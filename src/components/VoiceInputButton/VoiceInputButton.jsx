import {
    useEffect,
    useRef,
    useState,
} from "react";

import {
    RiCheckLine,
    RiCloseLine,
    RiLoader4Line,
    RiMicFill,
    RiSendPlane2Line,
} from "react-icons/ri";

import {
    useVoiceInput,
} from "../../hooks/useVoiceInput.js";

import LiveWaveform from "../AssistantInput/LiveWaveform.jsx";
import VoiceTopGlow from "../AssistantInput/VoiceTopGlow.jsx";
import { t as i18nT } from "../../i18n/index.js";
import { useI18n as __useI18nReactive } from "../../i18n/index.js";


function formatDuration(
    seconds,
) {
    const minutes =
        Math.floor(
            seconds / 60,
        );

    const rest =
        seconds % 60;

    return `${String(
        minutes,
    ).padStart(
        2,
        "0",
    )}:${String(
        rest,
    ).padStart(
        2,
        "0",
    )}`;
}


export default function AssistantPromptInput({
    value = "",
    onChange,
    onSubmit,
    onError,

    disabled = false,
    loading = false,

    maxLength = 1000,

    placeholder =
        "Спросите: кто свободен, что просрочено, как прошла смена...",
}) {
    __useI18nReactive();
    const textareaRef =
        useRef(null);

    const [
        recordingSeconds,
        setRecordingSeconds,
    ] = useState(0);


    const {
        recording,
        transcribing,
        stream,

        startRecording,
        stopRecording,
        cancelRecording,
    } = useVoiceInput({
        disabled:
            disabled ||
            loading,

        onError,

        onText: (
            recognizedText,
        ) => {
            const current =
                String(
                    value || "",
                ).trim();

            const nextValue =
                [
                    current,
                    recognizedText,
                ]
                    .filter(Boolean)
                    .join(" ");

            onChange?.(
                nextValue,
            );

            requestAnimationFrame(
                () => {
                    textareaRef.current
                        ?.focus();
                },
            );
        },
    });


    const hasText =
        value.trim().length >
        0;


    useEffect(() => {
        const textarea =
            textareaRef.current;

        if (!textarea) {
            return;
        }

        textarea.style.height =
            "0px";

        textarea.style.height =
            `${Math.min(
                textarea.scrollHeight,
                160,
            )}px`;
    }, [value]);


    useEffect(() => {
        if (!recording) {
            setRecordingSeconds(
                0,
            );

            return;
        }


        const startedAt =
            Date.now();


        const interval =
            window.setInterval(
                () => {
                    setRecordingSeconds(
                        Math.floor(
                            (Date.now() -
                                startedAt) /
                                1000,
                        ),
                    );
                },
                250,
            );


        return () => {
            window.clearInterval(
                interval,
            );
        };
    }, [recording]);


    function submit() {
        const message =
            String(
                value || "",
            ).trim();

        if (
            disabled ||
            loading ||
            message.length <
                2
        ) {
            return;
        }

        onSubmit?.(
            message,
        );
    }


    function handleKeyDown(
        event,
    ) {
        if (
            event.key ===
                "Enter" &&
            !event.shiftKey
        ) {
            event.preventDefault();

            submit();
        }
    }


    return (
        <div className="relative w-full">
            <VoiceTopGlow
                active={
                    recording
                }
                stream={stream}
                className="rounded-[25px]"
            />


            <div
                className={`
                    relative z-[1]
                    overflow-hidden
                    rounded-[24px]
                    border
                    bg-white
                    shadow-sm
                    transition-all
                    duration-300

                    ${
                        recording
                            ? "border-blue-400"
                            : "border-gray-300 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100/70"
                    }
                `}
            >
                {recording ? (
                    <div className="flex min-h-[88px] items-center gap-4 px-4">
                        <button
                            type="button"
                            onClick={
                                cancelRecording
                            }
                            className="
                                flex
                                h-10
                                w-10
                                shrink-0
                                items-center
                                justify-center
                                rounded-full
                                bg-gray-100
                                text-gray-500
                                transition
                                hover:bg-red-50
                                hover:text-red-600
                            "
                            title={i18nT("components.assistantinput.assistantpromptinput.0ddca6e")}
                        >
                            <RiCloseLine
                                size={
                                    21
                                }
                            />
                        </button>


                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-3">
                                <span
                                    className="
                                        h-2
                                        w-2
                                        shrink-0
                                        animate-pulse
                                        rounded-full
                                        bg-red-500
                                    "
                                />

                                <div className="min-w-0 flex-1">
                                    <LiveWaveform
                                        active
                                        stream={
                                            stream
                                        }
                                        height={
                                            34
                                        }
                                        barWidth={
                                            3
                                        }
                                        barGap={
                                            2
                                        }
                                        barRadius={
                                            2
                                        }
                                        sensitivity={
                                            1.8
                                        }
                                    />
                                </div>

                                <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-gray-500">
                                    {formatDuration(
                                        recordingSeconds,
                                    )}
                                </span>
                            </div>
                        </div>


                        <button
                            type="button"
                            onClick={
                                stopRecording
                            }
                            className="
                                flex
                                h-10
                                w-10
                                shrink-0
                                items-center
                                justify-center
                                rounded-full
                                bg-blue-600
                                text-white
                                shadow-sm
                                transition
                                hover:bg-blue-700
                                active:scale-95
                            "
                            title={i18nT("components.assistantinput.assistantpromptinput.ef46d22")}
                        >
                            <RiCheckLine
                                size={
                                    21
                                }
                            />
                        </button>
                    </div>
                ) : transcribing ? (
                    <div className="flex min-h-[88px] items-center justify-center gap-4 px-5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                            <RiLoader4Line
                                size={
                                    20
                                }
                                className="animate-spin"
                            />
                        </div>


                        <div>
                            <p className="text-sm font-semibold text-gray-800">
                                {i18nT("components.assistantinput.assistantpromptinput.1bf7abe")}
                            </p>

                            <div className="mt-1 flex h-3 items-center gap-[3px]">
                                <span className="h-2 w-[3px] animate-pulse rounded-full bg-blue-400 [animation-delay:-0.4s]" />
                                <span className="h-3 w-[3px] animate-pulse rounded-full bg-blue-500 [animation-delay:-0.3s]" />
                                <span className="h-2 w-[3px] animate-pulse rounded-full bg-blue-400 [animation-delay:-0.2s]" />
                                <span className="h-3 w-[3px] animate-pulse rounded-full bg-blue-500 [animation-delay:-0.1s]" />
                                <span className="h-2 w-[3px] animate-pulse rounded-full bg-blue-400" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <textarea
                            ref={
                                textareaRef
                            }
                            value={
                                value
                            }
                            disabled={
                                disabled ||
                                loading
                            }
                            onChange={(
                                event,
                            ) => {
                                onChange?.(
                                    event
                                        .target
                                        .value,
                                );
                            }}
                            onKeyDown={
                                handleKeyDown
                            }
                            rows={1}
                            maxLength={
                                maxLength
                            }
                            placeholder={
                                placeholder
                            }
                            className="
                                block
                                min-h-[58px]
                                max-h-[160px]
                                w-full
                                resize-none
                                overflow-y-auto
                                border-0
                                bg-transparent
                                px-5
                                pb-2
                                pt-4
                                text-[14px]
                                leading-6
                                text-gray-900
                                outline-none
                                placeholder:text-gray-400
                                disabled:cursor-not-allowed
                                disabled:opacity-60
                            "
                        />


                        <div className="flex items-center justify-between gap-4 px-3 pb-3">
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="hidden text-[11px] text-gray-400 sm:inline">
                                    {i18nT("components.assistantinput.assistantpromptinput.f423d83")}
                                </span>
                            </div>


                            <div className="flex shrink-0 items-center gap-2">
                                <span
                                    className={`
                                        text-[11px]

                                        ${
                                            value.length >
                                            maxLength *
                                                0.9
                                                ? "font-semibold text-orange-500"
                                                : "text-gray-400"
                                        }
                                    `}
                                >
                                    {
                                        value.length
                                    }
                                    /
                                    {
                                        maxLength
                                    }
                                </span>


                                {loading ? (
                                    <button
                                        type="button"
                                        disabled
                                        className="
                                            flex
                                            h-10
                                            w-10
                                            items-center
                                            justify-center
                                            rounded-full
                                            bg-gray-100
                                            text-gray-500
                                        "
                                    >
                                        <RiLoader4Line
                                            className="animate-spin"
                                            size={
                                                18
                                            }
                                        />
                                    </button>
                                ) : hasText ? (
                                    <button
                                        type="button"
                                        onClick={
                                            submit
                                        }
                                        disabled={
                                            disabled ||
                                            value
                                                .trim()
                                                .length <
                                                2
                                        }
                                        className="
                                            flex
                                            h-10
                                            w-10
                                            items-center
                                            justify-center
                                            rounded-full
                                            bg-blue-600
                                            text-white
                                            shadow-sm
                                            transition
                                            hover:bg-blue-700
                                            active:scale-95
                                            disabled:cursor-not-allowed
                                            disabled:opacity-40
                                        "
                                        title={i18nT("components.assistantinput.assistantpromptinput.6da0f0a")}
                                    >
                                        <RiSendPlane2Line
                                            size={
                                                18
                                            }
                                        />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={
                                            startRecording
                                        }
                                        disabled={
                                            disabled
                                        }
                                        className="
                                            flex
                                            h-10
                                            w-10
                                            items-center
                                            justify-center
                                            rounded-full
                                            bg-gray-100
                                            text-gray-600
                                            transition
                                            hover:bg-blue-50
                                            hover:text-blue-600
                                            active:scale-95
                                            disabled:cursor-not-allowed
                                            disabled:opacity-40
                                        "
                                        title={i18nT("components.assistantinput.assistantpromptinput.8c1a778")}
                                    >
                                        <RiMicFill
                                            size={
                                                18
                                            }
                                        />
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}