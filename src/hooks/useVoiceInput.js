import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import {
    transcribeAudio,
} from "../api/ai.api.js";


function getErrorMessage(error) {
    const status =
        error?.response?.status;

    if (status === 422) {
        return "Не расслышали, повторите запись";
    }

    if (status === 502) {
        return "Сервис распознавания сейчас недоступен. Введите текст вручную";
    }

    return (
        error?.response?.data?.error ||
        error?.message ||
        "Не удалось распознать речь"
    );
}


function chooseMimeType() {
    const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
    ];

    return candidates.find(
        (type) =>
            typeof MediaRecorder !== "undefined" &&
            MediaRecorder.isTypeSupported?.(type),
    );
}


export function useVoiceInput({
    onText,
    onError,
    disabled = false,
}) {
    const recorderRef =
        useRef(null);

    const streamRef =
        useRef(null);

    const chunksRef =
        useRef([]);

    const cancelledRef =
        useRef(false);

    const onTextRef =
        useRef(onText);

    const onErrorRef =
        useRef(onError);


    const [
        recording,
        setRecording,
    ] = useState(false);

    const [
        transcribing,
        setTranscribing,
    ] = useState(false);

    const [
        stream,
        setStream,
    ] = useState(null);


    useEffect(() => {
        onTextRef.current =
            onText;
    }, [onText]);


    useEffect(() => {
        onErrorRef.current =
            onError;
    }, [onError]);


    const cleanupStream =
        useCallback(() => {
            streamRef.current
                ?.getTracks?.()
                .forEach(
                    (track) =>
                        track.stop(),
                );

            streamRef.current =
                null;

            setStream(null);
        }, []);


    const startRecording =
        useCallback(async () => {
            if (
                disabled ||
                recording ||
                transcribing
            ) {
                return;
            }

            if (
                !navigator.mediaDevices
                    ?.getUserMedia ||
                typeof MediaRecorder ===
                "undefined"
            ) {
                onErrorRef.current?.(
                    "Запись с микрофона не поддерживается этим браузером",
                );

                return;
            }

            try {
                cancelledRef.current =
                    false;

                const mediaStream =
                    await navigator.mediaDevices.getUserMedia(
                        {
                            audio: {
                                echoCancellation: true,
                                noiseSuppression: true,
                                autoGainControl: true,
                            },
                        },
                    );

                streamRef.current =
                    mediaStream;

                setStream(
                    mediaStream,
                );

                chunksRef.current =
                    [];

                const mimeType =
                    chooseMimeType();

                const recorder =
                    new MediaRecorder(
                        mediaStream,
                        mimeType
                            ? {
                                mimeType,
                            }
                            : undefined,
                    );

                recorderRef.current =
                    recorder;


                recorder.ondataavailable =
                    (event) => {
                        if (
                            event.data?.size >
                            0
                        ) {
                            chunksRef.current.push(
                                event.data,
                            );
                        }
                    };


                recorder.onerror =
                    () => {
                        setRecording(
                            false,
                        );

                        cleanupStream();

                        onErrorRef.current?.(
                            "Не удалось записать аудио",
                        );
                    };


                recorder.onstop =
                    async () => {
                        const cancelled =
                            cancelledRef.current;

                        cancelledRef.current =
                            false;

                        recorderRef.current =
                            null;

                        setRecording(
                            false,
                        );

                        const chunks = [
                            ...chunksRef.current,
                        ];

                        chunksRef.current =
                            [];

                        cleanupStream();

                        if (cancelled) {
                            return;
                        }

                        if (
                            chunks.length ===
                            0
                        ) {
                            onErrorRef.current?.(
                                "Запись пустая",
                            );

                            return;
                        }


                        const type =
                            chunks[0]
                                ?.type ||
                            mimeType ||
                            "audio/webm";

                        const blob =
                            new Blob(
                                chunks,
                                {
                                    type,
                                },
                            );


                        if (
                            blob.size >
                            25 *
                            1024 *
                            1024
                        ) {
                            onErrorRef.current?.(
                                "Аудиозапись больше 25 МБ",
                            );

                            return;
                        }


                        try {
                            setTranscribing(
                                true,
                            );

                            const result =
                                await transcribeAudio(
                                    blob,
                                    type.includes(
                                        "ogg",
                                    )
                                        ? "voice.ogg"
                                        : "voice.webm",
                                );

                            const text =
                                String(
                                    result?.text ||
                                    "",
                                ).trim();

                            if (!text) {
                                onErrorRef.current?.(
                                    "Не расслышали, повторите запись",
                                );

                                return;
                            }

                            onTextRef.current?.(
                                text,
                            );
                        } catch (
                        error
                        ) {
                            onErrorRef.current?.(
                                getErrorMessage(
                                    error,
                                ),
                            );
                        } finally {
                            setTranscribing(
                                false,
                            );
                        }
                    };


                recorder.start(
                    250,
                );

                setRecording(true);
            } catch (error) {
                cleanupStream();

                setRecording(
                    false,
                );

                onErrorRef.current?.(
                    error?.name ===
                        "NotAllowedError"
                        ? "Разрешите доступ к микрофону в браузере"
                        : "Не удалось включить микрофон",
                );
            }
        }, [
            cleanupStream,
            disabled,
            recording,
            transcribing,
        ]);


    const stopRecording =
        useCallback(() => {
            try {
                if (
                    recorderRef.current
                        ?.state ===
                    "recording"
                ) {
                    recorderRef.current.stop();
                }
            } catch {
                setRecording(
                    false,
                );

                cleanupStream();
            }
        }, [cleanupStream]);


    const cancelRecording =
        useCallback(() => {
            cancelledRef.current =
                true;

            try {
                if (
                    recorderRef.current
                        ?.state ===
                    "recording"
                ) {
                    recorderRef.current.stop();
                } else {
                    cleanupStream();

                    setRecording(
                        false,
                    );
                }
            } catch {
                cleanupStream();

                setRecording(
                    false,
                );
            }
        }, [cleanupStream]);


    useEffect(() => {
        return () => {
            cancelledRef.current =
                true;

            try {
                if (
                    recorderRef.current
                        ?.state ===
                    "recording"
                ) {
                    recorderRef.current.stop();
                }
            } catch {
                // noop
            }

            streamRef.current
                ?.getTracks?.()
                .forEach(
                    (track) =>
                        track.stop(),
                );
        };
    }, []);


    return {
        recording,
        transcribing,
        stream,

        startRecording,
        stopRecording,
        cancelRecording,
    };
}