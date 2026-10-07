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
    RiDownload2Line,
    RiFileList3Line,
    RiHistoryLine,
    RiInformationLine,
    RiMapPinLine,
    RiQrCodeLine,
    RiRefreshLine,
    RiSparkling2Line,
    RiTimeLine,
    RiToolsLine,
} from "react-icons/ri";

import {
    downloadEquipmentQr,
} from "../../../api/equipment.api.js";

import {
    useEquipmentHistory,
} from "../../../hooks/useEquipment.js";


// MARK: Config

const ACTIVE_STATUSES = [
    "ISSUED",
    "ACCEPTED",
    "QUEUED",
    "IN_PROGRESS",
    "PAUSED",
    "REWORK",
];

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

const PRIORITY_LABELS = {
    EMERGENCY: "Аварийный",
    HIGH: "Высокий",
    NORMAL: "Обычный",
    PLANNED: "Плановый",
};


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
        "Не удалось выполнить запрос"
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
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        },
    );
}

function getCriticalityLabel(
    value,
) {
    const labels = {
        1: "Низкая",
        2: "Ниже средней",
        3: "Средняя",
        4: "Высокая",
        5: "Критическая",
    };

    return (
        labels[
            Number(value)
        ] ||
        value ||
        "—"
    );
}

function getDowntimeMinutes(
    order,
) {
    const downtime =
        order?.downtime;

    if (
        Array.isArray(
            downtime,
        )
    ) {
        return downtime.reduce(
            (
                total,
                item,
            ) =>
                total +
                Number(
                    item?.minutes ||
                        0,
                ),
            0,
        );
    }

    if (
        downtime &&
        typeof downtime ===
            "object"
    ) {
        return Number(
            downtime.minutes ||
                0,
        );
    }

    return Number(
        order?.actualDowntimeMinutes ||
            0,
    );
}

function formatMinutes(
    minutes,
) {
    const value =
        Number(minutes) ||
        0;

    if (value < 60) {
        return `${value} мин`;
    }

    const hours =
        Math.floor(
            value / 60,
        );

    const rest =
        value % 60;

    return rest
        ? `${hours} ч ${rest} мин`
        : `${hours} ч`;
}

function getOrderScore(
    order,
) {
    const assessment =
        order?.aiAssessment;

    if (!assessment) {
        return null;
    }

    return (
        assessment.masterScore ??
        assessment.score ??
        null
    );
}


// MARK: Page

export default function EquipmentDetails() {
    const {
        id,
    } = useParams();

    const navigate =
        useNavigate();

    const query =
        useEquipmentHistory(
            id,
        );

    const [
        qrLoading,
        setQrLoading,
    ] = useState(false);

    const [
        qrError,
        setQrError,
    ] = useState("");

    const equipment =
        query.data;

    const orders =
        asArray(
            equipment?.orders,
        );

    const activeOrders =
        useMemo(
            () =>
                orders.filter(
                    (order) =>
                        ACTIVE_STATUSES.includes(
                            order.status,
                        ),
                ),
            [
                orders,
            ],
        );

    const emergencyOrders =
        useMemo(
            () =>
                orders.filter(
                    (order) =>
                        order.type ===
                            "EMERGENCY" ||
                        order.priority ===
                            "EMERGENCY",
                ),
            [
                orders,
            ],
        );

    const downtimeMinutes =
        useMemo(
            () =>
                orders.reduce(
                    (
                        total,
                        order,
                    ) =>
                        total +
                        getDowntimeMinutes(
                            order,
                        ),
                    0,
                ),
            [
                orders,
            ],
        );

    const scores =
        useMemo(
            () =>
                orders
                    .map(
                        getOrderScore,
                    )
                    .filter(
                        (value) =>
                            value !==
                                null &&
                            Number.isFinite(
                                Number(
                                    value,
                                ),
                            ),
                    )
                    .map(Number),
            [
                orders,
            ],
        );

    const averageScore =
        scores.length
            ? (
                scores.reduce(
                    (
                        total,
                        value,
                    ) =>
                        total +
                        value,
                    0,
                ) /
                scores.length
            ).toFixed(1)
            : "—";

    async function downloadQr() {
        setQrError("");
        setQrLoading(true);

        try {
            const blob =
                await downloadEquipmentQr(
                    equipment.id,
                );

            const url =
                URL.createObjectURL(
                    blob,
                );

            const anchor =
                document.createElement(
                    "a",
                );

            anchor.href =
                url;

            anchor.download =
                `equipment-${equipment.inventoryNumber || equipment.id}-qr.png`;

            document.body.appendChild(
                anchor,
            );

            anchor.click();
            anchor.remove();

            URL.revokeObjectURL(
                url,
            );
        } catch (error) {
            setQrError(
                extractError(
                    error,
                ),
            );
        } finally {
            setQrLoading(
                false,
            );
        }
    }

    if (query.isLoading) {
        return (
            <div className="flex min-h-[500px] items-center justify-center">
                <div className="text-sm text-gray-500">
                    Загрузка
                    оборудования...
                </div>
            </div>
        );
    }

    if (query.isError) {
        return (
            <div className="py-24 text-center">
                <RiAlarmWarningLine
                    size={36}
                    className="mx-auto text-red-500"
                />

                <h1 className="mt-4 text-2xl font-bold text-gray-900">
                    Не удалось
                    загрузить
                    оборудование
                </h1>

                <p className="mt-2 text-sm text-gray-500">
                    {extractError(
                        query.error,
                    )}
                </p>

                <button
                    type="button"
                    onClick={() =>
                        query.refetch()
                    }
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
                >
                    <RiRefreshLine />

                    Повторить
                </button>
            </div>
        );
    }

    if (!equipment) {
        return (
            <div className="py-24 text-center">
                <h1 className="text-2xl font-bold text-gray-900">
                    Оборудование
                    не найдено
                </h1>

                <button
                    type="button"
                    onClick={() =>
                        navigate(
                            "/equipment",
                        )
                    }
                    className="mt-5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
                >
                    Назад
                </button>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[1600px]">
            <Link
                to="/equipment"
                className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-900"
            >
                <RiArrowLeftLine
                    size={18}
                />

                Всё оборудование
            </Link>

            {qrError && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {qrError}
                </div>
            )}

            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-bold text-gray-900">
                                {
                                    equipment.name
                                }
                            </h1>

                            <CriticalityBadge
                                value={
                                    equipment.criticality
                                }
                            />
                        </div>

                        <p className="mt-2 text-sm text-gray-500">
                            {
                                equipment.inventoryNumber
                            }

                            {" • "}

                            {
                                equipment.type
                            }
                        </p>

                        <div className="mt-4 inline-flex items-center gap-2 text-sm text-gray-500">
                            <RiMapPinLine
                                size={16}
                            />

                            {equipment.area
                                ?.name ||
                                "Участок не указан"}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={
                            downloadQr
                        }
                        disabled={
                            qrLoading
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        <RiQrCodeLine
                            size={18}
                        />

                        {qrLoading
                            ? "Загрузка..."
                            : "Скачать QR"}
                    </button>
                </div>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
                <Kpi
                    label="Активных нарядов"
                    value={
                        activeOrders.length
                    }
                    tone="blue"
                />

                <Kpi
                    label="Аварийных работ"
                    value={
                        emergencyOrders.length
                    }
                    tone="red"
                />

                <Kpi
                    label="Простой"
                    value={formatMinutes(
                        downtimeMinutes,
                    )}
                    tone="orange"
                />

                <Kpi
                    label="Средняя оценка"
                    value={
                        averageScore
                    }
                    tone="violet"
                />
            </div>

            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-w-0 space-y-6">
                    <Section
                        title="Активные наряды"
                        description="Работы, которые ещё не закрыты"
                        icon={
                            RiFileList3Line
                        }
                    >
                        {activeOrders.length >
                        0 ? (
                            <div className="space-y-3">
                                {activeOrders.map(
                                    (
                                        order,
                                    ) => (
                                        <OrderCard
                                            key={
                                                order.id
                                            }
                                            order={
                                                order
                                            }
                                        />
                                    ),
                                )}
                            </div>
                        ) : (
                            <EmptyText>
                                Активных
                                нарядов нет
                            </EmptyText>
                        )}
                    </Section>

                    <Section
                        title="История ремонтов"
                        description="Все зарегистрированные наряды по оборудованию"
                        icon={
                            RiHistoryLine
                        }
                    >
                        {orders.length >
                        0 ? (
                            <HistoryTable
                                orders={
                                    orders
                                }
                            />
                        ) : (
                            <EmptyText>
                                История
                                отсутствует
                            </EmptyText>
                        )}
                    </Section>
                </div>

                <aside className="space-y-5">
                    <Section
                        title="Данные"
                        icon={
                            RiInformationLine
                        }
                    >
                        <InfoRow
                            label="ID"
                            value={
                                equipment.id
                            }
                        />

                        <InfoRow
                            label="Инвентарный №"
                            value={
                                equipment.inventoryNumber
                            }
                        />

                        <InfoRow
                            label="Тип"
                            value={
                                equipment.type
                            }
                        />

                        <InfoRow
                            label="Критичность"
                            value={`${equipment.criticality}/5 — ${getCriticalityLabel(
                                equipment.criticality,
                            )}`}
                        />

                        <InfoRow
                            label="QR token"
                            value={
                                equipment.qrToken
                            }
                            last
                        />
                    </Section>

                    <Section
                        title="Участок"
                        icon={
                            RiMapPinLine
                        }
                    >
                        <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                <RiMapPinLine
                                    size={17}
                                />
                            </div>

                            <div>
                                <p className="text-sm font-semibold text-gray-900">
                                    {equipment
                                        .area
                                        ?.name ||
                                        "Не указан"}
                                </p>

                                <p className="mt-1 text-xs text-gray-400">
                                    Производственный
                                    участок
                                </p>
                            </div>
                        </div>
                    </Section>

                    <Section
                        title="AI и качество"
                        icon={
                            RiSparkling2Line
                        }
                    >
                        <div className="space-y-3">
                            <InfoRow
                                label="Работ с AI-оценкой"
                                value={
                                    scores.length
                                }
                            />

                            <InfoRow
                                label="Средняя оценка"
                                value={
                                    averageScore
                                }
                                last
                            />
                        </div>
                    </Section>
                </aside>
            </div>
        </div>
    );
}


// MARK: Order card

function OrderCard({
    order,
}) {
    const navigate =
        useNavigate();

    return (
        <button
            type="button"
            onClick={() =>
                navigate(
                    `/orders/${order.id}`,
                )
            }
            className="flex w-full flex-col justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/20 sm:flex-row sm:items-center"
        >
            <div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">
                        {
                            order.number
                        }
                    </span>

                    <PriorityBadge
                        value={
                            order.priority
                        }
                    />

                    <StatusBadge
                        value={
                            order.status
                        }
                    />
                </div>

                <p className="mt-2 text-sm font-medium text-gray-800">
                    {
                        order.description
                    }
                </p>
            </div>

            <span className="shrink-0 text-xs text-gray-500">
                {formatDate(
                    order.deadline,
                )}
            </span>
        </button>
    );
}


// MARK: History

function HistoryTable({
    orders,
}) {
    const navigate =
        useNavigate();

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left">
                    <thead className="bg-gray-50">
                        <tr className="text-xs uppercase text-gray-400">
                            <th className="px-4 py-3">
                                Наряд
                            </th>

                            <th className="px-4 py-3">
                                Шифр
                            </th>

                            <th className="px-4 py-3">
                                Приоритет
                            </th>

                            <th className="px-4 py-3">
                                Статус
                            </th>

                            <th className="px-4 py-3">
                                AI
                            </th>

                            <th className="px-4 py-3">
                                Простой
                            </th>

                            <th className="px-4 py-3">
                                Материалы
                            </th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                        {orders.map(
                            (
                                order,
                            ) => (
                                <tr
                                    key={
                                        order.id
                                    }
                                    onClick={() =>
                                        navigate(
                                            `/orders/${order.id}`,
                                        )
                                    }
                                    className="cursor-pointer transition hover:bg-gray-50"
                                >
                                    <td className="px-4 py-4">
                                        <p className="text-sm font-semibold text-gray-900">
                                            {
                                                order.number
                                            }
                                        </p>

                                        <p className="mt-1 max-w-[280px] truncate text-xs text-gray-400">
                                            {
                                                order.description
                                            }
                                        </p>
                                    </td>

                                    <td className="px-4 py-4 text-sm text-gray-600">
                                        {order
                                            .faultCode
                                            ?.code ||
                                            "—"}
                                    </td>

                                    <td className="px-4 py-4">
                                        <PriorityBadge
                                            value={
                                                order.priority
                                            }
                                        />
                                    </td>

                                    <td className="px-4 py-4">
                                        <StatusBadge
                                            value={
                                                order.status
                                            }
                                        />
                                    </td>

                                    <td className="px-4 py-4 text-sm font-semibold text-gray-700">
                                        {getOrderScore(
                                            order,
                                        ) ??
                                            "—"}
                                    </td>

                                    <td className="px-4 py-4 text-sm text-gray-600">
                                        {formatMinutes(
                                            getDowntimeMinutes(
                                                order,
                                            ),
                                        )}
                                    </td>

                                    <td className="px-4 py-4 text-sm text-gray-600">
                                        {asArray(
                                            order.materialUsages,
                                        ).length}
                                    </td>
                                </tr>
                            ),
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}


// MARK: UI

function CriticalityBadge({
    value,
}) {
    const numeric =
        Number(value);

    let style =
        "bg-green-50 text-green-700";

    if (numeric >= 5) {
        style =
            "bg-red-50 text-red-700";
    } else if (
        numeric >= 4
    ) {
        style =
            "bg-orange-50 text-orange-700";
    } else if (
        numeric >= 3
    ) {
        style =
            "bg-amber-50 text-amber-700";
    }

    return (
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>
            {numeric}/5
        </span>
    );
}

function StatusBadge({
    value,
}) {
    return (
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
            {STATUS_LABELS[
                value
            ] || value}
        </span>
    );
}

function PriorityBadge({
    value,
}) {
    const emergency =
        value ===
        "EMERGENCY";

    return (
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            emergency
                ? "bg-red-50 text-red-700"
                : "bg-blue-50 text-blue-700"
        }`}>
            {PRIORITY_LABELS[
                value
            ] || value}
        </span>
    );
}

function Section({
    title,
    description,
    icon: Icon,
    children,
}) {
    return (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
                <div>
                    <h2 className="text-[15px] font-semibold text-gray-900">
                        {title}
                    </h2>

                    {description && (
                        <p className="mt-1 text-xs text-gray-500">
                            {
                                description
                            }
                        </p>
                    )}
                </div>

                {Icon && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <Icon
                            size={18}
                        />
                    </div>
                )}
            </div>

            <div className="p-5">
                {children}
            </div>
        </section>
    );
}

function Kpi({
    label,
    value,
    tone,
}) {
    const tones = {
        blue:
            "text-blue-700",
        red:
            "text-red-700",
        orange:
            "text-orange-700",
        violet:
            "text-violet-700",
    };

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">
                {label}
            </p>

            <p className={`mt-2 text-2xl font-bold ${
                tones[tone] ||
                tones.blue
            }`}>
                {value}
            </p>
        </div>
    );
}

function InfoRow({
    label,
    value,
    last = false,
}) {
    return (
        <div className={`flex items-start justify-between gap-4 py-3 ${
            last
                ? ""
                : "border-b border-gray-100"
        }`}>
            <span className="text-xs text-gray-500">
                {label}
            </span>

            <span className="max-w-[190px] break-all text-right text-sm font-semibold text-gray-900">
                {value ||
                    "—"}
            </span>
        </div>
    );
}

function EmptyText({
    children,
}) {
    return (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-5 py-10 text-center text-sm text-gray-400">
            {children}
        </div>
    );
}