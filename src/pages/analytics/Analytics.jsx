import Chart from "react-apexcharts";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
    RiAlarmWarningLine,
    RiBarChartBoxLine,
    RiCheckboxCircleLine,
    RiFlashlightLine,
    RiLoader4Line,
    RiMapPinLine,
    RiRefreshLine,
    RiSparkling2Line,
    RiSpeedLine,
    RiTimeLine,
    RiToolsLine,
} from "react-icons/ri";
import SmartTable from "../../react-components/SmartTable/SmartTable.jsx";
import GlideSelect from "../../react-components/GlideSelect/GlideSelect.jsx";
import RubberSegment from "../../react-components/RubberSegment/RubberSegment.jsx";
import {
    useAnalyticsAnomalies,
    useAnalyticsDashboard,
    useFailureForecast,
    useRunAnalyticsAnomalies,
} from "../../hooks/useAnalytics.js";
import { useDowntimeReport, useShiftReport } from "../../hooks/useReports.js";
import { useAreas } from "../../hooks/useReferences.js";
import { useI18n } from "../../i18n/index.js";
import { t as i18nT } from "../../i18n/index.js";
import "./Analytics.css";
import "./AnalyticsLoading.css";
// MARK: Tokens
const INDIGO = "#2563eb";
// Сплошной цвет по проценту риска: зелёный → жёлтый → оранжевый → красный.
const RISK_STOPS = [
    [0, "#20b36b"],
    [30, "#8fcf5c"],
    [50, "#e5b940"],
    [80, "#f48035"],
    [100, "#e94553"],
];
function clampPercent(value) {
    return Math.max(0, Math.min(100, Number(value) || 0));
}
// API: probability в долях (0..1); также принимаем уже готовые проценты (0..100).
function probabilityPercent(value) {
    const hasPercentSign = typeof value === "string" && value.includes("%");
    const parsed = typeof value === "string"
        ? Number(value.replace("%", "").replace(",", ".").trim())
        : Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return clampPercent(!hasPercentSign && parsed <= 1 ? parsed * 100 : parsed);
}
const percentFormatter = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });
function displayPercent(value) {
    return `${percentFormatter.format(Math.round(clampPercent(value) * 10) / 10)}%`;
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
// MARK: Config
const PERIODS = () => [
    { value: "shift", label: i18nT("reportModal.shift"), days: 1 },
    { value: "day", label: i18nT("pages.analytics.analytics.81e7619"), days: 1 },
    { value: "week", label: i18nT("analyticsPage.week"), days: 7 },
    { value: "month", label: i18nT("reportModal.thirtyDays"), days: 30 },
];
const ANOMALY_TYPES = () => [
    { value: "", label: i18nT("pages.analytics.analytics.32a2cfd") },
    { value: "FREQUENT_FAILURES", label: i18nT("pages.analytics.analytics.91b6362") },
    { value: "REPEATED_FAULT", label: i18nT("pages.analytics.analytics.a6d8e7b") },
    {
        value: "FAILURE_AFTER_PLANNED_MAINTENANCE",
        label: i18nT("pages.analytics.analytics.ebc8df2"),
    },
    { value: "MATERIAL_ANOMALY", label: i18nT("pages.analytics.analytics.db68c6c") },
    { value: "AREA_HOTSPOT", label: i18nT("pages.analytics.analytics.a871901") },
    { value: "SHIFT_PATTERN", label: i18nT("pages.analytics.analytics.349d3d9") },
    { value: "TIME_OF_DAY", label: i18nT("pages.analytics.analytics.e3d751f") },
    {
        value: "EXECUTOR_REPEAT_FAILURES",
        label: i18nT("pages.analytics.analytics.1d44cc6"),
    },
    {
        value: "BRIGADE_REPEAT_FAILURES",
        label: i18nT("pages.analytics.analytics.15a05ac"),
    },
];
// MARK: Helpers
// Поддерживает старые локали, пока в ru.json/kk.json не обновлены переводы.
function completionCardTitle() {
    const label = i18nT("ratingPodium.closed");
    if (label === "Закрыто") return "Показатель завершения работ";
    if (label === "Жабылды") return "Жұмыстардың аяқталу көрсеткіші";
    return label;
}
function asArray(value) {
    return Array.isArray(value) ? value : [];
}
function formatMinutes(value) {
    const minutes = Math.max(0, Math.round(Number(value) || 0));
    if (minutes < 60) return `${minutes} мин`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (!rest) return `${hours} ч`;
    return `${hours} ч ${rest} мин`;
}
function formatPercent(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    return `${Math.round(number * 100)}%`;
}
function extractError(error) {
    return error?.response?.data?.error || error?.message || "Ошибка загрузки данных";
}
function createPeriodRange(period) {
    const now = new Date();
    const from = new Date(now);
    if (period === "shift") from.setHours(from.getHours() - 12);
    else if (period === "day") from.setDate(from.getDate() - 1);
    else if (period === "week") from.setDate(from.getDate() - 7);
    else from.setDate(from.getDate() - 30);
    return { from: from.toISOString(), to: now.toISOString() };
}
// MARK: Page
export default function Analytics() {
    const __i18nLocaleToken = i18nT("sidebar.home");
    useI18n();
    const [period, setPeriod] = useState("week");
    const [areaId, setAreaId] = useState("");
    const [anomalyType, setAnomalyType] = useState("");
    const [analysisContext, setAnalysisContext] = useState(null);
    const areasQuery = useAreas();
    const dashboardQuery = useAnalyticsDashboard();
    const currentPeriod = PERIODS().find((item) => item.value === period) ?? PERIODS()[2];
    const reportParams = useMemo(
        () => ({ period, ...(areaId ? { areaId: Number(areaId) } : {}) }),
        [period, areaId, __i18nLocaleToken],
    );
    const shiftQuery = useShiftReport(reportParams);
    const downtimeQuery = useDowntimeReport(reportParams);
    const forecastQuery = useFailureForecast(currentPeriod.days);
    const anomaliesQuery = useAnalyticsAnomalies({
        ...(areaId ? { areaId: Number(areaId) } : {}),
        ...(anomalyType ? { type: anomalyType } : {}),
    });
    const runMutation = useRunAnalyticsAnomalies();
    const areas = asArray(areasQuery.data);
    const dashboard = dashboardQuery.data ?? {};
    const shift = shiftQuery.data ?? {};
    const downtime = downtimeQuery.data ?? {};
    const forecasts = asArray(forecastQuery.data);
    const anomalies = asArray(anomaliesQuery.data);
    const sortedForecast = useMemo(
        () => [...forecasts].sort((a, b) => probabilityPercent(b.probability) - probabilityPercent(a.probability)),
        [forecasts, __i18nLocaleToken],
    );
    const sortedAnomalies = useMemo(
        () => [...anomalies].sort((a, b) => Number(b.severity) - Number(a.severity)),
        [anomalies, __i18nLocaleToken],
    );
    const downtimeEquipment = asArray(downtime.byEquipment);
    const topForecast = useMemo(() => sortedForecast.slice(0, 8), [sortedForecast, __i18nLocaleToken]);
    // Результат ручного AI-пересчёта не должен попадать в другой период/участок.
    const aiResult = analysisContext === `${period}:${areaId}` ? runMutation.data?.ai : null;
    const executors = Number(shift.workload?.executorsOnShift ?? 0);
    const busy = Number(shift.workload?.busy ?? 0);
    const loadPercent = executors ? (busy / executors) * 100 : 0;
    const issued = Number(shift.issued ?? 0);
    const closed = Number(shift.closed ?? 0);
    const closedPercent = issued > 0 ? clampPercent((closed / issued) * 100) : null;
    const downtimeColumns = useMemo(
        () => [
            {
                key: "equipment",
                header: i18nT("sidebar.equipment"),
                width: "34%",
                minWidth: 200,
                sortField: "equipmentName",
                sortValue: (row) => row.equipment?.name ?? row.equipment ?? "",
                render: (row) => (
                    <div className="an-equip-cell">
                        <div className="an-cell-name">{row.equipment?.name || row.equipment || "—"}</div>
                        {row.area?.name && <div className="an-cell-sub">{row.area.name}</div>}
                    </div>
                ),
            },
            { field: "count", header: i18nT("pages.analytics.analytics.fb7e9a2"), width: "10%", minWidth: 82, align: "center" },
            {
                field: "minutes",
                header: i18nT("analytics.downtime.label"),
                width: "16%",
                minWidth: 110,
                sortValue: (row) => Number(row.minutes),
                render: (row) => <span className="an-cell-time">{formatMinutes(row.minutes)}</span>,
            },
            {
                field: "plannedMinutes",
                header: i18nT("priority.planned"),
                width: "13%",
                minWidth: 96,
                render: (row) => <span className="an-cell-time">{formatMinutes(row.plannedMinutes)}</span>,
            },
            {
                field: "unplannedMinutes",
                header: i18nT("priority.emergency"),
                width: "17%",
                minWidth: 112,
                render: (row) => (
                    <span className="an-cell-time an-cell-danger">{formatMinutes(row.unplannedMinutes)}</span>
                ),
            },
            {
                field: "ongoing",
                header: i18nT("pages.dashboard.dashboard.2c2777e"),
                width: "10%",
                minWidth: 82,
                align: "center",
                render: (row) => row.ongoing ? (
                    <span className="an-pill an-pill--rose">{i18nT("pages.analytics.analytics.e04af96")}</span>
                ) : (
                    <span className="an-cell-off">{i18nT("pages.analytics.analytics.d0cd224")}</span>
                ),
            },
        ],
        [__i18nLocaleToken],
    );
    async function refreshAll() {
        await Promise.all([
            dashboardQuery.refetch(),
            shiftQuery.refetch(),
            downtimeQuery.refetch(),
            forecastQuery.refetch(),
            anomaliesQuery.refetch(),
        ]);
    }
    async function recalculate() {
        setAnalysisContext(`${period}:${areaId}`);
        const range = createPeriodRange(period);
        try {
            await runMutation.mutateAsync({
                ...range,
                ...(areaId ? { areaId: Number(areaId) } : {}),
            });
        } catch {
            // Ошибка отображается ниже.
        }
    }
    // Не размонтируем всю страницу при смене периода/фильтра.
    // Скелетоны отображаем только при отсутствии данных для выбранного ключа.
    // При фоновом refetch оставляем готовые данные на экране.
    const shiftLoading = isFirstLoad(shiftQuery);
    const downtimeLoading = isFirstLoad(downtimeQuery);
    const forecastLoading = isFirstLoad(forecastQuery);
    const anomaliesLoading = isFirstLoad(anomaliesQuery);
    return (
        <div className="an">
            {/* HEADER */}
            <div className="an-head">
                <div>
                    <h1 className="an-title">{i18nT("pages.analytics.analytics.4047521")}</h1>
                    <p className="an-subtitle">{i18nT("pages.analytics.analytics.5520929")}</p>
                </div>
                <div className="an-btn-row">
                    <button
                        type="button"
                        className="an-primary"
                        onClick={recalculate}
                        disabled={runMutation.isPending}
                    >
                        {runMutation.isPending ? (
                            <RiLoader4Line size={18} className="an-spin" />
                        ) : (
                            <RiSparkling2Line size={18} />
                        )}
                        {runMutation.isPending ? i18nT("pages.analytics.analytics.6eef3d0") : i18nT("pages.analytics.analytics.00e08d0")}
                    </button>
                </div>
            </div>
            {/* TOOLBAR */}
            <div className="an-glass an-toolbar">
                <RubberSegment
                    items={PERIODS()}
                    value={period}
                    onChange={setPeriod}
                    trackColor="#ffffff"
                    thumbColor="#2563eb"
                    textColor="#2563eb"
                    activeTextColor="#ffffff"
                    size="md"
                    radius={10}
                    inset={3}
                    equalSlots
                    draggable
                />
                <div className="an-toolbar__group">
                    <GlideSelect
                        className="glide-select--filter"
                        options={[
                            { value: "", label: i18nT("reportModal.allAreas") },
                            ...areas.map((area) => ({ value: String(area.id), label: area.name })),
                        ]}
                        value={areaId}
                        onChange={setAreaId}
                        portal
                    />
                    <GlideSelect
                        className="glide-select--filter"
                        options={ANOMALY_TYPES()}
                        value={anomalyType}
                        onChange={setAnomalyType}
                        portal
                    />
                </div>
            </div>
            {(shiftQuery.isError || downtimeQuery.isError) && (
                <div className="an-error">{extractError(shiftQuery.error || downtimeQuery.error)}</div>
            )}
            {/* HERO + KPI */}
            <div className="an-grid an-grid--top">
                <div className="an-hero">
                    <div className="an-hero__top">
                        <span>{completionCardTitle()}</span>
                        <span className="an-hero__icon"><RiCheckboxCircleLine size={19} /></span>
                    </div>
                    {shiftLoading ? (
                        <>
                            <div className="an-hero__summary" aria-hidden="true">
                                <Skeleton width={60} height={20} />
                                <Skeleton width={172} height={13} />
                            </div>
                            <div className="an-gauge an-gauge--skeleton" aria-hidden="true">
                                <span className="an-skeleton-gauge" />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="an-hero__summary">
                                <strong className="an-hero__value">{shiftQuery.isError && !shiftQuery.data ? "—" : closed}</strong>
                                <span className="an-hero__sub">{i18nT("pages.analytics.analytics.b98ccbc")} {issued} {i18nT("pages.analytics.analytics.e7be501")}</span>
                            </div>
                            {shiftQuery.isError && !shiftQuery.data ? (
                                <SectionError onRetry={() => shiftQuery.refetch()} />
                            ) : (
                                <StableClosedGauge percent={closedPercent} />
                            )}
                        </>
                    )}
                </div>
                <div className="an-kpis">
                    <KpiCard
                        label={i18nT("status.inProgress")}
                        loading={shiftLoading}
                        value={shift.inProgress ?? 0}
                        helper={i18nT("pages.analytics.analytics.6078ad9")}
                        icon={RiToolsLine}
                        tone="indigo"
                    />
                    <KpiCard
                        label={i18nT("kanban.overdue")}
                        loading={shiftLoading}
                        value={shift.overdue ?? 0}
                        helper={i18nT("pages.dashboard.dashboard.06745d6")}
                        icon={RiAlarmWarningLine}
                        tone="rose"
                    />
                    <KpiCard
                        label={i18nT("pages.analytics.analytics.deb5b8e")}
                        loading={downtimeLoading}
                        value={formatMinutes(downtime.totals?.minutes)}
                        helper={`${downtime.totals?.ongoing ?? 0} активных`}
                        icon={RiTimeLine}
                        tone="amber"
                    />
                    <KpiCard
                        label={i18nT("pages.dashboard.dashboard.849a585")}
                        value={formatMinutes(dashboard.averageReactionMinutes)}
                        helper={`Выполнение ${formatMinutes(dashboard.averageCompletionMinutes)}`}
                        icon={RiSpeedLine}
                        tone="pink"
                    />
                </div>
            </div>
            {/* FORECAST + WORKLOAD/AI */}
            <div className="an-grid an-grid--mid">
                <Card
                    title={i18nT("pages.analytics.analytics.b89121c")}
                    subtitle={`Горизонт: ${currentPeriod.days} дн.`}
                    icon={RiFlashlightLine}
                >
                    {forecastLoading ? (
                        <ForecastSkeleton />
                    ) : forecastQuery.isError && !forecastQuery.data ? (
                        <SectionError onRetry={() => forecastQuery.refetch()} />
                    ) : sortedForecast.length > 0 ? (
                        <>
                            <p className="an-hint">{i18nT("pages.analytics.analytics.f8c7a7a")}</p>
                            <StableForecastChart items={topForecast} height={260} />
                            <div className="an-flist">
                                {topForecast.map((item, index) => (
                                    <ForecastItem key={item.equipmentId} item={item} index={index} />
                                ))}
                            </div>
                        </>
                    ) : (
                        <EmptyBlock text="Прогноз отсутствует" />
                    )}
                </Card>
                <div className="an-stack">
                    <Card
                        title={i18nT("pages.analytics.analytics.f9f5658")}
                        subtitle={i18nT("pages.analytics.analytics.07e430b")}
                        icon={RiBarChartBoxLine}
                    >
                        {shiftLoading ? (
                            <WorkloadSkeleton />
                        ) : shiftQuery.isError && !shiftQuery.data ? (
                            <SectionError onRetry={() => shiftQuery.refetch()} />
                        ) : (
                        <div className="an-load">
                            <StableLoadRing label={i18nT("pages.analytics.analytics.ac491f6")} value={loadPercent} />
                            <div className="an-stats">
                                <MiniStat
                                    title={i18nT("pages.admin.admin.admin.958b816")}
                                    value={shift.workload?.executorsOnShift ?? 0}
                                />
                                <MiniStat
                                    title={i18nT("pages.analytics.analytics.90fc82e")}
                                    value={shift.workload?.busy ?? 0}
                                />
                                <MiniStat
                                    title={i18nT("pages.analytics.analytics.f3fd6df")}
                                    value={shift.workload?.free ?? 0}
                                />
                                <MiniStat
                                    title={i18nT("pages.analytics.analytics.0f7ca97")}
                                    value={shift.downtime?.equipmentInDowntimeNow ?? 0}
                                />
                            </div>
                        </div>
                        )}
                    </Card>
                    <Card
                        title={i18nT("pages.analytics.analytics.e3c205a")}
                        subtitle={i18nT("pages.analytics.analytics.5467c87")}
                        icon={RiSparkling2Line}
                    >
                        {shiftLoading ? (
                            <SummarySkeleton />
                        ) : (
                            <>
                                <p className="an-ai__text">
                                    {aiResult?.summary || shift.aiSummary || i18nT("pages.analytics.analytics.afa7e6c")}
                                </p>
                                {asArray(aiResult?.recommendations).map((item, index) => (
                                    <div key={`${item}-${index}`} className="an-rec">
                                        {item}
                                    </div>
                                ))}
                            </>
                        )}
                    </Card>
                </div>
            </div>
            {/* ANOMALIES + DOWNTIME */}
            <div className="an-grid an-grid--low">
                <Card
                    title={i18nT("pages.analytics.analytics.fb6342c")}
                    subtitle={`${sortedAnomalies.length} найдено`}
                    icon={RiSparkling2Line}
                >
                    {anomaliesLoading ? (
                        <AnomaliesSkeleton />
                    ) : anomaliesQuery.isError && !anomaliesQuery.data ? (
                        <SectionError onRetry={() => anomaliesQuery.refetch()} />
                    ) : sortedAnomalies.length > 0 ? (
                        <div className="an-fill">
                            <div className="an-fill__in">
                                <StableSeverityChart items={sortedAnomalies} />
                                <div className="an-scroll">
                                    {sortedAnomalies.map((item) => (
                                        <AnomalyItem key={item.id} item={item} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <EmptyBlock text="Аномалий не найдено" />
                    )}
                </Card>
                <Card
                    title={i18nT("analytics.downtime.title")}
                    subtitle={i18nT("pages.analytics.analytics.055384d")}
                    icon={RiTimeLine}
                >
                    <div className="an-tablewrap">
                        {downtimeLoading ? (
                            <TableSkeleton />
                        ) : downtimeQuery.isError && !downtimeQuery.data ? (
                            <SectionError onRetry={() => downtimeQuery.refetch()} />
                        ) : (
                        <SmartTable
                            data={downtimeEquipment}
                            columns={downtimeColumns}
                            dataKey="equipmentId"
                            mode="sort"
                            compact
                            striped
                            stickyHeader
                            className="an-downtime-table"
                            minWidth={940}
                            scrollHeight="clamp(440px, 56vh, 560px)"
                            emptyText={i18nT("pages.analytics.analytics.d96fa3b")}
                            emptyDescription={i18nT("pages.analytics.analytics.6362cee")}
                        />
                        )}
                    </div>
                </Card>
            </div>
            {/* TOPS */}
            <div className="an-grid an-grid--two" style={{ marginBottom: 0 }}>
                <Card
                    title={i18nT("pages.analytics.analytics.101358d")}
                    subtitle={i18nT("pages.analytics.analytics.c27d601")}
                    icon={RiToolsLine}
                >
                    <Ranking
                        items={asArray(dashboard.topEquipment)}
                        titleKey="name"
                        valueKey="_count"
                        suffix="аварий"
                    />
                </Card>
                <Card
                    title={i18nT("pages.analytics.analytics.e536c9b")}
                    subtitle={i18nT("pages.analytics.analytics.fe27183")}
                    icon={RiMapPinLine}
                >
                    <Ranking
                        items={asArray(dashboard.topAreas)}
                        titleKey="name"
                        valueKey="emergenciesPerUnit"
                        suffix="/ ед."
                    />
                </Card>
            </div>
        </div>
    );
}
// MARK: Local loading states
function isFirstLoad(query) {
    return !query.data && (query.isPending || query.isLoading);
}

function Skeleton({ width = "100%", height = 14, className = "" }) {
    return <span aria-hidden="true" className={`an-skeleton ${className}`} style={{ width, height }} />;
}

function SectionError({ onRetry }) {
    useI18n();
    return (
        <div className="an-inline-error" role="alert">
            <span>{i18nT("pages.admin.admin.admin.2502839")}</span>
            <button type="button" onClick={onRetry}>{i18nT("components.layout.appnavbar.b914bbb")}</button>
        </div>
    );
}

function ForecastSkeleton() {
    const heights = [32, 63, 45, 84, 55, 70, 38, 58];
    return (
        <div className="an-skeleton-forecast" aria-hidden="true">
            <Skeleton width="60%" height={12} />
            <div className="an-skeleton-chart">
                {heights.map((height, index) => (
                    <Skeleton key={index} className="an-skeleton-bar" height={`${height}%`} />
                ))}
            </div>
            {[0, 1, 2].map((index) => (
                <div key={index} className="an-skeleton-forecast-row">
                    <Skeleton width="65%" height={13} />
                    <Skeleton width="100%" height={7} />
                </div>
            ))}
        </div>
    );
}

function WorkloadSkeleton() {
    return (
        <div className="an-load" aria-hidden="true">
            <div className="an-ring">
                <span className="an-skeleton an-skeleton-ring" />
                <Skeleton width={118} height={12} />
            </div>
            <div className="an-stats">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="an-soft an-stat">
                        <Skeleton width="68%" height={12} />
                        <Skeleton width="42%" height={25} />
                    </div>
                ))}
            </div>
        </div>
    );
}

function SummarySkeleton() {
    return (
        <div className="an-skeleton-summary" aria-hidden="true">
            <Skeleton width="95%" height={13} />
            <Skeleton width="78%" height={13} />
            <Skeleton width="58%" height={13} />
        </div>
    );
}

function AnomaliesSkeleton() {
    return (
        <div className="an-skeleton-anomalies" aria-hidden="true">
            <div className="an-skeleton-donut" />
            {[0, 1, 2, 3].map((i) => (
                <div key={i} className="an-skeleton-anomaly-row">
                    <Skeleton width="70%" height={15} />
                    <Skeleton width="92%" height={11} />
                </div>
            ))}
        </div>
    );
}

function TableSkeleton() {
    return (
        <div className="an-skeleton-table" aria-hidden="true">
            {Array.from({ length: 7 }, (_, index) => (
                <div className="an-skeleton-table-row" key={index}>
                    <Skeleton width="90%" height={index === 0 ? 14 : 12} />
                    <Skeleton width="65%" height={12} />
                    <Skeleton width="76%" height={12} />
                    <Skeleton width="70%" height={12} />
                </div>
            ))}
        </div>
    );
}

// MARK: Card
function Card({ title, subtitle, icon: Icon, children }) {
    return (
        <section className="an-glass an-card">
            <div className="an-card__head">
                <div>
                    <h2 className="an-card__title">{title}</h2>
                    <p className="an-card__sub">{subtitle}</p>
                </div>
                <span className="an-card__ico">
                    <Icon size={18} />
                </span>
            </div>
            <div className="an-card__body">{children}</div>
        </section>
    );
}
// MARK: KPI
function KpiCard({ label, value, helper, icon: Icon, tone, loading = false }) {
    return (
        <div className="an-glass an-kpi">
            <div className="an-kpi__text">
                <div className="an-kpi__label">{label}</div>
                <div className="an-kpi__value">
                    {loading ? <Skeleton width={86} height={28} /> : value}
                </div>
                <div className="an-kpi__help">
                    {loading ? <Skeleton width={116} height={12} /> : helper}
                </div>
            </div>
            <span className={`an-kpi__icon an-tone--${tone}`}>
                <Icon size={24} />
            </span>
        </div>
    );
}
function MiniStat({ title, value }) {
    return (
        <div className="an-soft an-stat">
            <div className="an-stat__title">{title}</div>
            <div className="an-stat__value">{value}</div>
        </div>
    );
}
// MARK: Rings
// Semi-Circle Gauge на ApexCharts. Дуга занимает ширину карточки,
// а высоту карточки определяет только .an-grid--top (не размер графика).
function ClosedGauge({ percent }) {
    useI18n();
    const __i18nLocaleToken = i18nT("sidebar.home");
    const gaugeRef = useRef(null);
    const [space, setSpace] = useState({ width: 0, height: 0 });
    const hasData = percent !== null && percent !== undefined && Number.isFinite(Number(percent));
    const value = hasData ? clampPercent(percent) : 0;
    useEffect(() => {
        const element = gaugeRef.current;
        if (!element) return undefined;
        const measure = () => {
            const rect = element.getBoundingClientRect();
            const nextWidth = Math.max(0, Math.round(rect.width));
            const nextHeight = Math.max(0, Math.round(rect.height));
            setSpace((previous) => previous.width === nextWidth && previous.height === nextHeight
                ? previous : { width: nextWidth, height: nextHeight });
        };
        measure();
        const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
        if (observer) observer.observe(element);
        else window.addEventListener("resize", measure);
        return () => {
            observer?.disconnect();
            if (!observer) window.removeEventListener("resize", measure);
        };
    }, []);
    // ApexCharts резервирует часть холста вокруг дуги. Чуть больший
    // квадратный canvas компенсирует ВНУТРЕННИЕ поля библиотеки.
    // Радиус вычисляется от доступной ширины, а не от высоты блока.
    // В широких адаптивных карточках высота может ограничивать полукруг.
    // Для настоящих 180° максимальная ширина = две доступные высоты.
    const gaugeWidth = Math.max(0, Math.floor(Math.min(space.width, space.height * 2)));
    const chartSize = Math.round(gaugeWidth * 1.10);
    // Центр полукруга совпадает с нижним краем, но концы дуги
    // остаются внутри viewport с запасом под скругления.
    const endCapInset = gaugeWidth * 0.034;
    const chartOffsetY = Math.round((gaugeWidth - chartSize) / 2 - endCapInset - 5);
    const options = useMemo(() => ({
        chart: {
            type: "gauge",
            sparkline: { enabled: true },
            toolbar: { show: false },
            fontFamily: "inherit",
            animations: { enabled: true, speed: 400, animateGradually: { enabled: false } },
        },
        colors: [INDIGO],
        fill: { type: "solid", opacity: 1 },
        stroke: { lineCap: "round" },
        plotOptions: {
            radialBar: {
                startAngle: -90,
                endAngle: 90,
                offsetY: chartOffsetY,
                hollow: { size: "68%", background: "transparent", margin: 0 },
                track: {
                    show: true,
                    startAngle: -90,
                    endAngle: 90,
                    background: "#dbeafe",
                    strokeWidth: "100%",
                    margin: 0,
                },
                dataLabels: { show: false },
            },
        },
        grid: { padding: { top: 0, right: 0, bottom: 0, left: 0 } },
        tooltip: { enabled: false },
        states: {
            hover: { filter: { type: "none" } },
            active: { filter: { type: "none" } },
        },
    }), [chartOffsetY, __i18nLocaleToken]);
    return (
        <div
            ref={gaugeRef}
            className="an-gauge"
            role="img"
            aria-label={hasData ? `Завершено ${displayPercent(value)} нарядов` : "Нет выданных нарядов"}
        >
            <div className="an-gauge__viewport" style={{ width: gaugeWidth ? `${gaugeWidth}px` : "100%" }}>
                {gaugeWidth > 0 && (
                    <div className="an-gauge__canvas">
                        <Chart
                            type="gauge"
                            options={options}
                            series={[value]}
                            width={chartSize}
                            height={chartSize}
                        />
                    </div>
                )}
                <div className="an-gauge__metric" aria-hidden="true">
                    <strong className="an-gauge__percent">{hasData ? displayPercent(value) : "—"}</strong>
                    <span className="an-gauge__caption">{i18nT("pages.analytics.analytics.65f0a19")}</span>
                </div>
            </div>
        </div>
    );
}
function LoadRing({ label, value }) {
    const percent = Math.max(0, Math.min(100, Number(value) || 0));
    const options = {
        chart: { type: "radialBar", sparkline: { enabled: true }, fontFamily: "inherit" },
        colors: [INDIGO],
        fill: { type: "solid", opacity: 1 },
        plotOptions: {
            radialBar: {
                hollow: { size: "66%" },
                track: { background: "#dbeafe", strokeWidth: "100%" },
                dataLabels: {
                    name: { show: false },
                    value: {
                        show: true,
                        offsetY: 6,
                        fontSize: "20px",
                        fontWeight: 800,
                        color: "#153454",
                        formatter: (n) => `${Math.round(n)}%`,
                    },
                },
            },
        },
        stroke: { lineCap: "round" },
    };
    return (
        <div className="an-ring">
            <Chart type="radialBar" options={options} series={[percent]} width={140} height={140} />
            <span className="an-ring__label">{label}</span>
        </div>
    );
}
// MARK: Forecast
function ForecastItem({ item, index }) {
    useI18n();
    const percent = probabilityPercent(item.probability);
    return (
        <div className="an-soft an-fitem">
            <div className="an-fitem__row">
                <div className="an-fitem__who">
                    <div style={{ minWidth: 0 }}>
                        <div className="an-fitem__name">
                            {item.equipment?.name || item.equipment || `Оборудование #${item.equipmentId}`}
                        </div>
                        <div className="an-fitem__meta">
                            {i18nT("pages.analytics.analytics.d633feb")} {item.recentFailures}
                            {" • "}
                            {i18nT("pages.analytics.analytics.caf02f6")} {item.previousFailures}
                        </div>
                    </div>
                </div>
                <span className="an-pill an-pill--forecast">
                    {displayPercent(percent)}
                </span>
            </div>
            <div className="an-track">
                <div className="an-fill-bar" style={{ width: `${percent}%`, backgroundColor: riskColor(percent) }} />
            </div>
        </div>
    );
}
// MARK: Anomaly
function AnomalyItem({ item }) {
    const severity = Number(item.severity) || 1;
    const pill = severity >= 4 ? "an-pill--rose" : severity >= 3 ? "an-pill--amber" : "an-pill--indigo";
    return (
        <div className="an-soft an-anom">
            <div className="an-anom__row">
                <div style={{ minWidth: 0 }}>
                    <p className="an-anom__title">{item.title}</p>
                    <p className="an-anom__desc">{item.description}</p>
                </div>
                <span className={`an-pill ${pill}`}>{severity}/5</span>
            </div>
            {item.recommendation && <div className="an-rec">{item.recommendation}</div>}
        </div>
    );
}
// MARK: Ranking
function Ranking({ items, titleKey, valueKey, suffix }) {
    if (!items.length) return <EmptyBlock text="Данных нет" />;
    const max = Math.max(...items.map((item) => Number(item[valueKey]) || 0), 1);
    return (
        <div className="an-rank">
            {items.slice(0, 5).map((item, index) => {
                const value = Number(item[valueKey]) || 0;
                const relativePercent = clampPercent((value / max) * 100);
                return (
                    <div key={item.id ?? item.areaId ?? item.equipmentId ?? index}>
                        <div className="an-rank__row">
                            <span className="an-rank__name">{item[titleKey]}</span>
                            <span className="an-rank__val">
                                {value.toFixed(value % 1 ? 2 : 0)} {suffix}
                            </span>
                        </div>
                        <div className="an-track an-track--lg">
                            <div
                                className="an-fill-bar"
                                style={{
                                    width: `${relativePercent}%`,
                                    backgroundColor: riskColor(relativePercent),
                                }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
// MARK: State
function InlineLoader() {
    return (
        <div className="an-loader">
            <RiLoader4Line size={26} className="an-spin" />
        </div>
    );
}
function EmptyBlock({ text }) {
    return <div className="an-empty">{text}</div>;
}
// MARK: Forecast chart — риск по оборудованию, отсортированному по вероятности
function ForecastChart({ items, height = 240 }) {
    const selected = items.slice(0, 8);
    if (!selected.length) return null;
    const names = selected.map((item) =>
        typeof item.equipment === "string"
            ? item.equipment
            : item.equipment?.name || item.name || `#${item.equipmentId ?? "—"}`,
    );
    const values = selected.map((item) => probabilityPercent(item.probability));
    const options = {
        chart: {
            type: "line",
            toolbar: { show: false },
            zoom: { enabled: false },
            fontFamily: "inherit",
            animations: { enabled: true, speed: 450 },
            dropShadow: { enabled: false },
        },
        colors: [INDIGO],
        stroke: { curve: "smooth", width: 3 },
        fill: { type: "solid", opacity: 1 },
        markers: {
            size: 6,
            colors: [INDIGO],
            strokeColors: "#fff",
            strokeWidth: 2,
            hover: { size: 8 },
            discrete: values.map((risk, index) => ({
                seriesIndex: 0,
                dataPointIndex: index,
                fillColor: riskColor(risk),
                strokeColor: "#fff",
                size: 7,
            })),
        },
        dataLabels: { enabled: false },
        xaxis: {
            categories: names.map((_, i) => `${i + 1}`),
            labels: { style: { colors: "#91a7bf", fontSize: "11px" } },
            axisBorder: { show: false },
            axisTicks: { show: false },
            tooltip: { enabled: false },
        },
        yaxis: {
            min: 0,
            max: 100,
            tickAmount: 4,
            labels: {
                formatter: (v) => `${Math.round(v)}%`,
                style: { colors: "#91a7bf", fontSize: "11px" },
            },
        },
        grid: {
            borderColor: "#dbeafe",
            strokeDashArray: 5,
            padding: { top: 5, right: 14, left: 6, bottom: 0 },
        },
        tooltip: {
            x: { formatter: (_, opts) => names[opts.dataPointIndex] || "Оборудование" },
            y: { formatter: (v) => displayPercent(v) },
        },
        legend: { show: false },
    };
    return (
        <Chart
            type="line"
            height={height}
            width="100%"
            options={options}
            series={[{ name: "Риск отказа", data: values }]}
        />
    );
}
// MARK: Severity chart — кольцевая диаграмма распределения критичности
function SeverityChart({ items }) {
    useI18n();
    if (!items.length) return null;
    const counts = [1, 2, 3, 4, 5].map(
        (level) => items.filter((item) => Math.round(Number(item.severity)) === level).length,
    );
    const options = {
        chart: { type: "donut", fontFamily: "inherit", animations: { enabled: true, speed: 400 } },
        labels: ["1 · Низкая", "2 · Умеренная", "3 · Средняя", "4 · Высокая", "5 · Критическая"],
        colors: ["#20b36b", "#a2ca57", "#e5b940", "#f48035", "#e94553"],
        stroke: { width: 3, colors: ["#f8fbff"] },
        plotOptions: {
            pie: {
                expandOnClick: false,
                donut: {
                    size: "76%",
                    labels: {
                        show: true,
                        name: { show: true, fontSize: "11px", color: "#91a7bf", offsetY: -7 },
                        value: {
                            show: true,
                            fontSize: "26px",
                            fontWeight: 800,
                            color: "#153454",
                            offsetY: 5,
                        },
                        total: {
                            show: true,
                            label: i18nT("analytics.status.total"),
                            color: "#91a7bf",
                            formatter: () => String(items.length),
                        },
                    },
                },
            },
        },
        dataLabels: { enabled: false },
        legend: {
            show: true,
            position: "right",
            fontSize: "12px",
            labels: { colors: "#57718e" },
            markers: { size: 7 },
            itemMargin: { vertical: 4 },
        },
        tooltip: { y: { formatter: (v) => `${v} событий` } },
        responsive: [
            { breakpoint: 550, options: { legend: { position: "bottom" }, chart: { height: 240 } } },
        ],
    };
    return (
        <div style={{ flexShrink: 0, marginBottom: 14 }}>
            <Chart type="donut" height={200} width="100%" options={options} series={counts} />
        </div>
    );
}

// ApexCharts не перерисовываются при загрузке несвязанных запросов.
const StableClosedGauge = memo(ClosedGauge);
const StableLoadRing = memo(LoadRing);
const StableForecastChart = memo(ForecastChart);
const StableSeverityChart = memo(SeverityChart);
