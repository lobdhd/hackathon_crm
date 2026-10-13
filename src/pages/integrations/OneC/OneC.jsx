import {
    useMemo,
    useState,
} from "react";
import { createPortal } from "react-dom";

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
import RubberSegment from "../../../react-components/RubberSegment/RubberSegment.jsx";
import "./OneC.css";


import {
    useIntegrationOrders,
    useOneCJobs,
    useOneCMappings,
    usePushOneCOrders,
    useRetryOneCJob,
    useRunOneCQueue,
} from "../../../hooks/useOneC.js";
import { t as i18nT } from "../../../i18n/index.js";
import { useI18n as __useI18nReactive } from "../../../i18n/index.js";


// MARK: Config

const STATUS_OPTIONS = () => ([
    {
        value:
            "",
        label:
            i18nT("employeesPage.allStatuses"),
    },

    {
        value:
            "PENDING",
        label:
            i18nT("pages.integrations.onec.onec.b69f8c6"),
    },

    {
        value:
            "PROCESSING",
        label:
            i18nT("pages.integrations.onec.onec.239ce90"),
    },

    {
        value:
            "SUCCESS",
        label:
            i18nT("pages.integrations.onec.onec.f5cce37"),
    },

    {
        value:
            "FAILED",
        label:
            i18nT("pages.integrations.onec.onec.c6fd3c6"),
    },

    {
        value:
            "DEAD",
        label:
            i18nT("pages.integrations.onec.onec.daf4c7b"),
    },
]);

const DIRECTION_OPTIONS = () => ([
    {
        value:
            "",
        label:
            i18nT("pages.integrations.onec.onec.42154f9"),
    },

    {
        value:
            "OUTBOUND",
        label:
            i18nT("pages.integrations.onec.onec.e06c0ff"),
    },

    {
        value:
            "INBOUND",
        label:
            i18nT("pages.integrations.onec.onec.cdc2a62"),
    },
]);

const LIMIT_OPTIONS = () => ([
    {
        value:
            "50",
        label:
            i18nT("pages.integrations.onec.onec.912f0fa"),
    },

    {
        value:
            "100",
        label:
            i18nT("pages.integrations.onec.onec.2f21414"),
    },

    {
        value:
            "200",
        label:
            i18nT("pages.integrations.onec.onec.bf9d4b4"),
    },

    {
        value:
            "500",
        label:
            i18nT("pages.integrations.onec.onec.733ea90"),
    },
]);

const PUSH_MODE_OPTIONS = () => ([
    {
        value:
            "IDS",
        label:
            i18nT("pages.integrations.onec.onec.ade6488"),
    },

    {
        value:
            "SINCE",
        label:
            i18nT("pages.integrations.onec.onec.3215adf"),
    },
]);

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


// Отображаем русские названия, не меняя технические коды API.
const ENTITY_LABELS = {
    WORK_ORDER: "Наряд",
    EQUIPMENT: "Оборудование",
    AREA: "Участок",
    EXECUTOR: "Исполнитель",
    BRIGADE: "Бригада",
    MATERIAL: "Материал",
};

const EVENT_LABELS = {
    REJECT: "Отклонён",
    REJECTED: "Отклонён",
    CREATE: "Создан",
    CREATED: "Создан",
    QUEUE: "Поставлен в очередь",
    QUEUED: "Поставлен в очередь",
    EDIT: "Изменён",
    EDITED: "Изменён",
    UPDATE: "Обновлён",
    UPDATED: "Обновлён",
    PAUSE: "Приостановлен",
    PAUSED: "Приостановлен",
    START: "Начат",
    STARTED: "Начат",
    RESUME: "Возобновлён",
    RESUMED: "Возобновлён",
    COMPLETE: "Выполнен",
    COMPLETED: "Выполнен",
    CLOSE: "Закрыт",
    CLOSED: "Закрыт",
    CANCEL: "Отменён",
    CANCELLED: "Отменён",
    CANCELED: "Отменён",
    DELETE: "Удалён",
    DELETED: "Удалён",
    ISSUE: "Выдан",
    ISSUED: "Выдан",
    ASSIGN: "Назначен",
    ASSIGNED: "Назначен",
};

const ORDER_STATUS_LABELS = {
    ...STATUS_LABELS,
    NEW: "Новый",
    DRAFT: "Черновик",
    OPEN: "Открыт",
    ISSUED: "Выдан",
    ASSIGNED: "Назначен",
    IN_PROGRESS: "В работе",
    ON_HOLD: "Приостановлен",
    PAUSED: "Приостановлен",
    COMPLETED: "Выполнен",
    CLOSED: "Закрыт",
    CANCELLED: "Отменён",
    CANCELED: "Отменён",
    REJECTED: "Отклонён",
    OVERDUE: "Просрочен",
};

function entityLabel(value) {
    return ENTITY_LABELS[value] || value || "—";
}

function eventLabel(value) {
    return EVENT_LABELS[value] || value || "—";
}

function orderStatusLabel(value) {
    return ORDER_STATUS_LABELS[value] || value || "—";
}

function directionLabel(value) {
    if (value === "OUTBOUND") return "Из системы в 1С";
    if (value === "INBOUND") return "Из 1С в систему";
    return value || "—";
}

const ONE_C_TABS = () => [
    { value: "jobs", label: i18nT("pages.integrations.onec.onec.9ba82a4") },
    { value: "mappings", label: i18nT("pages.integrations.onec.onec.4e7ee7c") },
    { value: "reconciliation", label: i18nT("pages.integrations.onec.onec.45b6f8e") },
];

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
        entityLabel(job.entity),
        job.eventType,
        eventLabel(job.eventType),
        STATUS_LABELS[job.status],
        directionLabel(job.direction),
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
    __useI18nReactive();
    const __i18nLocaleToken = i18nT("sidebar.home");
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
                __i18nLocaleToken],
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
                __i18nLocaleToken],
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
                            entityLabel(item.entity),
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
                __i18nLocaleToken],
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
            [__i18nLocaleToken],
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
                            orderStatusLabel(order.status),
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
                __i18nLocaleToken],
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
                        i18nT("pages.integrations.onec.onec.71a464d"),
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
        <div className="oc mx-auto max-w-[1800px] p-7">
            <header className="oc-header">
                <div className="oc-heading">
                    <div className="oc-heading__copy">
                        <h1>{i18nT("pages.integrations.onec.onec.e82f03b")}</h1>
                        <p>{i18nT("pages.integrations.onec.onec.e1ee112")}</p>
                    </div>
                </div>
                <div className="oc-header__actions">
                    <button type="button" className="oc-btn oc-btn--secondary" onClick={() => setPushOpen(true)}>
                        <RiUploadCloud2Line size={18} />
                        {i18nT("pages.integrations.onec.onec.43f4374")}
                    </button>
                    <button type="button" className="oc-btn oc-btn--primary" onClick={handleRun} disabled={runMutation.isPending}>
                        {runMutation.isPending ? <RiLoader4Line className="oc-spin" size={18} /> : <RiPlayCircleLine size={18} />}
                        {i18nT("pages.integrations.onec.onec.cb4e4a2")}
                    </button>
                </div>
            </header>

            {notice && <Notice notice={notice} onClose={() => setNotice(null)} />}

            <section className="oc-stats" aria-label="Состояние заданий обмена">
                <MetricCard title={i18nT("pages.integrations.onec.onec.b69f8c6")} value={stats.pending} icon={RiTimeLine} description="Ожидают отправки" tone="pending" loading={statsQuery.isLoading} />
                <MetricCard title={i18nT("pages.integrations.onec.onec.239ce90")} value={stats.processing} icon={RiRefreshLine} description="Обрабатываются" tone="processing" loading={statsQuery.isLoading} />
                <MetricCard title={i18nT("pages.integrations.onec.onec.f5cce37")} value={stats.success} icon={RiCheckboxCircleLine} description="Успешно доставлены" tone="success" loading={statsQuery.isLoading} />
                <MetricCard title={i18nT("pages.integrations.onec.onec.058d8bc")} value={stats.failed} icon={RiErrorWarningLine} description={`${stats.dead} требуют внимания`} tone="failed" loading={statsQuery.isLoading} />
            </section>
            <p className="oc-stats-note">Показатели рассчитаны по последним {statsQuery.isLoading ? "до 500" : stats.total} заданиям (максимум 500), а не по всей истории обмена.</p>

            <section className="oc-panel oc-workspace">
                <div className="oc-workspace__top">
                    <div className="oc-workspace__title">
                        <span className="oc-title-icon"><RiDatabase2Line size={20} /></span>
                        <div>
                            <h2>Управление обменом</h2>
                            <p>Задания, соответствия идентификаторов и сверка нарядов</p>
                        </div>
                    </div>
                    <div className="oc-tabs">
                        <RubberSegment
                            className="oc-rubber"
                            items={ONE_C_TABS()}
                            value={activeTab}
                            onChange={setActiveTab}
                            trackColor="#ffffff"
                            thumbColor="#2563eb"
                            textColor="#2563eb"
                            activeTextColor="#ffffff"
                            size="md"
                            radius={10}
                            inset={3}
                            equalSlots
                            draggable
                            aria-label="Разделы интеграции 1С"
                        />
                    </div>
                </div>
                <div className="oc-workspace__body">
                    {activeTab === "jobs" && (
                        <div role="region" id="oc-jobs-panel" aria-label="Задания обмена">
                            <JobsTab jobs={visibleJobs} query={jobsQuery} status={status} setStatus={setStatus}
                                direction={direction} setDirection={setDirection} search={search} setSearch={setSearch}
                                limit={limit} setLimit={setLimit} onJob={setSelectedJob} onRetry={handleRetry}
                                retryingId={retryMutation.variables} />
                        </div>
                    )}
                    {activeTab === "mappings" && (
                        <div role="region" id="oc-mappings-panel" aria-label="Соответствия 1С">
                            <MappingsTab input={mappingInput} setInput={setMappingInput} entity={mappingEntity}
                                setEntity={setMappingEntity} search={mappingSearch} setSearch={setMappingSearch}
                                items={visibleMappings} query={mappingsQuery} />
                        </div>
                    )}
                    {activeTab === "reconciliation" && (
                        <div role="region" id="oc-reconciliation-panel" aria-label="Сверка нарядов">
                            <ReconciliationTab since={reconcileInput} setSince={setReconcileInput} onApply={applyReconciliation}
                                search={reconcileSearch} setSearch={setReconcileSearch} items={visibleReconciliationOrders}
                                total={reconciliationOrders.length} query={reconciliationQuery} />
                        </div>
                    )}
                </div>
            </section>

            {selectedJob && createPortal(
                <JobDetailsModal job={selectedJob} onClose={() => setSelectedJob(null)}
                    onRetry={handleRetry} retrying={retryMutation.isPending} />,
                document.body
            )}
            {pushOpen && createPortal(
                <PushOrdersModal pending={pushMutation.isPending}
                    onClose={() => setPushOpen(false)} onSubmit={handlePush} />,
                document.body
            )}
        </div>
    );
}

// MARK: KPI
function MetricCard({ title, value, icon: Icon, description, tone, loading }) {
    return (
        <div className={`oc-kpi oc-kpi--${tone}`}>
            <div className="oc-kpi__top">
                <span className="oc-kpi__label">{title}</span>
                <span className="oc-kpi__icon"><Icon size={21} /></span>
            </div>
            {loading ? <span className="oc-kpi__skeleton" aria-label="Загрузка" /> : <strong className="oc-kpi__value">{value}</strong>}
            <div className="oc-kpi__foot"><span className="oc-kpi__dot" />{description}</div>
        </div>
    );
}

// MARK: Jobs
function JobsTab({ jobs, query, status, setStatus, direction, setDirection, search, setSearch, limit, setLimit, onJob, onRetry, retryingId }) {
    __useI18nReactive();
    return (
        <div className="oc-tab-content">
            <div className="oc-toolbar">
                <label className="oc-search oc-search--wide">
                    <RiSearchLine size={18} aria-hidden="true" />
                    <input type="search" value={search} onChange={(event) => setSearch(event.target.value)}
                        placeholder={i18nT("pages.integrations.onec.onec.bd2ee1c")} aria-label="Поиск заданий обмена" />
                </label>
                <div className="oc-toolbar__filters">
                    <div className="oc-filter"><GlideSelect className="glide-select--field" options={STATUS_OPTIONS()} value={status} onChange={setStatus} menuWidth={195} portal ariaLabel="Статус задания" /></div>
                    <div className="oc-filter"><GlideSelect className="glide-select--field" options={DIRECTION_OPTIONS()} value={direction} onChange={setDirection} menuWidth={185} portal ariaLabel="Направление обмена" /></div>
                    <div className="oc-filter oc-filter--limit"><GlideSelect className="glide-select--field" options={LIMIT_OPTIONS()} value={limit} onChange={setLimit} menuWidth={240} portal ariaLabel="Количество заданий" /></div>
                    <button type="button" className="oc-btn oc-btn--icon" onClick={() => query.refetch()} disabled={query.isFetching} title="Обновить задания" aria-label="Обновить задания">
                        <RiRefreshLine size={19} className={query.isFetching ? "oc-spin" : ""} />
                    </button>
                </div>
            </div>
            <div className="oc-list-topline">
                <span><RiFileList3Line size={16} /> Найдено: <strong>{jobs.length}</strong></span>
                <span className="oc-list-topline__hint">Обновление очереди каждые 10 секунд</span>
            </div>
            {query.isLoading && !query.data ? (
                <LoadingState text="Загружаем задания обмена..." />
            ) : query.isError && !query.data ? (
                <ErrorState text={getErrorMessage(query.error)} onRetry={() => query.refetch()} />
            ) : jobs.length === 0 ? (
                <EmptyState title={i18nT("pages.integrations.onec.onec.6f15733")} text="Для выбранных фильтров заданий обмена нет." />
            ) : (
                <div className="oc-table-area" tabIndex={0} role="region" aria-label="Прокручиваемая таблица">
                    <table className="oc-table oc-table--jobs">
                        <thead><tr>
                            <Th>Задание</Th><Th>{i18nT("employeeModal.status")}</Th>
                            <Th>{i18nT("pages.integrations.onec.onec.0153214")}</Th>
                            <Th>Идентификаторы</Th><Th>Попытки / повтор</Th>
                            <Th>{i18nT("pages.integrations.onec.onec.d1227a4")}</Th>
                            <Th align="right">{i18nT("pages.integrations.onec.onec.fb3df31")}</Th>
                        </tr></thead>
                        <tbody>{jobs.map((job) => {
                            const canRetry = job.status === "DEAD" && job.direction === "OUTBOUND";
                            return (
                                <tr key={job.id} className="oc-table__row oc-table__row--clickable" tabIndex={0}
                                    onClick={() => onJob(job)}
                                    onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onJob(job); } }}
                                    aria-label={`Задание ${job.id}, открыть подробности`}>
                                    <Td><div className="oc-cell-primary">#{job.id}</div><div className="oc-cell-secondary" title={job.entity || ""}>{entityLabel(job.entity)}</div></Td>
                                    <Td><div className="oc-status-stack"><StatusBadge status={job.status} /></div></Td>
                                    <Td><span className="oc-ellipsis oc-ellipsis--event" title={job.eventType || ""}>{eventLabel(job.eventType)}</span></Td>
                                    <Td><div className="oc-cell-pair"><span className="oc-cell-pair__label">Local ID</span><b title={String(job.localId ?? "—")}>{job.localId ?? "—"}</b></div>
                                        <div className="oc-cell-pair"><span className="oc-cell-pair__label">1С ID</span><b title={String(job.externalId ?? "—")}>{job.externalId ?? "—"}</b></div></Td>
                                    <Td><div className="oc-cell-primary">{job.attempts ?? 0}</div><div className="oc-cell-secondary">{formatDate(job.nextAttemptAt)}</div></Td>
                                    <Td><span className="oc-cell-date">{formatDate(job.updatedAt)}</span></Td>
                                    <Td align="right">{canRetry ? (
                                        <button type="button" className="oc-btn oc-btn--retry" onClick={(event) => { event.stopPropagation(); onRetry(job); }}
                                            disabled={Number(retryingId) === Number(job.id)}>
                                            <RiRefreshLine size={15} /> {i18nT("components.layout.appnavbar.b914bbb")}
                                        </button>
                                    ) : (
                                        <button type="button" className="oc-btn oc-btn--details" onClick={(event) => { event.stopPropagation(); onJob(job); }} title="Открыть подробности задания">
                                            Подробнее
                                        </button>
                                    )}</Td>
                                </tr>
                            );
                        })}</tbody>
                    </table>
                </div>
            )}
            {query.isError && query.data && <p className="oc-inline-warning">Не удалось обновить данные: {getErrorMessage(query.error)}</p>}
        </div>
    );
}

// MARK: Mappings
function MappingsTab({ input, setInput, entity, setEntity, search, setSearch, items, query }) {
    __useI18nReactive();
    return (
        <div className="oc-tab-content">
            <div className="oc-toolbar oc-toolbar--mapping">
                <label className="oc-field oc-field--entity">
                    <span>{i18nT("pages.integrations.onec.onec.edd8fff")}</span>
                    <input className="oc-input" value={input} onChange={(event) => setInput(event.target.value.toUpperCase())}
                        placeholder={i18nT("pages.integrations.onec.onec.bcaa832")} />
                </label>
                <button type="button" className="oc-btn oc-btn--primary oc-btn--apply" onClick={() => setEntity(input.trim())}>
                    {i18nT("pages.integrations.onec.onec.2cd8441")}
                </button>
                <label className="oc-field oc-field--search"><span>Поиск соответствия</span>
                    <span className="oc-search"><RiSearchLine size={18} aria-hidden="true" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)}
                        placeholder={i18nT("pages.integrations.onec.onec.1a89234")} /></span>
                </label>
                <button type="button" className="oc-btn oc-btn--icon oc-btn--mapping-refresh" onClick={() => query.refetch()} disabled={query.isFetching} title="Обновить соответствия" aria-label="Обновить соответствия">
                    <RiRefreshLine size={19} className={query.isFetching ? "oc-spin" : ""} />
                </button>
            </div>
            <div className="oc-mapping-hint"><RiInformationLine size={17} /><span>{i18nT("pages.integrations.onec.onec.81cc281")} <strong>EQUIPMENT</strong> {i18nT("pages.integrations.onec.onec.b9488ea")}</span></div>
            <div className="oc-list-topline"><span><RiDatabase2Line size={16} /> Найдено: <strong>{items.length}</strong></span><span>Сущность: <b>{entity || "все"}</b></span></div>
            {query.isLoading && !query.data ? <LoadingState text="Загружаем соответствия 1С..." />
                : query.isError && !query.data ? <ErrorState text={getErrorMessage(query.error)} onRetry={() => query.refetch()} />
                    : items.length === 0 ? <EmptyState title={i18nT("pages.integrations.onec.onec.9f73c42")} text={`Для сущности ${entity || "без фильтра"} записей не найдено.`} />
                        : <div className="oc-table-area" tabIndex={0} role="region" aria-label="Прокручиваемая таблица">
                            <table className="oc-table oc-table--mappings">
                                <thead><tr><Th>ID</Th><Th>{i18nT("pages.integrations.onec.onec.de2925f")}</Th><Th>Local ID</Th><Th>{i18nT("pages.integrations.onec.onec.e978367")}</Th><Th>{i18nT("pages.integrations.onec.onec.342a6a5")}</Th><Th>{i18nT("pages.integrations.onec.onec.d1227a4")}</Th></tr></thead>
                                <tbody>{items.map((item) => (
                                    <tr key={item.id} className="oc-table__row"><Td><strong>#{item.id}</strong></Td>
                                        <Td><span className="oc-entity-badge" title={item.entity || ""}>{entityLabel(item.entity)}</span></Td>
                                        <Td>{item.localId ?? "—"}</Td><Td>{item.externalId ?? "—"}</Td>
                                        <Td>{formatDate(item.createdAt)}</Td><Td>{formatDate(item.updatedAt)}</Td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>}
            {query.isError && query.data && <p className="oc-inline-warning">Не удалось обновить данные: {getErrorMessage(query.error)}</p>}
        </div>
    );
}

// MARK: Reconciliation
function ReconciliationTab({ since, setSince, onApply, search, setSearch, items, total, query }) {
    __useI18nReactive();
    return (
        <div className="oc-tab-content">
            <div className="oc-toolbar oc-toolbar--reconciliation">
                <label className="oc-field oc-field--date"><span>{i18nT("pages.integrations.onec.onec.68f5567")}</span>
                    <input className="oc-input" type="datetime-local" value={since} onChange={(event) => setSince(event.target.value)} />
                </label>
                <button type="button" className="oc-btn oc-btn--primary oc-btn--apply" onClick={onApply}>
                    {i18nT("pages.integrations.onec.onec.9359cf8")}
                </button>
                <label className="oc-field oc-field--search"><span>Поиск наряда</span>
                    <span className="oc-search"><RiSearchLine size={18} aria-hidden="true" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)}
                        placeholder={i18nT("pages.integrations.onec.onec.a1d4727")} /></span>
                </label>
            </div>
            <div className="oc-list-topline"><span><RiFileList3Line size={16} /> {i18nT("pages.integrations.onec.onec.a5cbbd1")} <strong>{total}</strong></span><span className="oc-list-topline__hint">Сверка с выбранной даты</span></div>
            {query.isLoading && !query.data ? <LoadingState text="Получаем изменённые наряды..." />
                : query.isError && !query.data ? <ErrorState text={getErrorMessage(query.error)} onRetry={() => query.refetch()} />
                    : items.length === 0 ? <EmptyState title={i18nT("pages.integrations.onec.onec.c985d79")} text="После указанной даты изменённых нарядов не найдено." />
                        : <div className="oc-table-area" tabIndex={0} role="region" aria-label="Прокручиваемая таблица">
                            <table className="oc-table oc-table--reconcile">
                                <thead><tr><Th>Наряд</Th><Th>{i18nT("employeeModal.status")}</Th><Th>Описание / оборудование</Th><Th>{i18nT("ordersTable.area")}</Th><Th>{i18nT("ordersTable.assignee")}</Th><Th>{i18nT("pages.integrations.onec.onec.d1227a4")}</Th></tr></thead>
                                <tbody>{items.map((order) => (
                                    <tr key={order.id} className="oc-table__row">
                                        <Td><div className="oc-cell-primary">{order.number || "—"}</div><div className="oc-cell-secondary">#{order.id}</div></Td>
                                        <Td><span className="oc-entity-badge" title={order.status || ""}>{orderStatusLabel(order.status)}</span></Td>
                                        <Td><div className="oc-cell-primary oc-ellipsis" title={order.description || ""}>{order.description || "—"}</div><div className="oc-cell-secondary oc-ellipsis" title={order.equipment?.name || ""}>{order.equipment?.name || "—"}</div></Td>
                                        <Td>{order.area?.name || "—"}</Td><Td>{order.assignee?.fullName || "—"}</Td>
                                        <Td><span className="oc-cell-date">{formatDate(order.updatedAt)}</span></Td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>}
            {query.isError && query.data && <p className="oc-inline-warning">Не удалось обновить данные: {getErrorMessage(query.error)}</p>}
        </div>
    );
}

// MARK: Push modal

function PushOrdersModal({
    pending,
    onClose,
    onSubmit,
}) {
    __useI18nReactive();
    const __i18nLocaleToken = i18nT("sidebar.home");
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
                __i18nLocaleToken],
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
        <div className="oc-modal fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/40 p-4">
            <form
                onSubmit={
                    submit
                }
                role="dialog" aria-modal="true" aria-label="Отправка нарядов в 1С" className="oc-modal__dialog oc-modal__dialog--form w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl"
            >
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">
                            {i18nT("pages.integrations.onec.onec.479eadb")}
                        </h2>

                        <p className="mt-1 text-xs text-gray-500">
                            {i18nT("pages.integrations.onec.onec.92320f3")}
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
                            {i18nT("pages.integrations.onec.onec.38557d2")}
                        </label>

                        <GlideSelect
                            options={
                                PUSH_MODE_OPTIONS()
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
                                {i18nT("pages.integrations.onec.onec.5f9d0b0")}
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
                                placeholder={i18nT("pages.integrations.onec.onec.ae88597")}
                                className="w-full resize-none rounded-xl border border-gray-300 bg-gray-50 px-3 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                            />

                            <div className="mt-1.5 flex justify-between text-[11px] text-gray-400">
                                <span>
                                    {i18nT("pages.integrations.onec.onec.03c82fa")}
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
                                {i18nT("pages.integrations.onec.onec.d360daf")}
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
                                {i18nT("pages.integrations.onec.onec.2ac6b84")}
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
                        {i18nT("employeeModal.cancel")}
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

                        {i18nT("pages.integrations.onec.onec.7e3abea")}
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
    __useI18nReactive();
    const canRetry =
        job.status ===
        "DEAD" &&
        job.direction ===
        "OUTBOUND";

    return (
        <div className="oc-modal fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/40 p-4">
            <div role="dialog" aria-modal="true" aria-label="Подробности задания обмена" className="oc-modal__dialog oc-modal__dialog--details flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
                <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-gray-900">
                                {i18nT("pages.integrations.onec.onec.4b58349")}
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
                            <span title={job.entity || ""}>{entityLabel(job.entity)}</span>
                            {" • "}
                            <span title={job.eventType || ""}>{eventLabel(job.eventType)}</span>
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

                <div className="oc-modal-scroll min-h-0 flex-1" tabIndex={0} role="region" aria-label="Содержимое задания">
                    <div className="space-y-5 p-5">
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            <DetailBox
                                label={i18nT("pages.integrations.onec.onec.e4de622")}
                                value={directionLabel(job.direction)}
                            />

                            <DetailBox
                                label="Локальный ID"
                                value={
                                    job.localId
                                }
                            />

                            <DetailBox
                                label="ID в 1С"
                                value={
                                    job.externalId
                                }
                            />

                            <DetailBox
                                label={i18nT("pages.integrations.onec.onec.80c8855")}
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
                                label={i18nT("pages.integrations.onec.onec.55fcf8f")}
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
                                label={i18nT("pages.integrations.onec.onec.342a6a5")}
                                value={
                                    formatDate(
                                        job.createdAt,
                                    )
                                }
                            />
                        </div>

                        <div>
                            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                                Ключ идемпотентности
                            </p>

                            <div className="break-all rounded-xl bg-gray-50 p-3 font-mono text-xs text-gray-600">
                                {job.idempotencyKey ||
                                    "—"}
                            </div>
                        </div>

                        {job.lastError && (
                            <div>
                                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-red-400">
                                    {i18nT("pages.integrations.onec.onec.a8fc16e")}
                                </p>

                                <div className="whitespace-pre-wrap rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">
                                    {
                                        job.lastError
                                    }
                                </div>
                            </div>
                        )}

                        <JsonBlock
                            title="Данные запроса"
                            value={
                                job.payload
                            }
                        />

                        <JsonBlock
                            title={i18nT("pages.integrations.onec.onec.da13a4f")}
                            value={
                                job.response
                            }
                        />
                    </div>
                </div>

                <div className="flex justify-between gap-3 border-t border-gray-100 px-5 py-4">
                    <span className="text-xs text-gray-400">
                        {i18nT("pages.integrations.onec.onec.ecb784d")}{" "}
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

                            {i18nT("pages.integrations.onec.onec.951fc04")}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}


// MARK: Small components

function StatusBadge({ status }) {
    return <span className={`oc-status oc-status--${String(status || "unknown").toLowerCase()}`}>
        <span className="oc-status__dot" />{STATUS_LABELS[status] || status || "—"}
    </span>;
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

function LoadingState({ text }) {
    return <div className="oc-state" role="status">
        <div className="oc-state__inner">
            <div className="oc-state__icon"><RiLoader4Line className="oc-spin" size={25} /></div>
            <h3>Загрузка данных</h3><p>{text}</p>
        </div>
    </div>;
}

function ErrorState({ text, onRetry }) {
    __useI18nReactive();
    return <div className="oc-state" role="alert">
        <div className="oc-state__inner">
            <div className="oc-state__icon" style={{ background: "#fff1f2", color: "#e34d5f" }}><RiErrorWarningLine size={25} /></div>
            <h3>{i18nT("pages.integrations.onec.onec.e0e3af6")}</h3><p>{text}</p>
            {onRetry && <button type="button" className="oc-btn oc-btn--primary oc-state__retry" onClick={onRetry}>
                <RiRefreshLine size={16} />{i18nT("components.layout.appnavbar.b914bbb")}
            </button>}
        </div>
    </div>;
}

function EmptyState({ title, text }) {
    return <div className="oc-state"><div className="oc-state__inner">
        <div className="oc-state__icon"><RiDatabase2Line size={25} /></div>
        <h3>{title}</h3><p>{text}</p>
    </div></div>;
}

function Notice({ notice, onClose }) {
    const type = ["success", "warning", "error"].includes(notice?.type) ? notice.type : "warning";
    return <div role="status" className={`oc-notice oc-notice--${type}`}>
        <span>{notice.text}</span><button type="button" onClick={onClose} aria-label="Закрыть уведомление"><RiCloseLine size={18} /></button>
    </div>;
}
