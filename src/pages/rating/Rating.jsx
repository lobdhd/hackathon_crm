import {
    useMemo,
    useState,
} from "react";
import {
    useNavigate,
} from "react-router-dom";
import {
    RiBarChartBoxLine,
    RiCheckboxCircleLine,
    RiCloseLine,
    RiFilter3Line,
    RiLoader4Line,
    RiMedalLine,
    RiRefreshLine,
    RiSearchLine,
    RiShieldCheckLine,
    RiSparkling2Line,
    RiStarFill,
    RiTeamLine,
    RiTrophyLine,
} from "react-icons/ri";
import Chart from "react-apexcharts";
import SmartTable from "../../react-components/SmartTable/SmartTable.jsx";
import GlideSelect from "../../react-components/GlideSelect/GlideSelect.jsx";
import {
    useAuth,
} from "../../auth/AuthProvider.jsx";
import {
    useBrigadeRatings,
    useMyRating,
    useRatings,
} from "../../hooks/useReports.js";
import {
    useAreas,
} from "../../hooks/useReferences.js";
import { t as i18nT } from "../../i18n/index.js";
import { useI18n as __useI18nReactive } from "../../i18n/index.js";

// MARK: Config

const PERIODS = () => ([
    {
        value: "shift",
        label: i18nT("reportModal.shift"),
    },
    {
        value: "week",
        label: i18nT("analyticsPage.week"),
    },
    {
        value: "month",
        label: i18nT("pages.rating.rating.aeb10f7"),
    },
]);

// MARK: Helpers

function asArray(value) {
    return Array.isArray(value)
        ? value
        : [];
}

function asObject(value) {
    if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
    ) {
        return value;
    }
    if (
        Array.isArray(value) &&
        value.length > 0
    ) {
        return value[0];
    }
    return null;
}

function percent(value) {
    const number =
        Number(value);
    if (
        !Number.isFinite(number)
    ) {
        return "—";
    }
    const normalized =
        number <= 1
            ? number * 100
            : number;
    return `${Math.round(normalized)}%`;
}

function numberValue(
    value,
    digits = 1,
) {
    const number =
        Number(value);
    if (
        !Number.isFinite(number)
    ) {
        return "—";
    }
    return number.toFixed(digits);
}

function scoreValue(value) {
    const number =
        Number(value);
    if (
        !Number.isFinite(number)
    ) {
        return "—";
    }
    return Math.round(number * 10) / 10;
}

function getErrorMessage(error) {
    return (
        error?.response?.data?.error ||
        error?.message ||
        "Не удалось загрузить рейтинг"
    );
}

// MARK: Page

export default function Rating() {
    __useI18nReactive();
    const __i18nLocaleToken = i18nT("sidebar.home");
    const navigate =
        useNavigate();
    const auth =
        useAuth();
    const role =
        auth?.role ??
        auth?.user?.role;
    const isExecutor =
        role === "EXECUTOR";
    const [
        mode,
        setMode,
    ] = useState(
        "executors",
    );
    const [
        filters,
        setFilters,
    ] = useState({
        search: "",
        areaId: "",
        specialty: "",
        period: "month",
    });
    function updateFilter(
        field,
        value,
    ) {
        setFilters(
            (previous) => ({
                ...previous,
                [field]: value,
            }),
        );
    }
    const reportParams =
        useMemo(
            () => ({
                period:
                    filters.period,
                ...(filters.areaId
                    ? {
                        areaId:
                            Number(
                                filters.areaId,
                            ),
                    }
                    : {}),
            }),
            [
                filters.period,
                filters.areaId,
             __i18nLocaleToken],
        );
    const ratingsQuery =
        useRatings(
            reportParams,
            {
                enabled:
                    !isExecutor,
            },
        );
    const brigadesQuery =
        useBrigadeRatings(
            reportParams,
            {
                enabled:
                    !isExecutor,
            },
        );
    const myRatingQuery =
        useMyRating(
            {
                period:
                    filters.period,
            },
            {
                enabled:
                    isExecutor,
            },
        );
    const areasQuery =
        useAreas();
    if (isExecutor) {
        return (
            <MyRatingView
                period={
                    filters.period
                }
                onPeriodChange={(
                    value,
                ) =>
                    updateFilter(
                        "period",
                        value,
                    )
                }
                query={
                    myRatingQuery
                }
            />
        );
    }
    const employees =
        asArray(
            ratingsQuery.data,
        );
    const brigades =
        asArray(
            brigadesQuery.data,
        );
    const areas =
        asArray(
            areasQuery.data,
        );
    function resetFilters() {
        setFilters(
            (previous) => ({
                ...previous,
                search: "",
                areaId: "",
                specialty: "",
            }),
        );
    }
    const specialties =
        useMemo(
            () => [
                ...new Set(
                    employees
                        .map(
                            (item) =>
                                item.specialty,
                        )
                        .filter(Boolean),
                ),
            ].sort(),
            [employees, __i18nLocaleToken],
        );
    const areaOptions =
        useMemo(
            () => [
                {
                    value: "",
                    label: i18nT("reportModal.allAreas"),
                },
                ...areas.map(
                    (area) => ({
                        value:
                            String(
                                area.id,
                            ),
                        label:
                            area.name,
                    }),
                ),
            ],
            [areas, __i18nLocaleToken],
        );
    const specialtyOptions =
        useMemo(
            () => [
                {
                    value: "",
                    label:
                        i18nT("employeesPage.allSpecialties"),
                },
                ...specialties.map(
                    (specialty) => ({
                        value:
                            specialty,
                        label:
                            specialty,
                    }),
                ),
            ],
            [specialties, __i18nLocaleToken],
        );
    const filteredEmployees =
        useMemo(() => {
            const search =
                filters.search
                    .trim()
                    .toLowerCase();
            return employees
                .filter(
                    (employee) => {
                        const matchSearch =
                            !search ||
                            String(
                                employee.fullName ||
                                    "",
                            )
                                .toLowerCase()
                                .includes(
                                    search,
                                ) ||
                            String(
                                employee.specialty ||
                                    "",
                            )
                                .toLowerCase()
                                .includes(
                                    search,
                                );
                        const matchSpecialty =
                            !filters.specialty ||
                            employee.specialty ===
                                filters.specialty;
                        return (
                            matchSearch &&
                            matchSpecialty
                        );
                    },
                )
                .sort(
                    (a, b) =>
                        Number(
                            b.score,
                        ) -
                        Number(
                            a.score,
                        ),
                );
        }, [
            employees,
            filters.search,
            filters.specialty,
         __i18nLocaleToken]);
    const filteredBrigades =
        useMemo(() => {
            const search =
                filters.search
                    .trim()
                    .toLowerCase();
            return brigades
                .filter(
                    (brigade) =>
                        !search ||
                        String(
                            brigade.name ||
                                "",
                        )
                            .toLowerCase()
                            .includes(
                                search,
                            ),
                )
                .sort(
                    (a, b) =>
                        Number(
                            b.score,
                        ) -
                        Number(
                            a.score,
                        ),
                );
        }, [
            brigades,
            filters.search,
         __i18nLocaleToken]);
    const scoredEmployees =
        filteredEmployees.filter(
            (employee) =>
                Number.isFinite(
                    Number(
                        employee.score,
                    ),
                ),
        );
    const topEmployees =
        scoredEmployees.slice(
            0,
            3,
        );
    const bestEmployee =
        scoredEmployees[0] ??
        null;
    const averageRating =
        scoredEmployees.length
            ? scoredEmployees.reduce(
                (total, employee) =>
                    total +
                    Number(
                        employee.score,
                    ),
                0,
            ) /
            scoredEmployees.length
            : 0;
    const averageOnTime =
        scoredEmployees.length
            ? scoredEmployees.reduce(
                (total, employee) => {
                    const value =
                        Number(
                            employee.onTimeRate,
                        ) || 0;
                    return (
                        total +
                        (value <= 1
                            ? value * 100
                            : value)
                    );
                },
                0,
            ) /
            scoredEmployees.length
            : 0;
    const totalClosed =
        employees.reduce(
            (total, employee) =>
                total +
                Number(
                    employee.closed ??
                        0,
                ),
            0,
        );
    const activeFiltersCount =
        [
            filters.areaId,
            filters.specialty,
        ].filter(Boolean).length;
    const employeeColumns = [
        {
            key: "place",
            header: "#",
            minWidth: 60,
            sortable: false,
            render: (
                _,
                index,
            ) => (
                <span className="font-bold text-gray-400">
                    {index + 1}
                </span>
            ),
        },
        {
            field: "fullName",
            header: i18nT("ordersTable.assignee"),
            minWidth: 250,
            render: (
                employee,
            ) => (
                <div>
                    <p className="font-semibold text-gray-900">
                        {employee.fullName}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                        {employee.specialty ||
                            "Специальность не указана"}
                    </p>
                </div>
            ),
        },
        {
            field: "score",
            header: i18nT("pages.rating.rating.304ce2c"),
            minWidth: 120,
            sortValue: (
                row,
            ) =>
                Number(
                    row.score,
                ),
            render: (
                row,
            ) => (
                <ScoreBadge
                    score={
                        row.score
                    }
                />
            ),
        },
        {
            field: "quality",
            header: i18nT("pages.rating.rating.cfedc14"),
            minWidth: 110,
            render: (
                row,
            ) =>
                numberValue(
                    row.quality,
                ),
        },
        {
            field: "onTimeRate",
            header: i18nT("pages.rating.rating.a67436e"),
            minWidth: 110,
            render: (
                row,
            ) =>
                percent(
                    row.onTimeRate,
                ),
        },
        {
            field: "reworkRate",
            header: i18nT("pages.rating.rating.399f7c5"),
            minWidth: 120,
            render: (
                row,
            ) =>
                percent(
                    row.reworkRate,
                ),
        },
        {
            field: "repeatFailureRate",
            header: i18nT("pages.rating.rating.0a7f61c"),
            minWidth: 150,
            render: (
                row,
            ) =>
                percent(
                    row.repeatFailureRate,
                ),
        },
        {
            field: "productivity",
            header: i18nT("pages.rating.rating.a12969d"),
            minWidth: 160,
            render: (
                row,
            ) =>
                numberValue(
                    row.productivity,
                ),
        },
        {
            field: "closed",
            header: i18nT("ratingPodium.closed"),
            minWidth: 100,
        },
    ];
    const brigadeColumns = [
        {
            field: "name",
            header: i18nT("employeeModal.team"),
            minWidth: 230,
            render: (
                brigade,
            ) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <RiTeamLine />
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900">
                            {brigade.name}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                            {i18nT("pages.rating.rating.6cef7a4")}{" "}
                            {Array.isArray(
                                brigade.members,
                            )
                                ? brigade.members.length
                                : brigade.members ??
                                  "—"}
                        </p>
                    </div>
                </div>
            ),
        },
        {
            field: "score",
            header: i18nT("pages.rating.rating.304ce2c"),
            minWidth: 120,
            render: (
                row,
            ) => (
                <ScoreBadge
                    score={
                        row.score
                    }
                />
            ),
        },
        {
            field: "quality",
            header: i18nT("pages.rating.rating.cfedc14"),
            minWidth: 120,
            render: (
                row,
            ) =>
                numberValue(
                    row.quality,
                ),
        },
        {
            field: "onTimeRate",
            header: i18nT("pages.rating.rating.a67436e"),
            minWidth: 120,
            render: (
                row,
            ) =>
                percent(
                    row.onTimeRate,
                ),
        },
        {
            field: "repeatFailureRate",
            header: i18nT("pages.rating.rating.0a7f61c"),
            minWidth: 150,
            render: (
                row,
            ) =>
                percent(
                    row.repeatFailureRate,
                ),
        },
        {
            field: "closed",
            header: i18nT("ratingPodium.closed"),
            minWidth: 110,
        },
    ];
    if (
        ratingsQuery.isLoading &&
        !ratingsQuery.data
    ) {
        return (
            <LoadingPage />
        );
    }
    return (
        <div className="mx-auto max-w-[1800px]">
            <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                        {i18nT("pages.rating.rating.304ce2c")}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {i18nT("pages.rating.rating.1bf7492")}
                    </p>
                </div>
                <PeriodSwitch
                    value={
                        filters.period
                    }
                    onChange={(
                        value,
                    ) =>
                        updateFilter(
                            "period",
                            value,
                        )
                    }
                />
            </div>
            {ratingsQuery.isError && (
                <ErrorBox
                    text={
                        getErrorMessage(
                            ratingsQuery.error,
                        )
                    }
                />
            )}
            <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
                <StatCard
                    label="Лучший рейтинг"
                    value={
                        bestEmployee?.score ??
                        "—"
                    }
                    helper={
                        bestEmployee?.fullName ??
                        "Нет данных"
                    }
                    icon={
                        RiTrophyLine
                    }
                    tone="gold"
                />
                <StatCard
                    label="Средний рейтинг"
                    value={
                        averageRating
                            ? averageRating.toFixed(
                                1,
                            )
                            : "—"
                    }
                    helper={i18nT("pages.reports.reports.a3436b1")}
                    icon={
                        RiStarFill
                    }
                    tone="blue"
                />
                <StatCard
                    label="Выполнено в срок"
                    value={`${Math.round(
                        averageOnTime,
                    )}%`}
                    helper="Средний показатель"
                    icon={
                        RiCheckboxCircleLine
                    }
                    tone="green"
                />
                <StatCard
                    label={i18nT("pages.rating.rating.54a16b9")}
                    value={
                        totalClosed
                    }
                    helper="За период"
                    icon={
                        RiBarChartBoxLine
                    }
                    tone="violet"
                />
            </div>
            {topEmployees.length >
                0 && (
                <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="mb-5 flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-semibold text-gray-900">
                                {i18nT("pages.rating.rating.6fe16c2")}
                            </h2>
                            <p className="mt-1 text-xs text-gray-500">
                                {i18nT("pages.rating.rating.73799f5")}
                            </p>
                        </div>
                        <div className="hidden items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 sm:flex">
                            <RiMedalLine />
                            TOP 3
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {topEmployees.map(
                            (
                                employee,
                                index,
                            ) => (
                                <LeaderCard
                                    key={
                                        employee.id
                                    }
                                    place={
                                        index + 1
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
                        )}
                    </div>
                </section>
            )}
            <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                    <div className="relative flex-1">
                        <RiSearchLine
                            size={18}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                            value={
                                filters.search
                            }
                            onChange={(
                                event,
                            ) =>
                                updateFilter(
                                    "search",
                                    event.target.value,
                                )
                            }
                            placeholder={
                                mode ===
                                "executors"
                                    ? "Поиск исполнителя..."
                                    : "Поиск бригады..."
                            }
                            className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white"
                        />
                    </div>
                    <GlideSelect
                        options={
                            areaOptions
                        }
                        value={
                            filters.areaId
                        }
                        onChange={(
                            value,
                        ) =>
                            updateFilter(
                                "areaId",
                                value,
                            )
                        }
                        className="glide-select--filter"
                        menuWidth={240}
                    />
                    {mode ===
                        "executors" && (
                        <GlideSelect
                            options={
                                specialtyOptions
                            }
                            value={
                                filters.specialty
                            }
                            onChange={(
                                value,
                            ) =>
                                updateFilter(
                                    "specialty",
                                    value,
                                )
                            }
                            className="glide-select--filter"
                            menuWidth={240}
                        />
                    )}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <RiFilter3Line />
                        {i18nT("pages.rating.rating.8c063da")}
                        <span className="font-semibold text-gray-900">
                            {mode ===
                            "executors"
                                ? filteredEmployees.length
                                : filteredBrigades.length}
                        </span>
                        {activeFiltersCount >
                            0 && (
                            <button
                                type="button"
                                onClick={
                                    resetFilters
                                }
                                className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600"
                            >
                                <RiCloseLine />
                                {i18nT("employeesPage.reset")}
                            </button>
                        )}
                    </div>
                    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                        <button
                            type="button"
                            onClick={() =>
                                setMode(
                                    "executors",
                                )
                            }
                            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                                mode ===
                                "executors"
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-500"
                            }`}
                        >
                            {i18nT("sidebar.employees")}
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                setMode(
                                    "brigades",
                                )
                            }
                            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                                mode ===
                                "brigades"
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-500"
                            }`}
                        >
                            {i18nT("pages.admin.admin.admin.bfbd755")}
                        </button>
                    </div>
                </div>
            </div>
            {mode ===
            "executors" ? (
                <SmartTable
                    data={
                        filteredEmployees
                    }
                    columns={
                        employeeColumns
                    }
                    dataKey="id"
                    mode="sort"
                    compact
                    striped
                    stickyHeader
                    minWidth={1250}
                    scrollHeight="clamp(360px, calc(100dvh - 620px), 560px)"
                    rowClassName={() =>
                        "cursor-pointer"
                    }
                    onRowClick={(
                        employee,
                    ) =>
                        navigate(
                            `/employees/${employee.id}`,
                        )
                    }
                    emptyText="Рейтинг пуст"
                    emptyDescription="За выбранный период нет данных"
                />
            ) : (
                <SmartTable
                    data={
                        filteredBrigades
                    }
                    columns={
                        brigadeColumns
                    }
                    dataKey="id"
                    mode="sort"
                    compact
                    striped
                    stickyHeader
                    minWidth={900}
                    scrollHeight="clamp(360px, calc(100dvh - 620px), 560px)"
                    emptyText="Рейтинг бригад пуст"
                    emptyDescription="За выбранный период нет данных"
                />
            )}
            {bestEmployee && (
                <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
                    <FormulaSection
                        rating={
                            bestEmployee
                        }
                    />
                    <ExplanationSection
                        rating={
                            bestEmployee
                        }
                        subtitle={
                            bestEmployee.fullName
                        }
                    />
                </div>
            )}
        </div>
    );
}

// MARK: My rating

function MyRatingView({ period, onPeriodChange, query }) {
    __useI18nReactive();
    const __i18nLocaleToken = i18nT("sidebar.home");
    const rating = asObject(query.data);
    const score = Number(rating?.score);
    const validScore = rating?.score != null && Number.isFinite(score);
    const boundedScore = validScore ? Math.max(0, Math.min(100, score)) : 0;
    // MARK: ApexCharts — только визуализация готового балла с backend
    const chartOptions = useMemo(() => ({
        chart: {
            type: "radialBar",
            sparkline: { enabled: true },
            animations: { enabled: true, speed: 450 },
        },
        colors: ["#2563eb"],
        stroke: { lineCap: "round" },
        plotOptions: {
            radialBar: {
                startAngle: -125,
                endAngle: 125,
                hollow: { size: "72%" },
                track: { background: "#eef2f7", strokeWidth: "100%" },
                dataLabels: {
                    name: { show: false },
                    value: {
                        show: true,
                        offsetY: 10,
                        fontSize: "36px",
                        fontWeight: 750,
                        color: "#0f172a",
                        formatter: () => validScore ? String(scoreValue(score)) : "—",
                    },
                },
            },
        },
        tooltip: { enabled: false },
    }), [score, validScore, __i18nLocaleToken]);
    if (query.isLoading && !query.data) return <LoadingPage />;
    const metrics = rating ? [
        { label: i18nT("pages.rating.rating.cfedc14"), value: numberValue(rating.quality), icon: RiStarFill, tone: "blue" },
        { label: i18nT("pages.rating.rating.a67436e"), value: percent(rating.onTimeRate), icon: RiCheckboxCircleLine, tone: "green" },
        { label: i18nT("pages.rating.rating.399f7c5"), value: percent(rating.reworkRate), icon: RiRefreshLine, tone: "amber" },
        { label: i18nT("pages.rating.rating.0a7f61c"), value: percent(rating.repeatFailureRate), icon: RiBarChartBoxLine, tone: "rose" },
        { label: i18nT("pages.rating.rating.ca8a107"), value: percent(rating.returnRate), icon: RiCloseLine, tone: "amber" },
        { label: i18nT("pages.rating.rating.a12969d"), value: numberValue(rating.productivity), icon: RiBarChartBoxLine, tone: "blue" },
        { label: i18nT("pages.rating.rating.86be933"), value: rating.unjustifiedRejects ?? "—", icon: RiShieldCheckLine, tone: "rose" },
        { label: i18nT("pages.rating.rating.54a16b9"), value: rating.closed ?? 0, icon: RiCheckboxCircleLine, tone: "green" },
    ] : [];
    return (
        <div className="mx-auto max-w-[1500px] pb-8">
            {/* MARK: Header */}
            <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                <div>
                    <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                        <RiTrophyLine size={13} /> {i18nT("pages.rating.rating.d3bb533")}
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">{i18nT("pages.rating.rating.34bfde9")}</h1>
                    <p className="mt-1 text-sm text-slate-500">{i18nT("pages.rating.rating.df8f838")}</p>
                </div>
                <PeriodSwitch value={period} onChange={onPeriodChange} />
            </div>
            {query.isError && <ErrorBox text={getErrorMessage(query.error)} />}
            {!query.isError && !rating && (
                <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <RiTrophyLine size={32} className="mx-auto text-slate-300" />
                    <h2 className="mt-3 text-sm font-semibold text-slate-900">{i18nT("pages.rating.rating.5cfc524")}</h2>
                    <p className="mt-1 text-sm text-slate-500">{i18nT("pages.rating.rating.93022fc")}</p>
                </div>
            )}
            {rating && (
                <>
                    {/* MARK: Compact score + metrics */}
                    <section className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="grid lg:grid-cols-[285px_minmax(0,1fr)]">
                            <div className="flex flex-col items-center justify-center border-b border-slate-100 px-5 py-5 lg:border-b-0 lg:border-r">
                                <div className="w-full text-left">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{i18nT("pages.rating.rating.bb560ce")}</p>
                                </div>
                                <div className="relative mt-1 h-[190px] w-[230px] max-w-full">
                                    <Chart type="radialBar" height={190} width="100%" series={[boundedScore]} options={chartOptions} />
                                    <span className="pointer-events-none absolute bottom-[27px] left-1/2 -translate-x-1/2 text-[11px] font-medium text-slate-400">{i18nT("pages.rating.rating.0791eff")}</span>
                                </div>
                                <div className="w-full border-t border-slate-100 pt-3">
                                    <p className="truncate text-sm font-semibold text-slate-900">{rating.fullName || "Ваш результат"}</p>
                                    <p className="mt-0.5 text-xs text-slate-500">{rating.specialty || i18nT("ordersTable.assignee")}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4">
                                {metrics.map((metric, index) => (
                                    <MyMetric key={metric.label} {...metric} index={index} />
                                ))}
                            </div>
                        </div>
                    </section>
                    {/* MARK: Formula and explanation — original backend data */}
                    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
                        <FormulaSection rating={rating} />
                        <ExplanationSection rating={rating} subtitle="Что влияет на ваш результат" compactResult />
                    </div>
                </>
            )}
        </div>
    );
}

function MyMetric({ label, value, icon: Icon, tone = "blue", index }) {
    const tones = {
        blue: "bg-blue-50 text-blue-600",
        green: "bg-emerald-50 text-emerald-600",
        amber: "bg-amber-50 text-amber-600",
        rose: "bg-rose-50 text-rose-600",
    };
    return (
        <div className={`min-w-0 px-4 py-4 sm:px-5 sm:py-5 ${index >= 4 ? "border-t border-slate-100" : ""} ${index % 4 !== 0 ? "sm:border-l sm:border-slate-100" : ""} ${index % 2 !== 0 ? "border-l border-slate-100 sm:border-l" : ""}`}>
            <div className="flex items-center gap-2">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tones[tone] || tones.blue}`}>
                    <Icon size={15} />
                </span>
                <p className="min-w-0 text-[11px] leading-4 text-slate-500">{label}</p>
            </div>
            <p className="mt-3 text-[23px] font-bold leading-none tracking-tight text-slate-900">{value}</p>
        </div>
    );
}

// MARK: Shared rating sections*

function FormulaSection({
    rating,
}) {
    __useI18nReactive();
    return (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <div>
                    <h2 className="text-[15px] font-semibold text-gray-900">
                        {i18nT("pages.rating.rating.0e2f7ee")}
                    </h2>
                    <p className="mt-1 text-xs text-gray-500">
                        {i18nT("pages.rating.rating.a7810e8")}
                    </p>
                </div>
                <RiShieldCheckLine
                    size={19}
                    className="text-blue-600"
                />
            </div>
            <div className="grid grid-cols-2 gap-3 p-5 md:grid-cols-3">
                <PointCard
                    title={i18nT("pages.rating.rating.cfedc14")}
                    value={
                        rating.points?.quality
                    }
                />
                <PointCard
                    title={i18nT("pages.orders.orderdetails.orderdetails.8a44424")}
                    value={
                        rating.points?.onTime
                    }
                />
                <PointCard
                    title={i18nT("pages.rating.rating.a09c947")}
                    value={
                        rating.points?.noReturns
                    }
                />
                <PointCard
                    title={i18nT("pages.rating.rating.678bc9b")}
                    value={
                        rating.points?.volume
                    }
                />
                <PointCard
                    title={i18nT("pages.rating.rating.8edf8fc")}
                    value={
                        rating.points?.complexity
                    }
                />
                <PointCard
                    title={i18nT("pages.rating.rating.71a5d51")}
                    value={
                        rating.points?.rejects
                    }
                />
            </div>
            {rating.complexityBonus != null && (
                <div className="border-t border-gray-100 px-5 py-4 text-xs text-gray-500">
                    {i18nT("pages.rating.rating.89d7ccd")}{" "}
                    <span className="font-semibold text-gray-900">
                        {rating.complexityBonus}
                    </span>
                </div>
            )}
        </section>
    );
}

function ExplanationSection({
    rating,
    subtitle,
    compactResult = false,
}) {
    __useI18nReactive();
    return (
        <section className="overflow-hidden rounded-xl border border-violet-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-violet-100 bg-violet-50/40 px-5 py-4">
                <div>
                    <h2 className="text-[15px] font-semibold text-gray-900">
                        {i18nT("pages.rating.rating.7b5097b")}
                    </h2>
                    <p className="mt-1 text-xs text-gray-500">
                        {subtitle}
                    </p>
                </div>
                <RiSparkling2Line
                    size={19}
                    className="text-violet-600"
                />
            </div>
            <div className="p-5">
                {!compactResult && (
                <div className="rounded-xl border border-green-100 bg-green-50 p-4">
                    <p className="text-xs font-semibold uppercase text-green-600">
                        {i18nT("pages.rating.rating.0133281")}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">
                        {scoreValue(
                            rating.score,
                        )}
                        /100
                    </p>
                </div>
                )}
                <p className="mt-4 text-sm leading-6 text-gray-600">
                    {rating.explanation ||
                        "Пояснение отсутствует"}
                </p>
                {rating.formula && (
                    <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs leading-5 text-gray-500">
                        {rating.formula}
                    </div>
                )}
            </div>
        </section>
    );
}

// MARK: UI helpers

function PeriodSwitch({
    value,
    onChange,
}) {
    __useI18nReactive();
    return (
        <div className="inline-flex self-start rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
            {PERIODS().map(
                (item) => (
                    <button
                        key={
                            item.value
                        }
                        type="button"
                        onClick={() =>
                            onChange(
                                item.value,
                            )
                        }
                        className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                            value ===
                            item.value
                                ? "bg-blue-600 text-white shadow-sm"
                                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                    >
                        {item.label}
                    </button>
                ),
            )}
        </div>
    );
}

function StatCard({
    label,
    value,
    helper,
    icon: Icon,
    tone,
}) {
    const tones = {
        gold:
            "bg-amber-50 text-amber-600",
        blue:
            "bg-blue-50 text-blue-600",
        green:
            "bg-green-50 text-green-600",
        violet:
            "bg-violet-50 text-violet-600",
    };
    return (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500">
                    {label}
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                    {value}
                </p>
                <p className="mt-1 truncate text-[11px] text-gray-400">
                    {helper}
                </p>
            </div>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                tones[tone] ||
                tones.blue
            }`}>
                <Icon
                    size={20}
                />
            </div>
        </div>
    );
}

function LeaderCard({
    place,
    employee,
    onClick,
}) {
    __useI18nReactive();
    const styles = {
        1: "border-amber-200 bg-amber-50/60",
        2: "border-slate-200 bg-slate-50",
        3: "border-orange-200 bg-orange-50/40",
    };
    return (
        <button
            type="button"
            onClick={
                onClick
            }
            className={`w-full rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
                styles[place]
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-bold text-gray-400">
                        #{place}
                    </p>
                    <p className="mt-2 text-sm font-bold text-gray-900">
                        {employee.fullName}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                        {employee.specialty ||
                            "Специальность не указана"}
                    </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm">
                    <RiTrophyLine
                        size={19}
                    />
                </div>
            </div>
            <div className="mt-4 flex items-end justify-between">
                <div>
                    <p className="text-3xl font-bold text-gray-900">
                        {employee.score}
                    </p>
                    <p className="text-[10px] text-gray-400">
                        {i18nT("pages.rating.rating.0791eff")}
                    </p>
                </div>
                <p className="text-xs font-semibold text-gray-500">
                    {employee.closed}{" "}
                    {i18nT("pages.rating.rating.04aadcb")}
                </p>
            </div>
        </button>
    );
}

function ScoreBadge({
    score,
}) {
    const value =
        Number(score);
    let className =
        "bg-gray-100 text-gray-700";
    if (value >= 85) {
        className =
            "bg-green-50 text-green-700";
    } else if (
        value >= 70
    ) {
        className =
            "bg-blue-50 text-blue-700";
    } else if (
        value >= 50
    ) {
        className =
            "bg-orange-50 text-orange-700";
    } else {
        className =
            "bg-red-50 text-red-700";
    }
    return (
        <span className={`inline-flex min-w-[62px] justify-center rounded-full px-2.5 py-1 text-xs font-bold ${className}`}>
            {Number.isFinite(value)
                ? value
                : "—"}
        </span>
    );
}

function PointCard({
    title,
    value,
}) {
    __useI18nReactive();
    return (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs text-gray-500">
                {title}
            </p>
            <p className="mt-2 text-xl font-bold text-gray-900">
                {value ??
                    "—"}
            </p>
            <p className="mt-1 text-[10px] text-gray-400">
                {i18nT("pages.rating.rating.ce62b4a")}
            </p>
        </div>
    );
}

function ErrorBox({
    text,
}) {
    return (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {text}
        </div>
    );
}

function LoadingPage() {
    return (
        <div className="flex min-h-[500px] items-center justify-center">
            <RiLoader4Line
                size={32}
                className="animate-spin text-blue-600"
            />
        </div>
    );
}
