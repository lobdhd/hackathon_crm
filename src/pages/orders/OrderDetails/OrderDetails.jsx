import {
    useMemo,
    useState,
} from "react";

import {
    Link,
    useNavigate,
    useParams,
} from "react-router-dom";

import {
    RiAlarmWarningLine,
    RiArrowLeftLine,
    RiCalendarLine,
    RiCameraLine,
    RiCheckLine,
    RiCloseLine,
    RiDownload2Line,
    RiEditLine,
    RiFileTextLine,
    RiHistoryLine,
    RiLoader4Line,
    RiMessage3Line,
    RiMicFill,
    RiRefreshLine,
    RiSparkling2Line,
    RiTeamLine,
    RiTimeLine,
    RiToolsLine,
    RiUserLine,
    RiUserStarLine,
} from "react-icons/ri";

import GlideSelect from "../../../react-components/GlideSelect/GlideSelect.jsx";

import {
    useAuth,
} from "../../../auth/AuthProvider.jsx";

import {
    resolveWorkOrderAssetUrl,
    uploadWorkOrderFile,
} from "../../../api/workOrders.api.js";

import {
    downloadWorkOrderReportPdf,
} from "../../../api/reports.api.js";

import {
    useExecutors,
    useFaultCodes,
    useMaterials,
} from "../../../hooks/useReferences.js";

import {
    useAddWorkOrderComment,
    useReassignWorkOrder,
    useUpdateWorkOrder,
    useWorkOrder,
    useWorkOrderAction,
    useWorkOrderEvaluation,
} from "../../../hooks/useWorkOrders.js";

import {
    useRecommendExecutors,
} from "../../../hooks/useRecommendations.js";

import {
    useWorkOrderOfflineQueueStatus,
} from "../../../hooks/useWorkOrderOfflineQueue.js";

import {
    useVoiceInput,
} from "../../../hooks/useVoiceInput.js";
import { t as i18nT } from "../../../i18n/index.js";
import { useI18n as __useI18nReactive } from "../../../i18n/index.js";


// MARK: Config

const STATUS_LABELS = {
    ISSUED: "Выдан",
    QUEUED: "В очереди",
    ACCEPTED: "Принят",
    IN_PROGRESS: "В работе",
    PAUSED: "Приостановлен",
    COMPLETED: "Выполнен",
    AI_REVIEW: "На проверке",
    REWORK: "На доработке",
    CLOSED: "Закрыт",
    REJECTED: "Отклонён",
    CANCELLED: "Отменён",
};

const ACTION_LABELS = {
    ACCEPT: "Принять",
    QUEUE: "В очередь",
    REJECT: "Отклонить",
    START: "Начать",
    PAUSE: "Приостановить",
    RESUME: "Продолжить",
    COMPLETE: "Завершить работу",
    SEND_TO_REWORK:
        "На доработку",
    CLOSE: "Закрыть",
    CANCEL: "Отменить",
};

const ALLOWED_ACTIONS = {
    ACCEPT: [
        "ISSUED",
        "QUEUED",
    ],

    QUEUE: [
        "ISSUED",
    ],

    REJECT: [
        "ISSUED",
    ],

    START: [
        "ACCEPTED",
        "QUEUED",
        "REWORK",
    ],

    PAUSE: [
        "IN_PROGRESS",
    ],

    RESUME: [
        "PAUSED",
    ],

    COMPLETE: [
        "IN_PROGRESS",
    ],

    SEND_TO_REWORK: [
        "AI_REVIEW",
    ],

    CLOSE: [
        "AI_REVIEW",
    ],

    CANCEL: [
        "ISSUED",
        "ACCEPTED",
        "QUEUED",
        "IN_PROGRESS",
        "PAUSED",
        "REWORK",
    ],
};

const MASTER_ONLY = [
    "SEND_TO_REWORK",
    "CLOSE",
    "CANCEL",
];

const EDITABLE_STATUSES = [
    "ISSUED",
    "ACCEPTED",
    "QUEUED",
    "IN_PROGRESS",
    "PAUSED",
    "REWORK",
];

const PRIORITY_OPTIONS = () => ([
    {
        value: "EMERGENCY",
        label: i18nT("pages.orders.orderdetails.orderdetails.04a0f08"),
    },
    {
        value: "HIGH",
        label: i18nT("pages.orders.orderdetails.orderdetails.bd12891"),
    },
    {
        value: "NORMAL",
        label: i18nT("pages.orders.orderdetails.orderdetails.cc13e93"),
    },
    {
        value: "PLANNED",
        label: i18nT("pages.orders.orderdetails.orderdetails.1d67544"),
    },
]);

const SCORE_OPTIONS = [
    1,
    2,
    3,
    4,
    5,
].map((value) => ({
    value: String(value),
    label: String(value),
}));

const GLIDE_LIGHT = {
    accentColor: "#2563eb",
    surfaceColor: "#f9fafb",
    highlightColor: "#eff6ff",
    textColor: "#111827",
    radius: 10,
};


// MARK: Helpers

function asArray(value) {
    return Array.isArray(value)
        ? value
        : [];
}

function extractError(error) {
    const data =
        error?.response?.data;

    if (!data) {
        return (
            error?.message ||
            "Не удалось выполнить запрос"
        );
    }

    if (data.details) {
        try {
            const parsed =
                typeof data.details ===
                "string"
                    ? JSON.parse(
                        data.details,
                    )
                    : data.details;

            if (
                Array.isArray(
                    parsed,
                )
            ) {
                const messages =
                    parsed
                        .map(
                            (item) =>
                                item?.message,
                        )
                        .filter(
                            Boolean,
                        );

                if (
                    messages.length
                ) {
                    return messages.join(
                        ". ",
                    );
                }
            }
        } catch {
            return (
                data.error ||
                String(
                    data.details,
                )
            );
        }
    }

    return (
        data.error ||
        "Ошибка запроса"
    );
}

function isOverdue(order) {
    if (
        typeof order?.isOverdue ===
        "boolean"
    ) {
        return order.isOverdue;
    }

    if (!order?.deadline) {
        return false;
    }

    if (
        [
            "CLOSED",
            "CANCELLED",
            "REJECTED",
        ].includes(
            order.status,
        )
    ) {
        return false;
    }

    return (
        new Date(
            order.deadline,
        ).getTime() <
        Date.now()
    );
}

function formatDate(value) {
    if (!value) {
        return "—";
    }

    return new Date(
        value,
    ).toLocaleString(
        "ru-RU",
        {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        },
    );
}

function formatHours(value) {
    const number =
        Number(value);

    return Number.isFinite(
        number,
    )
        ? `${number.toFixed(
            number % 1
                ? 1
                : 0,
        )} ч`
        : "—";
}

function formatMinutes(value) {
    const minutes =
        Number(value);

    if (
        !Number.isFinite(
            minutes,
        )
    ) {
        return "—";
    }

    if (minutes < 60) {
        return `${Math.round(
            minutes,
        )} мин`;
    }

    const hours =
        Math.floor(
            minutes / 60,
        );

    const rest =
        Math.round(
            minutes % 60,
        );

    return rest
        ? `${hours} ч ${rest} мин`
        : `${hours} ч`;
}

function getInitials(
    fullName = "",
) {
    return fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map(
            (word) =>
                word[0],
        )
        .join("")
        .toUpperCase();
}

function availableActions(
    order,
    user,
) {
    if (
        !order ||
        !user
    ) {
        return [];
    }

    if (
        user.role ===
        "MANAGER"
    ) {
        return [];
    }

    const master =
        [
            "MASTER",
            "ADMIN",
        ].includes(
            user.role,
        );

    return Object.keys(
        ALLOWED_ACTIONS,
    ).filter(
        (action) => {
            if (
                !ALLOWED_ACTIONS[
                    action
                ].includes(
                    order.status,
                )
            ) {
                return false;
            }

            if (
                MASTER_ONLY.includes(
                    action,
                )
            ) {
                return master;
            }

            if (master) {
                return true;
            }

            return (
                user.role ===
                    "EXECUTOR" &&
                Number(
                    order.assigneeId,
                ) ===
                    Number(
                        user.id,
                    )
            );
        },
    );
}

function mapOptions(
    items,
    getLabel,
    getTag,
) {
    return items.map(
        (item) => ({
            value:
                String(
                    item.id,
                ),
            label:
                getLabel(item),
            tag:
                getTag?.(item),
        }),
    );
}

function downloadBlob(
    blob,
    filename,
) {
    const url =
        URL.createObjectURL(
            blob,
        );

    const anchor =
        document.createElement(
            "a",
        );

    anchor.href = url;
    anchor.download =
        filename;

    document.body.appendChild(
        anchor,
    );
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(
        url,
    );
}


// MARK: Page

export default function OrderDetails() {
    __useI18nReactive();
    const __i18nLocaleToken = i18nT("sidebar.home");
    const {
        id,
    } = useParams();

    const navigate =
        useNavigate();

    const {
        user,
    } = useAuth();

    const [
        activeTab,
        setActiveTab,
    ] = useState(
        "overview",
    );

    const [
        modal,
        setModal,
    ] = useState(null);

    const [
        pageError,
        setPageError,
    ] = useState("");

    const [
        pageNotice,
        setPageNotice,
    ] = useState("");

    const offlineQueue =
        useWorkOrderOfflineQueueStatus(
            user?.id,
        );

    const orderQuery =
        useWorkOrder(id);

    const reportQuery =
        useWorkOrderEvaluation(
            id,
            {
                enabled:
                    activeTab ===
                    "report",
            },
        );

    const updateMutation =
        useUpdateWorkOrder();

    const reassignMutation =
        useReassignWorkOrder();

    const actionMutation =
        useWorkOrderAction();

    const commentMutation =
        useAddWorkOrderComment();

    const order =
        orderQuery.data;

    const actions =
        useMemo(
            () =>
                availableActions(
                    order,
                    user,
                ),
            [
                order,
                user,
             __i18nLocaleToken],
        );

    const canManage =
        [
            "MASTER",
            "ADMIN",
        ].includes(
            user?.role,
        );

    const canEdit =
        canManage &&
        order &&
        EDITABLE_STATUSES.includes(
            order.status,
        );

    const canDownloadPdf =
        [
            "MASTER",
            "MANAGER",
            "ADMIN",
        ].includes(
            user?.role,
        );

    const overdue =
        isOverdue(
            order,
        );

    async function runSimpleAction(
        action,
        payload = {},
    ) {
        setPageError("");
        setPageNotice("");

        try {
            const result =
                await actionMutation.mutateAsync({
                    id: order.id,
                    payload: {
                        action,
                        clientActionId:
                            crypto.randomUUID(),
                        ...payload,
                    },
                });

            if (
                result?.queuedOffline
            ) {
                setPageNotice(
                    "Нет связи с сервером. Действие сохранено в offline-очередь и будет отправлено после восстановления сети.",
                );
            }

            setModal(null);
        } catch (error) {
            setPageError(
                extractError(
                    error,
                ),
            );

            throw error;
        }
    }

    if (
        orderQuery.isLoading
    ) {
        return (
            <div className="flex min-h-[500px] items-center justify-center">
                <RiLoader4Line
                    size={34}
                    className="animate-spin text-blue-600"
                />
            </div>
        );
    }

    if (
        orderQuery.isError
    ) {
        const status =
            orderQuery.error
                ?.status ??
            orderQuery.error
                ?.response
                ?.status;

        return (
            <div className="mx-auto max-w-4xl py-24 text-center">
                <RiAlarmWarningLine
                    size={38}
                    className="mx-auto text-red-500"
                />

                <h1 className="mt-4 text-2xl font-bold text-gray-900">
                    {status === 404
                        ? i18nT("orderDetails.notFound")
                        : "Не удалось загрузить наряд"}
                </h1>

                <p className="mt-2 text-sm text-gray-500">
                    {extractError(
                        orderQuery.error,
                    )}
                </p>

                <button
                    type="button"
                    onClick={() =>
                        navigate(
                            "/orders",
                        )
                    }
                    className="mt-6 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
                >
                    {i18nT("pages.orders.orderdetails.orderdetails.c06132c")}
                </button>
            </div>
        );
    }

    if (!order) {
        return null;
    }

    const events =
        asArray(
            order.events,
        );

    const materials =
        asArray(
            order.materialUsages,
        );

    const photos =
        asArray(
            order.photos,
        );

    const beforePhotos =
        photos.filter(
            (photo) =>
                photo.type ===
                "BEFORE",
        );

    const afterPhotos =
        photos.filter(
            (photo) =>
                photo.type ===
                "AFTER",
        );

    const comments =
        events.filter(
            (event) =>
                event.action ===
                "COMMENT",
        );

    const tabs = [
        {
            id: "overview",
            title: i18nT("pages.orders.orderdetails.orderdetails.9db9752"),
            icon: RiFileTextLine,
        },
        {
            id: "history",
            title: i18nT("pages.orders.orderdetails.orderdetails.63fb7e1"),
            icon: RiHistoryLine,
            count: events.length,
        },
        {
            id: "report",
            title: i18nT("pages.orders.orderdetails.orderdetails.b25022c"),
            icon: RiSparkling2Line,
        },
    ];

    return (
        <>
            <div className="mx-auto max-w-[1600px]">
                <Link
                    to="/orders"
                    className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-900"
                >
                    <RiArrowLeftLine size={18} />
                    {i18nT("pages.orders.orderdetails.orderdetails.3afeb19")}
                </Link>

                {pageError && (
                    <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        <RiAlarmWarningLine
                            size={19}
                        />
                        {pageError}
                    </div>
                )}

                {pageNotice && (
                    <div className="mb-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        <RiTimeLine
                            size={19}
                            className="mt-0.5 shrink-0"
                        />

                        <span>
                            {pageNotice}
                        </span>
                    </div>
                )}

                {(
                    !offlineQueue.online ||
                    offlineQueue.syncing ||
                    offlineQueue.count > 0
                ) && (
                    <div className={`mb-5 flex items-start gap-3 rounded-xl border p-4 text-sm ${
                        offlineQueue.online
                            ? "border-blue-200 bg-blue-50 text-blue-800"
                            : "border-amber-200 bg-amber-50 text-amber-800"
                    }`}>
                        {offlineQueue.syncing ? (
                            <RiLoader4Line
                                size={19}
                                className="mt-0.5 shrink-0 animate-spin"
                            />
                        ) : (
                            <RiRefreshLine
                                size={19}
                                className="mt-0.5 shrink-0"
                            />
                        )}

                        <div>
                            <p className="font-semibold">
                                {offlineQueue.syncing
                                    ? "Синхронизация offline-действий"
                                    : !offlineQueue.online
                                      ? "Нет сети"
                                      : "Есть действия, ожидающие отправки"}
                            </p>

                            <p className="mt-1 text-xs opacity-80">
                                {offlineQueue.count > 0
                                    ? `В очереди: ${offlineQueue.count}`
                                    : offlineQueue.lastMessage ||
                                      "Проверяем очередь"}
                            </p>
                        </div>
                    </div>
                )}

                {offlineQueue.lastMessage &&
                    [
                        "warning",
                        "error",
                    ].includes(
                        offlineQueue.lastKind,
                    ) && (
                    <div className="mb-5 flex items-start gap-2 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
                        <RiAlarmWarningLine
                            size={19}
                            className="mt-0.5 shrink-0"
                        />

                        {offlineQueue.lastMessage}
                    </div>
                )}

                <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="p-5 md:p-6">
                        <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                                        {order.number}
                                    </h1>

                                    <StatusBadge
                                        status={
                                            order.status
                                        }
                                    />

                                    <PriorityBadge
                                        priority={
                                            order.priority
                                        }
                                    />
                                </div>

                                <h2 className="mt-3 max-w-4xl text-lg font-semibold text-gray-800">
                                    {order.description}
                                </h2>

                                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
                                    <span className="inline-flex items-center gap-1.5">
                                        <RiToolsLine />
                                        {order.equipment
                                            ?.name ||
                                            "Без оборудования"}
                                    </span>

                                    <span className="inline-flex items-center gap-1.5">
                                        <RiUserLine />
                                        {order.assignee
                                            ?.fullName ||
                                            "Без исполнителя"}
                                    </span>

                                    {order.brigade && (
                                        <span className="inline-flex items-center gap-1.5">
                                            <RiTeamLine />
                                            {order.brigade.name}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {canEdit && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setModal({
                                                type: "edit",
                                            })
                                        }
                                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                                    >
                                        <RiEditLine />
                                        {i18nT("pages.orders.orderdetails.orderdetails.47e2436")}
                                    </button>
                                )}

                                {canManage && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setModal({
                                                type: "reassign",
                                            })
                                        }
                                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                                    >
                                        <RiRefreshLine />
                                        {i18nT("pages.orders.orderdetails.orderdetails.7db9467")}
                                    </button>
                                )}
                            </div>
                        </div>

                        {overdue && (
                            <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                                <RiAlarmWarningLine
                                    size={20}
                                    className="text-red-600"
                                />

                                <div>
                                    <p className="text-sm font-semibold text-red-800">
                                        {i18nT("pages.orders.orderdetails.orderdetails.a469b32")}
                                    </p>

                                    <p className="mt-1 text-xs text-red-700">
                                        {i18nT("pages.orders.orderdetails.orderdetails.57390a2")} {formatDate(
                                            order.deadline,
                                        )}
                                    </p>
                                </div>
                            </div>
                        )}

                        {order.aiAssessment
                            ?.needsMasterReview && (
                            <div className="mt-5 flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4">
                                <RiSparkling2Line
                                    size={20}
                                    className="text-violet-600"
                                />

                                <div>
                                    <p className="text-sm font-semibold text-violet-900">
                                        {i18nT("pages.orders.orderdetails.orderdetails.cc2185b")}
                                    </p>

                                    <p className="mt-1 text-xs leading-5 text-violet-700">
                                        {order.aiAssessment
                                            .photoComment ||
                                            order.aiAssessment
                                                .explanation ||
                                            "AI не уверен в результате проверки."}
                                    </p>
                                </div>
                            </div>
                        )}

                        {actions.length > 0 && (
                            <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-5">
                                {actions.map(
                                    (action) => (
                                        <ActionButton
                                            key={action}
                                            action={action}
                                            pending={
                                                actionMutation.isPending
                                            }
                                            onClick={() => {
                                                if (
                                                    [
                                                        "ACCEPT",
                                                        "QUEUE",
                                                        "START",
                                                        "RESUME",
                                                    ].includes(
                                                        action,
                                                    )
                                                ) {
                                                    runSimpleAction(
                                                        action,
                                                    ).catch(
                                                        () => {},
                                                    );
                                                    return;
                                                }

                                                setModal({
                                                    type: "action",
                                                    action,
                                                });
                                            }}
                                        />
                                    ),
                                )}
                            </div>
                        )}
                    </div>

                    <div className="overflow-x-auto border-t border-gray-200">
                        <div className="flex min-w-max px-3">
                            {tabs.map(
                                (tab) => {
                                    const Icon =
                                        tab.icon;
                                    const active =
                                        activeTab ===
                                        tab.id;

                                    return (
                                        <button
                                            type="button"
                                            key={tab.id}
                                            onClick={() =>
                                                setActiveTab(
                                                    tab.id,
                                                )
                                            }
                                            className={`relative flex items-center gap-2 px-4 py-3.5 text-sm font-medium transition ${
                                                active
                                                    ? "text-blue-600"
                                                    : "text-gray-500 hover:text-gray-900"
                                            }`}
                                        >
                                            <Icon size={17} />
                                            {tab.title}

                                            {tab.count !==
                                                undefined && (
                                                <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold">
                                                    {tab.count}
                                                </span>
                                            )}

                                            {active && (
                                                <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-blue-600" />
                                            )}
                                        </button>
                                    );
                                },
                            )}
                        </div>
                    </div>
                </div>

                {activeTab ===
                    "overview" && (
                    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                        <div className="min-w-0 space-y-6">
                            <Section
                                title={i18nT("pages.orders.orderdetails.orderdetails.a7fd9be")}
                                icon={
                                    RiToolsLine
                                }
                            >
                                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                    <InfoItem
                                        label={i18nT("ordersTable.area")}
                                        value={
                                            order.area
                                                ?.name
                                        }
                                    />

                                    <InfoItem
                                        label={i18nT("sidebar.equipment")}
                                        value={
                                            order.equipment
                                                ?.name
                                        }
                                        helper={
                                            order.equipment
                                                ?.inventoryNumber
                                                ? `Инвентарный номер: ${order.equipment.inventoryNumber}`
                                                : null
                                        }
                                    />

                                    <InfoItem
                                        label={i18nT("pages.admin.admin.admin.345805b")}
                                        value={
                                            order.type
                                        }
                                    />

                                    <InfoItem
                                        label={i18nT("pages.admin.admin.admin.63ed571")}
                                        value={
                                            order.normative
                                                ?.name ||
                                            "—"
                                        }
                                        helper={
                                            order.normative
                                                ?.hours
                                                ? `${order.normative.hours} ч`
                                                : null
                                        }
                                    />
                                </div>

                                <div className="my-5 border-t border-gray-100" />

                                <p className="text-xs font-medium text-gray-500">
                                    {i18nT("pages.orders.orderdetails.orderdetails.519ae15")}
                                </p>

                                <p className="mt-2 text-sm leading-6 text-gray-700">
                                    {order.description}
                                </p>

                                {order.comment && (
                                    <>
                                        <div className="my-5 border-t border-gray-100" />

                                        <p className="text-xs font-medium text-gray-500">
                                            {i18nT("pages.orders.orderdetails.orderdetails.70d1da9")}
                                        </p>

                                        <p className="mt-2 text-sm leading-6 text-gray-700">
                                            {order.comment}
                                        </p>
                                    </>
                                )}
                            </Section>

                            <Section
                                title={i18nT("pages.orders.orderdetails.orderdetails.08516b1")}
                                icon={
                                    RiFileTextLine
                                }
                            >
                                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                    <InfoItem
                                        label={i18nT("pages.admin.admin.admin.b88c90e")}
                                        value={
                                            order.faultCode
                                                ? `${order.faultCode.code} — ${order.faultCode.name}`
                                                : "—"
                                        }
                                    />

                                    <InfoItem
                                        label={i18nT("ordersTable.assignee")}
                                        value={
                                            order.assignee
                                                ?.fullName
                                        }
                                    />
                                </div>

                                <div className="my-5 border-t border-gray-100" />

                                <p className="text-xs font-medium text-gray-500">
                                    {i18nT("pages.orders.orderdetails.orderdetails.156a24e")}
                                </p>

                                <p className="mt-2 text-sm leading-6 text-gray-700">
                                    {order.completionText ||
                                        "Отчёт ещё не заполнен"}
                                </p>
                            </Section>

                            <Section
                                title={i18nT("pages.admin.admin.admin.79bfff8")}
                                icon={
                                    RiToolsLine
                                }
                            >
                                <MaterialsTable
                                    items={
                                        materials
                                    }
                                />
                            </Section>

                            <Section
                                title={i18nT("pages.orders.orderdetails.orderdetails.f97030d")}
                                icon={
                                    RiCameraLine
                                }
                            >
                                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                    <PhotoColumn
                                        title={i18nT("pages.orders.orderdetails.orderdetails.a57fcf6")}
                                        photos={
                                            beforePhotos
                                        }
                                    />

                                    <PhotoColumn
                                        title={i18nT("pages.orders.orderdetails.orderdetails.2c998a2")}
                                        photos={
                                            afterPhotos
                                        }
                                    />
                                </div>
                            </Section>

                            <CommentsSection
                                comments={
                                    comments
                                }
                                orderId={
                                    order.id
                                }
                                mutation={
                                    commentMutation
                                }
                                onQueued={() =>
                                    setPageNotice(
                                        "Нет связи с сервером. Комментарий сохранён в offline-очередь и будет отправлен после восстановления сети.",
                                    )
                                }
                            />
                        </div>

                        <aside className="space-y-5">
                            <TimingCard
                                timing={
                                    order.timing
                                }
                            />

                            <Section
                                title={i18nT("pages.orders.orderdetails.orderdetails.8a44424")}
                                icon={
                                    RiCalendarLine
                                }
                            >
                                <div className="space-y-4">
                                    <DateItem
                                        label={i18nT("reportsPage.created")}
                                        value={
                                            order.createdAt
                                        }
                                    />

                                    <DateItem
                                        label={i18nT("status.accepted")}
                                        value={
                                            order.acceptedAt
                                        }
                                    />

                                    <DateItem
                                        label="Начат"
                                        value={
                                            order.startedAt
                                        }
                                    />

                                    <DateItem
                                        label="Выполнен"
                                        value={
                                            order.completedAt
                                        }
                                    />

                                    <DateItem
                                        label={i18nT("status.closed")}
                                        value={
                                            order.closedAt
                                        }
                                    />

                                    <DateItem
                                        label={i18nT("ordersTable.deadline")}
                                        value={
                                            order.deadline
                                        }
                                        danger={
                                            overdue
                                        }
                                    />
                                </div>
                            </Section>

                            <Section
                                title={i18nT("ordersTable.assignee")}
                                icon={
                                    RiUserLine
                                }
                            >
                                {order.assignee ? (
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-sm font-bold text-blue-700">
                                            {getInitials(
                                                order
                                                    .assignee
                                                    .fullName,
                                            )}
                                        </div>

                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-gray-900">
                                                {order
                                                    .assignee
                                                    .fullName}
                                            </p>

                                            <p className="mt-1 truncate text-xs text-gray-500">
                                                {order
                                                    .assignee
                                                    .specialty ||
                                                    "Специальность не указана"}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <EmptyText>
                                        {i18nT("pages.orders.orderdetails.orderdetails.bff171b")}
                                    </EmptyText>
                                )}

                                {order.brigade && (
                                    <div className="mt-4 rounded-lg bg-gray-50 p-3">
                                        <p className="text-xs text-gray-400">
                                            {i18nT("employeeModal.team")}
                                        </p>
                                        <p className="mt-1 text-sm font-semibold text-gray-800">
                                            {order.brigade.name}
                                        </p>
                                    </div>
                                )}
                            </Section>

                            <Section
                                title={i18nT("pages.orders.orderdetails.orderdetails.7c7d054")}
                                icon={
                                    RiUserLine
                                }
                            >
                                <InfoItem
                                    label="Создал наряд"
                                    value={
                                        order.creator
                                            ?.fullName ||
                                        "—"
                                    }
                                />
                            </Section>
                        </aside>
                    </div>
                )}

                {activeTab ===
                    "history" && (
                    <Section
                        title={i18nT("pages.orders.orderdetails.orderdetails.a022a8a")}
                        icon={
                            RiHistoryLine
                        }
                    >
                        <Timeline
                            items={events}
                        />
                    </Section>
                )}

                {activeTab ===
                    "report" && (
                    <EvaluationReport
                        query={
                            reportQuery
                        }
                        order={order}
                        canDownloadPdf={
                            canDownloadPdf
                        }
                    />
                )}
            </div>

            {modal?.type ===
                "edit" && (
                <EditOrderModal
                    order={order}
                    mutation={
                        updateMutation
                    }
                    onClose={() =>
                        setModal(null)
                    }
                />
            )}

            {modal?.type ===
                "reassign" && (
                <ReassignModal
                    order={order}
                    mutation={
                        reassignMutation
                    }
                    onClose={() =>
                        setModal(null)
                    }
                />
            )}

            {modal?.type ===
                "action" &&
                modal.action ===
                    "COMPLETE" && (
                <CompleteModal
                    order={order}
                    mutation={
                        actionMutation
                    }
                    onQueued={() =>
                        setPageNotice(
                            "Завершение сохранено в offline-очередь и будет отправлено после восстановления сети.",
                        )
                    }
                    onClose={() =>
                        setModal(null)
                    }
                />
            )}

            {modal?.type ===
                "action" &&
                modal.action !==
                    "COMPLETE" && (
                <ActionModal
                    order={order}
                    action={
                        modal.action
                    }
                    mutation={
                        actionMutation
                    }
                    onQueued={() =>
                        setPageNotice(
                            "Действие сохранено в offline-очередь и будет отправлено после восстановления сети.",
                        )
                    }
                    onClose={() =>
                        setModal(null)
                    }
                />
            )}
        </>
    );
}


// MARK: Comments

function CommentsSection({
    comments,
    orderId,
    mutation,
    onQueued,
}) {
    __useI18nReactive();
    const [
        comment,
        setComment,
    ] = useState("");

    const [
        error,
        setError,
    ] = useState("");

    async function submit(
        event,
    ) {
        event.preventDefault();

        const value =
            comment.trim();

        if (!value) {
            return;
        }

        setError("");

        try {
            const result =
                await mutation.mutateAsync({
                    id: orderId,
                    comment: value,
                    clientActionId:
                        crypto.randomUUID(),
                });

            if (
                result?.queuedOffline
            ) {
                onQueued?.();
            }

            setComment("");
        } catch (requestError) {
            setError(
                extractError(
                    requestError,
                ),
            );
        }
    }

    return (
        <Section
            title={i18nT("pages.orders.orderdetails.orderdetails.b532166")}
            icon={
                RiMessage3Line
            }
        >
            {error && (
                <div className="mb-4">
                    <ErrorBox
                        text={error}
                    />
                </div>
            )}

            <form
                onSubmit={submit}
                className="mb-5 flex flex-col gap-2 sm:flex-row"
            >
                <input
                    value={comment}
                    onChange={(
                        event,
                    ) =>
                        setComment(
                            event
                                .target
                                .value,
                        )
                    }
                    placeholder={i18nT("pages.orders.orderdetails.orderdetails.fd639c8")}
                    className="input flex-1"
                />

                <button
                    type="submit"
                    disabled={
                        mutation.isPending ||
                        !comment.trim()
                    }
                    className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                    {mutation.isPending
                        ? "Отправляем..."
                        : i18nT("pages.admin.admin.admin.5eba283")}
                </button>
            </form>

            {comments.length > 0 ? (
                <div className="space-y-3">
                    {[...comments]
                        .reverse()
                        .map(
                            (event) => (
                                <div
                                    key={
                                        event.id
                                    }
                                    className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-xs font-semibold text-gray-700">
                                            {event.actor
                                                ?.fullName ||
                                                "Система"}
                                        </p>

                                        <span className="text-[11px] text-gray-400">
                                            {formatDate(
                                                event.createdAt,
                                            )}
                                        </span>
                                    </div>

                                    <p className="mt-2 text-sm leading-6 text-gray-700">
                                        {event.comment}
                                    </p>
                                </div>
                            ),
                        )}
                </div>
            ) : (
                <EmptyText>
                    {i18nT("pages.orders.orderdetails.orderdetails.a1bf1e5")}
                </EmptyText>
            )}
        </Section>
    );
}


// MARK: Evaluation report

function EvaluationReport({
    query,
    order,
    canDownloadPdf,
}) {
    __useI18nReactive();
    const [
        pdfLoading,
        setPdfLoading,
    ] = useState(false);

    const [
        pdfError,
        setPdfError,
    ] = useState("");

    if (query.isLoading) {
        return (
            <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-gray-200 bg-white">
                <RiLoader4Line
                    size={30}
                    className="animate-spin text-blue-600"
                />
            </div>
        );
    }

    if (query.isError) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                {extractError(
                    query.error,
                )}
            </div>
        );
    }

    const report =
        query.data;

    if (!report) {
        return (
            <Section
                title={i18nT("pages.orders.orderdetails.orderdetails.cca4509")}
                icon={
                    RiSparkling2Line
                }
            >
                <EmptyText>
                    {i18nT("pages.orders.orderdetails.orderdetails.cc2cbd6")}
                </EmptyText>
            </Section>
        );
    }

    const assessment =
        order.aiAssessment ?? {};

    const strengths =
        asArray(
            report.strengths ??
                assessment.strengths,
        );

    const improvements =
        asArray(
            report.improvements ??
                assessment.improvements,
        );

    const timing =
        report.timing ??
        order.timing;

    async function downloadPdf() {
        setPdfError("");
        setPdfLoading(true);

        try {
            const blob =
                await downloadWorkOrderReportPdf(
                    order.id,
                );

            downloadBlob(
                blob,
                `${order.number || `order-${order.id}`}.pdf`,
            );
        } catch (error) {
            setPdfError(
                extractError(
                    error,
                ),
            );
        } finally {
            setPdfLoading(false);
        }
    }

    return (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
                <Section
                    title={i18nT("pages.orders.orderdetails.orderdetails.8a9901b")}
                    icon={
                        RiSparkling2Line
                    }
                >
                    {pdfError && (
                        <div className="mb-4">
                            <ErrorBox
                                text={
                                    pdfError
                                }
                            />
                        </div>
                    )}

                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                        <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-4">
                            <ScoreBox
                                label="Итог"
                                value={
                                    report.finalScore ??
                                    assessment.masterScore ??
                                    assessment.score
                                }
                            />

                            <ScoreBox
                                label="AI"
                                value={
                                    report.aiScore ??
                                    assessment.score
                                }
                            />

                            <ScoreBox
                                label={i18nT("pages.admin.admin.admin.2bb1fb2")}
                                value={
                                    report.masterScore ??
                                    assessment.masterScore
                                }
                            />

                            <ScoreBox
                                label="Аудитория"
                                value={
                                    report.audience ||
                                    "—"
                                }
                            />
                        </div>

                        {canDownloadPdf && (
                            <button
                                type="button"
                                onClick={
                                    downloadPdf
                                }
                                disabled={
                                    pdfLoading
                                }
                                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700 disabled:opacity-50"
                            >
                                {pdfLoading ? (
                                    <RiLoader4Line className="animate-spin" />
                                ) : (
                                    <RiDownload2Line />
                                )}
                                PDF
                            </button>
                        )}
                    </div>

                    <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <p className="text-xs font-semibold text-gray-500">
                            {i18nT("pages.orders.orderdetails.orderdetails.c842322")}
                        </p>

                        <p className="mt-2 text-sm font-bold text-gray-900">
                            {report.verdict ||
                                assessment.verdict ||
                                "—"}
                        </p>

                        <p className="mt-2 text-sm leading-6 text-gray-600">
                            {report.explanation ||
                                assessment.explanation ||
                                "Пояснение отсутствует"}
                        </p>
                    </div>

                    {strengths.length > 0 && (
                        <AiList
                            title={i18nT("pages.orders.orderdetails.orderdetails.923a1a9")}
                            items={
                                strengths
                            }
                            tone="green"
                        />
                    )}

                    {improvements.length > 0 && (
                        <AiList
                            title={i18nT("pages.orders.orderdetails.orderdetails.f3344d2")}
                            items={
                                improvements
                            }
                            tone="violet"
                        />
                    )}
                </Section>

                {(report.masterComment ||
                    report.photoComment ||
                    assessment.masterComment ||
                    assessment.photoComment) && (
                    <Section
                        title={i18nT("pages.orders.orderdetails.orderdetails.f6e1d95")}
                        icon={
                            RiMessage3Line
                        }
                    >
                        <div className="space-y-4">
                            <InfoItem
                                label="Комментарий мастера"
                                value={
                                    report.masterComment ??
                                    assessment.masterComment ??
                                    "—"
                                }
                            />

                            <InfoItem
                                label="Комментарий по фото"
                                value={
                                    report.photoComment ??
                                    assessment.photoComment ??
                                    "—"
                                }
                            />
                        </div>
                    </Section>
                )}

                {asArray(
                    report.chronology,
                ).length > 0 && (
                    <Section
                        title={i18nT("pages.orders.orderdetails.orderdetails.fef377b")}
                        icon={
                            RiHistoryLine
                        }
                    >
                        <ReportChronology
                            items={
                                report.chronology
                            }
                        />
                    </Section>
                )}
            </div>

            <aside className="space-y-5">
                <TimingCard
                    timing={timing}
                />

                <Section
                    title={i18nT("pages.orders.orderdetails.orderdetails.d86de0f")}
                    icon={
                        RiSparkling2Line
                    }
                >
                    <AiAssessmentCompact
                        assessment={
                            assessment
                        }
                    />
                </Section>
            </aside>
        </div>
    );
}

function ReportChronology({
    items,
}) {
    return (
        <div className="space-y-3">
            {asArray(items).map(
                (item, index) => (
                    <div
                        key={`${item.at}-${item.action}-${index}`}
                        className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                    >
                        <div className="flex flex-wrap justify-between gap-2">
                            <p className="text-xs font-bold text-gray-800">
                                {item.action}
                            </p>
                            <span className="text-[11px] text-gray-400">
                                {formatDate(
                                    item.at,
                                )}
                            </span>
                        </div>

                        <p className="mt-1 text-xs text-gray-500">
                            {typeof item.actor ===
                            "string"
                                ? item.actor
                                : item.actor
                                    ?.fullName ||
                                  "Система"}
                        </p>

                        {(item.from ||
                            item.to) && (
                            <p className="mt-2 text-xs text-gray-600">
                                {item.from ||
                                    "—"}{" "}
                                →{" "}
                                {item.to ||
                                    "—"}
                            </p>
                        )}

                        {item.comment && (
                            <p className="mt-2 text-sm text-gray-700">
                                {item.comment}
                            </p>
                        )}
                    </div>
                ),
            )}
        </div>
    );
}


// MARK: Edit

function EditOrderModal({
    order,
    mutation,
    onClose,
}) {
    __useI18nReactive();
    const [
        form,
        setForm,
    ] = useState({
        priority:
            order.priority,
        deadline:
            order.deadline
                ? new Date(
                    order.deadline,
                )
                    .toISOString()
                    .slice(
                        0,
                        16,
                    )
                : "",
        comment:
            order.comment ||
            "",
    });

    const [
        error,
        setError,
    ] = useState("");

    async function submit(
        event,
    ) {
        event.preventDefault();

        try {
            await mutation.mutateAsync({
                id: order.id,
                payload: {
                    priority:
                        form.priority,
                    deadline:
                        form.deadline
                            ? new Date(
                                form.deadline,
                            ).toISOString()
                            : null,
                    comment:
                        form.comment,
                },
            });

            onClose();
        } catch (requestError) {
            setError(
                extractError(
                    requestError,
                ),
            );
        }
    }

    return (
        <Modal
            title={i18nT("pages.orders.orderdetails.orderdetails.adcc1a1")}
            onClose={onClose}
        >
            <form
                onSubmit={submit}
                className="space-y-4"
            >
                {error && (
                    <ErrorBox
                        text={error}
                    />
                )}

                <Field label={i18nT("orderModal.priority")}>
                    <FieldSelect
                        value={
                            form.priority
                        }
                        onChange={(value) =>
                            setForm(
                                (previous) => ({
                                    ...previous,
                                    priority:
                                        value,
                                }),
                            )
                        }
                        options={
                            PRIORITY_OPTIONS()
                        }
                        ariaLabel="Приоритет"
                    />
                </Field>

                <Field label={i18nT("ordersTable.deadline")}>
                    <input
                        type="datetime-local"
                        value={
                            form.deadline
                        }
                        onChange={(
                            event,
                        ) =>
                            setForm(
                                (previous) => ({
                                    ...previous,
                                    deadline:
                                        event
                                            .target
                                            .value,
                                }),
                            )
                        }
                        className="input"
                    />
                </Field>

                <Field label={i18nT("orderModal.comment")}>
                    <textarea
                        rows={4}
                        value={
                            form.comment
                        }
                        onChange={(
                            event,
                        ) =>
                            setForm(
                                (previous) => ({
                                    ...previous,
                                    comment:
                                        event
                                            .target
                                            .value,
                                }),
                            )
                        }
                        className="input min-h-[100px] resize-none py-3"
                    />
                </Field>

                <ModalFooter
                    onClose={onClose}
                    pending={
                        mutation.isPending
                    }
                    text={i18nT("pages.admin.admin.admin.74ea58b")}
                />
            </form>
        </Modal>
    );
}


// MARK: Reassign

function ReassignModal({
    order,
    mutation,
    onClose,
}) {
    __useI18nReactive();
    const executorsQuery =
        useExecutors();

    const recommendation =
        useRecommendExecutors();

    const [
        assigneeId,
        setAssigneeId,
    ] = useState(
        order.assigneeId
            ? String(
                order.assigneeId,
            )
            : "",
    );

    const [
        error,
        setError,
    ] = useState("");

    const executors =
        asArray(
            executorsQuery.data,
        );

    const suggested =
        asArray(
            recommendation.data,
        );

    async function loadRecommendations() {
        setError("");

        try {
            await recommendation.mutateAsync({
                equipmentId:
                    order.equipmentId,
                description:
                    order.description,
                brigadeId:
                    order.brigadeId ||
                    undefined,
                faultCodeId:
                    order.faultCodeId ||
                    undefined,
            });
        } catch (requestError) {
            setError(
                extractError(
                    requestError,
                ),
            );
        }
    }

    async function submit(
        event,
    ) {
        event.preventDefault();

        if (!assigneeId) {
            setError(
                "Выберите исполнителя",
            );
            return;
        }

        try {
            await mutation.mutateAsync({
                id: order.id,
                assigneeId:
                    Number(
                        assigneeId,
                    ),
            });

            onClose();
        } catch (requestError) {
            setError(
                extractError(
                    requestError,
                ),
            );
        }
    }

    return (
        <Modal
            title={i18nT("pages.orders.orderdetails.orderdetails.2ec6c58")}
            onClose={onClose}
            width="720px"
        >
            <form
                onSubmit={submit}
                className="space-y-4"
            >
                {error && (
                    <ErrorBox
                        text={error}
                    />
                )}

                <Field label={i18nT("ordersTable.assignee")}>
                    <FieldSelect
                        value={
                            assigneeId
                        }
                        onChange={
                            setAssigneeId
                        }
                        options={[
                            {
                                value: "",
                                label: i18nT("pages.orders.orderdetails.orderdetails.ed773b2"),
                            },
                            ...mapOptions(
                                executors,
                                (item) =>
                                    item.fullName,
                                (item) =>
                                    item.statusText ||
                                    item.specialty,
                            ),
                        ]}
                        menuWidth={360}
                        ariaLabel="Исполнитель"
                    />
                </Field>

                <button
                    type="button"
                    onClick={
                        loadRecommendations
                    }
                    disabled={
                        recommendation.isPending
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 disabled:opacity-50"
                >
                    {recommendation.isPending ? (
                        <RiLoader4Line className="animate-spin" />
                    ) : (
                        <RiUserStarLine />
                    )}
                    {i18nT("pages.orders.orderdetails.orderdetails.cb68c9f")}
                </button>

                {suggested.length > 0 && (
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        {suggested
                            .slice(
                                0,
                                6,
                            )
                            .map(
                                (item) => (
                                    <button
                                        key={
                                            item.id
                                        }
                                        type="button"
                                        onClick={() =>
                                            setAssigneeId(
                                                String(
                                                    item.id,
                                                ),
                                            )
                                        }
                                        className={`rounded-xl border p-3 text-left ${
                                            String(
                                                item.id,
                                            ) ===
                                            String(
                                                assigneeId,
                                            )
                                                ? "border-blue-400 bg-blue-50"
                                                : "border-gray-200 bg-white"
                                        }`}
                                    >
                                        <p className="text-sm font-semibold text-gray-900">
                                            {item.fullName}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-500">
                                            {item.specialty ||
                                                "—"} {i18nT("pages.orders.orderdetails.orderdetails.e1a0e0b")} {item.queue ?? 0} {i18nT("pages.orders.orderdetails.orderdetails.148c880")} {Number(
                                                item.score ||
                                                    0,
                                            ).toFixed(
                                                1,
                                            )}
                                        </p>
                                    </button>
                                ),
                            )}
                    </div>
                )}

                <ModalFooter
                    onClose={onClose}
                    pending={
                        mutation.isPending
                    }
                    text={i18nT("pages.orders.orderdetails.orderdetails.7db9467")}
                />
            </form>
        </Modal>
    );
}


// MARK: Action modal

function ActionModal({
    order,
    action,
    mutation,
    onQueued,
    onClose,
}) {
    __useI18nReactive();
    const [
        comment,
        setComment,
    ] = useState("");

    const [
        masterScore,
        setMasterScore,
    ] = useState("5");

    const [
        downtime,
        setDowntime,
    ] = useState("");

    const [
        error,
        setError,
    ] = useState("");

    const requiredComment =
        [
            "REJECT",
            "PAUSE",
        ].includes(
            action,
        );

    async function submit(
        event,
    ) {
        event.preventDefault();

        if (
            requiredComment &&
            !comment.trim()
        ) {
            setError(
                "Укажите причину",
            );
            return;
        }

        const payload = {
            action,
            clientActionId:
                crypto.randomUUID(),
        };

        if (
            comment.trim()
        ) {
            payload.comment =
                comment.trim();
        }

        if (
            action ===
            "CLOSE"
        ) {
            payload.masterScore =
                Number(
                    masterScore,
                );

            if (downtime) {
                payload.actualDowntimeMinutes =
                    Number(
                        downtime,
                    );
            }
        }

        try {
            const result =
                await mutation.mutateAsync({
                    id: order.id,
                    payload,
                });

            if (
                result?.queuedOffline
            ) {
                onQueued?.();
            }

            onClose();
        } catch (requestError) {
            setError(
                extractError(
                    requestError,
                ),
            );
        }
    }

    return (
        <Modal
            title={
                ACTION_LABELS[
                    action
                ]
            }
            onClose={onClose}
        >
            <form
                onSubmit={submit}
                className="space-y-4"
            >
                {error && (
                    <ErrorBox
                        text={error}
                    />
                )}

                {action ===
                    "CLOSE" && (
                    <>
                        <Field label="Оценка мастера">
                            <FieldSelect
                                value={
                                    masterScore
                                }
                                onChange={
                                    setMasterScore
                                }
                                options={
                                    SCORE_OPTIONS
                                }
                                ariaLabel="Оценка мастера"
                            />
                        </Field>

                        <Field label="Фактический простой, мин.">
                            <input
                                type="number"
                                min="0"
                                value={
                                    downtime
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setDowntime(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                className="input"
                            />
                        </Field>
                    </>
                )}

                <Field
                    label={
                        requiredComment
                            ? "Причина"
                            : i18nT("orderModal.comment")
                    }
                >
                    <textarea
                        value={comment}
                        onChange={(
                            event,
                        ) =>
                            setComment(
                                event
                                    .target
                                    .value,
                            )
                        }
                        rows={4}
                        className="input min-h-[100px] resize-none py-3"
                    />
                </Field>

                <ModalFooter
                    onClose={onClose}
                    pending={
                        mutation.isPending
                    }
                    text={
                        ACTION_LABELS[
                            action
                        ]
                    }
                />
            </form>
        </Modal>
    );
}


// MARK: Complete modal

function CompleteModal({
    order,
    mutation,
    onQueued,
    onClose,
}) {
    __useI18nReactive();
    const faultCodesQuery =
        useFaultCodes();

    const materialsQuery =
        useMaterials();

    const [
        completionText,
        setCompletionText,
    ] = useState("");

    const [
        faultCodeId,
        setFaultCodeId,
    ] = useState("");

    const [
        files,
        setFiles,
    ] = useState([]);

    const [
        rows,
        setRows,
    ] = useState([]);

    const [
        error,
        setError,
    ] = useState("");

    const faultCodes =
        asArray(
            faultCodesQuery.data,
        );

    const materials =
        asArray(
            materialsQuery.data,
        );

    function addMaterial() {
        setRows(
            (previous) => [
                ...previous,
                {
                    id:
                        crypto.randomUUID(),
                    materialId:
                        "",
                    quantity: "",
                },
            ],
        );
    }

    function updateMaterial(
        id,
        field,
        value,
    ) {
        setRows(
            (previous) =>
                previous.map(
                    (row) =>
                        row.id === id
                            ? {
                                ...row,
                                [field]:
                                    value,
                            }
                            : row,
                ),
        );
    }

    function removeMaterial(
        id,
    ) {
        setRows(
            (previous) =>
                previous.filter(
                    (row) =>
                        row.id !==
                        id,
                ),
        );
    }

    async function submit(
        event,
    ) {
        event.preventDefault();
        setError("");

        if (
            !completionText.trim()
        ) {
            setError(
                "Опишите выполненные работы и проверку результата",
            );
            return;
        }

        if (!faultCodeId) {
            setError(
                "Выберите шифр неисправности",
            );
            return;
        }

        if (
            order.type ===
                "EMERGENCY" &&
            files.length === 0
        ) {
            setError(
                "Для аварийного наряда добавьте хотя бы одно фото после выполнения",
            );
            return;
        }

        if (
            files.length > 0 &&
            typeof navigator !==
                "undefined" &&
            navigator.onLine ===
                false
        ) {
            setError(
                "Для завершения с фото сначала восстановите интернет. Файлы не сохраняются в offline-очередь.",
            );
            return;
        }

        try {
            const afterPhotoUrls =
                [];

            for (
                const file of files
            ) {
                if (
                    file.size >
                    15 *
                        1024 *
                        1024
                ) {
                    throw new Error(
                        `Файл ${file.name} больше 15 МБ`,
                    );
                }

                const uploaded =
                    await uploadWorkOrderFile(
                        file,
                    );

                afterPhotoUrls.push(
                    uploaded.url,
                );
            }

            const materialPayload =
                rows
                    .filter(
                        (row) =>
                            row.materialId &&
                            row.quantity,
                    )
                    .map(
                        (row) => ({
                            materialId:
                                Number(
                                    row.materialId,
                                ),
                            quantity:
                                Number(
                                    row.quantity,
                                ),
                        }),
                    );

            const result =
                await mutation.mutateAsync({
                    id: order.id,
                    payload: {
                        action:
                            "COMPLETE",
                        completionText:
                            completionText.trim(),
                        faultCodeId:
                            Number(
                                faultCodeId,
                            ),
                        afterPhotoUrls,
                        materials:
                            materialPayload,
                        clientActionId:
                            crypto.randomUUID(),
                    },
                });

            if (
                result?.queuedOffline
            ) {
                onQueued?.();
            }

            onClose();
        } catch (requestError) {
            setError(
                extractError(
                    requestError,
                ),
            );
        }
    }

    return (
        <Modal
            title={i18nT("pages.orders.orderdetails.orderdetails.a5870b2")}
            width="820px"
            onClose={onClose}
        >
            <form
                onSubmit={submit}
                className="space-y-5"
            >
                {error && (
                    <ErrorBox
                        text={error}
                    />
                )}

                {mutation.isPending && (
                    <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                        <div className="flex items-center gap-3">
                            <RiLoader4Line
                                className="animate-spin text-violet-600"
                                size={22}
                            />

                            <div>
                                <p className="text-sm font-semibold text-violet-900">
                                    {i18nT("pages.orders.orderdetails.orderdetails.9c2cdd0")}
                                </p>

                                <p className="mt-1 text-xs text-violet-700">
                                    {i18nT("pages.orders.orderdetails.orderdetails.a48e6a9")}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <Field label="Что выполнено и как проверено">
                    <div className="relative">
                        <textarea
                            value={
                                completionText
                            }
                            onChange={(
                                event,
                            ) =>
                                setCompletionText(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            rows={5}
                            minLength={3}
                            required
                            placeholder={i18nT("pages.orders.orderdetails.orderdetails.bf23715")}
                            className="input min-h-[138px] resize-none py-3 pb-14 pr-16"
                        />

                        <CompletionVoiceInput
                            disabled={
                                mutation.isPending
                            }
                            onText={(
                                recognizedText,
                            ) =>
                                setCompletionText(
                                    (previous) =>
                                        [
                                            previous.trim(),
                                            recognizedText,
                                        ]
                                            .filter(
                                                Boolean,
                                            )
                                            .join(
                                                " ",
                                            ),
                                )
                            }
                            onError={
                                setError
                            }
                        />
                    </div>

                    <p className="mt-2 text-[11px] text-gray-400">
                        {i18nT("pages.orders.orderdetails.orderdetails.b5b5341")}
                    </p>
                </Field>

                <Field label={i18nT("pages.admin.admin.admin.b88c90e")}>
                    <FieldSelect
                        value={
                            faultCodeId
                        }
                        onChange={
                            setFaultCodeId
                        }
                        options={[
                            {
                                value: "",
                                label: i18nT("pages.orders.orderdetails.orderdetails.aa7140b"),
                            },
                            ...mapOptions(
                                faultCodes,
                                (item) =>
                                    `${item.code} — ${item.name}`,
                                (item) =>
                                    item.category,
                            ),
                        ]}
                        menuWidth={430}
                        ariaLabel="Шифр неисправности"
                    />
                </Field>

                <Field label="Фото после выполнения">
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(
                            event,
                        ) =>
                            setFiles(
                                Array.from(
                                    event
                                        .target
                                        .files ||
                                        [],
                                ).slice(
                                    0,
                                    5,
                                ),
                            )
                        }
                        className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm"
                    />

                    {files.length > 0 && (
                        <p className="mt-2 text-xs text-gray-500">
                            {i18nT("pages.orders.orderdetails.orderdetails.5a1b889")} {files.length}
                        </p>
                    )}
                </Field>

                <div className="rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between border-b border-gray-200 p-4">
                        <div>
                            <p className="text-sm font-semibold text-gray-900">
                                {i18nT("pages.admin.admin.admin.79bfff8")}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                                {i18nT("pages.orders.orderdetails.orderdetails.06706d1")}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={
                                addMaterial
                            }
                            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold"
                        >
                            {i18nT("pages.admin.admin.admin.5eba283")}
                        </button>
                    </div>

                    <div className="space-y-2 p-4">
                        {rows.length === 0 ? (
                            <p className="py-4 text-center text-xs text-gray-400">
                                {i18nT("pages.admin.admin.admin.6eeaa86")}
                            </p>
                        ) : (
                            rows.map(
                                (row) => (
                                    <div
                                        key={row.id}
                                        className="grid grid-cols-[minmax(0,1fr)_140px_40px] gap-2"
                                    >
                                        <FieldSelect
                                            value={
                                                row.materialId
                                            }
                                            onChange={(value) =>
                                                updateMaterial(
                                                    row.id,
                                                    "materialId",
                                                    value,
                                                )
                                            }
                                            options={[
                                                {
                                                    value: "",
                                                    label: i18nT("orderDetails.material"),
                                                },
                                                ...mapOptions(
                                                    materials,
                                                    (material) =>
                                                        material.name,
                                                    (material) =>
                                                        material.unit,
                                                ),
                                            ]}
                                            menuWidth={350}
                                            ariaLabel="Материал"
                                        />

                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={
                                                row.quantity
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                updateMaterial(
                                                    row.id,
                                                    "quantity",
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                            placeholder={i18nT("pages.orders.orderdetails.orderdetails.302e2bd")}
                                            className="input"
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeMaterial(
                                                    row.id,
                                                )
                                            }
                                            className="rounded-lg border border-red-200 text-red-600"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ),
                            )
                        )}
                    </div>
                </div>

                <ModalFooter
                    onClose={onClose}
                    pending={
                        mutation.isPending
                    }
                    text="Завершить"
                />
            </form>
        </Modal>
    );
}


// MARK: Completion voice

function CompletionVoiceInput({
    onText,
    onError,
    disabled = false,
}) {
    __useI18nReactive();
    const {
        recording,
        transcribing,
        startRecording,
        stopRecording,
        cancelRecording,
    } = useVoiceInput({
        disabled,

        onError,

        onText: (
            recognizedText,
        ) => {
            const text =
                String(
                    recognizedText ??
                    "",
                ).trim();

            if (text) {
                onText?.(
                    text,
                );
            }
        },
    });

    if (recording) {
        return (
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full border border-red-200 bg-white p-1 shadow-sm">
                <div className="flex items-center gap-1.5 px-2 text-[11px] font-semibold text-red-600">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />

                    {i18nT("pages.orders.orderdetails.orderdetails.c805385")}
                </div>

                <button
                    type="button"
                    onClick={
                        cancelRecording
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                    title={i18nT("components.assistantinput.assistantpromptinput.0ddca6e")}
                >
                    <RiCloseLine
                        size={17}
                    />
                </button>

                <button
                    type="button"
                    onClick={
                        stopRecording
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700"
                    title={i18nT("components.assistantinput.assistantpromptinput.ef46d22")}
                >
                    <RiCheckLine
                        size={17}
                    />
                </button>
            </div>
        );
    }

    if (transcribing) {
        return (
            <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-2 text-[11px] font-semibold text-blue-600 shadow-sm">
                <RiLoader4Line
                    size={15}
                    className="animate-spin"
                />

                {i18nT("pages.orders.orderdetails.orderdetails.449d483")}
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={
                startRecording
            }
            disabled={
                disabled
            }
            className="
                absolute
                bottom-3
                right-3
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-full
                border
                border-gray-200
                bg-white
                text-gray-500
                shadow-sm
                transition
                hover:border-blue-200
                hover:bg-blue-50
                hover:text-blue-600
                active:scale-95
                disabled:cursor-not-allowed
                disabled:opacity-40
            "
            title={i18nT("pages.orders.orderdetails.orderdetails.faadf56")}
        >
            <RiMicFill
                size={17}
            />
        </button>
    );
}


// MARK: Timing

function TimingCard({
    timing,
}) {
    __useI18nReactive();
    return (
        <Section
            title={i18nT("pages.orders.orderdetails.orderdetails.5e59c19")}
            icon={
                RiTimeLine
            }
        >
            {!timing ? (
                <EmptyText>
                    {i18nT("pages.orders.orderdetails.orderdetails.db31199")}
                </EmptyText>
            ) : (
                <div className="space-y-4">
                    <TimingRow
                        label={i18nT("pages.admin.admin.admin.63ed571")}
                        value={formatHours(
                            timing.normativeHours,
                        )}
                    />

                    <TimingRow
                        label="Фактически"
                        value={formatHours(
                            timing.actualHours,
                        )}
                    />

                    <TimingRow
                        label="К нормативу"
                        value={
                            timing.vsNormativePercent !=
                            null
                                ? `${Number(
                                    timing.vsNormativePercent,
                                ).toFixed(
                                    0,
                                )}%`
                                : "—"
                        }
                        danger={
                            Number(
                                timing.vsNormativePercent,
                            ) > 100
                        }
                    />

                    <TimingRow
                        label="Срок соблюдён"
                        value={
                            timing.deadlineMet ===
                            null ||
                            timing.deadlineMet ===
                            undefined
                                ? "Ещё не определено"
                                : timing.deadlineMet
                                  ? "Да"
                                  : "Нет"
                        }
                        danger={
                            timing.deadlineMet ===
                            false
                        }
                    />

                    <TimingRow
                        label="Просрочка"
                        value={formatMinutes(
                            timing.overdueMinutes,
                        )}
                        danger={
                            Number(
                                timing.overdueMinutes,
                            ) > 0
                        }
                    />
                </div>
            )}
        </Section>
    );
}

function TimingRow({
    label,
    value,
    danger = false,
}) {
    return (
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
            <span className="text-xs text-gray-500">
                {label}
            </span>

            <span
                className={`text-sm font-semibold ${
                    danger
                        ? "text-red-600"
                        : "text-gray-900"
                }`}
            >
                {value}
            </span>
        </div>
    );
}


// MARK: AI compact

function AiAssessmentCompact({
    assessment,
}) {
    __useI18nReactive();
    if (!assessment) {
        return (
            <EmptyText>
                {i18nT("pages.orders.orderdetails.orderdetails.809b869")}
            </EmptyText>
        );
    }

    return (
        <div>
            {assessment.needsMasterReview && (
                <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50 p-3 text-xs font-semibold text-violet-800">
                    {i18nT("pages.orders.orderdetails.orderdetails.cc2185b")}
                </div>
            )}

            <div className="grid grid-cols-2 gap-2">
                <ScoreBox
                    label="AI"
                    value={
                        assessment.score
                    }
                />

                <ScoreBox
                    label="Фото"
                    value={
                        assessment.photoScore
                    }
                />

                <ScoreBox
                    label={i18nT("pages.admin.admin.admin.2bb1fb2")}
                    value={
                        assessment.masterScore
                    }
                />

                <ScoreBox
                    label="Уверенность"
                    value={
                        assessment.confidence !=
                        null
                            ? `${Math.round(
                                Number(
                                    assessment.confidence,
                                ) * 100,
                            )}%`
                            : "—"
                    }
                />
            </div>
        </div>
    );
}


// MARK: Timeline

function Timeline({
    items,
}) {
    __useI18nReactive();
    if (!items.length) {
        return (
            <EmptyText>
                {i18nT("pages.equipment.equipmentdetails.equipmentdetails.32d2955")}
            </EmptyText>
        );
    }

    return (
        <div className="space-y-4">
            {items.map(
                (event, index) => (
                    <div
                        key={event.id}
                        className="relative flex gap-4"
                    >
                        {index <
                            items.length -
                                1 && (
                            <div className="absolute left-[17px] top-9 h-[calc(100%+8px)] w-px bg-gray-200" />
                        )}

                        <div className="relative z-10 mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-600">
                            <RiHistoryLine />
                        </div>

                        <div className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {event.action}
                                    </p>

                                    <p className="mt-1 text-xs text-gray-500">
                                        {event.actor
                                            ?.fullName ||
                                            "Система"}
                                    </p>
                                </div>

                                <span className="text-xs text-gray-400">
                                    {formatDate(
                                        event.createdAt,
                                    )}
                                </span>
                            </div>

                            {(event.fromStatus ||
                                event.toStatus) && (
                                <p className="mt-3 text-xs text-gray-600">
                                    {event.fromStatus ||
                                        "—"}{" "}
                                    →{" "}
                                    {event.toStatus ||
                                        "—"}
                                </p>
                            )}

                            {event.comment && (
                                <p className="mt-3 text-sm text-gray-700">
                                    {event.comment}
                                </p>
                            )}
                        </div>
                    </div>
                ),
            )}
        </div>
    );
}


// MARK: Materials

function MaterialsTable({
    items,
}) {
    __useI18nReactive();
    if (!items.length) {
        return (
            <EmptyText>
                {i18nT("pages.orders.orderdetails.orderdetails.548458e")}
            </EmptyText>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left">
                <thead>
                    <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400">
                        <th className="pb-3 font-semibold">
                            {i18nT("orderDetails.material")}
                        </th>
                        <th className="pb-3 font-semibold">
                            {i18nT("orderDetails.quantity")}
                        </th>
                        <th className="pb-3 font-semibold">
                            {i18nT("orderDetails.unit")}
                        </th>
                    </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                    {items.map(
                        (usage, index) => (
                            <tr
                                key={
                                    usage.id ||
                                    `${usage.materialId}-${index}`
                                }
                            >
                                <td className="py-4 text-sm font-medium text-gray-900">
                                    {usage.material
                                        ?.name ||
                                        "—"}
                                </td>

                                <td className="py-4 text-sm text-gray-600">
                                    {usage.quantity}
                                </td>

                                <td className="py-4 text-sm text-gray-600">
                                    {usage.material
                                        ?.unit ||
                                        "—"}
                                </td>
                            </tr>
                        ),
                    )}
                </tbody>
            </table>
        </div>
    );
}


// MARK: Photos

function PhotoColumn({
    title,
    photos,
}) {
    __useI18nReactive();
    return (
        <div>
            <p className="mb-3 text-sm font-semibold text-gray-800">
                {title}
            </p>

            {photos.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                    {photos.map(
                        (photo) => (
                            <a
                                key={
                                    photo.id
                                }
                                href={resolveWorkOrderAssetUrl(
                                    photo.fileUrl,
                                )}
                                target="_blank"
                                rel="noreferrer"
                                className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100"
                            >
                                <img
                                    src={resolveWorkOrderAssetUrl(
                                        photo.fileUrl,
                                    )}
                                    alt={title}
                                    className="aspect-[4/3] h-full w-full object-cover"
                                />
                            </a>
                        ),
                    )}
                </div>
            ) : (
                <div className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50">
                    <RiCameraLine
                        size={28}
                        className="text-gray-300"
                    />

                    <p className="text-xs text-gray-400">
                        {i18nT("pages.orders.orderdetails.orderdetails.8a757c0")}
                    </p>
                </div>
            )}
        </div>
    );
}


// MARK: Select

function FieldSelect({
    ...props
}) {
    return (
        <GlideSelect
            {...GLIDE_LIGHT}
            {...props}
            size="lg"
            className="glide-select--field"
            showTags
        />
    );
}


// MARK: UI

function Section({
    title,
    icon: Icon,
    children,
}) {
    return (
        <section className="overflow-visible rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
                <h3 className="text-[15px] font-semibold text-gray-900">
                    {title}
                </h3>

                {Icon && (
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <Icon size={18} />
                    </div>
                )}
            </div>

            <div className="p-5">
                {children}
            </div>
        </section>
    );
}

function InfoItem({
    label,
    value,
    helper,
}) {
    return (
        <div>
            <p className="text-xs font-medium text-gray-500">
                {label}
            </p>

            <p className="mt-2 text-sm font-semibold text-gray-900">
                {value || "—"}
            </p>

            {helper && (
                <p className="mt-1 text-xs text-gray-400">
                    {helper}
                </p>
            )}
        </div>
    );
}

function DateItem({
    label,
    value,
    danger = false,
}) {
    return (
        <div>
            <p className="text-xs text-gray-500">
                {label}
            </p>

            <p
                className={`mt-1 text-sm font-semibold ${
                    danger
                        ? "text-red-600"
                        : "text-gray-900"
                }`}
            >
                {formatDate(value)}
            </p>
        </div>
    );
}

function StatusBadge({
    status,
}) {
    const styles = {
        ISSUED:
            "bg-blue-50 text-blue-700",
        QUEUED:
            "bg-slate-100 text-slate-700",
        ACCEPTED:
            "bg-indigo-50 text-indigo-700",
        IN_PROGRESS:
            "bg-green-50 text-green-700",
        PAUSED:
            "bg-amber-50 text-amber-700",
        COMPLETED:
            "bg-cyan-50 text-cyan-700",
        AI_REVIEW:
            "bg-violet-50 text-violet-700",
        REWORK:
            "bg-orange-50 text-orange-700",
        CLOSED:
            "bg-gray-100 text-gray-600",
        REJECTED:
            "bg-red-50 text-red-700",
        CANCELLED:
            "bg-gray-100 text-gray-500",
    };

    return (
        <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                styles[status] ||
                "bg-gray-100 text-gray-600"
            }`}
        >
            {STATUS_LABELS[
                status
            ] || status}
        </span>
    );
}

function PriorityBadge({
    priority,
}) {
    const labels = {
        EMERGENCY:
            "Аварийный",
        HIGH: "Высокий",
        NORMAL: "Обычный",
        PLANNED: "Плановый",
    };

    const styles = {
        EMERGENCY:
            "bg-red-50 text-red-700",
        HIGH:
            "bg-orange-50 text-orange-700",
        NORMAL:
            "bg-blue-50 text-blue-700",
        PLANNED:
            "bg-gray-100 text-gray-600",
    };

    return (
        <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                styles[priority] ||
                "bg-gray-100 text-gray-600"
            }`}
        >
            {labels[
                priority
            ] || priority}
        </span>
    );
}

function ActionButton({
    action,
    pending,
    onClick,
}) {
    const danger =
        [
            "REJECT",
            "CANCEL",
        ].includes(
            action,
        );

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={pending}
            className={`rounded-lg px-3.5 py-2 text-sm font-semibold disabled:opacity-50 ${
                danger
                    ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                    : "border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
        >
            {ACTION_LABELS[
                action
            ]}
        </button>
    );
}

function Modal({
    title,
    onClose,
    children,
    width = "640px",
}) {
    return (
        <div
            className="fixed inset-0 z-[5000] flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm"
            onMouseDown={onClose}
        >
            <div
                className="max-h-[calc(100vh-32px)] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl"
                style={{
                    maxWidth: width,
                }}
                onMouseDown={(
                    event,
                ) =>
                    event.stopPropagation()
                }
            >
                <div className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-5">
                    <h2 className="text-lg font-bold text-gray-900">
                        {title}
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                    >
                        <RiCloseLine size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}

function ModalFooter({
    onClose,
    pending,
    text,
}) {
    __useI18nReactive();
    return (
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-5">
            <button
                type="button"
                onClick={onClose}
                disabled={pending}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700"
            >
                {i18nT("employeeModal.cancel")}
            </button>

            <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
                {pending
                    ? "Выполняется..."
                    : text}
            </button>
        </div>
    );
}

function Field({
    label,
    children,
}) {
    return (
        <div className="block">
            <span className="mb-2 block text-xs font-semibold text-gray-600">
                {label}
            </span>
            {children}
        </div>
    );
}

function ErrorBox({
    text,
}) {
    return (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <RiAlarmWarningLine
                size={18}
            />
            {text}
        </div>
    );
}

function EmptyText({
    children,
}) {
    return (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-5 py-8 text-center text-sm text-gray-400">
            {children}
        </div>
    );
}

function ScoreBox({
    label,
    value,
}) {
    return (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs text-gray-500">
                {label}
            </p>

            <p className="mt-1 text-xl font-bold text-gray-900">
                {value ?? "—"}
            </p>
        </div>
    );
}

function AiList({
    title,
    items,
    tone = "violet",
}) {
    const className =
        tone === "green"
            ? "bg-green-50 text-green-800"
            : "bg-violet-50 text-violet-800";

    return (
        <div className="mt-5">
            <p className="text-xs font-semibold text-gray-500">
                {title}
            </p>

            <div className="mt-2 space-y-2">
                {items.map(
                    (item, index) => (
                        <div
                            key={`${item}-${index}`}
                            className={`rounded-lg px-3 py-2 text-sm ${className}`}
                        >
                            {item}
                        </div>
                    ),
                )}
            </div>
        </div>
    );
}
