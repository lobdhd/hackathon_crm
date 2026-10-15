import { useCallback, useEffect, useRef, useState } from "react";

import jsQR from "jsqr";

import {
    RiAlarmWarningLine,
    RiCameraLine,
    RiCloseLine,
    RiImageLine,
    RiKeyboardLine,
    RiLoader4Line,
    RiQrScan2Line,
} from "react-icons/ri";

import { getEquipmentByQr } from "../../api/equipment.api.js";

import { t, useI18n } from "../../i18n/index.js";


// QR on equipment: the sticker holds a link ".../equipment/<qrToken>".
// Scan → GET /api/equipment/qr/<token> → equipment (with area) → onDetected(equipment).

// MARK: Config

const SCAN_INTERVAL_MS = 150;


// MARK: Helpers

function label(key, fallback) {
    const value = t(key);
    return !value || value === key ? fallback : value;
}

function cameraError(error) {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        return label("qrScanner.noCamera", "Камера недоступна: откройте сайт по HTTPS или выберите фото QR-кода");
    }
    if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
        return label("qrScanner.denied", "Нет доступа к камере. Разрешите его в настройках браузера или выберите фото QR-кода");
    }
    if (error?.name === "NotFoundError" || error?.name === "OverconstrainedError") {
        return label("qrScanner.notFound", "Камера не найдена. Выберите фото QR-кода или введите код вручную");
    }
    return label("qrScanner.failed", "Не удалось включить камеру");
}

function lookupError(error) {
    const status = error?.status ?? error?.response?.status;
    if (status === 404) return label("qrScanner.unknown", "Такого QR-кода нет в системе");
    return error?.data?.error || error?.message || label("qrScanner.lookupFailed", "Не удалось определить оборудование");
}

// Native detector where available (Chrome, Android), jsQR everywhere else (Safari, Firefox).
function createDetector() {
    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
        try {
            const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
            return async (source, canvas) => {
                const codes = await detector.detect(source);
                return codes[0]?.rawValue || decodeWithJsQr(source, canvas);
            };
        } catch {
            // fall through to jsQR
        }
    }

    return async (source, canvas) => decodeWithJsQr(source, canvas);
}

function decodeWithJsQr(source, canvas) {
    const width = source.videoWidth || source.naturalWidth || source.width;
    const height = source.videoHeight || source.naturalHeight || source.height;
    if (!width || !height) return null;

    // Downscale big frames: jsQR is CPU-bound and 800 px is plenty for a sticker.
    const scale = Math.min(1, 800 / Math.max(width, height));
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);

    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);

    return jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" })?.data || null;
}


// MARK: Modal

export default function QrScannerModal({ onClose, onDetected, title }) {
    useI18n();

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const busyRef = useRef(false);
    const detectRef = useRef(null);

    const [phase, setPhase] = useState("starting"); // starting | scanning | looking | error
    const [error, setError] = useState("");
    const [manual, setManual] = useState(false);
    const [code, setCode] = useState("");

    const stopCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
    }, []);

    const resolve = useCallback(async (raw) => {
        if (busyRef.current) return;
        busyRef.current = true;
        setPhase("looking");
        setError("");

        try {
            const equipment = await getEquipmentByQr(raw);
            stopCamera();
            if (navigator.vibrate) navigator.vibrate(60);
            onDetected(equipment);
        } catch (requestError) {
            setError(lookupError(requestError));
            setPhase(streamRef.current ? "scanning" : "error");
            // Give the user a moment to move the camera off the wrong code.
            setTimeout(() => { busyRef.current = false; }, 1200);
        }
    }, [onDetected, stopCamera]);

    // MARK: Camera

    useEffect(() => {
        let cancelled = false;
        let timer = null;

        detectRef.current = createDetector();

        async function start() {
            try {
                if (!navigator.mediaDevices?.getUserMedia) throw new Error("no-media");

                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
                });

                if (cancelled) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }

                streamRef.current = stream;
                const video = videoRef.current;
                video.srcObject = stream;
                await video.play();
                setPhase("scanning");
                tick();
            } catch (startError) {
                if (cancelled) return;
                setError(cameraError(startError));
                setPhase("error");
            }
        }

        async function tick() {
            if (cancelled) return;

            const video = videoRef.current;

            if (!busyRef.current && video?.readyState >= 2) {
                try {
                    const raw = await detectRef.current(video, canvasRef.current);
                    if (raw && !cancelled) await resolve(raw);
                } catch {
                    // a bad frame is not an error; try the next one
                }
            }

            timer = setTimeout(tick, SCAN_INTERVAL_MS);
        }

        start();

        return () => {
            cancelled = true;
            clearTimeout(timer);
            stopCamera();
        };
    }, [resolve, stopCamera]);

    // MARK: Fallbacks

    async function scanPhoto(event) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;

        const url = URL.createObjectURL(file);

        try {
            const image = new Image();
            image.src = url;
            await image.decode();

            const raw = await detectRef.current(image, canvasRef.current);

            if (!raw) {
                setError(label("qrScanner.notInPhoto", "На фото не найден QR-код. Снимите ближе и ровнее"));
                return;
            }

            busyRef.current = false;
            await resolve(raw);
        } catch {
            setError(label("qrScanner.photoFailed", "Не удалось прочитать фото"));
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    async function submitCode(event) {
        event.preventDefault();
        if (!code.trim()) return;
        busyRef.current = false;
        await resolve(code.trim());
    }

    // MARK: Render

    return (
        <div className="fixed inset-0 z-[6000] flex flex-col bg-slate-950 text-white">
            <div className="relative flex items-center justify-between px-4 pb-3 pt-[max(16px,env(safe-area-inset-top))]">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                        <RiQrScan2Line size={19} />
                    </span>
                    <div>
                        <p className="text-sm font-bold">{title || label("qrScanner.title", "Сканировать QR оборудования")}</p>
                        <p className="text-xs text-white/60">{label("qrScanner.hint", "Наведите камеру на наклейку")}</p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                    aria-label="Закрыть"
                >
                    <RiCloseLine size={24} />
                </button>
            </div>

            <div className="relative flex-1 overflow-hidden">
                <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />

                {/* Viewfinder */}
                {phase !== "error" && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="relative h-64 w-64 rounded-3xl shadow-[0_0_0_9999px_rgba(2,6,23,0.55)] sm:h-72 sm:w-72">
                            {["left-0 top-0 border-l-4 border-t-4 rounded-tl-3xl", "right-0 top-0 border-r-4 border-t-4 rounded-tr-3xl", "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-3xl", "bottom-0 right-0 border-b-4 border-r-4 rounded-br-3xl"].map((corner) => (
                                <span key={corner} className={`absolute h-10 w-10 border-blue-400 ${corner}`} />
                            ))}

                            {phase === "scanning" && (
                                <span className="qr-scan-line absolute inset-x-4 h-0.5 rounded-full bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_12px_2px_rgba(96,165,250,0.7)]" />
                            )}

                            {(phase === "starting" || phase === "looking") && (
                                <span className="absolute inset-0 flex items-center justify-center">
                                    <span className="flex items-center gap-2 rounded-full bg-slate-900/80 px-4 py-2 text-sm font-semibold">
                                        <RiLoader4Line className="animate-spin" size={18} />
                                        {phase === "looking"
                                            ? label("qrScanner.looking", "Ищем оборудование…")
                                            : label("qrScanner.starting", "Включаем камеру…")}
                                    </span>
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {phase === "error" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
                        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                            <RiCameraLine size={28} />
                        </span>
                        <p className="max-w-sm text-sm leading-6 text-white/80">{error}</p>
                    </div>
                )}

                {phase !== "error" && error && (
                    <div className="absolute inset-x-4 top-4 flex items-start gap-2 rounded-2xl bg-red-500/90 px-4 py-3 text-sm font-semibold shadow-lg">
                        <RiAlarmWarningLine size={18} className="shrink-0" />
                        {error}
                    </div>
                )}
            </div>

            <div className="space-y-3 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-4">
                {manual ? (
                    <form onSubmit={submitCode} className="flex gap-2">
                        <input
                            value={code}
                            onChange={(event) => setCode(event.target.value)}
                            autoFocus
                            placeholder={label("qrScanner.codePlaceholder", "Ссылка или код с наклейки")}
                            className="h-12 min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-4 text-sm text-white outline-none placeholder:text-white/40 focus:border-blue-400"
                        />
                        <button type="submit" className="h-12 rounded-xl bg-blue-600 px-5 text-sm font-semibold transition hover:bg-blue-500">
                            {label("qrScanner.find", "Найти")}
                        </button>
                    </form>
                ) : null}

                <div className="grid grid-cols-2 gap-2">
                    <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-white/10 text-sm font-semibold transition hover:bg-white/15">
                        <RiImageLine size={18} />
                        {label("qrScanner.photo", "Фото QR")}
                        <input type="file" accept="image/*" capture="environment" onChange={scanPhoto} className="hidden" />
                    </label>

                    <button
                        type="button"
                        onClick={() => setManual((value) => !value)}
                        className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white/10 text-sm font-semibold transition hover:bg-white/15"
                    >
                        <RiKeyboardLine size={18} />
                        {label("qrScanner.manual", "Ввести код")}
                    </button>
                </div>
            </div>
        </div>
    );
}
