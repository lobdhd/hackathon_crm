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
    RiSearchLine,
    RiShieldCheckLine,
    RiSparkling2Line,
    RiStarFill,
    RiTeamLine,
    RiTimeLine,
    RiTrophyLine,
} from "react-icons/ri";

import SmartTable from "../../react-components/SmartTable/SmartTable.jsx";

import {
    useBrigadeRatings,
    useRatings,
} from "../../hooks/useReports.js";

import {
    useAreas,
} from "../../hooks/useReferences.js";

import {
    useI18n,
} from "../../i18n/index.js";


// MARK: Config

const PERIODS = [
    {
        value: "shift",
        label: "Смена",
    },
    {
        value: "week",
        label: "Неделя",
    },
    {
        value: "month",
        label: "Месяц",
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

function percent(
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

    /*
     * Backend может отдавать долю либо уже процент.
     */
    const normalized =
        number <= 1
            ? number * 100
            : number;

    return `${Math.round(
        normalized,
    )}%`;
}

function numberValue(
    value,
    digits = 1,
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

    return number.toFixed(
        digits,
    );
}


// MARK: Page

export default function Rating() {
    useI18n();

    const navigate =
        useNavigate();

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
            ],
        );

    const ratingsQuery =
        useRatings(
            reportParams,
        );

    const brigadesQuery =
        useBrigadeRatings(
            reportParams,
        );

    const areasQuery =
        useAreas();

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

    function updateFilter(
        field,
        value,
    ) {
        setFilters(
            (
                previous,
            ) => ({
                ...previous,
                [field]: value,
            }),
        );
    }

    function resetFilters() {
        setFilters(
            (
                previous,
            ) => ({
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
                            (
                                item,
                            ) =>
                                item.specialty,
                        )
                        .filter(
                            Boolean,
                        ),
                ),
            ].sort(),
            [
                employees,
            ],
        );

    const filteredEmployees =
        useMemo(() => {
            const search =
                filters.search
                    .trim()
                    .toLowerCase();

            return employees
                .filter(
                    (
                        employee,
                    ) => {
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
                    (
                        a,
                        b,
                    ) =>
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
        ]);

    const filteredBrigades =
        useMemo(() => {
            const search =
                filters.search
                    .trim()
                    .toLowerCase();

            return brigades
                .filter(
                    (
                        brigade,
                    ) =>
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
                    (
                        a,
                        b,
                    ) =>
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
        ]);

    const scoredEmployees =
        filteredEmployees.filter(
            (
                employee,
            ) =>
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
                (
                    total,
                    employee,
                ) =>
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
                (
                    total,
                    employee,
                ) => {
                    const value =
                        Number(
                            employee.onTimeRate,
                        ) || 0;

                    return (
                        total +
                        (value <=
                        1
                            ? value *
                              100
                            : value)
                    );
                },
                0,
            ) /
            scoredEmployees.length
            : 0;

    const totalClosed =
        employees.reduce(
            (
                total,
                employee,
            ) =>
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
        ].filter(
            Boolean,
        ).length;

    const employeeColumns =
        useMemo(
            () => [
                {
                    key:
                        "place",

                    header:
                        "#",

                    minWidth:
                        60,

                    sortable:
                        false,

                    render: (
                        _,
                        index,
                    ) => (
                        <span className="font-bold text-gray-400">
                            {index +
                                1}
                        </span>
                    ),
                },

                {
                    field:
                        "fullName",

                    header:
                        "Исполнитель",

                    minWidth:
                        250,

                    render:
                        (
                            employee,
                        ) => (
                            <div>
                                <p className="font-semibold text-gray-900">
                                    {
                                        employee.fullName
                                    }
                                </p>

                                <p className="mt-1 text-xs text-gray-400">
                                    {employee.specialty ||
                                        "Специальность не указана"}
                                </p>
                            </div>
                        ),
                },

                {
                    field:
                        "score",

                    header:
                        "Рейтинг",

                    minWidth:
                        120,

                    sortValue:
                        (
                            row,
                        ) =>
                            Number(
                                row.score,
                            ),

                    render:
                        (
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
                    field:
                        "quality",

                    header:
                        "Качество",

                    minWidth:
                        110,

                    render:
                        (
                            row,
                        ) =>
                            numberValue(
                                row.quality,
                            ),
                },

                {
                    field:
                        "onTimeRate",

                    header:
                        "В срок",

                    minWidth:
                        110,

                    render:
                        (
                            row,
                        ) =>
                            percent(
                                row.onTimeRate,
                            ),
                },

                {
                    field:
                        "reworkRate",

                    header:
                        "Доработки",

                    minWidth:
                        120,

                    render:
                        (
                            row,
                        ) =>
                            percent(
                                row.reworkRate,
                            ),
                },

                {
                    field:
                        "repeatFailureRate",

                    header:
                        "Повторные отказы",

                    minWidth:
                        150,

                    render:
                        (
                            row,
                        ) =>
                            percent(
                                row.repeatFailureRate,
                            ),
                },

                {
                    field:
                        "productivity",

                    header:
                        "Производительность",

                    minWidth:
                        160,

                    render:
                        (
                            row,
                        ) =>
                            numberValue(
                                row.productivity,
                            ),
                },

                {
                    field:
                        "closed",

                    header:
                        "Закрыто",

                    minWidth:
                        100,
                },
            ],
        [],
    );

    const brigadeColumns =
        useMemo(
            () => [
                {
                    field:
                        "name",

                    header:
                        "Бригада",

                    minWidth:
                        230,

                    render:
                        (
                            brigade,
                        ) => (
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                    <RiTeamLine />
                                </div>

                                <div>
                                    <p className="font-semibold text-gray-900">
                                        {
                                            brigade.name
                                        }
                                    </p>

                                    <p className="mt-1 text-xs text-gray-400">
                                        Участников:{" "}
                                        {Array.isArray(
                                            brigade.members,
                                        )
                                            ? brigade
                                                .members
                                                .length
                                            : brigade.members ??
                                              "—"}
                                    </p>
                                </div>
                            </div>
                        ),
                },

                {
                    field:
                        "score",

                    header:
                        "Рейтинг",

                    minWidth:
                        120,

                    render:
                        (
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
                    field:
                        "quality",

                    header:
                        "Качество",

                    minWidth:
                        120,

                    render:
                        (
                            row,
                        ) =>
                            numberValue(
                                row.quality,
                            ),
                },

                {
                    field:
                        "onTimeRate",

                    header:
                        "В срок",

                    minWidth:
                        120,

                    render:
                        (
                            row,
                        ) =>
                            percent(
                                row.onTimeRate,
                            ),
                },

                {
                    field:
                        "repeatFailureRate",

                    header:
                        "Повторные отказы",

                    minWidth:
                        150,

                    render:
                        (
                            row,
                        ) =>
                            percent(
                                row.repeatFailureRate,
                            ),
                },

                {
                    field:
                        "closed",

                    header:
                        "Закрыто",

                    minWidth:
                        110,
                },
            ],
        [],
    );

    if (
        ratingsQuery.isLoading &&
        !ratingsQuery.data
    ) {
        return (
            <div className="flex min-h-[500px] items-center justify-center">
                <RiLoader4Line
                    size={32}
                    className="animate-spin text-blue-600"
                />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[1800px]">

            {/* HEADER */}

            <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                        Рейтинг
                    </h1>

                    <p className="mt-1 text-sm text-gray-500">
                        Оценка качества,
                        сроков и
                        эффективности
                        исполнителей
                    </p>
                </div>

                <div className="inline-flex self-start rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
                    {PERIODS.map(
                        (
                            item,
                        ) => (
                            <PeriodButton
                                key={
                                    item.value
                                }
                                active={
                                    filters.period ===
                                    item.value
                                }
                                onClick={() =>
                                    updateFilter(
                                        "period",
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
            </div>


            {/* KPI */}

            <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
                <StatCard
                    label="Лучший рейтинг"
                    value={
                        bestEmployee
                            ?.score ??
                        "—"
                    }
                    helper={
                        bestEmployee
                            ?.fullName ??
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
                    helper="По исполнителям"
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
                    label="Закрыто нарядов"
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


            {/* PODIUM */}

            {topEmployees.length >
                0 && (
                <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="mb-5 flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-semibold text-gray-900">
                                Лидеры
                            </h2>

                            <p className="mt-1 text-xs text-gray-500">
                                Лучшие
                                исполнители
                                за выбранный
                                период
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
                                        index +
                                        1
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


            {/* FILTERS */}

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
                                    event
                                        .target
                                        .value,
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

                    <select
                        value={
                            filters.areaId
                        }
                        onChange={(
                            event,
                        ) =>
                            updateFilter(
                                "areaId",
                                event
                                    .target
                                    .value,
                            )
                        }
                        className="min-w-[210px] rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                    >
                        <option value="">
                            Все участки
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

                    {mode ===
                        "executors" && (
                        <select
                            value={
                                filters.specialty
                            }
                            onChange={(
                                event,
                            ) =>
                                updateFilter(
                                    "specialty",
                                    event
                                        .target
                                        .value,
                                )
                            }
                            className="min-w-[190px] rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                        >
                            <option value="">
                                Все
                                специальности
                            </option>

                            {specialties.map(
                                (
                                    specialty,
                                ) => (
                                    <option
                                        key={
                                            specialty
                                        }
                                        value={
                                            specialty
                                        }
                                    >
                                        {
                                            specialty
                                        }
                                    </option>
                                ),
                            )}
                        </select>
                    )}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <RiFilter3Line />

                        В рейтинге

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

                                Сбросить
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
                            Исполнители
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
                            Бригады
                        </button>
                    </div>
                </div>
            </div>


            {/* TABLE */}

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
                    minWidth={
                        1250
                    }
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
                    minWidth={
                        900
                    }
                    scrollHeight="clamp(360px, calc(100dvh - 620px), 560px)"
                    emptyText="Рейтинг бригад пуст"
                    emptyDescription="За выбранный период нет данных"
                />
            )}


            {/* EXPLANATION */}

            {bestEmployee && (
                <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">

                    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                            <div>
                                <h2 className="text-[15px] font-semibold text-gray-900">
                                    Формула
                                    рейтинга
                                </h2>

                                <p className="mt-1 text-xs text-gray-500">
                                    Баллы
                                    рассчитаны
                                    backend
                                </p>
                            </div>

                            <RiShieldCheckLine
                                size={19}
                                className="text-blue-600"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3 p-5 md:grid-cols-3">
                            <PointCard
                                title="Качество"
                                value={
                                    bestEmployee
                                        .points
                                        ?.quality
                                }
                            />

                            <PointCard
                                title="Сроки"
                                value={
                                    bestEmployee
                                        .points
                                        ?.onTime
                                }
                            />

                            <PointCard
                                title="Без возвратов"
                                value={
                                    bestEmployee
                                        .points
                                        ?.noReturns
                                }
                            />

                            <PointCard
                                title="Объём"
                                value={
                                    bestEmployee
                                        .points
                                        ?.volume
                                }
                            />

                            <PointCard
                                title="Сложность"
                                value={
                                    bestEmployee
                                        .points
                                        ?.complexity
                                }
                            />

                            <PointCard
                                title="Отказы"
                                value={
                                    bestEmployee
                                        .points
                                        ?.rejects
                                }
                            />
                        </div>
                    </section>

                    <section className="overflow-hidden rounded-xl border border-violet-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-violet-100 bg-violet-50/40 px-5 py-4">
                            <div>
                                <h2 className="text-[15px] font-semibold text-gray-900">
                                    Объяснение
                                </h2>

                                <p className="mt-1 text-xs text-gray-500">
                                    {
                                        bestEmployee.fullName
                                    }
                                </p>
                            </div>

                            <RiSparkling2Line
                                size={19}
                                className="text-violet-600"
                            />
                        </div>

                        <div className="p-5">
                            <div className="rounded-xl border border-green-100 bg-green-50 p-4">
                                <p className="text-xs font-semibold uppercase text-green-600">
                                    Результат
                                </p>

                                <p className="mt-2 text-3xl font-bold text-gray-900">
                                    {
                                        bestEmployee.score
                                    }
                                    /100
                                </p>
                            </div>

                            <p className="mt-4 text-sm leading-6 text-gray-600">
                                {bestEmployee.explanation ||
                                    "Пояснение отсутствует"}
                            </p>

                            {bestEmployee.formula && (
                                <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs leading-5 text-gray-500">
                                    {
                                        bestEmployee.formula
                                    }
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            )}
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
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            }`}
        >
            {children}
        </button>
    );
}


// MARK: Stat

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
                    size={
                        20
                    }
                />
            </div>
        </div>
    );
}


// MARK: Leader

function LeaderCard({
    place,
    employee,
    onClick,
}) {
    const styles = {
        1: "border-amber-200 bg-amber-50/60",
        2: "border-slate-200 bg-slate-50",
        3: "border-orange-200 bg-orange-50/40",
    };

    return (
        <button
            type="button"
            onClick={onClick}
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
                        {
                            employee.fullName
                        }
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                        {employee.specialty ||
                            "Специальность не указана"}
                    </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm">
                    <RiTrophyLine
                        size={
                            19
                        }
                    />
                </div>
            </div>

            <div className="mt-4 flex items-end justify-between">
                <div>
                    <p className="text-3xl font-bold text-gray-900">
                        {
                            employee.score
                        }
                    </p>

                    <p className="text-[10px] text-gray-400">
                        из 100
                    </p>
                </div>

                <p className="text-xs font-semibold text-gray-500">
                    {
                        employee.closed
                    }{" "}
                    закрыто
                </p>
            </div>
        </button>
    );
}


// MARK: Score

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
            {Number.isFinite(
                value,
            )
                ? value
                : "—"}
        </span>
    );
}


// MARK: Points

function PointCard({
    title,
    value,
}) {
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
                баллов
            </p>
        </div>
    );
}