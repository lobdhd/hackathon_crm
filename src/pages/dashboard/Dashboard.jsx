import { memo, useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import { useNavigate } from "react-router-dom";
import {
    RiAlarmWarningLine,
    RiArrowRightLine,
    RiCheckboxCircleLine,
    RiFlashlightLine,
    RiLoader4Line,
    RiMapPinLine,
    RiPieChart2Line,
    RiRefreshLine,
    RiSparkling2Line,
    RiTeamLine,
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
import { useExecutors } from "../../hooks/useReferences.js";
import { useWorkOrders } from "../../hooks/useWorkOrders.js";
import { t as i18nT, useI18n } from "../../i18n/index.js";
import "./Dashboard.css";

// MARK: Config
const ACTIVE_STATUSES = [
    "ISSUED", "QUEUED", "ACCEPTED", "IN_PROGRESS", "PAUSED", "REWORK",
];
const STATUS_LABELS = {
    ISSUED: "Выдан", QUEUED: "В очереди", ACCEPTED: "Принят",
    IN_PROGRESS: "В работе", PAUSED: "Приостановлен", COMPLETED: "Выполнен",
    AI_REVIEW: "На проверке", REWORK: "На доработке", CLOSED: "Закрыт",
    REJECTED: "Отклонён", CANCELLED: "Отменён",
};
const STATUS_COLORS = {
    ISSUED: "#3b82f6", QUEUED: "#94a3b8", ACCEPTED: "#6366f1",
    IN_PROGRESS: "#f59e0b", PAUSED: "#fbbf24", COMPLETED: "#22c55e",
    AI_REVIEW: "#8b5cf6", REWORK: "#fb923c", CLOSED: "#64748b",
    REJECTED: "#f87171", CANCELLED: "#cbd5e1",
};
const PRIORITY_LABELS = {
    EMERGENCY: "Аварийный", HIGH: "Высокий", NORMAL: "Обычный", PLANNED: "Плановый",
};
const STATUS_TONES = {
    ISSUED: "blue", QUEUED: "slate", ACCEPTED: "blue", IN_PROGRESS: "amber",
    PAUSED: "amber", COMPLETED: "green", AI_REVIEW: "violet", REWORK: "orange",
    CLOSED: "slate", REJECTED: "red", CANCELLED: "slate",
};
const PRIORITY_TONES = {
    EMERGENCY: "red", HIGH: "orange", NORMAL: "blue", PLANNED: "slate",
};
const EXECUTOR_STATUS = {
    AVAILABLE: { label: "Свободен", tone: "green" },
    BUSY: { label: "В работе", tone: "orange" },
    QUEUED: { label: "Есть очередь", tone: "blue" },
    OFF_SHIFT: { label: "Не на смене", tone: "slate" },
};
const SEVERITY_COLORS = ["#20b36b", "#a2ca57", "#e5b940", "#f48035", "#e94553"];
const SEVERITY_LABELS = ["Низкая", "Умеренная", "Средняя", "Высокая", "Критическая"];
// Сплошной цвет по проценту риска: зелёный → жёлтый → оранжевый → красный (как в аналитике).
const RISK_STOPS = [
    [0, "#20b36b"],
    [30, "#8fcf5c"],
    [50, "#e5b940"],
    [80, "#f48035"],
    [100, "#e94553"],
];
const GAUGE_ARC = "M 20 120 A 100 100 0 0 1 220 120";
const EMPTY = [];

// MARK: Helpers
function asArray(value) {
    return Array.isArray(value) ? value : EMPTY;
}
function num(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}
function clampPercent(value) {
    return Math.max(0, Math.min(100, Number(value) || 0));
}
function formatMinutes(value) {
    const minutes = Math.max(0, Math.round(num(value)));
    if (minutes < 60) return `${minutes} мин`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours} ч ${rest} мин` : `${hours} ч`;
}
function formatRisk(value) {
    const numeric = num(value);
    return clampPercent(numeric <= 1 ? numeric * 100 : numeric);
}
function riskColor(value) {
    const percent = clampPercent(value);
    const highIndex = RISK_STOPS.findIndex(([limit]) => percent <= limit);
    if (highIndex <= 0) return RISK_STOPS[0][1];
    const [start, from] = RISK_STOPS[highIndex - 1];
    const [end, to] = RISK_STOPS[highIndex];
    const mix = (percent - start) / (end - start);
    const channels = [1, 3, 5].map((index) => {
        const a = parseInt(from.slice(index, index + 2), 16);
        const b = parseInt(to.slice(index, index + 2), 16);
        return Math.round(a + (b - a) * mix).toString(16).padStart(2, "0");
    });
    return `#${channels.join("")}`;
}
function initials(value) {
    return String(value || "")
        .trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
}
function shorten(value, limit = 16) {
    const text = String(value || "");
    return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}
function equipmentName(item) {
    if (typeof item?.equipment === "string") return item.equipment;
    return item?.equipment?.name || item?.name || `Оборудование #${item?.equipmentId ?? "—"}`;
}
function errorMessage(error) {
    return error?.response?.data?.error || error?.message || "Не удалось загрузить данные";
}
function tr(key, fallback) {
    const value = i18nT(key);
    return value && value !== key ? value : fallback;
}

// MARK: Page
export default function Dashboard() {
    useI18n();
    const localeToken = i18nT("sidebar.home");
    const navigate = useNavigate();
    const dashboardQuery = useAnalyticsDashboard();
    const forecastQuery = useFailureForecast(30);
    const anomaliesQuery = useAnalyticsAnomalies();
    const executorsQuery = useExecutors();
    const ordersQuery = useWorkOrders({
        status: ACTIVE_STATUSES,
        compact: true,
        limit: 24,
        offset: 0,
    });

    const dashboard = dashboardQuery.data || {};
    const forecasts = asArray(forecastQuery.data);
    const anomalies = asArray(anomaliesQuery.data);
    const executors = asArray(executorsQuery.data);
    const orders = asArray(ordersQuery.data?.items);

    const onShiftCount = executors.filter((person) => person.isOnShift).length;
    const freeCount = executors.filter((person) => person.isOnShift && person.employeeStatus === "AVAILABLE").length;
    const busyCount = Math.max(0, onShiftCount - freeCount);
    const loadPercent = onShiftCount ? (busyCount / onShiftCount) * 100 : 0;

    const onShiftExecutors = useMemo(() => (
        executors.filter((person) => person.isOnShift).sort((a, b) => {
            const aFree = a.employeeStatus === "AVAILABLE" ? 0 : 1;
            const bFree = b.employeeStatus === "AVAILABLE" ? 0 : 1;
            return aFree - bFree || String(a.fullName || "").localeCompare(String(b.fullName || ""), "ru");
        }).slice(0, 6)
    ), [executors]);
    const sortedForecasts = useMemo(() => (
        [...forecasts].sort((a, b) => formatRisk(b.probability) - formatRisk(a.probability)).slice(0, 5)
    ), [forecasts]);
    const importantAnomaly = useMemo(() => (
        [...anomalies].sort((a, b) => num(b.severity) - num(a.severity))[0] || null
    ), [anomalies]);
    const severityCounts = useMemo(() => (
        [1, 2, 3, 4, 5].map((level) => anomalies.filter((item) => Math.round(num(item.severity)) === level).length)
    ), [anomalies]);
    const statusCounts = useMemo(() => {
        const map = new Map();
        orders.forEach((order) => map.set(order.status, (map.get(order.status) || 0) + 1));
        return [...map.entries()]
            .map(([status, value]) => ({
                status,
                value,
                label: STATUS_LABELS[status] || status || "—",
                color: STATUS_COLORS[status] || "#94a3b8",
            }))
            .sort((a, b) => b.value - a.value);
    }, [orders]);
    const ordersTotal = num(ordersQuery.data?.total) || orders.length;

    const orderColumns = useMemo(() => [
        {
            field: "number",
            header: tr("ordersTable.order", "Наряд"),
            minWidth: 186,
            render: (order) => (
                <div className="dash-table-order">
                    <span className="dash-table-order__number">{order.number || `#${order.id}`}</span>
                    <span className="dash-table-order__description" title={order.description || ""}>
                        {order.description || "Без описания"}
                    </span>
                </div>
            ),
        },
        {
            key: "equipment",
            header: tr("sidebar.equipment", "Оборудование"),
            minWidth: 205,
            sortField: "equipmentName",
            sortValue: (order) => order.equipment?.name || "",
            render: (order) => (
                <div className="dash-table-order">
                    <span className="dash-table-order__main" title={order.equipment?.name || ""}>
                        {order.equipment?.name || "—"}
                    </span>
                    {order.equipment?.inventoryNumber && (
                        <span className="dash-table-order__description">{order.equipment.inventoryNumber}</span>
                    )}
                </div>
            ),
        },
        {
            key: "assignee",
            header: tr("ordersTable.assignee", "Исполнитель"),
            minWidth: 194,
            sortField: "assigneeName",
            sortValue: (order) => order.assignee?.fullName || "",
            render: (order) => <span className="dash-table-person">{order.assignee?.fullName || order.brigade?.name || "Не назначен"}</span>,
        },
        {
            field: "priority",
            header: tr("orderModal.priority", "Приоритет"),
            minWidth: 125,
            render: (order) => (
                <ToneBadge tone={PRIORITY_TONES[order.priority] || "slate"}>
                    {PRIORITY_LABELS[order.priority] || order.priority || "—"}
                </ToneBadge>
            ),
        },
        {
            field: "status",
            header: tr("employeeModal.status", "Статус"),
            minWidth: 145,
            render: (order) => (
                <ToneBadge tone={STATUS_TONES[order.status] || "slate"}>
                    {STATUS_LABELS[order.status] || order.status || "—"}
                </ToneBadge>
            ),
        },
    ], [localeToken]);

    async function refreshAll() {
        await Promise.allSettled([
            dashboardQuery.refetch(), forecastQuery.refetch(), anomaliesQuery.refetch(),
            executorsQuery.refetch(), ordersQuery.refetch(),
        ]);
    }

    if (dashboardQuery.isLoading && !dashboardQuery.data) {
        return <PageState loading title="Загружаем главную страницу" />;
    }
    if (dashboardQuery.isError && !dashboardQuery.data) {
        return <PageState title="Не удалось загрузить главную" description={errorMessage(dashboardQuery.error)} onRetry={refreshAll} />;
    }

    const stats = [
        {
            title: tr("dashboard.activeOrders", "Активные наряды"),
            value: num(dashboard.active),
            note: tr("pages.dashboard.dashboard.6ba2f90", "Работы в процессе"),
            icon: RiToolsLine,
            tone: "blue",
            onClick: () => navigate("/orders"),
        },
        {
            title: tr("kanban.overdue", "Просрочено"),
            value: num(dashboard.overdue),
            note: tr("pages.dashboard.dashboard.06745d6", "Требуют внимания"),
            icon: RiAlarmWarningLine,
            tone: num(dashboard.overdue) ? "red" : "green",
            onClick: () => navigate("/orders"),
        },
        {
            title: tr("pages.analytics.analytics.0f7ca97", "Оборудование в простое"),
            value: num(dashboard.equipmentInDowntime),
            note: tr("pages.dashboard.dashboard.2c2777e", "Остановленные единицы"),
            icon: RiTimeLine,
            tone: num(dashboard.equipmentInDowntime) ? "orange" : "green",
            onClick: () => navigate("/equipment"),
        },
        {
            title: tr("pages.dashboard.dashboard.849a585", "Средняя реакция"),
            value: formatMinutes(dashboard.averageReactionMinutes),
            note: `Выполнение: ${formatMinutes(dashboard.averageCompletionMinutes)}`,
            icon: RiFlashlightLine,
            tone: "blue",
            onClick: () => navigate("/analytics"),
        },
    ];

    const topAreas = asArray(dashboard.topAreas).slice(0, 5);

    return (
        <div className="dash-page mx-auto w-full max-w-[1800px] p-7">
            <header className="dash-heading">
                <div className="dash-heading__copy">
                    <h1>{tr("pages.dashboard.dashboard.d76b1bb", "Главная")}</h1>
                    <p>{tr("pages.dashboard.dashboard.08fe3eb", "Оперативная информация по производству")}</p>
                </div>
                <div className="dash-heading__actions">
                    <button
                        type="button"
                        className="dash-button dash-button--outline"
                        onClick={refreshAll}
                        aria-label="Обновить показатели"
                        title="Обновить показатели"
                        disabled={dashboardQuery.isFetching}
                    >
                        <RiRefreshLine size={17} className={dashboardQuery.isFetching ? "dash-spin" : ""} />
                        <span>Обновить</span>
                    </button>
                    <button type="button" className="dash-button dash-button--primary" onClick={() => navigate("/orders")}>
                        {tr("pages.dashboard.dashboard.1181a18", "Все наряды")}
                        <RiArrowRightLine size={18} />
                    </button>
                </div>
            </header>

            {/* HERO + KPI */}
            <div className="dash-top-grid">
                <div className="dash-hero">
                    <div className="dash-hero__top">
                        <span>Загрузка смены</span>
                        <span className="dash-hero__icon"><RiTeamLine size={19} /></span>
                    </div>
                    <div className="dash-hero__summary">
                        <strong>{busyCount}</strong>
                        <span>из {onShiftCount} исполнителей заняты · {freeCount} свободных</span>
                    </div>
                    {executorsQuery.isError && !executorsQuery.data ? (
                        <InlineError error={executorsQuery.error} onRetry={executorsQuery.refetch} />
                    ) : executorsQuery.isLoading && !executorsQuery.data ? (
                        <PanelLoading />
                    ) : (
                        <LoadGauge percent={loadPercent} empty={!onShiftCount} />
                    )}
                </div>
                <div className="dash-kpis">
                    {stats.map((item) => <StatCard key={item.title} {...item} />)}
                </div>
            </div>

            {/* ORDERS + EXECUTORS */}
            <div className="dash-main-grid">
                <section className="dash-panel dash-panel--orders">
                    <PanelHeader
                        title={tr("dashboard.activeOrders", "Активные наряды")}
                        description="Открытые работы и текущие статусы"
                        icon={RiToolsLine}
                        action={
                            <button type="button" className="dash-link" onClick={() => navigate("/orders")}>
                                Все наряды <RiArrowRightLine size={16} />
                            </button>
                        }
                    />
                    <div className="dash-orders__meta">
                        <span className="dash-indicator" />
                        <span>{ordersQuery.data?.total ?? orders.length} в работе</span>
                        {ordersQuery.isFetching && <RiLoader4Line size={14} className="dash-spin" />}
                    </div>
                    <div className="dash-orders__table">
                        {ordersQuery.isError && !ordersQuery.data ? (
                            <InlineError error={ordersQuery.error} onRetry={ordersQuery.refetch} />
                        ) : ordersQuery.isLoading && !ordersQuery.data ? (
                            <PanelLoading />
                        ) : (
                            <SmartTable
                                data={orders}
                                columns={orderColumns}
                                dataKey="id"
                                mode="sort"
                                compact
                                striped
                                stickyHeader
                                minWidth={850}
                                scrollHeight="395px"
                                rowClassName={() => "cursor-pointer"}
                                onRowClick={(order) => navigate(`/orders/${order.id}`)}
                                emptyText={tr("employeeDetails.noActiveOrders", "Активных нарядов нет")}
                                emptyDescription="На текущий момент открытых работ нет"
                            />
                        )}
                    </div>
                </section>

                <section className="dash-panel dash-panel--executors">
                    <PanelHeader
                        title={tr("pages.dashboard.dashboard.f1bdaed", "Исполнители на смене")}
                        description={`${onShiftCount} на смене · ${freeCount} свободных`}
                        icon={RiUserLine}
                        action={<span className="dash-counter">{onShiftCount}</span>}
                    />
                    <div className="dash-executors__list">
                        {executorsQuery.isError && !executorsQuery.data ? (
                            <InlineError error={executorsQuery.error} onRetry={executorsQuery.refetch} />
                        ) : executorsQuery.isLoading && !executorsQuery.data ? (
                            <PanelLoading />
                        ) : onShiftExecutors.length ? (
                            onShiftExecutors.map((person) => (
                                <ExecutorRow
                                    key={person.id}
                                    employee={person}
                                    onClick={() => navigate(`/employees/${person.id}`)}
                                />
                            ))
                        ) : <EmptyBlock text={tr("pages.dashboard.dashboard.b417908", "На смене пока нет исполнителей")} />}
                    </div>
                    <button type="button" className="dash-panel__footer" onClick={() => navigate("/employees")}>
                        {tr("pages.dashboard.dashboard.6fc64f4", "Все исполнители")}
                        <RiArrowRightLine size={16} />
                    </button>
                </section>
            </div>

            {/* FORECAST + STATUSES + ANOMALY */}
            <div className="dash-insights-grid">
                <section className="dash-panel dash-panel--forecast">
                    <PanelHeader
                        title={tr("pages.analytics.analytics.b89121c", "Прогноз отказов")}
                        description="Риск по оборудованию на 30 дней"
                        icon={RiFlashlightLine}
                        action={""}
                    />
                    <div className="dash-panel__content">
                        {forecastQuery.isLoading ? <PanelLoading /> : forecastQuery.isError && !forecastQuery.data ? (
                            <InlineError error={forecastQuery.error} onRetry={forecastQuery.refetch} />
                        ) : sortedForecasts.length ? (
                            <>
                                <ForecastRings items={sortedForecasts} />
                                <div className="dash-risk-list">
                                    {sortedForecasts.map((item, index) => (
                                        <ForecastRow key={item.equipmentId ?? index} item={item} onClick={() => {
                                            if (item.equipmentId != null) navigate(`/equipment/${item.equipmentId}`);
                                        }} />
                                    ))}
                                </div>
                            </>
                        ) : <EmptyBlock text="Прогноз пока не сформирован" />}
                    </div>
                </section>

                <section className="dash-panel dash-panel--statuses">
                    <PanelHeader
                        title="Структура нарядов"
                        description={ordersTotal > orders.length
                            ? `Выборка ${orders.length} из ${ordersTotal}`
                            : "Активные наряды по статусам"}
                        icon={RiPieChart2Line}
                    />
                    <div className="dash-panel__content">
                        {ordersQuery.isLoading && !ordersQuery.data ? <PanelLoading /> : statusCounts.length ? (
                            <StatusDonut counts={statusCounts} total={orders.length} />
                        ) : <EmptyBlock text="Активных нарядов нет" />}
                    </div>
                </section>

                <section className="dash-panel dash-panel--anomaly">
                    <PanelHeader 
                        title={tr("pages.dashboard.dashboard.33cd729", "Аномалии")}
                        description="Приоритетные события, требующие внимания"
                        icon={RiSparkling2Line}
                        action={<button type="button" className="dash-link" onClick={() => navigate("/analytics")}>Аналитика <RiArrowRightLine size={16} /></button>}
                    />
                    <div className="dash-panel__content dash-anomaly-content">
                        {anomaliesQuery.isLoading ? <PanelLoading /> : anomaliesQuery.isError && !anomaliesQuery.data ? (
                            <InlineError error={anomaliesQuery.error} onRetry={anomaliesQuery.refetch} />
                        ) : importantAnomaly ? (
                            <AnomalyCard
                                anomaly={importantAnomaly}
                                counts={severityCounts}
                                onOpen={() => navigate("/analytics")}
                            />
                        ) : (
                            <div className="dash-anomaly-clean">
                                <span className="dash-anomaly-clean__icon"><RiCheckboxCircleLine size={25} /></span>
                                <h3>{tr("pages.dashboard.dashboard.6480cd8", "Критических аномалий нет")}</h3>
                                <p>{tr("pages.dashboard.dashboard.83fd28a", "Система не обнаружила событий, требующих вмешательства")}</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            <div className="dash-subsection-title">
                <div>
                    <h2>Сводка за 30 дней</h2>
                    <p>Оборудование, участки и исполнители</p>
                </div>
            </div>
            <div className="dash-ranking-grid">
                <RankingPanel
                    title={tr("pages.analytics.analytics.101358d", "Проблемное оборудование")}
                    subtitle="Количество аварийных нарядов"
                    icon={RiToolsLine}
                >
                    <RankingList
                        items={asArray(dashboard.topEquipment).slice(0, 5)}
                        getTitle={(item) => item.name || `Оборудование #${item.equipmentId}`}
                        getValue={(item) => num(item._count)}
                        formatValue={(value) => `${value} аварий`}
                        onRowClick={(item) => item.equipmentId != null && navigate(`/equipment/${item.equipmentId}`)}
                        colorOf={(ratio) => riskColor(ratio * 100)}
                    />
                </RankingPanel>
                <RankingPanel
                    title={tr("ratingTable.areas", "Участки")}
                    subtitle="Аварийность на единицу оборудования"
                    icon={RiMapPinLine}
                >
                    {topAreas.length >= 3 ? (
                        <AreasRadar items={topAreas} />
                    ) : (
                        <RankingList
                            items={topAreas}
                            getTitle={(item) => item.name || `Участок #${item.areaId}`}
                            getValue={(item) => num(item.emergenciesPerUnit)}
                            formatValue={(value) => `${value.toFixed(2)} / ед.`}
                            colorOf={(ratio) => riskColor(ratio * 100)}
                        />
                    )}
                </RankingPanel>
                <RankingPanel
                    title={tr("pages.dashboard.dashboard.64823bc", "Лучшие исполнители")}
                    subtitle="Средняя оценка за 30 дней"
                    icon={RiUserLine}
                >
                    <RankingList
                        items={asArray(dashboard.topExecutors).slice(0, 5)}
                        getTitle={(item) => item.fullName || "Исполнитель"}
                        getValue={(item) => num(item.score)}
                        formatValue={(value) => `${value.toFixed(1)} / 5`}
                        scaleMax={5}
                        avatar
                        onRowClick={(item) => {
                            const executorId = item.executorId ?? item.id;
                            if (executorId != null) navigate(`/employees/${executorId}`);
                        }}
                        colorOf={() => "#2563eb"}
                    />
                </RankingPanel>
            </div>
        </div>
    );
}

// MARK: KPI / panel chrome
function StatCard({ title, value, note, icon: Icon, tone, onClick }) {
    return (
        <button type="button" className={`dash-stat dash-tone--${tone}`} onClick={onClick}>
            <span className="dash-stat__text">
                <span className="dash-stat__label">{title}</span>
                <strong className="dash-stat__value">{value}</strong>
                <span className="dash-stat__note">{note}</span>
            </span>
            <span className="dash-stat__icon"><Icon size={24} /></span>
        </button>
    );
}

function PanelHeader({ title, description, icon: Icon, action }) {
    return (
        <div className="dash-panel__header">
            <div className="dash-panel__titles">
                <h2>{title}</h2>
                {description && <p>{description}</p>}
            </div>
            <div className="dash-panel__aside">
                {action}
                <span className="dash-panel__icon"><Icon size={18} /></span>
            </div>
        </div>
    );
}

function ToneBadge({ tone = "slate", children }) {
    return <span className={`dash-badge dash-badge--${tone}`}>{children}</span>;
}

// MARK: Gauge (SVG полукруг загрузки смены)
function LoadGauge({ percent, empty }) {
    const [shown, setShown] = useState(0);
    useEffect(() => {
        const id = requestAnimationFrame(() => setShown(clampPercent(percent)));
        return () => cancelAnimationFrame(id);
    }, [percent]);
    const label = empty ? "На смене никого нет" : `Загрузка смены ${Math.round(clampPercent(percent))}%`;
    return (
        <div className="dash-gauge" role="img" aria-label={label}>
            <svg className="dash-gauge__svg" viewBox="0 0 240 132" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
                <defs>
                    <linearGradient id="dash-gauge-gradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#7dd3fc" />
                        <stop offset="55%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#1d4ed8" />
                    </linearGradient>
                </defs>
                <path d={GAUGE_ARC} pathLength="100" className="dash-gauge__track" />
                <path
                    d={GAUGE_ARC}
                    pathLength="100"
                    className="dash-gauge__value"
                    strokeDasharray={`${shown} 100`}
                    style={{ opacity: shown > 0.3 ? 1 : 0 }}
                />
                <text x="20" y="131" className="dash-gauge__edge" textAnchor="middle">0</text>
                <text x="220" y="131" className="dash-gauge__edge" textAnchor="middle">100</text>
            </svg>
            <div className="dash-gauge__metric" aria-hidden="true">
                <strong>{empty ? "—" : `${Math.round(clampPercent(percent))}%`}</strong>
                <span>загрузка смены</span>
            </div>
        </div>
    );
}

// MARK: Executors
function ExecutorRow({ employee, onClick }) {
    const status = EXECUTOR_STATUS[employee.employeeStatus] || EXECUTOR_STATUS.OFF_SHIFT;
    return (
        <button type="button" onClick={onClick} className="dash-executor">
            <span className="dash-executor__avatar">{initials(employee.fullName)}</span>
            <span className="dash-executor__identity">
                <span className="dash-executor__name" title={employee.fullName}>{employee.fullName}</span>
                <span className="dash-executor__specialty">
                    {employee.specialty || "Специальность не указана"}
                    {employee.grade ? ` · ${employee.grade} разряд` : ""}
                </span>
            </span>
            <ToneBadge tone={status.tone}>{employee.statusText || status.label}</ToneBadge>
        </button>
    );
}

// MARK: Forecast — концентрические кольца риска
const ForecastRings = memo(function ForecastRings({ items }) {
    const values = items.map((item) => Math.round(formatRisk(item.probability)));
    const names = items.map((item) => shorten(equipmentName(item), 22));
    const signature = `${values.join(",")}|${names.join(",")}`;
    const options = useMemo(() => ({
        chart: {
            type: "radialBar",
            background: "transparent",
            fontFamily: "inherit",
            sparkline: { enabled: true },
            animations: { enabled: true, speed: 700 },
        },
        colors: values.map(riskColor),
        labels: names,
        stroke: { lineCap: "round" },
        fill: { type: "solid", opacity: 1 },
        plotOptions: {
            radialBar: {
                startAngle: -135,
                endAngle: 135,
                hollow: { size: "32%", background: "transparent" },
                track: { background: "#e3ecfa", strokeWidth: "100%", margin: 5 },
                dataLabels: {
                    name: { show: true, fontSize: "11px", fontWeight: 600, color: "#7f97b2", offsetY: 22 },
                    value: {
                        show: true,
                        fontSize: "28px",
                        fontWeight: 800,
                        color: "#153454",
                        offsetY: -14,
                        formatter: (value) => `${Math.round(value)}%`,
                    },
                    total: {
                        show: true,
                        label: "Макс. риск",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#7f97b2",
                        formatter: () => `${Math.max(...values)}%`,
                    },
                },
            },
        },
        states: { hover: { filter: { type: "none" } }, active: { filter: { type: "none" } } },
        legend: { show: false },
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [signature]);
    return (
        <div className="dash-rings" aria-label="Вероятность отказа по оборудованию">
            <Chart type="radialBar" options={options} series={values} height={285} width="100%" />
        </div>
    );
});

function ForecastRow({ item, onClick }) {
    const risk = Math.round(formatRisk(item.probability));
    return (
        <button type="button" className="dash-risk-row" onClick={onClick} disabled={item.equipmentId == null}>
            <span className="dash-risk-row__dot" style={{ backgroundColor: riskColor(risk) }} />
            <span className="dash-risk-row__name" title={equipmentName(item)}>{equipmentName(item)}</span>
            <span className="dash-risk-row__failures">Отказов: {num(item.recentFailures)}</span>
            <span className="dash-risk-row__value">{risk}%</span>
            {item.equipmentId != null && <RiArrowRightLine size={15} className="dash-risk-row__arrow" />}
        </button>
    );
}

// MARK: Statuses — бублик
const StatusDonut = memo(function StatusDonut({ counts, total }) {
    const signature = counts.map((item) => `${item.status}:${item.value}`).join("|");
    const options = useMemo(() => ({
        chart: {
            type: "donut",
            background: "transparent",
            fontFamily: "inherit",
            animations: { enabled: true, speed: 600 },
        },
        labels: counts.map((item) => item.label),
        colors: counts.map((item) => item.color),
        stroke: { width: 4, colors: ["#f4f8ff"] },
        dataLabels: { enabled: false },
        plotOptions: {
            pie: {
                expandOnClick: false,
                donut: {
                    size: "74%",
                    labels: {
                        show: true,
                        name: { show: true, fontSize: "11px", fontWeight: 600, color: "#7f97b2", offsetY: -8 },
                        value: { show: true, fontSize: "30px", fontWeight: 800, color: "#153454", offsetY: 6 },
                        total: {
                            show: true,
                            showAlways: true,
                            label: "Всего",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "#7f97b2",
                            formatter: () => String(total),
                        },
                    },
                },
            },
        },
        legend: {
            show: true,
            position: "bottom",
            fontSize: "12px",
            fontWeight: 600,
            labels: { colors: "#57718e" },
            markers: { size: 6, offsetX: -2 },
            itemMargin: { horizontal: 8, vertical: 4 },
        },
        states: { hover: { filter: { type: "none" } }, active: { filter: { type: "none" } } },
        tooltip: { y: { formatter: (value) => `${value} нар.` } },
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [signature, total]);
    return (
        <div className="dash-donut" aria-label="Распределение активных нарядов по статусам">
            <Chart type="donut" options={options} series={counts.map((item) => item.value)} height={330} width="100%" />
        </div>
    );
});

// MARK: Anomaly
function AnomalyCard({ anomaly, counts, onOpen }) {
    const severity = num(anomaly.severity);
    const tone = severity >= 4 ? "red" : severity >= 3 ? "orange" : "blue";
    const location = [anomaly.area?.name, anomaly.equipment?.name].filter(Boolean).join(" · ");
    const total = counts.reduce((sum, value) => sum + value, 0);
    return (
        <div className="dash-anomaly">
            <div className="dash-anomaly__top">
                <ToneBadge tone={tone}>Важность {severity}/5</ToneBadge>
                {anomaly.type && <span className="dash-anomaly__type">{anomaly.type}</span>}
            </div>
            <h3>{anomaly.title || "Обнаружена аномалия"}</h3>
            <p className="dash-anomaly__description">{anomaly.description || "Необычное событие в производственных данных"}</p>
            {anomaly.recommendation && (
                <div className="dash-anomaly__recommendation">
                    <span><RiSparkling2Line size={16} /> Рекомендация</span>
                    <p>{anomaly.recommendation}</p>
                </div>
            )}
            {total > 1 && (
                <div className="dash-spectrum" aria-label="Распределение аномалий по важности">
                    <div className="dash-spectrum__bar">
                        {counts.map((count, index) => count > 0 && (
                            <span
                                key={index}
                                className="dash-spectrum__seg"
                                style={{ flexGrow: count, backgroundColor: SEVERITY_COLORS[index] }}
                                title={`${SEVERITY_LABELS[index]}: ${count}`}
                            />
                        ))}
                    </div>
                    <div className="dash-spectrum__legend">
                        {counts.map((count, index) => count > 0 && (
                            <span key={index}>
                                <i style={{ backgroundColor: SEVERITY_COLORS[index] }} />
                                {SEVERITY_LABELS[index]} · {count}
                            </span>
                        ))}
                    </div>
                </div>
            )}
            <div className="dash-anomaly__bottom">
                <span className="dash-anomaly__location" title={location}>{location || "Производство"}</span>
                <button type="button" className="dash-link" onClick={onOpen}>Подробнее <RiArrowRightLine size={16} /></button>
            </div>
        </div>
    );
}

// MARK: Rankings
function RankingPanel({ title, subtitle, icon, children }) {
    return (
        <section className="dash-panel dash-ranking">
            <PanelHeader title={title} description={subtitle} icon={icon} />
            <div className="dash-ranking__body">{children}</div>
        </section>
    );
}

function RankingList({ items, getTitle, getValue, formatValue, onRowClick, colorOf, scaleMax, avatar = false }) {
    if (!items.length) return <EmptyBlock text="Данных пока нет" />;
    const max = scaleMax || Math.max(0.0001, ...items.map(getValue));
    return (
        <div className="dash-ranking__list">
            {items.map((item, index) => {
                const value = getValue(item);
                const ratio = Math.max(0, Math.min(1, value / max));
                const title = getTitle(item);
                const content = (
                    <>
                        {avatar ? (
                            <span className="dash-ranking__avatar">{initials(title)}</span>
                        ) : (
                            <span className="dash-ranking__position">{String(index + 1).padStart(2, "0")}</span>
                        )}
                        <span className="dash-ranking__details">
                            <span className="dash-ranking__rowline">
                                <span className="dash-ranking__name" title={title}>{title}</span>
                                <span className="dash-ranking__value">{formatValue(value)}</span>
                            </span>
                            <span className="dash-ranking__track">
                                <span className="dash-ranking__fill" style={{ width: `${ratio * 100}%`, backgroundColor: colorOf(ratio) }} />
                            </span>
                        </span>
                    </>
                );
                const key = item.id ?? item.equipmentId ?? item.areaId ?? index;
                return onRowClick ? (
                    <button type="button" className="dash-ranking__row dash-ranking__row--clickable" key={key} onClick={() => onRowClick(item)}>
                        {content}
                    </button>
                ) : (
                    <div className="dash-ranking__row" key={key}>{content}</div>
                );
            })}
        </div>
    );
}

// Радар по участкам: аварийность на единицу оборудования
const AreasRadar = memo(function AreasRadar({ items }) {
    const names = items.map((item) => shorten(item.name || `Участок #${item.areaId}`, 15));
    const values = items.map((item) => Number(num(item.emergenciesPerUnit).toFixed(2)));
    const signature = `${names.join(",")}|${values.join(",")}`;
    const options = useMemo(() => ({
        chart: {
            type: "radar",
            background: "transparent",
            fontFamily: "inherit",
            toolbar: { show: false },
            zoom: { enabled: false },
            animations: { enabled: true, speed: 600 },
            dropShadow: { enabled: true, blur: 8, left: 0, top: 4, opacity: 0.12, color: "#2563eb" },
        },
        colors: ["#2563eb"],
        stroke: { width: 2.5, colors: ["#2563eb"] },
        fill: { type: "solid", opacity: 0.2, colors: ["#3b82f6"] },
        markers: { size: 5, colors: ["#fff"], strokeColors: "#2563eb", strokeWidth: 2, hover: { size: 7 } },
        dataLabels: { enabled: false },
        xaxis: {
            categories: names,
            labels: { style: { colors: names.map(() => "#5c7594"), fontSize: "11px", fontWeight: 600 } },
        },
        yaxis: { show: false, min: 0 },
        plotOptions: {
            radar: {
                size: 100,
                polygons: { strokeColors: "#dbe6f5", connectorColors: "#dbe6f5", fill: { colors: ["rgba(255,255,255,.35)", "rgba(239,246,255,.55)"] } },
            },
        },
        legend: { show: false },
        tooltip: { y: { formatter: (value) => `${Number(value).toFixed(2)} / ед.` } },
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [signature]);
    return (
        <div className="dash-radar" aria-label="Аварийность на единицу оборудования по участкам">
            <Chart type="radar" options={options} series={[{ name: "Аварийность", data: values }]} height={300} width="100%" />
        </div>
    );
});

// MARK: States
function EmptyBlock({ text }) {
    return <div className="dash-empty">{text}</div>;
}
function PanelLoading() {
    return <div className="dash-panel-loading"><RiLoader4Line size={24} className="dash-spin" /> Загрузка...</div>;
}
function InlineError({ error, onRetry }) {
    return (
        <div className="dash-inline-error">
            <RiAlarmWarningLine size={19} />
            <span>{errorMessage(error)}</span>
            <button type="button" onClick={onRetry}>Повторить</button>
        </div>
    );
}
function PageState({ loading, title, description, onRetry }) {
    return (
        <div className="dash-page mx-auto w-full max-w-[1800px] p-7">
            <div className="dash-page-state">
                {loading ? <RiLoader4Line size={32} className="dash-spin" /> : <RiAlarmWarningLine size={32} />}
                <h2>{title}</h2>
                {description && <p>{description}</p>}
                {onRetry && <button type="button" className="dash-button dash-button--primary" onClick={onRetry}><RiRefreshLine /> Повторить</button>}
            </div>
        </div>
    );
}
