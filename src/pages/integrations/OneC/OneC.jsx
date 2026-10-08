import {
    useMemo,
    useState,
} from "react";

import {
    RiCheckboxCircleLine,
    RiCloseLine,
    RiDatabase2Line,
    RiErrorWarningLine,
    RiFileList3Line,
    RiFilter3Line,
    RiInformationLine,
    RiLoader4Line,
    RiPlayCircleLine,
    RiRefreshLine,
    RiSearchLine,
    RiTimeLine,
    RiUploadCloud2Line,
} from "react-icons/ri";

import GlideSelect from "../../../react-components/GlideSelect/GlideSelect.jsx";

import ScrollArea from "../../../components/ScrollArea/ScrollArea.jsx";

import {
    useIntegrationOrders,
    useOneCJobs,
    useOneCMappings,
    usePushOneCOrders,
    useRetryOneCJob,
    useRunOneCQueue,
} from "../../../hooks/useOneC.js";


// MARK: Config

const STATUS_OPTIONS = [
    {
        value:
            "",
        label:
            "Все статусы",
    },

    {
        value:
            "PENDING",
        label:
            "В очереди",
    },

    {
        value:
            "PROCESSING",
        label:
            "Отправляется",
    },

    {
        value:
            "SUCCESS",
        label:
            "Доставлено",
    },

    {
        value:
            "FAILED",
        label:
            "Ошибка",
    },

    {
        value:
            "DEAD",
        label:
            "Попытки исчерпаны",
    },
];

const DIRECTION_OPTIONS = [
    {
        value:
            "",
        label:
            "Все направления",
    },

    {
        value:
            "OUTBOUND",
        label:
            "НарядAI → 1С",
    },

    {
        value:
            "INBOUND",
        label:
            "1С → НарядAI",
    },
];

const LIMIT_OPTIONS = [
    {
        value:
            "50",
        label:
            "50 записей",
    },

    {
        value:
            "100",
        label:
            "100 записей",
    },

    {
        value:
            "200",
        label:
            "200 записей",
    },

    {
        value:
            "500",
        label:
            "500 записей",
    },
];

const PUSH_MODE_OPTIONS = [
    {
        value:
            "IDS",
        label:
            "По ID нарядов",
    },

    {
        value:
            "SINCE",
        label:
            "Изменённые с даты",
    },
];

const STATUS_LABELS = {
    PENDING:
        "В очереди",

    PROCESSING:
        "Отправляется",

    SUCCESS:
        "Доставлено",

    FAILED:
        "Ошибка",

    DEAD:
        "Исчерпаны попытки",
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

function getErrorMessage(
    error,
) {
    return (
        error?.response?.data
            ?.error ||
        error?.message ||
        "Произошла ошибка"
    );
}

function formatDate(
    value,
) {
    if (!value) {
        return "—";
    }

    const date =
        new Date(
            value,
        );

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return "—";
    }

    return date.toLocaleString(
        "ru-RU",
        {
            day:
                "2-digit",

            month:
                "2-digit",

            year:
                "numeric",

            hour:
                "2-digit",

            minute:
                "2-digit",

            second:
                "2-digit",
        },
    );
}

function toLocalInputValue(
    date,
) {
    const offset =
        date.getTimezoneOffset();

    const localDate =
        new Date(
            date.getTime() -
            offset * 60 * 1000,
        );

    return localDate
        .toISOString()
        .slice(
            0,
            16,
        );
}

function localInputToIso(
    value,
) {
    if (!value) {
        return "";
    }

    const date =
        new Date(
            value,
        );

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return "";
    }

    return date.toISOString();
}

function parseIds(
    value,
) {
    return [
        ...new Set(
            String(
                value || "",
            )
                .split(
                    /[\s,;]+/,
                )
                .map(
                    (
                        item,
                    ) =>
                        Number(
                            item.trim(),
                        ),
                )
                .filter(
                    (
                        item,
                    ) =>
                        Number.isInteger(
                            item,
                        ) &&
                        item > 0,
                ),
        ),
    ];
}

function getStatusClass(
    status,
) {
    switch (
    status
    ) {
        case "PENDING":
            return "bg-slate-100 text-slate-700";

        case "PROCESSING":
            return "bg-blue-50 text-blue-700";

        case "SUCCESS":
            return "bg-green-50 text-green-700";

        case "FAILED":
            return "bg-orange-50 text-orange-700";

        case "DEAD":
            return "bg-red-50 text-red-700";

        default:
            return "bg-gray-100 text-gray-600";
    }
}

function safeJson(
    value,
) {
    if (
        value == null
    ) {
        return "—";
    }

    try {
        return JSON.stringify(
            value,
            null,
            2,
        );
    } catch {
        return String(
            value,
        );
    }
}

function matchesJobSearch(
    job,
    search,
) {
    const value =
        String(
            search || "",
        )
            .trim()
            .toLowerCase();

    if (!value) {
        return true;
    }

    return [
        job.id,
        job.entity,
        job.eventType,
        job.localId,
        job.externalId,
        job.idempotencyKey,
        job.lastError,
    ]
        .filter(
            (
                item,
            ) =>
                item != null,
        )
        .some(
            (
                item,
            ) =>
                String(
                    item,
                )
                    .toLowerCase()
                    .includes(
                        value,
                    ),
        );
}


// MARK: Page

export default function OneC() {
    const [
        activeTab,
        setActiveTab,
    ] = useState(
        "jobs",
    );

    const [
        status,
        setStatus,
    ] = useState("");

    const [
        direction,
        setDirection,
    ] = useState("");

    const [
        search,
        setSearch,
    ] = useState("");

    const [
        limit,
        setLimit,
    ] = useState(
        "100",
    );

    const [
        selectedJob,
        setSelectedJob,
    ] = useState(null);

    const [
        pushOpen,
        setPushOpen,
    ] = useState(false);

    const [
        notice,
        setNotice,
    ] = useState(null);


    // MARK: Jobs

    const jobsQuery =
        useOneCJobs(
            {
                status:
                    status ||
                    undefined,

                limit:
                    Number(
                        limit,
                    ),
            },
            {
                enabled:
                    activeTab ===
                    "jobs",

                refetchInterval:
                    activeTab ===
                        "jobs"
                        ? 10000
                        : false,
            },
        );

    /*
     * Отдельно последние 500
     * для KPI по всем статусам.
     */
    const statsQuery =
        useOneCJobs(
            {
                limit:
                    500,
            },
            {
                refetchInterval:
                    15000,
            },
        );

    const runMutation =
        useRunOneCQueue();

    const retryMutation =
        useRetryOneCJob();

    const pushMutation =
        usePushOneCOrders();

    const jobs =
        asArray(
            jobsQuery.data,
        );

    const visibleJobs =
        useMemo(
            () =>
                jobs.filter(
                    (
                        job,
                    ) => {
                        if (
                            direction &&
                            job.direction !==
                            direction
                        ) {
                            return false;
                        }

                        return matchesJobSearch(
                            job,
                            search,
                        );
                    },
                ),
            [
                jobs,
                direction,
                search,
            ],
        );

    const stats =
        useMemo(
            () => {
                const items =
                    asArray(
                        statsQuery.data,
                    );

                return {
                    total:
                        items.length,

                    pending:
                        items.filter(
                            (
                                item,
                            ) =>
                                item.status ===
                                "PENDING",
                        ).length,

                    processing:
                        items.filter(
                            (
                                item,
                            ) =>
                                item.status ===
                                "PROCESSING",
                        ).length,

                    success:
                        items.filter(
                            (
                                item,
                            ) =>
                                item.status ===
                                "SUCCESS",
                        ).length,

                    failed:
                        items.filter(
                            (
                                item,
                            ) =>
                                item.status ===
                                "FAILED" ||
                                item.status ===
                                "DEAD",
                        ).length,

                    dead:
                        items.filter(
                            (
                                item,
                            ) =>
                                item.status ===
                                "DEAD",
                        ).length,
                };
            },
            [
                statsQuery.data,
            ],
        );


    // MARK: Mappings

    const [
        mappingInput,
        setMappingInput,
    ] = useState(
        "EQUIPMENT",
    );

    const [
        mappingEntity,
        setMappingEntity,
    ] = useState(
        "EQUIPMENT",
    );

    const [
        mappingSearch,
        setMappingSearch,
    ] = useState("");

    const mappingsQuery =
        useOneCMappings(
            {
                entity:
                    mappingEntity ||
                    undefined,
            },
            {
                enabled:
                    activeTab ===
                    "mappings",
            },
        );

    const mappings =
        asArray(
            mappingsQuery.data,
        );

    const visibleMappings =
        useMemo(
            () => {
                const q =
                    mappingSearch
                        .trim()
                        .toLowerCase();

                if (!q) {
                    return mappings;
                }

                return mappings.filter(
                    (
                        item,
                    ) =>
                        [
                            item.id,
                            item.entity,
                            item.localId,
                            item.externalId,
                        ]
                            .filter(
                                (
                                    value,
                                ) =>
                                    value !=
                                    null,
                            )
                            .some(
                                (
                                    value,
                                ) =>
                                    String(
                                        value,
                                    )
                                        .toLowerCase()
                                        .includes(
                                            q,
                                        ),
                            ),
                );
            },
            [
                mappings,
                mappingSearch,
            ],
        );


    // MARK: Reconciliation

    const initialSince =
        useMemo(
            () =>
                toLocalInputValue(
                    new Date(
                        Date.now() -
                        24 *
                        60 *
                        60 *
                        1000,
                    ),
                ),
            [],
        );

    const [
        reconcileInput,
        setReconcileInput,
    ] = useState(
        initialSince,
    );

    const [
        reconcileSince,
        setReconcileSince,
    ] = useState(
        localInputToIso(
            initialSince,
        ),
    );

    const [
        reconcileSearch,
        setReconcileSearch,
    ] = useState("");

    const reconciliationQuery =
        useIntegrationOrders(
            {
                since:
                    reconcileSince,
            },
            {
                enabled:
                    activeTab ===
                    "reconciliation" &&
                    Boolean(
                        reconcileSince,
                    ),
            },
        );

    const reconciliationOrders =
        asArray(
            reconciliationQuery.data,
        );

    const visibleReconciliationOrders =
        useMemo(
            () => {
                const q =
                    reconcileSearch
                        .trim()
                        .toLowerCase();

                if (!q) {
                    return reconciliationOrders;
                }

                return reconciliationOrders.filter(
                    (
                        order,
                    ) =>
                        [
                            order.id,
                            order.number,
                            order.status,
                            order.description,
                            order.equipment
                                ?.name,
                            order.area?.name,
                            order.assignee
                                ?.fullName,
                        ]
                            .filter(Boolean)
                            .some(
                                (
                                    value,
                                ) =>
                                    String(
                                        value,
                                    )
                                        .toLowerCase()
                                        .includes(
                                            q,
                                        ),
                            ),
                );
            },
            [
                reconciliationOrders,
                reconcileSearch,
            ],
        );


    // MARK: Actions

    async function handleRun() {
        setNotice(
            null,
        );

        try {
            const result =
                await runMutation.mutateAsync();

            if (
                result?.disabled
            ) {
                setNotice({
                    type:
                        "warning",

                    text:
                        "Интеграция 1С отключена на backend.",
                });

                return;
            }

            setNotice({
                type:
                    "success",

                text:
                    `Очередь обработана. Обработано: ${result?.processed ??
                    0
                    }, успешно: ${result?.succeeded ??
                    0
                    }.`,
            });
        } catch (
        error
        ) {
            setNotice({
                type:
                    "error",

                text:
                    getErrorMessage(
                        error,
                    ),
            });
        }
    }

    async function handleRetry(
        job,
    ) {
        setNotice(
            null,
        );

        try {
            await retryMutation.mutateAsync(
                job.id,
            );

            setNotice({
                type:
                    "success",

                text:
                    `Задание #${job.id} возвращено в очередь.`,
            });
        } catch (
        error
        ) {
            setNotice({
                type:
                    "error",

                text:
                    getErrorMessage(
                        error,
                    ),
            });
        }
    }

    async function handlePush(
        payload,
    ) {
        setNotice(
            null,
        );

        try {
            const result =
                await pushMutation.mutateAsync(
                    payload,
                );

            setPushOpen(
                false,
            );

            setNotice({
                type:
                    "success",

                text:
                    `В очередь 1С добавлено: ${result?.queued ??
                    0
                    }.`,
            });
        } catch (
        error
        ) {
            throw error;
        }
    }

    function applyReconciliation() {
        const iso =
            localInputToIso(
                reconcileInput,
            );

        if (!iso) {
            return;
        }

        if (
            iso ===
            reconcileSince
        ) {
            reconciliationQuery.refetch();

            return;
        }

        setReconcileSince(
            iso,
        );
    }


    // MARK: Render

    return (
        <div className="space-y-5">

            {/* MARK: Header */}

            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400 text-xl font-black text-black">
                            1C
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                                Интеграция
                                с 1С
                            </h1>

                            <p className="mt-1 text-sm text-gray-500">
                                Мониторинг
                                обмена,
                                ошибки,
                                повторные
                                отправки и
                                ручная
                                синхронизация
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() =>
                            setPushOpen(
                                true,
                            )
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                        <RiUploadCloud2Line />

                        Выгрузить
                        наряды
                    </button>

                    <button
                        type="button"
                        onClick={
                            handleRun
                        }
                        disabled={
                            runMutation.isPending
                        }
                        className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {runMutation.isPending ? (
                            <RiLoader4Line className="animate-spin" />
                        ) : (
                            <RiPlayCircleLine />
                        )}

                        Запустить
                        обмен
                    </button>
                </div>
            </div>


            {/* MARK: Notice */}

            {notice && (
                <Notice
                    notice={
                        notice
                    }
                    onClose={() =>
                        setNotice(
                            null,
                        )
                    }
                />
            )}


            {/* MARK: Stats */}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard
                    title="В очереди"
                    value={
                        stats.pending
                    }
                    icon={
                        RiTimeLine
                    }
                    description="PENDING"
                />

                <MetricCard
                    title="Отправляется"
                    value={
                        stats.processing
                    }
                    icon={
                        RiRefreshLine
                    }
                    description="PROCESSING"
                />

                <MetricCard
                    title="Доставлено"
                    value={
                        stats.success
                    }
                    icon={
                        RiCheckboxCircleLine
                    }
                    description="SUCCESS"
                />

                <MetricCard
                    title="С ошибками"
                    value={
                        stats.failed
                    }
                    icon={
                        RiErrorWarningLine
                    }
                    description={`${stats.dead} требуют внимания`}
                    danger={
                        stats.failed >
                        0
                    }
                />
            </div>


            {/* MARK: Tabs */}

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex overflow-x-auto border-b border-gray-200 px-2">
                    <TabButton
                        active={
                            activeTab ===
                            "jobs"
                        }
                        onClick={() =>
                            setActiveTab(
                                "jobs",
                            )
                        }
                    >
                        Задания
                        обмена
                    </TabButton>

                    <TabButton
                        active={
                            activeTab ===
                            "mappings"
                        }
                        onClick={() =>
                            setActiveTab(
                                "mappings",
                            )
                        }
                    >
                        Соответствия
                        1С
                    </TabButton>

                    <TabButton
                        active={
                            activeTab ===
                            "reconciliation"
                        }
                        onClick={() =>
                            setActiveTab(
                                "reconciliation",
                            )
                        }
                    >
                        Сверка
                        нарядов
                    </TabButton>
                </div>

                {activeTab ===
                    "jobs" && (
                        <JobsTab
                            jobs={
                                visibleJobs
                            }
                            query={
                                jobsQuery
                            }
                            status={
                                status
                            }
                            setStatus={
                                setStatus
                            }
                            direction={
                                direction
                            }
                            setDirection={
                                setDirection
                            }
                            search={
                                search
                            }
                            setSearch={
                                setSearch
                            }
                            limit={
                                limit
                            }
                            setLimit={
                                setLimit
                            }
                            onJob={
                                setSelectedJob
                            }
                            onRetry={
                                handleRetry
                            }
                            retryingId={
                                retryMutation
                                    .variables
                            }
                        />
                    )}

                {activeTab ===
                    "mappings" && (
                        <MappingsTab
                            input={
                                mappingInput
                            }
                            setInput={
                                setMappingInput
                            }
                            entity={
                                mappingEntity
                            }
                            setEntity={
                                setMappingEntity
                            }
                            search={
                                mappingSearch
                            }
                            setSearch={
                                setMappingSearch
                            }
                            items={
                                visibleMappings
                            }
                            query={
                                mappingsQuery
                            }
                        />
                    )}

                {activeTab ===
                    "reconciliation" && (
                        <ReconciliationTab
                            since={
                                reconcileInput
                            }
                            setSince={
                                setReconcileInput
                            }
                            onApply={
                                applyReconciliation
                            }
                            search={
                                reconcileSearch
                            }
                            setSearch={
                                setReconcileSearch
                            }
                            items={
                                visibleReconciliationOrders
                            }
                            total={
                                reconciliationOrders.length
                            }
                            query={
                                reconciliationQuery
                            }
                        />
                    )}
            </div>


            {/* MARK: Job modal */}

            {selectedJob && (
                <JobDetailsModal
                    job={
                        selectedJob
                    }
                    onClose={() =>
                        setSelectedJob(
                            null,
                        )
                    }
                    onRetry={
                        handleRetry
                    }
                    retrying={
                        retryMutation.isPending
                    }
                />
            )}


            {/* MARK: Push modal */}

            {pushOpen && (
                <PushOrdersModal
                    pending={
                        pushMutation.isPending
                    }
                    onClose={() =>
                        setPushOpen(
                            false,
                        )
                    }
                    onSubmit={
                        handlePush
                    }
                />
            )}
        </div>
    );
}


// MARK: Metric card

function MetricCard({
    title,
    value,
    icon: Icon,
    description,
    danger = false,
}) {
    return (
        <div
            className={`
                rounded-2xl
                border
                bg-white
                p-4
                shadow-sm

                ${danger
                    ? "border-red-200"
                    : "border-gray-200"
                }
            `}
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        {title}
                    </p>

                    <p
                        className={`
                            mt-2
                            text-2xl
                            font-bold

                            ${danger
                                ? "text-red-600"
                                : "text-gray-900"
                            }
                        `}
                    >
                        {value}
                    </p>

                    <p className="mt-1 text-[11px] text-gray-400">
                        {
                            description
                        }
                    </p>
                </div>

                <div
                    className={`
                        flex
                        h-9
                        w-9
                        items-center
                        justify-center
                        rounded-lg

                        ${danger
                            ? "bg-red-50 text-red-600"
                            : "bg-gray-100 text-gray-600"
                        }
                    `}
                >
                    <Icon
                        size={
                            18
                        }
                    />
                </div>
            </div>
        </div>
    );
}


// MARK: Tab

function TabButton({
    active,
    onClick,
    children,
}) {
    return (
        <button
            type="button"
            onClick={
                onClick
            }
            className={`
                relative
                whitespace-nowrap
                px-4
                py-4
                text-sm
                font-semibold
                transition

                ${active
                    ? "text-blue-700"
                    : "text-gray-500 hover:text-gray-900"
                }
            `}
        >
            {children}

            {active && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-blue-600" />
            )}
        </button>
    );
}


// MARK: Jobs tab

function JobsTab({
    jobs,
    query,

    status,
    setStatus,

    direction,
    setDirection,

    search,
    setSearch,

    limit,
    setLimit,

    onJob,
    onRetry,
    retryingId,
}) {
    return (
        <div>
            <div className="flex flex-col gap-3 border-b border-gray-100 p-4 xl:flex-row xl:items-center">
                <div className="relative min-w-0 flex-1">
                    <RiSearchLine
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                        value={
                            search
                        }
                        onChange={(
                            event,
                        ) =>
                            setSearch(
                                event
                                    .target
                                    .value,
                            )
                        }
                        placeholder="Поиск по ID, сущности, событию, ошибке..."
                        className="h-10 w-full rounded-lg border border-gray-300 bg-gray-50 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <GlideSelect
                        options={
                            STATUS_OPTIONS
                        }
                        value={
                            status
                        }
                        onChange={
                            setStatus
                        }
                        className="glide-select--filter"
                        menuWidth={
                            210
                        }
                    />

                    <GlideSelect
                        options={
                            DIRECTION_OPTIONS
                        }
                        value={
                            direction
                        }
                        onChange={
                            setDirection
                        }
                        className="glide-select--filter"
                        menuWidth={
                            210
                        }
                    />

                    <GlideSelect
                        options={
                            LIMIT_OPTIONS
                        }
                        value={
                            limit
                        }
                        onChange={
                            setLimit
                        }
                        className="glide-select--filter"
                        menuWidth={
                            150
                        }
                    />

                    <button
                        type="button"
                        onClick={() =>
                            query.refetch()
                        }
                        disabled={
                            query.isFetching
                        }
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 transition hover:bg-gray-50 disabled:opacity-50"
                    >
                        <RiRefreshLine
                            className={
                                query.isFetching
                                    ? "animate-spin"
                                    : ""
                            }
                        />
                    </button>
                </div>
            </div>

            {query.isLoading ? (
                <LoadingState text="Загружаем задания обмена..." />
            ) : query.isError ? (
                <ErrorState
                    text={
                        getErrorMessage(
                            query.error,
                        )
                    }
                    onRetry={() =>
                        query.refetch()
                    }
                />
            ) : jobs.length ===
                0 ? (
                <EmptyState
                    title="Задания не найдены"
                    text="Для выбранных фильтров заданий обмена нет."
                />
            ) : (
                <ScrollArea
                    axis="both"
                    className="max-h-[620px]"
                >
                    <table className="w-full min-w-[1180px] border-collapse text-left">
                        <thead className="sticky top-0 z-10 bg-gray-50">
                            <tr className="border-b border-gray-200">
                                <Th>
                                    ID
                                </Th>

                                <Th>
                                    Статус
                                </Th>

                                <Th>
                                    Направление
                                </Th>

                                <Th>
                                    Сущность
                                </Th>

                                <Th>
                                    Событие
                                </Th>

                                <Th>
                                    Local ID
                                </Th>

                                <Th>
                                    External ID
                                </Th>

                                <Th>
                                    Попытки
                                </Th>

                                <Th>
                                    Следующая
                                    попытка
                                </Th>

                                <Th>
                                    Обновлено
                                </Th>

                                <Th align="right">
                                    Действия
                                </Th>
                            </tr>
                        </thead>

                        <tbody>
                            {jobs.map(
                                (
                                    job,
                                ) => {
                                    const canRetry =
                                        job.status ===
                                        "DEAD" &&
                                        job.direction ===
                                        "OUTBOUND";

                                    return (
                                        <tr
                                            key={
                                                job.id
                                            }
                                            onClick={() =>
                                                onJob(
                                                    job,
                                                )
                                            }
                                            className="cursor-pointer border-b border-gray-100 transition hover:bg-gray-50"
                                        >
                                            <Td>
                                                <span className="font-semibold text-gray-900">
                                                    #
                                                    {
                                                        job.id
                                                    }
                                                </span>
                                            </Td>

                                            <Td>
                                                <StatusBadge
                                                    status={
                                                        job.status
                                                    }
                                                />
                                            </Td>

                                            <Td>
                                                <DirectionBadge
                                                    direction={
                                                        job.direction
                                                    }
                                                />
                                            </Td>

                                            <Td>
                                                {job.entity ||
                                                    "—"}
                                            </Td>

                                            <Td>
                                                {job.eventType ||
                                                    "—"}
                                            </Td>

                                            <Td>
                                                {job.localId ??
                                                    "—"}
                                            </Td>

                                            <Td>
                                                <span className="max-w-[160px] truncate">
                                                    {job.externalId ??
                                                        "—"}
                                                </span>
                                            </Td>

                                            <Td>
                                                {job.attempts ??
                                                    0}
                                            </Td>

                                            <Td>
                                                {formatDate(
                                                    job.nextAttemptAt,
                                                )}
                                            </Td>

                                            <Td>
                                                {formatDate(
                                                    job.updatedAt,
                                                )}
                                            </Td>

                                            <Td align="right">
                                                {canRetry ? (
                                                    <button
                                                        type="button"
                                                        onClick={(
                                                            event,
                                                        ) => {
                                                            event.stopPropagation();

                                                            onRetry(
                                                                job,
                                                            );
                                                        }}
                                                        disabled={
                                                            Number(
                                                                retryingId,
                                                            ) ===
                                                            Number(
                                                                job.id,
                                                            )
                                                        }
                                                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                                                    >
                                                        Повторить
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-gray-300">
                                                        —
                                                    </span>
                                                )}
                                            </Td>
                                        </tr>
                                    );
                                },
                            )}
                        </tbody>
                    </table>
                </ScrollArea>
            )}
        </div>
    );
}


// MARK: Mappings

function MappingsTab({
    input,
    setInput,

    entity,
    setEntity,

    search,
    setSearch,

    items,
    query,
}) {
    return (
        <div>
            <div className="border-b border-gray-100 p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
                    <div className="min-w-0 flex-1">
                        <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                            Сущность
                            1С
                        </label>

                        <input
                            value={
                                input
                            }
                            onChange={(
                                event,
                            ) =>
                                setInput(
                                    event
                                        .target
                                        .value
                                        .toUpperCase(),
                                )
                            }
                            placeholder="Например: EQUIPMENT"
                            className="h-10 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm font-medium uppercase outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            setEntity(
                                input.trim(),
                            )
                        }
                        className="h-10 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-black"
                    >
                        Применить
                    </button>

                    <div className="relative min-w-0 flex-[1.5]">
                        <RiSearchLine
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                            value={
                                search
                            }
                            onChange={(
                                event,
                            ) =>
                                setSearch(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            placeholder="Поиск в соответствиях..."
                            className="h-10 w-full rounded-lg border border-gray-300 bg-gray-50 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            query.refetch()
                        }
                        disabled={
                            query.isFetching
                        }
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50"
                    >
                        <RiRefreshLine
                            className={
                                query.isFetching
                                    ? "animate-spin"
                                    : ""
                            }
                        />
                    </button>
                </div>

                <p className="mt-2 text-xs text-gray-400">
                    В backend-документации
                    гарантирован пример
                    сущности{" "}
                    <strong>
                        EQUIPMENT
                    </strong>
                    . Другие значения
                    здесь не
                    захардкожены.
                </p>
            </div>

            {query.isLoading ? (
                <LoadingState text="Загружаем соответствия 1С..." />
            ) : query.isError ? (
                <ErrorState
                    text={
                        getErrorMessage(
                            query.error,
                        )
                    }
                    onRetry={() =>
                        query.refetch()
                    }
                />
            ) : items.length ===
                0 ? (
                <EmptyState
                    title="Соответствий нет"
                    text={`Для сущности ${entity ||
                        "без фильтра"
                        } записей не найдено.`}
                />
            ) : (
                <ScrollArea
                    axis="both"
                    className="max-h-[620px]"
                >
                    <table className="w-full min-w-[760px] text-left">
                        <thead className="sticky top-0 bg-gray-50">
                            <tr className="border-b border-gray-200">
                                <Th>
                                    ID
                                </Th>

                                <Th>
                                    Сущность
                                </Th>

                                <Th>
                                    Local ID
                                </Th>

                                <Th>
                                    External
                                    ID 1С
                                </Th>

                                <Th>
                                    Создано
                                </Th>

                                <Th>
                                    Обновлено
                                </Th>
                            </tr>
                        </thead>

                        <tbody>
                            {items.map(
                                (
                                    item,
                                ) => (
                                    <tr
                                        key={
                                            item.id
                                        }
                                        className="border-b border-gray-100 hover:bg-gray-50"
                                    >
                                        <Td>
                                            #
                                            {
                                                item.id
                                            }
                                        </Td>

                                        <Td>
                                            <span className="font-semibold text-gray-900">
                                                {
                                                    item.entity
                                                }
                                            </span>
                                        </Td>

                                        <Td>
                                            {item.localId ??
                                                "—"}
                                        </Td>

                                        <Td>
                                            {item.externalId ??
                                                "—"}
                                        </Td>

                                        <Td>
                                            {formatDate(
                                                item.createdAt,
                                            )}
                                        </Td>

                                        <Td>
                                            {formatDate(
                                                item.updatedAt,
                                            )}
                                        </Td>
                                    </tr>
                                ),
                            )}
                        </tbody>
                    </table>
                </ScrollArea>
            )}
        </div>
    );
}


// MARK: Reconciliation

function ReconciliationTab({
    since,
    setSince,
    onApply,

    search,
    setSearch,

    items,
    total,

    query,
}) {
    return (
        <div>
            <div className="border-b border-gray-100 p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
                    <div>
                        <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                            Изменены
                            после
                        </label>

                        <input
                            type="datetime-local"
                            value={
                                since
                            }
                            onChange={(
                                event,
                            ) =>
                                setSince(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            className="h-10 rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={
                            onApply
                        }
                        className="h-10 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-black"
                    >
                        Получить
                        изменения
                    </button>

                    <div className="relative min-w-0 flex-1">
                        <RiSearchLine
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                            value={
                                search
                            }
                            onChange={(
                                event,
                            ) =>
                                setSearch(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            placeholder="Поиск среди изменённых нарядов..."
                            className="h-10 w-full rounded-lg border border-gray-300 bg-gray-50 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <div className="rounded-lg bg-gray-100 px-3 py-2.5 text-xs font-semibold text-gray-600">
                        Получено:{" "}
                        {total}
                    </div>
                </div>
            </div>

            {query.isLoading ||
                query.isFetching ? (
                <LoadingState text="Получаем изменённые наряды..." />
            ) : query.isError ? (
                <ErrorState
                    text={
                        getErrorMessage(
                            query.error,
                        )
                    }
                    onRetry={() =>
                        query.refetch()
                    }
                />
            ) : items.length ===
                0 ? (
                <EmptyState
                    title="Изменений нет"
                    text="После указанной даты изменённых нарядов не найдено."
                />
            ) : (
                <ScrollArea
                    axis="both"
                    className="max-h-[620px]"
                >
                    <table className="w-full min-w-[1000px] text-left">
                        <thead className="sticky top-0 bg-gray-50">
                            <tr className="border-b border-gray-200">
                                <Th>
                                    ID
                                </Th>

                                <Th>
                                    Номер
                                </Th>

                                <Th>
                                    Статус
                                </Th>

                                <Th>
                                    Описание
                                </Th>

                                <Th>
                                    Оборудование
                                </Th>

                                <Th>
                                    Участок
                                </Th>

                                <Th>
                                    Исполнитель
                                </Th>

                                <Th>
                                    Обновлено
                                </Th>
                            </tr>
                        </thead>

                        <tbody>
                            {items.map(
                                (
                                    order,
                                ) => (
                                    <tr
                                        key={
                                            order.id
                                        }
                                        className="border-b border-gray-100 hover:bg-gray-50"
                                    >
                                        <Td>
                                            #
                                            {
                                                order.id
                                            }
                                        </Td>

                                        <Td>
                                            <span className="font-semibold text-blue-700">
                                                {order.number ||
                                                    "—"}
                                            </span>
                                        </Td>

                                        <Td>
                                            {order.status ||
                                                "—"}
                                        </Td>

                                        <Td>
                                            <div className="max-w-[260px] truncate">
                                                {order.description ||
                                                    "—"}
                                            </div>
                                        </Td>

                                        <Td>
                                            {order.equipment
                                                ?.name ||
                                                "—"}
                                        </Td>

                                        <Td>
                                            {order.area
                                                ?.name ||
                                                "—"}
                                        </Td>

                                        <Td>
                                            {order.assignee
                                                ?.fullName ||
                                                "—"}
                                        </Td>

                                        <Td>
                                            {formatDate(
                                                order.updatedAt,
                                            )}
                                        </Td>
                                    </tr>
                                ),
                            )}
                        </tbody>
                    </table>
                </ScrollArea>
            )}
        </div>
    );
}


// MARK: Push modal

function PushOrdersModal({
    pending,
    onClose,
    onSubmit,
}) {
    const [
        mode,
        setMode,
    ] = useState(
        "IDS",
    );

    const [
        idsText,
        setIdsText,
    ] = useState("");

    const [
        since,
        setSince,
    ] = useState(
        toLocalInputValue(
            new Date(
                Date.now() -
                24 *
                60 *
                60 *
                1000,
            ),
        ),
    );

    const [
        error,
        setError,
    ] = useState("");

    const ids =
        useMemo(
            () =>
                parseIds(
                    idsText,
                ),
            [
                idsText,
            ],
        );


    async function submit(
        event,
    ) {
        event.preventDefault();

        setError("");

        let payload;

        if (
            mode ===
            "IDS"
        ) {
            if (
                ids.length ===
                0
            ) {
                setError(
                    "Укажите хотя бы один ID наряда.",
                );

                return;
            }

            if (
                ids.length >
                500
            ) {
                setError(
                    "За один запрос можно передать максимум 500 нарядов.",
                );

                return;
            }

            payload = {
                ids,
            };
        } else {
            const iso =
                localInputToIso(
                    since,
                );

            if (!iso) {
                setError(
                    "Укажите корректную дату.",
                );

                return;
            }

            payload = {
                since:
                    iso,
            };
        }

        try {
            await onSubmit(
                payload,
            );
        } catch (
        requestError
        ) {
            setError(
                getErrorMessage(
                    requestError,
                ),
            );
        }
    }


    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/40 p-4">
            <form
                onSubmit={
                    submit
                }
                className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl"
            >
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">
                            Выгрузить
                            наряды
                            в 1С
                        </h2>

                        <p className="mt-1 text-xs text-gray-500">
                            Принудительное
                            создание
                            заданий
                            обмена
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
                    >
                        <RiCloseLine
                            size={
                                20
                            }
                        />
                    </button>
                </div>

                <div className="space-y-4 p-5">
                    <div>
                        <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                            Режим
                            выгрузки
                        </label>

                        <GlideSelect
                            options={
                                PUSH_MODE_OPTIONS
                            }
                            value={
                                mode
                            }
                            onChange={
                                setMode
                            }
                            className="glide-select--field"
                            menuWidth={
                                250
                            }
                        />
                    </div>

                    {mode ===
                        "IDS" ? (
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                                ID
                                нарядов
                            </label>

                            <textarea
                                value={
                                    idsText
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setIdsText(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                rows={5}
                                placeholder="Например: 12, 15, 18, 42"
                                className="w-full resize-none rounded-xl border border-gray-300 bg-gray-50 px-3 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                            />

                            <div className="mt-1.5 flex justify-between text-[11px] text-gray-400">
                                <span>
                                    Через
                                    запятую,
                                    пробел
                                    или
                                    точку
                                    с
                                    запятой
                                </span>

                                <span>
                                    {
                                        ids.length
                                    }
                                    /500
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                                Выгрузить
                                наряды,
                                изменённые
                                после
                            </label>

                            <input
                                type="datetime-local"
                                value={
                                    since
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setSince(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                className="h-11 w-full rounded-xl border border-gray-300 bg-gray-50 px-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                    )}

                    {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                        <div className="flex items-start gap-2">
                            <RiInformationLine className="mt-0.5 shrink-0 text-blue-600" />

                            <p className="text-xs leading-5 text-blue-700">
                                Backend
                                поставит
                                выбранные
                                наряды
                                в очередь
                                обмена.
                                Фактическую
                                отправку
                                можно
                                запустить
                                кнопкой
                                «Запустить
                                обмен».
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        Отмена
                    </button>

                    <button
                        type="submit"
                        disabled={
                            pending
                        }
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {pending ? (
                            <RiLoader4Line className="animate-spin" />
                        ) : (
                            <RiUploadCloud2Line />
                        )}

                        Выгрузить
                    </button>
                </div>
            </form>
        </div>
    );
}


// MARK: Job details

function JobDetailsModal({
    job,
    onClose,
    onRetry,
    retrying,
}) {
    const canRetry =
        job.status ===
        "DEAD" &&
        job.direction ===
        "OUTBOUND";

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/40 p-4">
            <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
                <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-gray-900">
                                Задание
                                #
                                {
                                    job.id
                                }
                            </h2>

                            <StatusBadge
                                status={
                                    job.status
                                }
                            />
                        </div>

                        <p className="mt-1 text-xs text-gray-500">
                            {job.entity ||
                                "—"}
                            {" • "}
                            {job.eventType ||
                                "—"}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
                    >
                        <RiCloseLine
                            size={
                                20
                            }
                        />
                    </button>
                </div>

                <ScrollArea
                    axis="y"
                    className="min-h-0 flex-1"
                >
                    <div className="space-y-5 p-5">
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            <DetailBox
                                label="Направление"
                                value={
                                    job.direction
                                }
                            />

                            <DetailBox
                                label="Local ID"
                                value={
                                    job.localId
                                }
                            />

                            <DetailBox
                                label="External ID"
                                value={
                                    job.externalId
                                }
                            />

                            <DetailBox
                                label="Попытки"
                                value={
                                    job.attempts ??
                                    0
                                }
                            />
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            <DetailBox
                                label="Последняя попытка"
                                value={
                                    formatDate(
                                        job.lastAttemptAt,
                                    )
                                }
                            />

                            <DetailBox
                                label="Следующая попытка"
                                value={
                                    formatDate(
                                        job.nextAttemptAt,
                                    )
                                }
                            />

                            <DetailBox
                                label="Завершено"
                                value={
                                    formatDate(
                                        job.completedAt,
                                    )
                                }
                            />

                            <DetailBox
                                label="Создано"
                                value={
                                    formatDate(
                                        job.createdAt,
                                    )
                                }
                            />
                        </div>

                        <div>
                            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                                Idempotency
                                key
                            </p>

                            <div className="break-all rounded-xl bg-gray-50 p-3 font-mono text-xs text-gray-600">
                                {job.idempotencyKey ||
                                    "—"}
                            </div>
                        </div>

                        {job.lastError && (
                            <div>
                                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-red-400">
                                    Последняя
                                    ошибка
                                </p>

                                <div className="whitespace-pre-wrap rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">
                                    {
                                        job.lastError
                                    }
                                </div>
                            </div>
                        )}

                        <JsonBlock
                            title="Payload"
                            value={
                                job.payload
                            }
                        />

                        <JsonBlock
                            title="Ответ 1С"
                            value={
                                job.response
                            }
                        />
                    </div>
                </ScrollArea>

                <div className="flex justify-between gap-3 border-t border-gray-100 px-5 py-4">
                    <span className="text-xs text-gray-400">
                        Обновлено:{" "}
                        {formatDate(
                            job.updatedAt,
                        )}
                    </span>

                    {canRetry && (
                        <button
                            type="button"
                            onClick={() =>
                                onRetry(
                                    job,
                                )
                            }
                            disabled={
                                retrying
                            }
                            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                            {retrying && (
                                <RiLoader4Line className="animate-spin" />
                            )}

                            Повторить
                            отправку
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}


// MARK: Small components

function StatusBadge({
    status,
}) {
    return (
        <span
            className={`
                inline-flex
                rounded-full
                px-2.5
                py-1
                text-[10px]
                font-bold

                ${getStatusClass(
                status,
            )}
            `}
        >
            {STATUS_LABELS[
                status
            ] ||
                status ||
                "—"}
        </span>
    );
}

function DirectionBadge({
    direction,
}) {
    const outbound =
        direction ===
        "OUTBOUND";

    return (
        <span
            className={`
                inline-flex
                rounded-full
                px-2
                py-1
                text-[10px]
                font-bold

                ${outbound
                    ? "bg-blue-50 text-blue-700"
                    : "bg-violet-50 text-violet-700"
                }
            `}
        >
            {outbound
                ? "НарядAI → 1С"
                : direction ===
                    "INBOUND"
                    ? "1С → НарядAI"
                    : direction ||
                    "—"}
        </span>
    );
}

function Th({
    children,
    align = "left",
}) {
    return (
        <th
            className={`
                whitespace-nowrap
                px-4
                py-3
                text-xs
                font-bold
                uppercase
                tracking-wide
                text-gray-400

                ${align ===
                    "right"
                    ? "text-right"
                    : "text-left"
                }
            `}
        >
            {children}
        </th>
    );
}

function Td({
    children,
    align = "left",
}) {
    return (
        <td
            className={`
                whitespace-nowrap
                px-4
                py-3.5
                text-sm
                text-gray-600

                ${align ===
                    "right"
                    ? "text-right"
                    : "text-left"
                }
            `}
        >
            {children}
        </td>
    );
}

function DetailBox({
    label,
    value,
}) {
    return (
        <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                {label}
            </p>

            <p className="mt-1 break-all text-sm font-semibold text-gray-800">
                {value ??
                    "—"}
            </p>
        </div>
    );
}

function JsonBlock({
    title,
    value,
}) {
    return (
        <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                {title}
            </p>

            <pre className="overflow-x-auto rounded-xl bg-gray-950 p-4 text-xs leading-5 text-gray-200">
                {safeJson(
                    value,
                )}
            </pre>
        </div>
    );
}

function LoadingState({
    text,
}) {
    return (
        <div className="flex min-h-[320px] items-center justify-center">
            <div className="text-center">
                <RiLoader4Line
                    size={
                        28
                    }
                    className="mx-auto animate-spin text-blue-600"
                />

                <p className="mt-3 text-sm text-gray-500">
                    {text}
                </p>
            </div>
        </div>
    );
}

function ErrorState({
    text,
    onRetry,
}) {
    return (
        <div className="flex min-h-[320px] items-center justify-center p-6 text-center">
            <div>
                <RiErrorWarningLine
                    size={
                        32
                    }
                    className="mx-auto text-red-500"
                />

                <p className="mt-3 text-sm font-semibold text-gray-900">
                    Ошибка
                    загрузки
                </p>

                <p className="mt-1 max-w-lg text-xs text-gray-500">
                    {text}
                </p>

                <button
                    type="button"
                    onClick={
                        onRetry
                    }
                    className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white"
                >
                    Повторить
                </button>
            </div>
        </div>
    );
}

function EmptyState({
    title,
    text,
}) {
    return (
        <div className="flex min-h-[320px] items-center justify-center p-6 text-center">
            <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
                    <RiDatabase2Line
                        size={
                            22
                        }
                    />
                </div>

                <p className="mt-3 text-sm font-semibold text-gray-900">
                    {title}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                    {text}
                </p>
            </div>
        </div>
    );
}

function Notice({
    notice,
    onClose,
}) {
    const styles =
        notice.type ===
            "success"
            ? "border-green-200 bg-green-50 text-green-700"
            : notice.type ===
                "warning"
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-red-200 bg-red-50 text-red-700";

    return (
        <div
            className={`
                flex
                items-center
                justify-between
                gap-3
                rounded-xl
                border
                px-4
                py-3
                text-sm

                ${styles}
            `}
        >
            <span>
                {
                    notice.text
                }
            </span>

            <button
                type="button"
                onClick={
                    onClose
                }
                className="shrink-0 rounded-lg p-1 hover:bg-black/5"
            >
                <RiCloseLine />
            </button>
        </div>
    );
}