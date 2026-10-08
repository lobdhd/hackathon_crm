import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import {
    RiAlarmWarningLine,
    RiArrowRightLine,
    RiBarChartBoxLine,
    RiFlashlightLine,
    RiLoader4Line,
    RiMapPinLine,
    RiRefreshLine,
    RiRobot2Line,
    RiSendPlane2Line,
    RiSparkling2Line,
    RiTeamLine,
    RiTimeLine,
    RiToolsLine,
    RiUserLine,
} from "react-icons/ri";

import {
    useAssistantChat,
    useAssistantHistory,
} from "../../../hooks/useAssistant.js";

import AssistantPromptInput from "../../../components/AssistantInput/AssistantPromptInput.jsx";

// MARK: Suggestions

const SUGGESTIONS = [
    {
        text:
            "Кто свободен?",
        icon:
            RiTeamLine,
    },

    {
        text:
            "Что просрочено?",
        icon:
            RiAlarmWarningLine,
    },

    {
        text:
            "Как прошла смена?",
        icon:
            RiTimeLine,
    },

    {
        text:
            "Покажи аномалии",
        icon:
            RiSparkling2Line,
    },

    {
        text:
            "Прогноз отказов",
        icon:
            RiFlashlightLine,
    },

    {
        text:
            "Сформируй отчёт за неделю",
        icon:
            RiBarChartBoxLine,
    },
];


// MARK: Helpers

function asArray(value) {
    return Array.isArray(
        value,
    )
        ? value
        : [];
}

function extractError(error) {
    return (
        error?.response?.data
            ?.error ||
        error?.message ||
        "Не удалось получить ответ"
    );
}

function getMessageText(
    item,
) {
    return String(
        item?.content ??
        item?.message ??
        item?.answer ??
        item?.text ??
        "",
    );
}

function normalizeHistory(
    history,
) {
    return asArray(
        history,
    )
        .map(
            (
                item,
                index,
            ) => ({
                id:
                    item.id ??
                    `history-${index}`,

                role:
                    item.role ===
                        "assistant"
                        ? "assistant"
                        : "user",

                text:
                    getMessageText(
                        item,
                    ),

                intent:
                    item.intent ??
                    null,

                data:
                    item.data ??
                    null,

                lang:
                    item.lang ??
                    null,

                fromModel:
                    item.fromModel,

                createdAt:
                    item.createdAt ??
                    null,
            }),
        )
        .reverse();
}

function getIntentName(
    intent,
) {
    if (
        typeof intent ===
        "string"
    ) {
        return intent;
    }

    return (
        intent?.intent ??
        null
    );
}

function formatPercent(
    value,
) {
    const number =
        Number(value);

    if (
        !Number.isFinite(
            number,
        )
    ) {
        return "—";
    }

    const normalized =
        number <= 1
            ? number * 100
            : number;

    return `${Math.round(
        normalized,
    )}%`;
}

function formatMinutes(
    value,
) {
    const minutes =
        Math.max(
            0,
            Math.round(
                Number(
                    value,
                ) || 0,
            ),
        );

    if (minutes < 60) {
        return `${minutes} мин`;
    }

    const hours =
        Math.floor(
            minutes / 60,
        );

    const rest =
        minutes % 60;

    return rest
        ? `${hours} ч ${rest} мин`
        : `${hours} ч`;
}


// MARK: Page

export default function Assistant() {
    const navigate =
        useNavigate();

    const historyQuery =
        useAssistantHistory();

    const chatMutation =
        useAssistantChat();

    const [
        messages,
        setMessages,
    ] = useState([]);

    const [
        input,
        setInput,
    ] = useState("");

    const [
        error,
        setError,
    ] = useState("");

    const hydratedRef =
        useRef(false);

    const scrollRef =
        useRef(null);


    // MARK: Hydrate history

    useEffect(() => {
        if (
            hydratedRef.current ||
            !historyQuery.data
        ) {
            return;
        }

        setMessages(
            normalizeHistory(
                historyQuery.data,
            ),
        );

        hydratedRef.current =
            true;
    }, [
        historyQuery.data,
    ]);


    // MARK: Auto scroll

    useEffect(() => {
        const element =
            scrollRef.current;

        if (!element) {
            return;
        }

        requestAnimationFrame(
            () => {
                element.scrollTo({
                    top:
                        element.scrollHeight,

                    behavior:
                        messages.length > 1
                            ? "smooth"
                            : "auto",
                });
            },
        );
    }, [
        messages,
        chatMutation.isPending,
    ]);


    // MARK: Send

    async function send(
        rawMessage = input,
    ) {
        const message =
            String(
                rawMessage ??
                "",
            ).trim();

        if (
            message.length < 2
        ) {
            return;
        }

        if (
            message.length > 1000
        ) {
            setError(
                "Максимум 1000 символов",
            );

            return;
        }

        if (
            chatMutation.isPending
        ) {
            return;
        }

        setError("");
        setInput("");

        const userMessage = {
            id:
                `user-${Date.now()}`,

            role:
                "user",

            text:
                message,

            createdAt:
                new Date()
                    .toISOString(),
        };

        setMessages(
            (
                previous,
            ) => [
                    ...previous,
                    userMessage,
                ],
        );

        try {
            const result =
                await chatMutation.mutateAsync(
                    message,
                );

            const assistantMessage = {
                id:
                    `assistant-${Date.now()}`,

                role:
                    "assistant",

                text:
                    result?.answer ??
                    "Ответ не получен",

                intent:
                    result?.intent ??
                    null,

                data:
                    result?.data ??
                    null,

                lang:
                    result?.lang ??
                    null,

                fromModel:
                    result?.fromModel,

                createdAt:
                    new Date()
                        .toISOString(),
            };

            setMessages(
                (
                    previous,
                ) => [
                        ...previous,
                        assistantMessage,
                    ],
            );
        } catch (
        requestError
        ) {
            setError(
                extractError(
                    requestError,
                ),
            );
        }
    }

    // MARK: Refresh history

    async function refreshHistory() {
        const result =
            await historyQuery.refetch();

        if (
            result.data
        ) {
            setMessages(
                normalizeHistory(
                    result.data,
                ),
            );

            hydratedRef.current =
                true;
        }
    }


    const empty =
        messages.length === 0 &&
        !chatMutation.isPending;


    return (
        <div className="mx-auto flex h-[calc(100dvh-120px)] min-h-[620px] max-w-[1600px] flex-col">

            {/* HEADER */}

            <div className="mb-4 flex shrink-0 flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
                            <RiSparkling2Line
                                size={22}
                            />
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                                НарядAI
                            </h1>

                            <p className="mt-1 text-sm text-gray-500">
                                Помощник по
                                нарядам,
                                оборудованию,
                                сотрудникам и
                                аналитике
                            </p>
                        </div>
                    </div>
                </div>

            </div>


            {/* CHAT FRAME */}

            <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

                {/* CHAT */}

                <div className="flex min-w-0 flex-1 flex-col">

                    {/* MESSAGES */}

                    <div
                        ref={
                            scrollRef
                        }
                        className="min-h-0 flex-1 overflow-y-auto px-5 py-5 lg:px-8"
                    >
                        {historyQuery.isLoading &&
                            !hydratedRef.current ? (
                            <div className="flex h-full items-center justify-center">
                                <RiLoader4Line
                                    size={28}
                                    className="animate-spin text-blue-600"
                                />
                            </div>
                        ) : empty ? (
                            <Welcome
                                onSend={
                                    send
                                }
                            />
                        ) : (
                            <div className="mx-auto max-w-[1000px] space-y-5">
                                {messages.map(
                                    (
                                        message,
                                    ) => (
                                        <Message
                                            key={
                                                message.id
                                            }
                                            message={
                                                message
                                            }
                                            navigate={
                                                navigate
                                            }
                                        />
                                    ),
                                )}

                                {chatMutation.isPending && (
                                    <Typing />
                                )}
                            </div>
                        )}
                    </div>


                    {/* ERROR */}

                    {error && (
                        <div className="mx-5 mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 lg:mx-8">
                            {
                                error
                            }
                        </div>
                    )}


                    {/* INPUT */}

                    {/* INPUT */}

                    <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-4 lg:px-8">
                        <div className="mx-auto max-w-[1000px]">
                            <AssistantPromptInput
                                value={
                                    input
                                }

                                onChange={(
                                    value,
                                ) => {
                                    setInput(
                                        value,
                                    );

                                    setError(
                                        "",
                                    );
                                }}

                                onSubmit={(
                                    value,
                                ) => {
                                    send(
                                        value,
                                    );
                                }}

                                onError={
                                    setError
                                }

                                disabled={
                                    chatMutation.isPending
                                }

                                loading={
                                    chatMutation.isPending
                                }

                                maxLength={
                                    1000
                                }

                                placeholder="Спросите: кто свободен, что просрочено, как прошла смена..."
                            />
                        </div>
                    </div>
                </div>


                {/* RIGHT PANEL */}

                <aside className="hidden w-[310px] shrink-0 border-l border-gray-200 bg-gray-50/70 p-5 xl:block">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                        Быстрые запросы
                    </p>

                    <div className="mt-4 space-y-2">
                        {SUGGESTIONS.map(
                            (
                                item,
                            ) => {
                                const Icon =
                                    item.icon;

                                return (
                                    <button
                                        key={
                                            item.text
                                        }
                                        type="button"
                                        onClick={() =>
                                            send(
                                                item.text,
                                            )
                                        }
                                        disabled={
                                            chatMutation.isPending
                                        }
                                        className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3 text-left text-sm font-medium text-gray-700 transition hover:border-blue-200 hover:text-blue-700 hover:shadow-sm disabled:opacity-50"
                                    >
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                            <Icon />
                                        </div>

                                        <span>
                                            {
                                                item.text
                                            }
                                        </span>
                                    </button>
                                );
                            },
                        )}
                    </div>

                    <div className="mt-6 rounded-xl border border-violet-100 bg-violet-50 p-4">
                        <div className="flex items-center gap-2 text-violet-700">
                            <RiSparkling2Line />

                            <span className="text-xs font-bold">
                                Можно
                                спрашивать
                                свободно
                            </span>
                        </div>

                        <p className="mt-2 text-xs leading-5 text-violet-700/80">
                            Помощник
                            понимает период,
                            участок,
                            оборудование и
                            может отвечать
                            на русском или
                            казахском.
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
}


// MARK: Welcome

function Welcome({
    onSend,
}) {
    return (
        <div className="flex h-full items-center justify-center">
            <div className="w-full max-w-[820px] text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                    <RiRobot2Line
                        size={30}
                    />
                </div>

                <h2 className="mt-5 text-xl font-bold text-gray-900">
                    Чем помочь
                    по производству?
                </h2>

                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-500">
                    Я могу найти
                    свободных
                    исполнителей,
                    просроченные
                    наряды,
                    историю
                    оборудования,
                    показать сводку
                    смены,
                    аномалии и
                    прогноз отказов.
                </p>

                <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {SUGGESTIONS.map(
                        (
                            item,
                        ) => {
                            const Icon =
                                item.icon;

                            return (
                                <button
                                    key={
                                        item.text
                                    }
                                    type="button"
                                    onClick={() =>
                                        onSend(
                                            item.text,
                                        )
                                    }
                                    className="rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-sm"
                                >
                                    <Icon
                                        size={
                                            20
                                        }
                                        className="text-blue-600"
                                    />

                                    <p className="mt-3 text-sm font-semibold text-gray-800">
                                        {
                                            item.text
                                        }
                                    </p>
                                </button>
                            );
                        },
                    )}
                </div>
            </div>
        </div>
    );
}


// MARK: Message

function Message({
    message,
    navigate,
}) {
    const assistant =
        message.role ===
        "assistant";

    return (
        <div
            className={`flex ${assistant
                ? "justify-start"
                : "justify-end"
                }`}
        >
            <div
                className={
                    assistant
                        ? "w-full max-w-[850px]"
                        : "max-w-[720px]"
                }
            >
                <div
                    className={`flex items-start gap-3 ${assistant
                        ? ""
                        : "flex-row-reverse"
                        }`}
                >
                    <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${assistant
                            ? "bg-violet-50 text-violet-600"
                            : "bg-blue-600 text-white"
                            }`}
                    >
                        {assistant ? (
                            message.fromModel ===
                                false ? (
                                <RiRobot2Line />
                            ) : (
                                <RiSparkling2Line />
                            )
                        ) : (
                            <RiUserLine />
                        )}
                    </div>

                    <div
                        className={`min-w-0 rounded-2xl px-4 py-3 ${assistant
                            ? "border border-gray-200 bg-white text-gray-700"
                            : "bg-blue-600 text-white"
                            }`}
                    >
                        <p className="whitespace-pre-wrap text-sm leading-6">
                            {
                                message.text
                            }
                        </p>

                        {assistant && (
                            <IntentContent
                                intent={
                                    message.intent
                                }
                                data={
                                    message.data
                                }
                                navigate={
                                    navigate
                                }
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}


// MARK: Intent Router

function IntentContent({
    intent,
    data,
    navigate,
}) {
    const name =
        getIntentName(
            intent,
        );

    if (
        !name ||
        data == null
    ) {
        return null;
    }

    if (
        name ===
        "FREE_EXECUTORS"
    ) {
        return (
            <FreeExecutors
                data={
                    data
                }
                navigate={
                    navigate
                }
            />
        );
    }

    if (
        name ===
        "OVERDUE" ||
        name ===
        "EQUIPMENT_HISTORY"
    ) {
        return (
            <OrdersResult
                data={
                    data
                }
                navigate={
                    navigate
                }
            />
        );
    }

    if (
        name ===
        "SHIFT_REPORT"
    ) {
        return (
            <ShiftResult
                data={
                    data
                }
            />
        );
    }

    if (
        name ===
        "ANOMALIES"
    ) {
        return (
            <AnomaliesResult
                data={
                    data
                }
                navigate={
                    navigate
                }
            />
        );
    }

    if (
        name ===
        "FAILURE_FORECAST"
    ) {
        return (
            <ForecastResult
                data={
                    data
                }
                navigate={
                    navigate
                }
            />
        );
    }

    return null;
}


// MARK: Free Executors

function FreeExecutors({
    data,
    navigate,
}) {
    const items =
        asArray(
            data,
        );

    if (!items.length) {
        return null;
    }

    return (
        <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
            {items.map(
                (
                    item,
                ) => (
                    <button
                        key={
                            item.id
                        }
                        type="button"
                        onClick={() =>
                            navigate(
                                `/employees/${item.id}`,
                            )
                        }
                        className="flex w-full items-center justify-between gap-4 rounded-xl bg-gray-50 px-3 py-3 text-left transition hover:bg-blue-50"
                    >
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">
                                {
                                    item.fullName
                                }
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                                {item.specialty ||
                                    "Специальность не указана"}

                                {item.grade
                                    ? ` • ${item.grade} разряд`
                                    : ""}
                            </p>
                        </div>

                        <RiArrowRightLine className="shrink-0 text-gray-400" />
                    </button>
                ),
            )}
        </div>
    );
}


// MARK: Orders result

function OrdersResult({
    data,
    navigate,
}) {
    const items =
        asArray(
            data,
        );

    if (!items.length) {
        return null;
    }

    return (
        <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
            {items
                .slice(
                    0,
                    12,
                )
                .map(
                    (
                        order,
                    ) => (
                        <button
                            key={
                                order.id
                            }
                            type="button"
                            onClick={() =>
                                navigate(
                                    `/orders/${order.id}`,
                                )
                            }
                            className="w-full rounded-xl border border-gray-100 bg-gray-50 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/50"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-bold text-blue-600">
                                    {order.number ||
                                        `#${order.id}`}
                                </span>

                                {order.isOverdue && (
                                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                                        Просрочен
                                    </span>
                                )}
                            </div>

                            <p className="mt-2 line-clamp-2 text-sm font-semibold text-gray-900">
                                {
                                    order.description
                                }
                            </p>

                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                                {order.equipment
                                    ?.name && (
                                        <span>
                                            {
                                                order
                                                    .equipment
                                                    .name
                                            }
                                        </span>
                                    )}

                                {order.area
                                    ?.name && (
                                        <span>
                                            {
                                                order
                                                    .area
                                                    .name
                                            }
                                        </span>
                                    )}

                                {order.assignee
                                    ?.fullName && (
                                        <span>
                                            {
                                                order
                                                    .assignee
                                                    .fullName
                                            }
                                        </span>
                                    )}
                            </div>
                        </button>
                    ),
                )}
        </div>
    );
}


// MARK: Shift

function ShiftResult({
    data,
}) {
    if (
        !data ||
        typeof data !==
        "object"
    ) {
        return null;
    }

    const stats = [
        {
            label:
                "Выдано",
            value:
                data.issued ??
                0,
        },

        {
            label:
                "Закрыто",
            value:
                data.closed ??
                0,
        },

        {
            label:
                "Просрочено",
            value:
                data.overdue ??
                0,
        },

        {
            label:
                "В работе",
            value:
                data.inProgress ??
                0,
        },
    ];

    return (
        <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {stats.map(
                    (
                        item,
                    ) => (
                        <div
                            key={
                                item.label
                            }
                            className="rounded-xl bg-gray-50 p-3"
                        >
                            <p className="text-[10px] font-semibold uppercase text-gray-400">
                                {
                                    item.label
                                }
                            </p>

                            <p className="mt-1 text-xl font-bold text-gray-900">
                                {
                                    item.value
                                }
                            </p>
                        </div>
                    ),
                )}
            </div>

            {data.downtime && (
                <div className="mt-3 rounded-xl bg-orange-50 p-3 text-xs text-orange-700">
                    Простой:{" "}
                    {formatMinutes(
                        data.downtime
                            ?.minutes,
                    )}
                </div>
            )}

            {data.area?.name && (
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                    <RiMapPinLine />

                    {
                        data.area.name
                    }
                </div>
            )}
        </div>
    );
}


// MARK: Anomalies

function AnomaliesResult({
    data,
    navigate,
}) {
    const items =
        asArray(
            data,
        );

    if (!items.length) {
        return null;
    }

    return (
        <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
            {items
                .slice(
                    0,
                    8,
                )
                .map(
                    (
                        item,
                    ) => (
                        <button
                            key={
                                item.id
                            }
                            type="button"
                            onClick={() => {
                                if (
                                    item.equipmentId
                                ) {
                                    navigate(
                                        `/equipment/${item.equipmentId}`,
                                    );
                                } else {
                                    navigate(
                                        "/analytics",
                                    );
                                }
                            }}
                            className="w-full rounded-xl border border-orange-100 bg-orange-50/50 p-3 text-left"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <p className="text-sm font-semibold text-gray-900">
                                    {
                                        item.title
                                    }
                                </p>

                                <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-orange-700">
                                    {
                                        item.severity
                                    }
                                    /5
                                </span>
                            </div>

                            <p className="mt-1 text-xs leading-5 text-gray-600">
                                {
                                    item.description
                                }
                            </p>

                            {item.recommendation && (
                                <p className="mt-2 text-xs font-medium text-violet-700">
                                    {
                                        item.recommendation
                                    }
                                </p>
                            )}
                        </button>
                    ),
                )}
        </div>
    );
}


// MARK: Forecast

function ForecastResult({
    data,
    navigate,
}) {
    const items =
        asArray(
            data,
        );

    if (!items.length) {
        return null;
    }

    return (
        <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
            {items
                .slice(
                    0,
                    8,
                )
                .map(
                    (
                        item,
                    ) => {
                        const probability =
                            Number(
                                item.probability,
                            ) || 0;

                        return (
                            <button
                                key={
                                    item.equipmentId
                                }
                                type="button"
                                onClick={() =>
                                    navigate(
                                        `/equipment/${item.equipmentId}`,
                                    )
                                }
                                className="w-full rounded-xl bg-gray-50 p-3 text-left transition hover:bg-blue-50"
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-gray-900">
                                            {item
                                                .equipment
                                                ?.name ||
                                                item.equipment ||
                                                `Оборудование #${item.equipmentId}`}
                                        </p>

                                        <p className="mt-1 text-xs text-gray-500">
                                            Отказов:{" "}
                                            {
                                                item.recentFailures
                                            }
                                        </p>
                                    </div>

                                    <span className="shrink-0 text-sm font-bold text-blue-600">
                                        {formatPercent(
                                            probability,
                                        )}
                                    </span>
                                </div>

                                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200">
                                    <div
                                        className="h-full rounded-full bg-blue-600"
                                        style={{
                                            width:
                                                `${Math.min(
                                                    100,
                                                    probability *
                                                    100,
                                                )}%`,
                                        }}
                                    />
                                </div>
                            </button>
                        );
                    },
                )}
        </div>
    );
}


// MARK: Typing

function Typing() {
    return (
        <div className="flex justify-start">
            <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                    <RiSparkling2Line />
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                    <div className="flex items-center gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.2s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.1s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                    </div>

                    <p className="mt-2 text-xs text-gray-400">
                        НарядAI
                        анализирует
                        данные...
                    </p>
                </div>
            </div>
        </div>
    );
}