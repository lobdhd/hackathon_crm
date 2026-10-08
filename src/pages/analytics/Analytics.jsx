import Chart from "react-apexcharts";
import {
    useMemo,
    useState,
} from "react";
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
import {
    useAnalyticsAnomalies,
    useAnalyticsDashboard,
    useFailureForecast,
    useRunAnalyticsAnomalies,
} from "../../hooks/useAnalytics.js";
import {
    useDowntimeReport,
    useShiftReport,
} from "../../hooks/useReports.js";
import {
    useAreas,
} from "../../hooks/useReferences.js";
import {
    useI18n,
} from "../../i18n/index.js";
import { t as i18nT } from "../../i18n/index.js";
// MARK: Config
const PERIODS = () => ([
    {
        value: "shift",
        label: i18nT("reportModal.shift"),
        days: 1,
    },
    {
        value: "day",
        label: i18nT("pages.analytics.analytics.81e7619"),
        days: 1,
    },
    {
        value: "week",
        label: i18nT("analyticsPage.week"),
        days: 7,
    },
    {
        value: "month",
        label: i18nT("reportModal.thirtyDays"),
        days: 30,
    },
]);
const ANOMALY_TYPES = () => ([
    {
        value: "",
        label: i18nT("pages.analytics.analytics.32a2cfd"),
    },
    {
        value: "FREQUENT_FAILURES",
        label: i18nT("pages.analytics.analytics.91b6362"),
    },
    {
        value: "REPEATED_FAULT",
        label: i18nT("pages.analytics.analytics.a6d8e7b"),
    },
    {
        value:
            "FAILURE_AFTER_PLANNED_MAINTENANCE",
        label:
            i18nT("pages.analytics.analytics.ebc8df2"),
    },
    {
        value: "MATERIAL_ANOMALY",
        label:
            i18nT("pages.analytics.analytics.db68c6c"),
    },
    {
        value: "AREA_HOTSPOT",
        label:
            i18nT("pages.analytics.analytics.a871901"),
    },
    {
        value: "SHIFT_PATTERN",
        label:
            i18nT("pages.analytics.analytics.349d3d9"),
    },
    {
        value: "TIME_OF_DAY",
        label:
            i18nT("pages.analytics.analytics.e3d751f"),
    },
    {
        value:
            "EXECUTOR_REPEAT_FAILURES",
        label:
            i18nT("pages.analytics.analytics.1d44cc6"),
    },
    {
        value:
            "BRIGADE_REPEAT_FAILURES",
        label:
            i18nT("pages.analytics.analytics.15a05ac"),
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
function extractError(
    error,
) {
    return (
        error?.response?.data
            ?.error ||
        error?.message ||
        "Ошибка загрузки данных"
    );
}
function createPeriodRange(
    period,
) {
    const now =
        new Date();
    const from =
        new Date(
            now,
        );
    if (
        period ===
        "shift"
    ) {
        from.setHours(
            from.getHours() -
                12,
        );
    } else if (
        period ===
        "day"
    ) {
        from.setDate(
            from.getDate() -
                1,
        );
    } else if (
        period ===
        "week"
    ) {
        from.setDate(
            from.getDate() -
                7,
        );
    } else {
        from.setDate(
            from.getDate() -
                30,
        );
    }
    return {
        from:
            from.toISOString(),
        to:
            now.toISOString(),
    };
}
// MARK: Page
export default function Analytics() {
    const __i18nLocaleToken = i18nT("sidebar.home");
    useI18n();
    const [
        period,
        setPeriod,
    ] = useState(
        "week",
    );
    const [
        areaId,
        setAreaId,
    ] = useState("");
    const [
        anomalyType,
        setAnomalyType,
    ] = useState("");
    const areasQuery =
        useAreas();
    const dashboardQuery =
        useAnalyticsDashboard();
    const currentPeriod =
        PERIODS().find(
            (item) =>
                item.value ===
                period,
        ) ??
        PERIODS()[2];
    const reportParams =
        useMemo(
            () => ({
                period,
                ...(areaId
                    ? {
                        areaId:
                            Number(
                                areaId,
                            ),
                    }
                    : {}),
            }),
            [
                period,
                areaId,
             __i18nLocaleToken],
        );
    const shiftQuery =
        useShiftReport(
            reportParams,
        );
    const downtimeQuery =
        useDowntimeReport(
            reportParams,
        );
    const forecastQuery =
        useFailureForecast(
            currentPeriod.days,
        );
    const anomaliesQuery =
        useAnalyticsAnomalies({
            ...(areaId
                ? {
                    areaId:
                        Number(
                            areaId,
                        ),
                }
                : {}),
            ...(anomalyType
                ? {
                    type:
                        anomalyType,
                }
                : {}),
        });
    const runMutation =
        useRunAnalyticsAnomalies();
    const areas =
        asArray(
            areasQuery.data,
        );
    const dashboard =
        dashboardQuery.data ??
        {};
    const shift =
        shiftQuery.data ??
        {};
    const downtime =
        downtimeQuery.data ??
        {};
    const forecasts =
        asArray(
            forecastQuery.data,
        );
    const anomalies =
        asArray(
            anomaliesQuery.data,
        );
    const sortedForecast =
        useMemo(
            () =>
                [...forecasts].sort(
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
                ),
            [
                forecasts,
             __i18nLocaleToken],
        );
    const sortedAnomalies =
        useMemo(
            () =>
                [...anomalies].sort(
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
                ),
            [
                anomalies,
             __i18nLocaleToken],
        );
    const downtimeEquipment =
        asArray(
            downtime.byEquipment,
        );
    const aiResult =
        runMutation.data
            ?.ai;
    const downtimeColumns =
        useMemo(
            () => [
                {
                    key:
                        "equipment",
                    header:
                        i18nT("sidebar.equipment"),
                    minWidth:
                        220,
                    sortValue:
                        (
                            row,
                        ) =>
                            row.equipment
                                ?.name ??
                            row.equipment ??
                            "",
                    render:
                        (
                            row,
                        ) => (
                            <div>
                                <p className="font-semibold text-gray-900">
                                    {row
                                        .equipment
                                        ?.name ||
                                        row.equipment ||
                                        "—"}
                                </p>
                                <p className="mt-1 text-xs text-gray-400">
                                    {row.area
                                        ?.name ||
                                        "Участок не указан"}
                                </p>
                            </div>
                        ),
                },
                {
                    field:
                        "count",
                    header:
                        "Событий",
                    minWidth:
                        100,
                },
                {
                    field:
                        "minutes",
                    header:
                        i18nT("analytics.downtime.label"),
                    minWidth:
                        130,
                    sortValue:
                        (
                            row,
                        ) =>
                            Number(
                                row.minutes,
                            ),
                    render:
                        (
                            row,
                        ) =>
                            formatMinutes(
                                row.minutes,
                            ),
                },
                {
                    field:
                        "plannedMinutes",
                    header:
                        i18nT("priority.planned"),
                    minWidth:
                        130,
                    render:
                        (
                            row,
                        ) =>
                            formatMinutes(
                                row.plannedMinutes,
                            ),
                },
                {
                    field:
                        "unplannedMinutes",
                    header:
                        i18nT("priority.emergency"),
                    minWidth:
                        130,
                    render:
                        (
                            row,
                        ) => (
                            <span className="font-semibold text-red-600">
                                {formatMinutes(
                                    row.unplannedMinutes,
                                )}
                            </span>
                        ),
                },
                {
                    field:
                        "ongoing",
                    header:
                        i18nT("pages.dashboard.dashboard.2c2777e"),
                    minWidth:
                        100,
                    render:
                        (
                            row,
                        ) =>
                            row.ongoing
                                ? (
                                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                                        {i18nT("pages.analytics.analytics.e04af96")}
                                    </span>
                                )
                                : (
                                    <span className="text-gray-400">
                                        {i18nT("pages.analytics.analytics.d0cd224")}
                                    </span>
                                ),
                },
            ],
        [ __i18nLocaleToken],
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
        const range =
            createPeriodRange(
                period,
            );
        try {
            await runMutation.mutateAsync({
                ...range,
                ...(areaId
                    ? {
                        areaId:
                            Number(
                                areaId,
                            ),
                    }
                    : {}),
            });
        } catch {
// Ошибка отображается ниже.
        }
    }
    const loading =
        shiftQuery.isLoading &&
        !shiftQuery.data;
    if (loading) {
        return (
            <PageLoader />
        );
    }
    return (
        <div className="mx-auto max-w-[1800px]">
            {/* HEADER */}
            <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                        {i18nT("pages.analytics.analytics.4047521")}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {i18nT("pages.analytics.analytics.5520929")}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={
                            refreshAll
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        <RiRefreshLine />
                        {i18nT("components.layout.appnavbar.dbe5444")}
                    </button>
                    <button
                        type="button"
                        onClick={
                            recalculate
                        }
                        disabled={
                            runMutation.isPending
                        }
                        className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                    >
                        {runMutation.isPending
                            ? (
                                <RiLoader4Line className="animate-spin" />
                            )
                            : (
                                <RiSparkling2Line />
                            )}
                        {runMutation.isPending
                            ? "AI анализирует..."
                            : "Пересчитать аномалии"}
                    </button>
                </div>
            </div>
            {/* FILTERS */}
            <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex flex-wrap gap-2">
                        {PERIODS().map(
                            (
                                item,
                            ) => (
                                <PeriodButton
                                    key={
                                        item.value
                                    }
                                    active={
                                        period ===
                                        item.value
                                    }
                                    onClick={() =>
                                        setPeriod(
                                            item.value,
                                        )
                                    }
                                >
                                    {
                                        item.label
                                    }
                                </PeriodButton>
                            ),
                        )}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <select
                            value={
                                areaId
                            }
                            onChange={(
                                event,
                            ) =>
                                setAreaId(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            className="min-w-[220px] rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                        >
                            <option value="">
                                {i18nT("reportModal.allAreas")}
                            </option>
                            {areas.map(
                                (
                                    area,
                                ) => (
                                    <option
                                        key={
                                            area.id
                                        }
                                        value={
                                            area.id
                                        }
                                    >
                                        {
                                            area.name
                                        }
                                    </option>
                                ),
                            )}
                        </select>
                        <select
                            value={
                                anomalyType
                            }
                            onChange={(
                                event,
                            ) =>
                                setAnomalyType(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            className="min-w-[240px] rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                        >
                            {ANOMALY_TYPES().map(
                                (
                                    item,
                                ) => (
                                    <option
                                        key={
                                            item.value
                                        }
                                        value={
                                            item.value
                                        }
                                    >
                                        {
                                            item.label
                                        }
                                    </option>
                                ),
                            )}
                        </select>
                    </div>
                </div>
            </div>
            {/* ERRORS */}
            {(shiftQuery.isError ||
                downtimeQuery.isError) && (
                <ErrorBox
                    text={extractError(
                        shiftQuery.error ||
                            downtimeQuery.error,
                    )}
                />
            )}
            {/* KPI */}
            <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-5">
                <KpiCard
                    label={i18nT("ratingPodium.closed")}
                    value={
                        shift.closed ??
                        0
                    }
                    helper="За период"
                    icon={
                        RiCheckboxCircleLine
                    }
                    tone="green"
                />
                <KpiCard
                    label={i18nT("status.inProgress")}
                    value={
                        shift.inProgress ??
                        0
                    }
                    helper="Активные работы"
                    icon={
                        RiToolsLine
                    }
                    tone="blue"
                />
                <KpiCard
                    label={i18nT("kanban.overdue")}
                    value={
                        shift.overdue ??
                        0
                    }
                    helper={i18nT("pages.dashboard.dashboard.06745d6")}
                    icon={
                        RiAlarmWarningLine
                    }
                    tone="red"
                />
                <KpiCard
                    label="Общий простой"
                    value={formatMinutes(
                        downtime.totals
                            ?.minutes,
                    )}
                    helper={`${downtime.totals?.ongoing ?? 0} активных`}
                    icon={
                        RiTimeLine
                    }
                    tone="orange"
                />
                <KpiCard
                    label={i18nT("pages.dashboard.dashboard.849a585")}
                    value={formatMinutes(
                        dashboard.averageReactionMinutes,
                    )}
                    helper={`Выполнение ${formatMinutes(
                        dashboard.averageCompletionMinutes,
                    )}`}
                    icon={
                        RiSpeedLine
                    }
                    tone="violet"
                />
            </div>
            {/* WORKLOAD */}
            <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <Section
                    title={i18nT("pages.analytics.analytics.f9f5658")}
                    subtitle="Состояние исполнителей за выбранный период"
                    icon={
                        RiBarChartBoxLine
                    }
                >
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <MiniStat
                            title={i18nT("pages.admin.admin.admin.958b816")}
                            value={
                                shift.workload
                                    ?.executorsOnShift ??
                                0
                            }
                        />
                        <MiniStat
                            title={i18nT("pages.analytics.analytics.90fc82e")}
                            value={
                                shift.workload
                                    ?.busy ??
                                0
                            }
                        />
                        <MiniStat
                            title={i18nT("pages.analytics.analytics.f3fd6df")}
                            value={
                                shift.workload
                                    ?.free ??
                                0
                            }
                        />
                        <MiniStat
                            title={i18nT("pages.analytics.analytics.0f7ca97")}
                            value={
                                shift.downtime
                                    ?.equipmentInDowntimeNow ??
                                0
                            }
                        />
                    </div>
                    <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <ProgressMetric
                            label="Загрузка исполнителей"
                            value={
                                shift.workload
                                    ?.executorsOnShift
                                    ? (
                                        Number(
                                            shift.workload
                                                .busy ??
                                                0,
                                        ) /
                                        Number(
                                            shift.workload
                                                .executorsOnShift,
                                        )
                                    ) *
                                    100
                                    : 0
                            }
                        />
                        <ProgressMetric
                            label="Закрытые / выданные"
                            value={
                                shift.issued
                                    ? (
                                        Number(
                                            shift.closed ??
                                                0,
                                        ) /
                                        Number(
                                            shift.issued,
                                        )
                                    ) *
                                    100
                                    : 0
                            }
                        />
                    </div>
                </Section>
                <Section
                    title={i18nT("pages.analytics.analytics.e3c205a")}
                    subtitle="Вывод сервера по периоду"
                    icon={
                        RiSparkling2Line
                    }
                >
                    <p className="text-sm leading-6 text-gray-600">
                        {aiResult
                            ?.summary ||
                            shift.aiSummary ||
                            "AI-сводка пока отсутствует."}
                    </p>
                    {asArray(
                        aiResult
                            ?.recommendations,
                    ).length >
                        0 && (
                        <div className="mt-4 space-y-2">
                            {aiResult.recommendations.map(
                                (
                                    item,
                                    index,
                                ) => (
                                    <div
                                        key={`${item}-${index}`}
                                        className="rounded-lg bg-violet-50 px-3 py-2 text-xs leading-5 text-violet-800"
                                    >
                                        {
                                            item
                                        }
                                    </div>
                                ),
                            )}
                        </div>
                    )}
                </Section>
            </div>
            {/* FORECAST */}
            <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className="min-w-0">
                <Section
                    title={i18nT("pages.analytics.analytics.b89121c")}
                    subtitle={`Горизонт: ${currentPeriod.days} дн.`}
                    icon={
                        RiFlashlightLine
                    }
                >
                    {forecastQuery.isLoading ? (
                        <InlineLoader />
                    ) : sortedForecast.length >
                      0 ? (
                        <div className="space-y-3">
<p className="text-[11px] text-gray-400">{i18nT("pages.analytics.analytics.f8c7a7a")}</p>
                            <ForecastChart items={sortedForecast.slice(0, 8)} height={220} />
                            {sortedForecast
                                .slice(
                                    0,
                                    8,
                                )
                                .map(
                                    (
                                        item,
                                    ) => (
                                        <ForecastItem
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
                        <EmptyBlock text="Прогноз отсутствует" />
                    )}
                </Section>
                </div>
                <div className="min-w-0 xl:relative xl:min-h-0">
                    <div className={sortedForecast.length && !forecastQuery.isLoading ? "xl:absolute xl:inset-0" : ""}>
                <Section
                    title={i18nT("pages.analytics.analytics.fb6342c")}
                    subtitle={`${sortedAnomalies.length} найдено`}
                    icon={RiSparkling2Line}
                    fillHeight
                >
                    {anomaliesQuery.isLoading ? (
                        <InlineLoader />
                    ) : sortedAnomalies.length >
                      0 ? (
                        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                            <div className="shrink-0"><SeverityChart items={sortedAnomalies} /></div>
                            <div className={`min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1 ${sortedForecast.length && !forecastQuery.isLoading ? "max-h-[520px] xl:max-h-none" : "max-h-[520px]"}`}>
                            {sortedAnomalies.map(
                                (
                                    item,
                                ) => (
                                    <AnomalyItem
                                        key={
                                            item.id
                                        }
                                        item={
                                            item
                                        }
                                    />
                                ),
                            )}
                        </div>
</div>
                    ) : (
                        <EmptyBlock text="Аномалий не найдено" />
                    )}
                </Section>
                    </div>
                </div>
            </div>
            {/* DOWNTIME */}
            <Section
                title={i18nT("analytics.downtime.title")}
                subtitle="Разбивка по оборудованию"
                icon={
                    RiTimeLine
                }
            >
                <div className="[&_.smart-table__table]:h-full">
                <SmartTable
                    data={
                        downtimeEquipment
                    }
                    columns={
                        downtimeColumns
                    }
                    dataKey="equipmentId"
                    mode="sort"
                    compact
                    striped
                    stickyHeader
                    minWidth={
                        900
                    }
                    scrollHeight="clamp(500px, 61vh, 640px)"
                    emptyText="Простоев нет"
                    emptyDescription="За выбранный период простоев оборудования не зарегистрировано"
                />
                </div>
            </Section>
            {/* TOPS */}
            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Section
                    title={i18nT("pages.analytics.analytics.101358d")}
                    subtitle="Аварийные наряды за 30 дней"
                    icon={
                        RiToolsLine
                    }
                >
                    <Ranking
                        items={asArray(
                            dashboard.topEquipment,
                        )}
                        titleKey="name"
                        valueKey="_count"
                        suffix="аварий"
                    />
                </Section>
                <Section
                    title={i18nT("pages.analytics.analytics.e536c9b")}
                    subtitle="Аварийность на единицу оборудования"
                    icon={
                        RiMapPinLine
                    }
                >
                    <Ranking
                        items={asArray(
                            dashboard.topAreas,
                        )}
                        titleKey="name"
                        valueKey="emergenciesPerUnit"
                        suffix="/ ед."
                    />
                </Section>
            </div>
        </div>
    );
}
// MARK: Period
function PeriodButton({
    active,
    onClick,
    children,
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            }`}
        >
            {children}
        </button>
    );
}
// MARK: KPI
function KpiCard({
    label,
    value,
    helper,
    icon: Icon,
    tone,
}) {
    const tones = {
        green:
            "bg-green-50 text-green-600",
        blue:
            "bg-blue-50 text-blue-600",
        red:
            "bg-red-50 text-red-600",
        orange:
            "bg-orange-50 text-orange-600",
        violet:
            "bg-violet-50 text-violet-600",
    };
    return (
        <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="min-w-0">
                <p className="truncate text-xs font-medium text-gray-500">
                    {label}
                </p>
                <p className="mt-1 truncate text-2xl font-bold text-gray-900">
                    {value}
                </p>
                <p className="mt-1 truncate text-[10px] text-gray-400">
                    {helper}
                </p>
            </div>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                tones[tone] ||
                tones.blue
            }`}>
                <Icon
                    size={
                        20
                    }
                />
            </div>
        </div>
    );
}
// MARK: Section
function Section({
    title,
    subtitle,
    icon: Icon,
    children,
    fillHeight = false,
}) {
    return (
        <section className={`${fillHeight ? "flex h-full min-h-0 flex-col" : ""} overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm`}>
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
                <div>
                    <h2 className="text-[15px] font-semibold text-gray-900">
                        {title}
                    </h2>
                    <p className="mt-1 text-xs text-gray-500">
                        {subtitle}
                    </p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Icon
                        size={
                            18
                        }
                    />
                </div>
            </div>
            <div className={fillHeight ? "flex min-h-0 flex-1 flex-col p-5" : "p-5"}>
                {children}
            </div>
        </section>
    );
}
// MARK: Mini Stats
function MiniStat({
    title,
    value,
}) {
    return (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs text-gray-500">
                {title}
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
                {value}
            </p>
        </div>
    );
}
function ProgressMetric({ label, value }) {
    const percent = Math.max(0, Math.min(100, Number(value) || 0));
    const options = {
        chart: { type: "radialBar", sparkline: { enabled: true }, animations: { enabled: true, speed: 400 } },
        colors: ["#2563eb"],
        plotOptions: { radialBar: { hollow: { size: "68%" }, track: { background: "#eff3f8", strokeWidth: "100%" }, dataLabels: { name: { show: false }, value: { show: true, offsetY: 6, fontSize: "17px", fontWeight: 700, color: "#0f172a", formatter: (n) => `${Math.round(n)}%` } } } },
        stroke: { lineCap: "round" }
    };
    return (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-4 py-2">
            <span className="max-w-[140px] text-xs font-medium leading-5 text-gray-600">{label}</span>
            <div className="shrink-0"><Chart type="radialBar" options={options} series={[percent]} width={106} height={106} /></div>
        </div>
    );
}
// MARK: Forecast
function ForecastItem({
    item,
}) {
    useI18n();
    const probability =
        Number(
            item.probability,
        ) || 0;
    const percent =
        Math.round(
            probability * 100,
        );
    return (
        <div className="rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold text-gray-900">
                        {item.equipment
                            ?.name ||
                            item.equipment ||
                            `Оборудование #${item.equipmentId}`}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                        {i18nT("pages.analytics.analytics.d633feb")}{" "}
                        {
                            item.recentFailures
                        }
                        {" • "}
                        {i18nT("pages.analytics.analytics.caf02f6")}{" "}
                        {
                            item.previousFailures
                        }
                    </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    percent >= 65
                        ? "bg-red-50 text-red-700"
                        : percent >= 40
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
                    className="h-full rounded-full bg-blue-600"
                    style={{
                        width:
                            `${percent}%`,
                    }}
                />
            </div>
        </div>
    );
}
// MARK: Anomaly
function AnomalyItem({
    item,
}) {
    const severity =
        Number(
            item.severity,
        ) || 1;
    return (
        <div className="rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900">
                        {
                            item.title
                        }
                    </p>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                        {
                            item.description
                        }
                    </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${
                    severity >= 4
                        ? "bg-red-50 text-red-700"
                        : severity >= 3
                          ? "bg-orange-50 text-orange-700"
                          : "bg-blue-50 text-blue-700"
                }`}>
                    {
                        severity
                    }
                    /5
                </span>
            </div>
            {item.recommendation && (
                <div className="mt-3 rounded-lg bg-violet-50 px-3 py-2 text-xs leading-5 text-violet-800">
                    {
                        item.recommendation
                    }
                </div>
            )}
        </div>
    );
}
// MARK: Ranking
function Ranking({
    items,
    titleKey,
    valueKey,
    suffix,
}) {
    if (
        !items.length
    ) {
        return (
            <EmptyBlock text="Данных нет" />
        );
    }
    const max =
        Math.max(
            ...items.map(
                (item) =>
                    Number(
                        item[valueKey],
                    ) || 0,
            ),
            1,
        );
    return (
        <div className="space-y-3">
            {items
                .slice(
                    0,
                    5,
                )
                .map(
                    (
                        item,
                        index,
                    ) => {
                        const value =
                            Number(
                                item[
                                    valueKey
                                ],
                            ) || 0;
                        return (
                            <div
                                key={
                                    item.id ??
                                    item.areaId ??
                                    item.equipmentId ??
                                    index
                                }
                            >
                                <div className="flex justify-between gap-4">
                                    <span className="truncate text-sm font-semibold text-gray-800">
                                        {
                                            item[
                                                titleKey
                                            ]
                                        }
                                    </span>
                                    <span className="shrink-0 text-xs font-semibold text-gray-500">
                                        {value.toFixed(
                                            value %
                                                1
                                                ? 2
                                                : 0,
                                        )}{" "}
                                        {
                                            suffix
                                        }
                                    </span>
                                </div>
                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                                    <div
                                        className="h-full rounded-full bg-blue-600"
                                        style={{
                                            width:
                                                `${Math.max(
                                                    4,
                                                    value /
                                                        max *
                                                        100,
                                                )}%`,
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
// MARK: State
function InlineLoader() {
    return (
        <div className="flex min-h-[180px] items-center justify-center">
            <RiLoader4Line
                size={26}
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
function EmptyBlock({
    text,
}) {
    return (
        <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400">
            {text}
        </div>
    );
}
function ErrorBox({
    text,
}) {
    return (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {text}
        </div>
    );
}


// MARK: Forecast chart — риск по оборудованию, отсортированному по вероятности
function ForecastChart({ items, height = 200 }) {
    const selected = items.slice(0, 8);
    if (!selected.length) return null;
    const names = selected.map((item) => typeof item.equipment === "string" ? item.equipment : item.equipment?.name || item.name || `#${item.equipmentId ?? "—"}`);
    const values = selected.map((item) => {
        const n = Number(item.probability);
        return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n * (n <= 1 ? 100 : 1)))) : 0;
    });
    const options = {
        chart: { type: "area", toolbar: { show: false }, zoom: { enabled: false }, fontFamily: "inherit", animations: { enabled: true, speed: 450 } },
        colors: ["#2563eb"], stroke: { curve: "smooth", width: 2.5 },
        fill: { type: "gradient", gradient: { shadeIntensity: 0, opacityFrom: 0.27, opacityTo: 0.01, stops: [0, 95, 100] } },
        markers: { size: 4, colors: ["#fff"], strokeColors: "#2563eb", strokeWidth: 2, hover: { size: 6 } },
        dataLabels: { enabled: false },
        xaxis: { categories: names.map((_, i) => `№${i + 1}`), labels: { style: { colors: "#94a3b8", fontSize: "10px" } }, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { min: 0, max: 100, tickAmount: 4, labels: { formatter: (v) => `${Math.round(v)}%`, style: { colors: "#94a3b8", fontSize: "10px" } } },
        grid: { borderColor: "#f1f5f9", strokeDashArray: 4, padding: { top: 5, right: 12, left: 4, bottom: 0 } },
        tooltip: { x: { formatter: (_, opts) => names[opts.dataPointIndex] || "Оборудование" }, y: { formatter: (v) => `${Math.round(v)}%` } },
        legend: { show: false }
    };
    return <Chart type="area" height={height} width="100%" options={options} series={[{ name: "Риск отказа", data: values }]} />;
}

// MARK: Severity chart — кольцевая диаграмма распределения критичности
function SeverityChart({ items }) {
    useI18n();
    if (!items.length) return null;
    const counts = [1, 2, 3, 4, 5].map((level) => items.filter((item) => Math.round(Number(item.severity)) === level).length);
    const options = {
        chart: { type: "donut", fontFamily: "inherit", animations: { enabled: true, speed: 400 } },
        labels: ["1 · Низкая", "2 · Умеренная", "3 · Средняя", "4 · Высокая", "5 · Критическая"],
        colors: ["#bfdbfe", "#60a5fa", "#fbbf24", "#fb923c", "#ef4444"],
        stroke: { width: 3, colors: ["#fff"] },
        plotOptions: { pie: { expandOnClick: false, donut: { size: "75%", labels: { show: true, name: { show: true, fontSize: "11px", color: "#94a3b8", offsetY: -7 }, value: { show: true, fontSize: "24px", fontWeight: 700, color: "#0f172a", offsetY: 5 }, total: { show: true, label: i18nT("analytics.status.total"), formatter: () => String(items.length) } } } } },
        dataLabels: { enabled: false },
        legend: { show: true, position: "right", fontSize: "11px", labels: { colors: "#64748b" }, markers: { size: 7 }, itemMargin: { vertical: 5 } },
        tooltip: { y: { formatter: (v) => `${v} событий` } },
        responsive: [{ breakpoint: 550, options: { legend: { position: "bottom" }, chart: { height: 240 } } }]
    };
    return <Chart type="donut" height={210} width="100%" options={options} series={counts} />;
}
