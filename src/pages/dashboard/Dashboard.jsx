import Chart from "react-apexcharts";
import {
    useMemo,
} from "react";
import {
    useNavigate,
} from "react-router-dom";
import {
    RiAlarmWarningLine,
    RiArrowRightLine,
    RiFlashlightLine,
    RiLoader4Line,
    RiMapPinLine,
    RiRefreshLine,
    RiSparkling2Line,
    RiTimeLine,
    RiToolsLine,
    RiUserLine,
} from "react-icons/ri";
import SmartTable from "../../react-components/SmartTable/SmartTable.jsx";
import {
    useAnalyticsAnomalies,
    useAnalyticsDashboard,
    useFailureForecast,
} from "../../hooks/useAnalytics.js";
import {
    useExecutors,
} from "../../hooks/useReferences.js";
import {
    useWorkOrders,
} from "../../hooks/useWorkOrders.js";
import {
    useI18n,
} from "../../i18n/index.js";
// MARK: Config
const ACTIVE_STATUSES = [
    "ISSUED",
    "QUEUED",
    "ACCEPTED",
    "IN_PROGRESS",
    "PAUSED",
    "REWORK",
];
const STATUS_LABELS = {
    ISSUED:
        "Выдан",
    QUEUED:
        "В очереди",
    ACCEPTED:
        "Принят",
    IN_PROGRESS:
        "В работе",
    PAUSED:
        "Приостановлен",
    COMPLETED:
        "Выполнен",
    AI_REVIEW:
        "На проверке",
    REWORK:
        "На доработке",
    CLOSED:
        "Закрыт",
    REJECTED:
        "Отклонён",
    CANCELLED:
        "Отменён",
};
const PRIORITY_LABELS = {
    EMERGENCY:
        "Аварийный",
    HIGH:
        "Высокий",
    NORMAL:
        "Обычный",
    PLANNED:
        "Плановый",
};
const EXECUTOR_STATUS = {
    AVAILABLE: {
        label:
            "Свободен",
        className:
            "bg-green-50 text-green-700",
        dot:
            "bg-green-500",
    },
    BUSY: {
        label:
            "В работе",
        className:
            "bg-amber-50 text-amber-700",
        dot:
            "bg-amber-500",
    },
    QUEUED: {
        label:
            "Есть очередь",
        className:
            "bg-blue-50 text-blue-700",
        dot:
            "bg-blue-500",
    },
    OFF_SHIFT: {
        label:
            "Не на смене",
        className:
            "bg-gray-100 text-gray-600",
        dot:
            "bg-gray-400",
    },
};
// MARK: Helpers
function asArray(
    value,
) {
    return Array.isArray(
        value,
    )
        ? value
        : [];
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
    if (!rest) {
        return `${hours} ч`;
    }
    return `${hours} ч ${rest} мин`;
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
    return `${Math.round(
        number * 100,
    )}%`;
}
function getInitials(
    name = "",
) {
    return String(name)
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map(
            (part) =>
                part[0],
        )
        .join("")
        .toUpperCase();
}
function extractError(
    error,
) {
    return (
        error?.response?.data
            ?.error ||
        error?.message ||
        "Не удалось загрузить данные"
    );
}
function equipmentName(
    item,
) {
    if (
        typeof item
            ?.equipment ===
        "string"
    ) {
        return item.equipment;
    }
    return (
        item?.equipment
            ?.name ||
        item?.name ||
        `Оборудование #${item?.equipmentId ?? "—"}`
    );
}
// MARK: Dashboard
export default function Dashboard() {
    useI18n();
    const navigate =
        useNavigate();
    const dashboardQuery =
        useAnalyticsDashboard();
    const forecastQuery =
        useFailureForecast(
            30,
        );
    const anomaliesQuery =
        useAnalyticsAnomalies();
    const executorsQuery =
        useExecutors();
    const ordersQuery =
        useWorkOrders({
            status:
                ACTIVE_STATUSES,
            compact: true,
            limit: 24,
            offset: 0,
        });
    const dashboard =
        dashboardQuery.data ??
        {};
    const forecasts =
        asArray(
            forecastQuery.data,
        );
    const anomalies =
        asArray(
            anomaliesQuery.data,
        );
    const executors =
        asArray(
            executorsQuery.data,
        );
    const orders =
        asArray(
            ordersQuery.data
                ?.items,
        );
    const onShiftExecutors =
        useMemo(
            () =>
                executors
                    .filter(
                        (
                            item,
                        ) =>
                            item.isOnShift,
                    )
                    .sort(
                        (
                            a,
                            b,
                        ) => {
                            const aStatus =
                                a.employeeStatus ===
                                "AVAILABLE"
                                    ? 0
                                    : 1;
                            const bStatus =
                                b.employeeStatus ===
                                "AVAILABLE"
                                    ? 0
                                    : 1;
                            if (
                                aStatus !==
                                bStatus
                            ) {
                                return (
                                    aStatus -
                                    bStatus
                                );
                            }
                            return String(
                                a.fullName,
                            ).localeCompare(
                                String(
                                    b.fullName,
                                ),
                                "ru",
                            );
                        },
                    )
                    .slice(
                        0,
                        6,
                    ),
            [
                executors,
            ],
        );
    // At desktop width, align the bottom of the orders table with the
    // executors card when it contains enough rows to be useful.
    const alignOrdersToExecutors = onShiftExecutors.length >= 4;

    const sortedForecasts =
        useMemo(
            () =>
                [...forecasts]
                    .sort(
                        (
                            a,
                            b,
                        ) =>
                            Number(
                                b.probability,
                            ) -
                            Number(
                                a.probability,
                            ),
                    )
                    .slice(
                        0,
                        5,
                    ),
            [
                forecasts,
            ],
        );
    const importantAnomaly =
        useMemo(() => {
            if (
                anomalies.length ===
                0
            ) {
                return null;
            }
            return [
                ...anomalies,
            ].sort(
                (
                    a,
                    b,
                ) =>
                    Number(
                        b.severity,
                    ) -
                    Number(
                        a.severity,
                    ),
            )[0];
        }, [
            anomalies,
        ]);
    const stats = [
        {
            title:
                "Активные наряды",
            value:
                Number(
                    dashboard.active,
                ) || 0,
            description:
                "Текущие работы",
            icon:
                RiToolsLine,
            tone:
                "blue",
        },
        {
            title:
                "Просрочено",
            value:
                Number(
                    dashboard.overdue,
                ) || 0,
            description:
                "Требуют внимания",
            icon:
                RiAlarmWarningLine,
            tone:
                Number(
                    dashboard.overdue,
                ) > 0
                    ? "red"
                    : "green",
        },
        {
            title:
                "Оборудование в простое",
            value:
                Number(
                    dashboard.equipmentInDowntime,
                ) || 0,
            description:
                "Сейчас",
            icon:
                RiTimeLine,
            tone:
                Number(
                    dashboard.equipmentInDowntime,
                ) > 0
                    ? "orange"
                    : "green",
        },
        {
            title:
                "Средняя реакция",
            value:
                formatMinutes(
                    dashboard.averageReactionMinutes,
                ),
            description:
                `Выполнение: ${formatMinutes(
                    dashboard.averageCompletionMinutes,
                )}`,
            icon:
                RiFlashlightLine,
            tone:
                "violet",
        },
    ];
    const orderColumns =
        useMemo(
            () => [
                {
                    field:
                        "number",
                    header:
                        "Наряд",
                    minWidth:
                        190,
                    render:
                        (
                            order,
                        ) => (
                            <div>
                                <div className="font-semibold text-gray-900">
                                    {
                                        order.number
                                    }
                                </div>
                                <div className="mt-1 max-w-[260px] truncate text-xs text-gray-400">
                                    {
                                        order.description
                                    }
                                </div>
                            </div>
                        ),
                },
                {
                    key:
                        "equipment",
                    header:
                        "Оборудование",
                    minWidth:
                        220,
                    sortValue:
                        (
                            order,
                        ) =>
                            order
                                .equipment
                                ?.name ??
                            "",
                    render:
                        (
                            order,
                        ) => (
                            <div>
                                <div className="font-medium text-gray-900">
                                    {order
                                        .equipment
                                        ?.name ||
                                        "—"}
                                </div>
                                <div className="mt-1 text-xs text-gray-400">
                                    {order
                                        .equipment
                                        ?.inventoryNumber ||
                                        ""}
                                </div>
                            </div>
                        ),
                },
                {
                    key:
                        "assignee",
                    header:
                        "Исполнитель",
                    minWidth:
                        210,
                    sortValue:
                        (
                            order,
                        ) =>
                            order
                                .assignee
                                ?.fullName ??
                            "",
                    render:
                        (
                            order,
                        ) =>
                            order
                                .assignee
                                ?.fullName ||
                            "Не назначен",
                },
                {
                    field:
                        "priority",
                    header:
                        "Приоритет",
                    minWidth:
                        135,
                    render:
                        (
                            order,
                        ) => (
                            <PriorityBadge
                                value={
                                    order.priority
                                }
                            />
                        ),
                },
                {
                    field:
                        "status",
                    header:
                        "Статус",
                    minWidth:
                        135,
                    render:
                        (
                            order,
                        ) => (
                            <StatusBadge
                                value={
                                    order.status
                                }
                            />
                        ),
                },
            ],
        [],
    );
    const loading =
        dashboardQuery.isLoading ||
        executorsQuery.isLoading ||
        ordersQuery.isLoading;
    const mainError =
        dashboardQuery.isError
            ? dashboardQuery.error
            : null;
    async function refreshAll() {
        await Promise.all([
            dashboardQuery.refetch(),
            forecastQuery.refetch(),
            anomaliesQuery.refetch(),
            executorsQuery.refetch(),
            ordersQuery.refetch(),
        ]);
    }
    if (
        loading &&
        !dashboardQuery.data
    ) {
        return (
            <PageLoader />
        );
    }
    if (
        mainError &&
        !dashboardQuery.data
    ) {
        return (
            <PageError
                text={
                    extractError(
                        mainError,
                    )
                }
                onRetry={
                    refreshAll
                }
            />
        );
    }
    return (
        <div className="mx-auto max-w-[1800px]">
            {/* HEADER */}
            <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                        Панель смены
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Текущее состояние
                        производства,
                        исполнителей и
                        оборудования
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={
                            refreshAll
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                        <RiRefreshLine
                            size={
                                18
                            }
                        />
                        Обновить
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/orders",
                            )
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                    >
                        Наряды
                        <RiArrowRightLine
                            size={
                                18
                            }
                        />
                    </button>
                </div>
            </div>
            {/* KPI */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map(
                    (
                        item,
                    ) => (
                        <StatCard
                            key={
                                item.title
                            }
                            {...item}
                        />
                    ),
                )}
            </div>
            {/* MAIN */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[370px_minmax(0,1fr)]">
                {/* EXECUTORS */}
                <section className="self-start overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <SectionHeader
                        title="Исполнители смены"
                        description={`${executors.filter(
                            (
                                item,
                            ) =>
                                item.isOnShift,
                        ).length} на смене`}
                        icon={
                            RiUserLine
                        }
                    />
                    <div className="divide-y divide-gray-100">
                        {onShiftExecutors.length >
                        0 ? (
                            onShiftExecutors.map(
                                (
                                    employee,
                                ) => (
                                    <ExecutorRow
                                        key={
                                            employee.id
                                        }
                                        employee={
                                            employee
                                        }
                                        onClick={() =>
                                            navigate(
                                                `/employees/${employee.id}`,
                                            )
                                        }
                                    />
                                ),
                            )
                        ) : (
                            <div className="px-5 py-12 text-center text-sm text-gray-400">
                                Нет
                                сотрудников
                                на смене
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/employees",
                            )
                        }
                        className="flex w-full items-center justify-center gap-1 border-t border-gray-200 px-5 py-3 text-sm font-semibold text-blue-600 transition hover:bg-gray-50"
                    >
                        Все
                        исполнители
                        <RiArrowRightLine />
                    </button>
                </section>
                {/* ORDERS */}
                <div className="min-w-0 xl:relative xl:min-h-0">
                <section className={`flex h-[620px] min-w-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ${alignOrdersToExecutors ? "xl:absolute xl:inset-0 xl:h-full" : "xl:h-[660px]"}`}>
                    <SectionHeader
                        title="Активные наряды"
                        description={`${ordersQuery.data?.total ?? orders.length} активных`}
                        icon={
                            RiToolsLine
                        }
                    />
                    <div className="flex min-h-0 flex-1 flex-col p-4">
                        <SmartTable
                            className="flex h-full min-h-0 flex-col [&_.smart-table__scroll]:min-h-0 [&_.smart-table__scroll]:flex-1 [&_.smart-table__table]:h-full"
                            data={
                                orders
                            }
                            columns={
                                orderColumns
                            }
                            dataKey="id"
                            mode="sort"
                            compact
                            striped
                            stickyHeader
                            minWidth={
                                950
                            }
                            scrollHeight="100%"
                            rowClassName={() =>
                                "cursor-pointer"
                            }
                            onRowClick={(
                                order,
                            ) =>
                                navigate(
                                    `/orders/${order.id}`,
                                )
                            }
                            emptyText="Активных нарядов нет"
                            emptyDescription="На текущий момент открытых работ нет"
                        />
                    </div>
                </section>
                </div>
            </div>
            {/* TOPS */}
            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
                {/* EQUIPMENT */}
                <DashboardSection
                    title="Проблемное оборудование"
                    subtitle="По аварийным нарядам за 30 дней"
                    icon={
                        RiToolsLine
                    }
                >
                    <RankingList
                        items={asArray(
                            dashboard.topEquipment,
                        ).slice(
                            0,
                            5,
                        )}
                        getTitle={(
                            item,
                        ) =>
                            item.name ||
                            `Оборудование #${item.equipmentId}`
                        }
                        getValue={(
                            item,
                        ) =>
                            `${item._count ?? 0} аварий`
                        }
                        emptyText="Данных пока нет"
                    />
                </DashboardSection>
                {/* AREAS */}
                <DashboardSection
                    title="Участки"
                    subtitle="Аварийность на единицу оборудования"
                    icon={
                        RiMapPinLine
                    }
                >
                    <RankingList
                        items={asArray(
                            dashboard.topAreas,
                        ).slice(
                            0,
                            5,
                        )}
                        getTitle={(
                            item,
                        ) =>
                            item.name ||
                            `Участок #${item.areaId}`
                        }
                        getValue={(
                            item,
                        ) =>
                            `${Number(
                                item.emergenciesPerUnit ??
                                    0,
                            ).toFixed(
                                2,
                            )} / ед.`
                        }
                        emptyText="Данных пока нет"
                    />
                </DashboardSection>
                {/* EXECUTORS TOP */}
                <DashboardSection
                    title="Лучшие исполнители"
                    subtitle="Средняя оценка за 30 дней"
                    icon={
                        RiUserLine
                    }
                >
                    <RankingList
                        items={asArray(
                            dashboard.topExecutors,
                        ).slice(
                            0,
                            5,
                        )}
                        getTitle={(
                            item,
                        ) =>
                            item.fullName
                        }
                        getValue={(
                            item,
                        ) =>
                            `${Number(
                                item.score ??
                                    0,
                            ).toFixed(
                                1,
                            )} / 5`
                        }
                        emptyText="Данных пока нет"
                    />
                </DashboardSection>
            </div>
            {/* FORECAST + AI */}
            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                {/* FORECAST */}
                <DashboardSection
                    title="Прогноз отказов"
                    subtitle="Вероятность отказа на горизонте 30 дней"
                    icon={
                        RiFlashlightLine
                    }
                >
                    {forecastQuery.isLoading ? (
                        <InlineLoader />
                    ) : sortedForecasts.length >
                      0 ? (
                        <div className="space-y-4">
<div className="mb-1 text-[11px] text-gray-400">Профиль риска · оборудование по убыванию вероятности</div>
                            <ForecastChart items={sortedForecasts} height={190} />
                            {sortedForecasts.map(
                                (
                                    item,
                                ) => (
                                    <ForecastRow
                                        key={
                                            item.equipmentId
                                        }
                                        item={
                                            item
                                        }
                                    />
                                ),
                            )}
                        </div>
                    ) : (
                        <EmptyBlock text="Прогноз пока не сформирован" />
                    )}
                </DashboardSection>
                {/* ANOMALY */}
                <DashboardSection
                    title="AI-контроль"
                    subtitle="Самая важная найденная аномалия"
                    icon={
                        RiSparkling2Line
                    }
                >
                    {anomaliesQuery.isLoading ? (
                        <InlineLoader />
                    ) : importantAnomaly ? (
                        <AnomalyCard
                            anomaly={
                                importantAnomaly
                            }
                            onOpen={() =>
                                navigate(
                                    "/analytics",
                                )
                            }
                        />
                    ) : (
                        <div className="flex min-h-[190px] items-center justify-center rounded-xl border border-green-100 bg-green-50/60 p-6 text-center">
                            <div>
                                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700">
                                    <RiSparkling2Line
                                        size={
                                            22
                                        }
                                    />
                                </div>
                                <p className="mt-3 text-sm font-semibold text-green-900">
                                    Критичных
                                    аномалий
                                    нет
                                </p>
                                <p className="mt-1 text-xs text-green-700">
                                    Система
                                    не обнаружила
                                    проблем,
                                    требующих
                                    внимания
                                </p>
                            </div>
                        </div>
                    )}
                </DashboardSection>
            </div>
        </div>
    );
}
// MARK: Stat Card
function StatCard({
    title,
    value,
    description,
    icon: Icon,
    tone,
}) {
    const tones = {
        blue: {
            icon:
                "bg-blue-50 text-blue-600",
            value:
                "text-gray-900",
        },
        red: {
            icon:
                "bg-red-50 text-red-600",
            value:
                "text-red-700",
        },
        orange: {
            icon:
                "bg-orange-50 text-orange-600",
            value:
                "text-orange-700",
        },
        green: {
            icon:
                "bg-green-50 text-green-600",
            value:
                "text-gray-900",
        },
        violet: {
            icon:
                "bg-violet-50 text-violet-600",
            value:
                "text-gray-900",
        },
    };
    const theme =
        tones[tone] ??
        tones.blue;
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-medium text-gray-500">
                        {title}
                    </p>
                    <p className={`mt-2 text-3xl font-bold tracking-tight ${theme.value}`}>
                        {value}
                    </p>
                </div>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${theme.icon}`}>
                    <Icon
                        size={
                            20
                        }
                    />
                </div>
            </div>
            <p className="mt-4 text-xs text-gray-500">
                {
                    description
                }
            </p>
        </div>
    );
}
// MARK: Section Header
function SectionHeader({
    title,
    description,
    icon: Icon,
}) {
    return (
        <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-5 py-4">
            <div>
                <h2 className="font-semibold text-gray-900">
                    {title}
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                    {
                        description
                    }
                </p>
            </div>
            <Icon
                size={20}
                className="shrink-0 text-gray-400"
            />
        </div>
    );
}
// MARK: Executor
function ExecutorRow({
    employee,
    onClick,
}) {
    const status =
        EXECUTOR_STATUS[
            employee.employeeStatus
        ] ??
        EXECUTOR_STATUS.OFF_SHIFT;
    const statusText =
        employee.statusText ||
        status.label;
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-gray-50"
        >
            <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                    {getInitials(
                        employee.fullName,
                    )}
                </div>
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">
                        {
                            employee.fullName
                        }
                    </p>
                    <p className="mt-1 truncate text-xs text-gray-500">
                        {employee.specialty ||
                            "Специальность не указана"}
                        {employee.grade
                            ? ` • ${employee.grade} разряд`
                            : ""}
                    </p>
                </div>
            </div>
            <div
                className={`max-w-[135px] shrink-0 rounded-lg px-2.5 py-1.5 text-right text-[11px] font-semibold ${status.className}`}
                title={
                    statusText
                }
            >
                <span className="flex items-center gap-1.5">
                    <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`}
                    />
                    <span className="truncate">
                        {
                            statusText
                        }
                    </span>
                </span>
            </div>
        </button>
    );
}
// MARK: Dashboard Section
function DashboardSection({
    title,
    subtitle,
    icon: Icon,
    children,
}) {
    return (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
                <div>
                    <h2 className="text-sm font-semibold text-gray-900">
                        {title}
                    </h2>
                    <p className="mt-1 text-xs text-gray-500">
                        {
                            subtitle
                        }
                    </p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
                    <Icon
                        size={
                            18
                        }
                    />
                </div>
            </div>
            <div className="p-5">
                {children}
            </div>
        </section>
    );
}
// MARK: Ranking
function RankingList({
    items,
    getTitle,
    getValue,
    emptyText,
}) {
    if (
        !items.length
    ) {
        return (
            <EmptyBlock
                text={
                    emptyText
                }
            />
        );
    }
    const max =
        Math.max(
            ...items.map(
                (
                    item,
                ) => {
                    const raw =
                        getValue(
                            item,
                        );
                    const parsed =
                        parseFloat(
                            String(
                                raw,
                            ),
                        );
                    return Number.isFinite(
                        parsed,
                    )
                        ? parsed
                        : 1;
                },
            ),
            1,
        );
    return (
        <div className="space-y-3">
            {items.map(
                (
                    item,
                    index,
                ) => {
                    const value =
                        getValue(
                            item,
                        );
                    const numeric =
                        parseFloat(
                            String(
                                value,
                            ),
                        );
                    const width =
                        Number.isFinite(
                            numeric,
                        )
                            ? Math.max(
                                8,
                                Math.min(
                                    100,
                                    (
                                        numeric /
                                        max
                                    ) *
                                        100,
                                ),
                            )
                            : 30;
                    return (
                        <div
                            key={
                                item.id ??
                                item.equipmentId ??
                                item.areaId ??
                                index
                            }
                            className="rounded-lg border border-gray-100 bg-gray-50/60 p-3"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-2">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-[11px] font-bold text-gray-500 shadow-sm">
                                        {index +
                                            1}
                                    </span>
                                    <p className="truncate text-sm font-semibold text-gray-800">
                                        {getTitle(
                                            item,
                                        )}
                                    </p>
                                </div>
                                <span className="shrink-0 text-xs font-semibold text-gray-600">
                                    {
                                        value
                                    }
                                </span>
                            </div>
                            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200">
                                <div
                                    className="h-full rounded-full bg-blue-600"
                                    style={{
                                        width:
                                            `${width}%`,
                                    }}
                                />
                            </div>
                        </div>
                    );
                },
            )}
        </div>
    );
}
// MARK: Forecast
function ForecastRow({
    item,
}) {
    const probability =
        Number(
            item.probability,
        ) || 0;
    const percent =
        Math.round(
            probability *
                100,
        );
    const dangerous =
        probability >=
        0.65;
    const moderate =
        probability >=
        0.4;
    return (
        <div className="rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">
                        {equipmentName(
                            item,
                        )}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                        Последние
                        отказы:{" "}
                        {item.recentFailures ??
                            0}
                        {" • "}
                        Было:{" "}
                        {item.previousFailures ??
                            0}
                    </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                    dangerous
                        ? "bg-red-50 text-red-700"
                        : moderate
                          ? "bg-orange-50 text-orange-700"
                          : "bg-green-50 text-green-700"
                }`}>
                    {formatPercent(
                        probability,
                    )}
                </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                    className={`h-full rounded-full ${
                        dangerous
                            ? "bg-red-500"
                            : moderate
                              ? "bg-orange-500"
                              : "bg-green-500"
                    }`}
                    style={{
                        width:
                            `${percent}%`,
                    }}
                />
            </div>
            {item.growth !==
                undefined &&
                item.growth !==
                    null && (
                <p className="mt-2 text-[11px] text-gray-400">
                    Изменение
                    частоты:{" "}
                    {Number(
                        item.growth,
                    ) > 0
                        ? "+"
                        : ""}
                    {
                        item.growth
                    }
                </p>
            )}
        </div>
    );
}
// MARK: Anomaly
function AnomalyCard({
    anomaly,
    onOpen,
}) {
    const severity =
        Number(
            anomaly.severity,
        ) || 1;
    return (
        <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-bold uppercase text-red-700">
                            Важность{" "}
                            {
                                severity
                            }
                            /5
                        </span>
                        <span className="text-[11px] font-semibold text-gray-400">
                            {
                                anomaly.type
                            }
                        </span>
                    </div>
                    <h3 className="mt-3 text-sm font-bold leading-5 text-gray-900">
                        {
                            anomaly.title
                        }
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-gray-600">
                        {
                            anomaly.description
                        }
                    </p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                    <RiSparkling2Line
                        size={
                            20
                        }
                    />
                </div>
            </div>
            {anomaly.recommendation && (
                <div className="mt-4 rounded-lg border border-white bg-white/80 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                        Рекомендация
                    </p>
                    <p className="mt-1 text-sm leading-5 text-gray-700">
                        {
                            anomaly.recommendation
                        }
                    </p>
                </div>
            )}
            <div className="mt-4 flex items-center justify-between gap-3">
                <div className="min-w-0 text-xs text-gray-500">
                    {anomaly.area
                        ?.name && (
                        <span>
                            {
                                anomaly
                                    .area
                                    .name
                            }
                        </span>
                    )}
                    {anomaly.equipment
                        ?.name && (
                        <span>
                            {anomaly.area
                                ?.name
                                ? " • "
                                : ""}
                            {
                                anomaly
                                    .equipment
                                    .name
                            }
                        </span>
                    )}
                </div>
                <button
                    type="button"
                    onClick={
                        onOpen
                    }
                    className="shrink-0 text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                    В аналитику →
                </button>
            </div>
        </div>
    );
}
// MARK: Badges
function PriorityBadge({
    value,
}) {
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
        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            styles[value] ||
            "bg-gray-100 text-gray-600"
        }`}>
            {PRIORITY_LABELS[
                value
            ] || value}
        </span>
    );
}
function StatusBadge({
    value,
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
        REWORK:
            "bg-orange-50 text-orange-700",
    };
    return (
        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            styles[value] ||
            "bg-gray-100 text-gray-600"
        }`}>
            {STATUS_LABELS[
                value
            ] || value}
        </span>
    );
}
// MARK: States
function EmptyBlock({
    text,
}) {
    return (
        <div className="flex min-h-[170px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-5 text-center text-sm text-gray-400">
            {text}
        </div>
    );
}
function InlineLoader() {
    return (
        <div className="flex min-h-[170px] items-center justify-center">
            <RiLoader4Line
                size={25}
                className="animate-spin text-blue-600"
            />
        </div>
    );
}
function PageLoader() {
    return (
        <div className="flex min-h-[500px] items-center justify-center">
            <RiLoader4Line
                size={32}
                className="animate-spin text-blue-600"
            />
        </div>
    );
}
function PageError({
    text,
    onRetry,
}) {
    return (
        <div className="flex min-h-[500px] flex-col items-center justify-center text-center">
            <RiAlarmWarningLine
                size={36}
                className="text-red-500"
            />
            <h2 className="mt-4 text-lg font-bold text-gray-900">
                Не удалось
                загрузить
                Dashboard
            </h2>
            <p className="mt-2 max-w-lg text-sm text-gray-500">
                {text}
            </p>
            <button
                type="button"
                onClick={
                    onRetry
                }
                className="mt-5 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700"
            >
                <RiRefreshLine />
                Повторить
            </button>
        </div>
    );
}


// MARK: Forecast chart — распределение риска по оборудованию (не временной ряд)
function ForecastChart({ items, height = 200 }) {
    const selected = items.slice(0, 8);
    if (!selected.length) return null;
    const names = selected.map((item) => equipmentName(item));
    const values = selected.map((item) => {
        const n = Number(item.probability);
        return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n * (n <= 1 ? 100 : 1)))) : 0;
    });
    const options = {
        chart: { type: "area", toolbar: { show: false }, zoom: { enabled: false }, fontFamily: "inherit", animations: { enabled: true, speed: 450 } },
        colors: ["#4f46e5"],
        stroke: { curve: "smooth", width: 2.5 },
        fill: { type: "gradient", gradient: { shadeIntensity: 0, opacityFrom: 0.24, opacityTo: 0.015, stops: [0, 95, 100] } },
        markers: { size: 4, colors: ["#fff"], strokeColors: "#4f46e5", strokeWidth: 2, hover: { size: 6 } },
        dataLabels: { enabled: false },
        xaxis: { categories: names.map((_, i) => `№${i + 1}`), labels: { style: { colors: "#94a3b8", fontSize: "10px" } }, axisBorder: { show: false }, axisTicks: { show: false }, tooltip: { enabled: false } },
        yaxis: { min: 0, max: 100, tickAmount: 4, labels: { formatter: (v) => `${Math.round(v)}%`, style: { colors: "#94a3b8", fontSize: "10px" } } },
        grid: { borderColor: "#f1f5f9", strokeDashArray: 4, padding: { top: 5, right: 12, left: 4, bottom: 0 } },
        tooltip: { x: { formatter: (_, opts) => names[opts.dataPointIndex] || "Оборудование" }, y: { formatter: (v) => `${Math.round(v)}%` } },
        legend: { show: false }
    };
    return <Chart type="area" height={height} width="100%" options={options} series={[{ name: "Риск отказа", data: values }]} />;
}
