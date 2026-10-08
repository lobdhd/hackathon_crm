import {
    useEffect,
    useMemo,
    useId,
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
    RiRobot2Line,
    RiSparkling2Line,
    RiTeamLine,
    RiTimeLine,
    RiUserLine,
} from "react-icons/ri";
import {
    useAssistantChat,
    useAssistantHistory,
} from "../../../hooks/useAssistant.js";
import AssistantPromptInput from "../../../components/AssistantInput/AssistantPromptInput.jsx";
import { t as i18nT } from "../../../i18n/index.js";
import { useI18n as __useI18nReactive } from "../../../i18n/index.js";
// MARK: Suggestions
const SUGGESTIONS = () => ([
    {
        text:
            i18nT("pages.assistant.assistant.assistant.dc77db9"),
        icon:
            RiTeamLine,
    },
    {
        text:
            i18nT("pages.assistant.assistant.assistant.af97c79"),
        icon:
            RiAlarmWarningLine,
    },
    {
        text:
            i18nT("pages.assistant.assistant.assistant.48f4766"),
        icon:
            RiTimeLine,
    },
    {
        text:
            i18nT("pages.assistant.assistant.assistant.7474867"),
        icon:
            RiSparkling2Line,
    },
    {
        text:
            i18nT("pages.analytics.analytics.b89121c"),
        icon:
            RiFlashlightLine,
    },
    {
        text:
            i18nT("pages.assistant.assistant.assistant.c64032e"),
        icon:
            RiBarChartBoxLine,
    },
]);
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
function normalizeHistory(history) {
    const list = Array.isArray(history)
        ? history
        : asArray(history?.messages ?? history?.items ?? history?.history ?? history?.data);

    return list.map((item, index) => ({
        id: item.id ?? `history-${index}`,
        role: item.role === "assistant" ? "assistant" : "user",
        text: getMessageText(item),
        intent: item.intent ?? item.meta?.intent ?? item.response?.intent ?? null,
        data: parseRichData(item.data ?? item.meta?.data ?? item.response?.data),
        lang: item.lang ?? null,
        fromModel: item.fromModel,
        createdAt: item.createdAt ?? null,
    })).reverse(); // Original API history is newest-first
}

function parseRichData(value) {
    if (typeof value !== "string") return value ?? null;
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
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
// MARK: Persistent rich history
// Client-side fallback until GET history returns the full intent/data payload.
// IMPORTANT: clear or scope this key by account in the logout/auth flow.
const ASSISTANT_STORAGE_KEY = "naryadai_assistant_rich_history_v2";
const ASSISTANT_STORAGE_LIMIT = 120;

function readAssistantCache() {
    if (typeof window === "undefined") return [];
    try {
        const saved = JSON.parse(window.localStorage.getItem(ASSISTANT_STORAGE_KEY) || "[]");
        return asArray(saved).slice(-ASSISTANT_STORAGE_LIMIT);
    } catch {
        return [];
    }
}

function writeAssistantCache(messages) {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(
            ASSISTANT_STORAGE_KEY,
            JSON.stringify(asArray(messages).slice(-ASSISTANT_STORAGE_LIMIT)),
        );
    } catch (error) {
        console.warn("Не удалось сохранить rich-историю НарядAI", error);
    }
}

function mergeHistoryWithCache(serverHistory, cachedMessages) {
    const server = normalizeHistory(serverHistory);
    const cached = asArray(cachedMessages);
    if (!server.length) return cached;

    // Match duplicate answers from newest to oldest (not only the first text match).
    const used = new Set();
    const mergedNewestFirst = [...server].reverse().map((serverItem) => {
        let matchIndex = -1;
        for (let i = cached.length - 1; i >= 0; i -= 1) {
            const saved = cached[i];
            if (used.has(i) || saved?.role !== serverItem.role) continue;
            if (String(saved.text ?? "") !== String(serverItem.text ?? "")) continue;
            if (
                serverItem.intent != null && saved.intent != null &&
                getIntentName(serverItem.intent) !== getIntentName(saved.intent)
            ) continue;
            matchIndex = i;
            break;
        }

        if (matchIndex < 0) return serverItem;
        used.add(matchIndex);
        const local = cached[matchIndex];
        return {
            ...serverItem,
            intent: serverItem.intent ?? local.intent ?? null,
            data: serverItem.data ?? local.data ?? null,
            lang: serverItem.lang ?? local.lang ?? null,
            fromModel: serverItem.fromModel ?? local.fromModel,
        };
    });

    const merged = mergedNewestFirst.reverse();
    // Preserve a newly submitted message not yet visible in the GET history result.
    const lastServerTimestamp = Math.max(
        0,
        ...merged.map((item) => Date.parse(item.createdAt || "") || 0),
    );
    const pending = cached.filter((item, index) => {
        if (used.has(index)) return false;
        const time = Date.parse(item?.createdAt || "") || 0;
        return lastServerTimestamp > 0 && time > lastServerTimestamp;
    });
    return [...merged, ...pending].slice(-ASSISTANT_STORAGE_LIMIT);
}

// MARK: Page
export default function Assistant() {
    __useI18nReactive();
    const navigate =
        useNavigate();
    const historyQuery =
        useAssistantHistory();
    const chatMutation =
        useAssistantChat();
    const [
        messages,
        setMessages,
    ] = useState(() => readAssistantCache());
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
        if (hydratedRef.current || !historyQuery.data) return;
        setMessages((previous) =>
            mergeHistoryWithCache(historyQuery.data, previous),
        );
        hydratedRef.current = true;
    }, [historyQuery.data]);

    // MARK: Persist rich responses
    useEffect(() => {
        writeAssistantCache(messages);
    }, [messages]);

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
                                {i18nT("pages.assistant.assistant.assistant.9d43787")}
                            </h1>
                            <p className="mt-1 text-sm text-gray-500">
                                {i18nT("pages.assistant.assistant.assistant.ab53863")}
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
                            messages.length === 0 ? (
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
                                placeholder={i18nT("pages.assistant.assistant.assistant.321804c")}
                            />
                        </div>
                    </div>
                </div>
                {/* RIGHT PANEL */}
                <aside className="hidden w-[310px] shrink-0 border-l border-gray-200 bg-gray-50/70 p-5 xl:block">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                        {i18nT("pages.assistant.assistant.assistant.b30f591")}
                    </p>
                    <div className="mt-4 space-y-2">
                        {SUGGESTIONS().map(
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
                                {i18nT("pages.assistant.assistant.assistant.c791eed")}
                            </span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-violet-700/80">
                            {i18nT("pages.assistant.assistant.assistant.2ce8bce")}
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
    __useI18nReactive();
    return (
        <div className="flex h-full items-center justify-center">
            <div className="w-full max-w-[820px] text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                    <RiRobot2Line
                        size={30}
                    />
                </div>
                <h2 className="mt-5 text-xl font-bold text-gray-900">
                    {i18nT("pages.assistant.assistant.assistant.c5415ff")}
                </h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-500">
                    {i18nT("pages.assistant.assistant.assistant.3941146")}
                </p>
                <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {SUGGESTIONS().map(
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
                        ? "w-full max-w-[940px]"
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
                            ? "border border-gray-200 bg-white text-gray-700 shadow-sm"
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
    __useI18nReactive();
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
                                        {i18nT("pages.assistant.assistant.assistant.0a04820")}
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
    __useI18nReactive();
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
                i18nT("pages.assistant.assistant.assistant.df7362f"),
            value:
                data.issued ??
                0,
        },
        {
            label:
                i18nT("pages.assistant.assistant.assistant.8280957"),
            value:
                data.closed ??
                0,
        },
        {
            label:
                i18nT("pages.assistant.assistant.assistant.b6fa08e"),
            value:
                data.overdue ??
                0,
        },
        {
            label:
                i18nT("pages.assistant.assistant.assistant.8c92e34"),
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
                    {i18nT("pages.assistant.assistant.assistant.b90ada4")}{" "}
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
function toRiskPercent(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.min(100, numeric <= 1 ? numeric * 100 : numeric));
}

function equipmentTitle(item) {
    return (
        item.equipment?.name ||
        (typeof item.equipment === "string" ? item.equipment : "") ||
        `Оборудование #${item.equipmentId ?? "—"}`
    );
}

// Catmull-Rom converted into cubic Bézier segments for a smooth, restrained line.
function smoothPath(points) {
    if (!points.length) return "";
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    const commands = [`M ${points[0].x} ${points[0].y}`];
    for (let i = 0; i < points.length - 1; i += 1) {
        const previous = points[Math.max(0, i - 1)];
        const current = points[i];
        const next = points[i + 1];
        const after = points[Math.min(points.length - 1, i + 2)];
        const cp1x = current.x + (next.x - previous.x) / 6;
        const cp1y = current.y + (next.y - previous.y) / 6;
        const cp2x = next.x - (after.x - current.x) / 6;
        const cp2y = next.y - (after.y - current.y) / 6;
        commands.push(`C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${next.x} ${next.y}`);
    }
    return commands.join(" ");
}

// MARK: One chart for all equipment
function ForecastResult({ data, navigate }) {
    __useI18nReactive();
    const [activeIndex, setActiveIndex] = useState(null);
    const gradientId = useId().replace(/:/g, "-");
    const items = useMemo(() => {
        return asArray(data)
            .filter((item) => item && Number.isFinite(Number(item.probability)))
            .map((item, originalIndex) => ({
                ...item,
                originalIndex,
                risk: toRiskPercent(item.probability),
                title: equipmentTitle(item),
            }))
            .sort((a, b) => b.risk - a.risk || a.originalIndex - b.originalIndex);
    }, [data]);

    const plot = useMemo(() => {
        const width = 760;
        const height = 248;
        const left = 43;
        const right = 19;
        const top = 23;
        const bottom = 43;
        const chartWidth = width - left - right;
        const chartHeight = height - top - bottom;
        const minRisk = Math.min(...items.map((item) => item.risk));
        const maxRisk = Math.max(...items.map((item) => item.risk));

        // Adaptive axis: labels show actual boundaries, so no hidden zoom.
        const axisMin = Math.max(0, Math.floor((minRisk - 8) / 10) * 10);
        const axisMax = Math.min(100, Math.ceil((maxRisk + 4) / 10) * 10);
        const range = Math.max(10, axisMax - axisMin);
        const yFor = (risk) => top + ((axisMax - risk) / range) * chartHeight;
        const points = items.map((item, index) => ({
            x: items.length === 1
                ? left + chartWidth / 2
                : left + index * chartWidth / (items.length - 1),
            y: yFor(item.risk),
        }));
        const baseline = top + chartHeight;
        const linePath = smoothPath(points);
        const areaPath = points.length
            ? `${linePath} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`
            : "";
        const guides = [0, 0.5, 1].map((part) => ({
            value: axisMax - part * range,
            y: top + part * chartHeight,
        }));
        return { width, height, points, guides, linePath, areaPath, axisMin, axisMax };
    }, [items]);

    if (!items.length) return null;

    const average = items.reduce((total, item) => total + item.risk, 0) / items.length;
    const peak = items[0];
    const selected = activeIndex != null && items[activeIndex]
        ? activeIndex
        : null;

    return (
        <section className="mt-4 border-t border-slate-100 pt-4">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.035)]">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
                    <div>
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            <span className="h-2 w-2 rounded-full bg-indigo-500" />
                            Аналитика оборудования
                        </div>
                        <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">
                            Прогноз рисков
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                            Сравнение вероятности отказа по оборудованию
                        </p>
                    </div>
                    <div className="flex items-center gap-5 sm:gap-7">
                        <div>
                            <p className="text-[11px] text-slate-400">Оборудование</p>
                            <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
                                {items.length}
                            </p>
                        </div>
                        <div className="h-8 w-px bg-slate-200" />
                        <div>
                            <p className="text-[11px] text-slate-400">Средний риск</p>
                            <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
                                {Math.round(average)}%
                            </p>
                        </div>
                    </div>
                </div>

                {/* Single comparative line chart */}
                <div className="px-4 pb-4 pt-5 sm:px-6">
                    <div className="flex items-center justify-between gap-3 px-1">
                        <span className="text-xs font-medium text-slate-600">
                            Вероятность отказа
                        </span>
                        <span className="text-[11px] tabular-nums text-slate-400">
                            Макс. {Math.round(peak.risk)}%
                        </span>
                    </div>
                    <div className="relative mt-3">
                        <svg
                            className="block h-auto w-full overflow-visible"
                            viewBox={`0 0 ${plot.width} ${plot.height}`}
                            role="img"
                            aria-label={`Линейный график рисков для ${items.length} единиц оборудования. Значения от ${Math.round(plot.axisMin)} до ${Math.round(plot.axisMax)} процентов. Данные сравниваются по оборудованию, а не по датам.`}
                        >
                            <defs>
                                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
                                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                                </linearGradient>
                            </defs>

                            {plot.guides.map((guide, index) => (
                                <g key={index}>
                                    <line
                                        x1="43"
                                        y1={guide.y}
                                        x2="741"
                                        y2={guide.y}
                                        stroke="#e2e8f0"
                                        strokeWidth="1"
                                        strokeDasharray={index === 2 ? "0" : "4 5"}
                                    />
                                    <text
                                        x="35"
                                        y={guide.y + 4}
                                        fill="#94a3b8"
                                        fontSize="11"
                                        textAnchor="end"
                                    >
                                        {Math.round(guide.value)}%
                                    </text>
                                </g>
                            ))}

                            <path d={plot.areaPath} fill={`url(#${gradientId})`} />
                            <path
                                d={plot.linePath}
                                fill="none"
                                stroke="#4f46e5"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            {plot.points.map((point, index) => {
                                const active = selected === index;
                                return (
                                    <g key={`${items[index].equipmentId ?? index}-point`}>
                                        {active && (
                                            <line
                                                x1={point.x}
                                                y1="23"
                                                x2={point.x}
                                                y2="205"
                                                stroke="#a5b4fc"
                                                strokeDasharray="4 5"
                                                strokeWidth="1.5"
                                            />
                                        )}
                                        <circle
                                            cx={point.x}
                                            cy={point.y}
                                            r={active ? "7" : "5"}
                                            fill="white"
                                            stroke="#4f46e5"
                                            strokeWidth={active ? "3.5" : "2.8"}
                                        />
                                        <circle
                                            cx={point.x}
                                            cy={point.y}
                                            r="18"
                                            fill="transparent"
                                            role="button"
                                            tabIndex={0}
                                            aria-label={`${items[index].title}: ${Math.round(items[index].risk)} процентов`}
                                            onMouseEnter={() => setActiveIndex(index)}
                                            onMouseLeave={() => setActiveIndex(null)}
                                            onFocus={() => setActiveIndex(index)}
                                            onBlur={() => setActiveIndex(null)}
                                            onClick={() => items[index].equipmentId != null && navigate(`/equipment/${items[index].equipmentId}`)}
                                            onKeyDown={(event) => {
                                                if ((event.key === "Enter" || event.key === " ") && items[index].equipmentId != null) {
                                                    event.preventDefault();
                                                    navigate(`/equipment/${items[index].equipmentId}`);
                                                }
                                            }}
                                            className="cursor-pointer outline-none"
                                        />
                                        <text
                                            x={point.x}
                                            y="237"
                                            fill={active ? "#4338ca" : "#94a3b8"}
                                            fontWeight={active ? "600" : "400"}
                                            fontSize="11"
                                            textAnchor="middle"
                                        >
                                            {String(index + 1).padStart(2, "0")}
                                        </text>
                                    </g>
                                );
                            })}
                        </svg>
                        {selected != null && (
                            <div
                                className="pointer-events-none absolute z-10 w-[190px] rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xl"
                                style={{
                                    left: `${Math.min(85, Math.max(15, plot.points[selected].x / plot.width * 100))}%`,
                                    top: `${plot.points[selected].y / plot.height * 100}%`,
                                    transform: "translate(-50%, calc(-100% - 12px))",
                                }}
                            >
                                <p className="truncate text-xs font-semibold text-slate-900">
                                    {items[selected].title}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    Вероятность: <span className="font-semibold text-indigo-600">{Math.round(items[selected].risk)}%</span>
                                </p>
                            </div>
                        )}
                    </div>
                    <p className="mt-1 px-1 text-[11px] leading-4 text-slate-400">
                        Точки — разные единицы оборудования, в порядке убывания риска. Это не график по времени.
                    </p>
                </div>

                {/* Compact equipment list, linked to the graph points */}
                <div className="border-t border-slate-100">
                    <div className="flex items-center justify-between px-5 pb-2 pt-4 sm:px-6">
                        <p className="text-xs font-semibold text-slate-700">Оборудование</p>
                        <p className="text-[11px] text-slate-400">Вероятность</p>
                    </div>
                    <div className="px-2 pb-2 sm:px-3">
                        {items.map((item, index) => {
                            const active = selected === index;
                            const navigable = item.equipmentId != null;
                            return (
                                <button
                                    key={`${item.equipmentId ?? item.originalIndex}-${index}`}
                                    type="button"
                                    disabled={!navigable}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    onMouseLeave={() => setActiveIndex(null)}
                                    onFocus={() => setActiveIndex(index)}
                                    onBlur={() => setActiveIndex(null)}
                                    onClick={() => navigate(`/equipment/${item.equipmentId}`)}
                                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors sm:px-3 ${active ? "bg-indigo-50/70" : "hover:bg-slate-50"} disabled:cursor-default`}
                                >
                                    <span className="w-5 shrink-0 text-xs tabular-nums text-slate-400">
                                        {String(index + 1).padStart(2, "0")}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[13px] font-medium text-slate-800">
                                            {item.title}
                                        </span>
                                        <span className="mt-0.5 block text-[11px] text-slate-400">
                                            Отказов: {item.recentFailures ?? 0}
                                        </span>
                                    </span>
                                    <span className={`shrink-0 text-sm font-semibold tabular-nums ${item.risk >= 90 ? "text-rose-600" : "text-slate-700"}`}>
                                        {formatPercent(item.probability)}
                                    </span>
                                    {navigable && <RiArrowRightLine className="hidden shrink-0 text-slate-300 sm:block" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}

// MARK: Typing
function Typing() {
    __useI18nReactive();
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
                        {i18nT("pages.assistant.assistant.assistant.40cbbfd")}
                    </p>
                </div>
            </div>
        </div>
    );
}
