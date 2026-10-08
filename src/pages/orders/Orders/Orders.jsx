import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Link, useNavigate, useSearchParams } from "react-router-dom";

import {

    RiAddLine,
    RiArrowDownSLine,
    RiCheckLine,

    RiAlarmWarningLine,

    RiArrowRightLine,

    RiCloseLine,

    RiFilter3Line,

    RiLayoutGridLine,

    RiListCheck2,

    RiLoader4Line,

    RiRefreshLine,

    RiSearchLine,

    RiToolsLine,

} from "react-icons/ri";

import SmartTable from "../../../react-components/SmartTable/SmartTable.jsx";

import { useAuth } from "../../../auth/AuthProvider.jsx";

import { isOrderStaff } from "../../../auth/roles.js";

import {

    useAreas,

    useBrigades,

    useEquipmentReference,

    useExecutors,

} from "../../../hooks/useReferences.js";

import {

    useWorkOrderBoard,

    useWorkOrders,

} from "../../../hooks/useWorkOrders.js";

import { useWorkOrderAction } from "../../../hooks/useWorkOrderAction.js";

import ScrollArea from "../../../components/ScrollArea/ScrollArea.jsx";

import CreateOrderModal from "../../../components/orders/CreateOrderModal.jsx";

import { DROP_COLUMNS, canDrag, resolveMove } from "./kanbanMoves.js";

import { t as i18nT } from "../../../i18n/index.js";

import { useI18n as __useI18nReactive } from "../../../i18n/index.js";

// MARK: Config

const LIST_HEIGHT = "clamp(380px, calc(100dvh - 430px), 660px)";

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

const STATUS_STYLES = {

    ISSUED: "bg-blue-50 text-blue-700",

    QUEUED: "bg-slate-100 text-slate-700",

    ACCEPTED: "bg-indigo-50 text-indigo-700",

    IN_PROGRESS: "bg-green-50 text-green-700",

    PAUSED: "bg-amber-50 text-amber-700",

    COMPLETED: "bg-cyan-50 text-cyan-700",

    AI_REVIEW: "bg-violet-50 text-violet-700",

    REWORK: "bg-orange-50 text-orange-700",

    CLOSED: "bg-gray-100 text-gray-600",

    REJECTED: "bg-red-50 text-red-700",

    CANCELLED: "bg-gray-100 text-gray-500",

};

const PRIORITY_LABELS = {

    EMERGENCY: "Аварийный",

    HIGH: "Высокий",

    NORMAL: "Обычный",

    PLANNED: "Плановый",

};

const PRIORITY_STYLES = {

    EMERGENCY: "bg-red-50 text-red-700",

    HIGH: "bg-orange-50 text-orange-700",

    NORMAL: "bg-blue-50 text-blue-700",

    PLANNED: "bg-gray-100 text-gray-600",

};

const BOARD_COLUMNS = () => ([

    { key: "issued", title: i18nT("pages.orders.orders.orders.903b9d6") },

    { key: "queued", title: i18nT("status.queued") },

    { key: "accepted", title: i18nT("pages.orders.orders.orders.ec4dcec") },

    { key: "inProgress", title: i18nT("status.inProgress") },

    { key: "completed", title: i18nT("pages.orders.orders.orders.a6caf7e") },

    { key: "overdue", title: i18nT("pages.orders.orders.orders.97a53e1"), danger: true },

]);

const TYPE_OPTIONS = () => ([

    { value: "", label: i18nT("pages.equipment.equipment.equipment.729d3f6") },

    { value: "EMERGENCY", label: i18nT("priority.emergency") },

    { value: "PLANNED", label: i18nT("priority.planned") },

]);

const PRIORITY_OPTIONS = () => ([

    { value: "", label: i18nT("pages.orders.orders.orders.32c1af4") },

    ...Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label })),

]);

const STATUS_OPTIONS = () => ([

    { value: "", label: i18nT("employeesPage.allStatuses") },

    ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),

    { value: "OVERDUE", label: i18nT("pages.orders.orders.orders.97a53e1") },

]);

const EMPTY_FILTERS = {

    search: "",

    areaId: "",

    equipmentId: "",

    assigneeId: "",

    brigadeId: "",

    priority: "",

    type: "",

    status: "",

};

const GLIDE_LIGHT = {

    accentColor: "#2563eb",

    surfaceColor: "#f9fafb",

    highlightColor: "#eff6ff",

    textColor: "#111827",

    radius: 10,

};

// MARK: Helpers

function asArray(value) {

    return Array.isArray(value) ? value : [];

}

function extractError(error) {

    const data = error?.response?.data;

    if (!data) {

        return error?.message || "Не удалось выполнить запрос";

    }

    if (data.details) {

        try {

            const parsed =

                typeof data.details === "string"

                    ? JSON.parse(data.details)

                    : data.details;

            if (Array.isArray(parsed)) {

                const messages = parsed.map((item) => item?.message).filter(Boolean);

                if (messages.length) {

                    return messages.join(". ");

                }

            }

        } catch {

            return data.error || String(data.details);

        }

    }

    return data.error || "Ошибка запроса";

}

function isOverdue(order) {

    if (typeof order?.isOverdue === "boolean") {

        return order.isOverdue;

    }

    if (!order?.deadline) {

        return false;

    }

    if (["CLOSED", "CANCELLED", "REJECTED"].includes(order.status)) {

        return false;

    }

    return new Date(order.deadline).getTime() < Date.now();

}

function formatDate(value) {

    if (!value) {

        return "—";

    }

    return new Date(value).toLocaleString("ru-RU", {

        day: "2-digit",

        month: "2-digit",

        year: "numeric",

        hour: "2-digit",

        minute: "2-digit",

    });

}

function mapOptions(items, getLabel, getTag) {

    return items.map((item) => ({

        value: String(item.id),

        label: getLabel(item),

        tag: getTag?.(item),

    }));

}

function matchesSearch(order, search) {

    if (!search) {

        return true;

    }

    return [

        order.number,

        order.description,

        order.equipment?.name,

        order.equipment?.inventoryNumber,

        order.area?.name,

        order.assignee?.fullName,

        order.brigade?.name,

    ].some((value) =>

        String(value || "").toLowerCase().includes(search),

    );

}

function uniqueBoardOrders(columns = {}) {

    const map = new Map();

    Object.values(columns).forEach((items) => {

        asArray(items).forEach((order) => {

            if (order?.id != null) {

                map.set(order.id, order);

            }

        });

    });

    return [...map.values()];

}

// MARK: Page

export default function Orders() {

    __useI18nReactive();

    const __i18nLocaleToken = i18nT("sidebar.home");

    const navigate = useNavigate();
    useEffect(() => {
        // The board must scroll inside its own viewport, never move the whole mobile page sideways.
        const html = document.documentElement;
        const body = document.body;
        const previousHtml = html.style.overflowX;
        const previousBody = body.style.overflowX;
        html.style.overflowX = "hidden";
        body.style.overflowX = "hidden";
        return () => {
            html.style.overflowX = previousHtml;
            body.style.overflowX = previousBody;
        };
    }, []);

    const auth = useAuth();

    const user = auth?.user ?? null;

    const role = auth?.role ?? user?.role;

    const isExecutor = role === "EXECUTOR";

    const canCreate = isOrderStaff(role);

    const [view, setView] = useState("kanban");

    // ?create=1[&equipmentId=N] opens the form, e.g. from an equipment card or its QR code.

    const [searchParams, setSearchParams] = useSearchParams();

    const createFromUrl = searchParams.get("create") === "1";

    const [createOpen, setCreateOpen] = useState(createFromUrl);

    const [createEquipmentId] = useState(createFromUrl ? searchParams.get("equipmentId") : null);

    function closeCreate() {

        setCreateOpen(false);

        if (searchParams.has("create")) {

            setSearchParams({}, { replace: true });

        }

    }

    const [filters, setFilters] = useState(EMPTY_FILTERS);

    const areasQuery = useAreas();

    const equipmentQuery = useEquipmentReference(

        filters.areaId ? Number(filters.areaId) : null,

    );

    const executorsQuery = useExecutors();

    const brigadesQuery = useBrigades();

    // Общие фильтры для списка и доски

    const baseParams = useMemo(() => {

        const params = {};

        ["areaId", "equipmentId", "assigneeId", "brigadeId"].forEach((key) => {

            if (filters[key]) {

                params[key] = Number(filters[key]);

            }

        });

        if (filters.priority) params.priority = filters.priority;

        if (filters.type) params.type = filters.type;

        return params;

    }, [

        filters.areaId,

        filters.equipmentId,

        filters.assigneeId,

        filters.brigadeId,

        filters.priority,

        filters.type,

     __i18nLocaleToken]);

    const listParams = useMemo(

        () => ({

            compact: true,

            limit: 500,

            offset: 0,

            ...baseParams,

            ...(filters.status === "OVERDUE"

                ? { overdue: true }

                : filters.status

                    ? { status: filters.status }

                    : {}),

        }),

        [baseParams, filters.status, __i18nLocaleToken],

    );

    const boardParams = useMemo(

        () => ({ hours: 12, ...baseParams }),

        [baseParams, __i18nLocaleToken],

    );

    const ordersQuery = useWorkOrders(listParams, {

        enabled: view === "table",

    });

    const boardQuery = useWorkOrderBoard(boardParams);

    const areas = asArray(areasQuery.data);

    const equipment = asArray(equipmentQuery.data);

    const executors = asArray(executorsQuery.data);

    const brigades = asArray(brigadesQuery.data);

    const orders = asArray(ordersQuery.data?.items);

    const board = boardQuery.data ?? { counters: {}, columns: {} };

    const counters = board.counters ?? {};

    const search = filters.search.trim().toLowerCase();

    const filteredOrders = useMemo(

        () => orders.filter((order) => matchesSearch(order, search)),

        [orders, search, __i18nLocaleToken],

    );

    const boardOrders = useMemo(

        () =>

            uniqueBoardOrders(board.columns).filter((order) => {

                if (!matchesSearch(order, search)) return false;

                if (filters.status === "OVERDUE") return isOverdue(order);

                if (filters.status) return order.status === filters.status;

                return true;

            }),

        [board.columns, search, filters.status, __i18nLocaleToken],

    );

    function updateFilter(name, value) {

        setFilters((previous) => ({ ...previous, [name]: value }));

    }

    function updateArea(value) {

        setFilters((previous) => ({

            ...previous,

            areaId: value,

            equipmentId: "",

        }));

    }

    function resetFilters() {

        setFilters(EMPTY_FILTERS);

    }

    async function refresh() {

        await Promise.all([

            boardQuery.refetch(),

            view === "table" ? ordersQuery.refetch() : Promise.resolve(),

        ]);

    }

    const activeFiltersCount = Object.entries(filters).filter(

        ([key, value]) => key !== "search" && Boolean(value),

    ).length;

    const columns = useMemo(

        () => [

            {

                field: "number",

                header: i18nT("ordersTable.order"),

                minWidth: 155,

                render: (order) => (

                    <div className="min-w-0">

                        <div className="font-semibold text-gray-900">{order.number}</div>

                        <div className="mt-1 max-w-[300px] truncate text-xs text-gray-400">

                            {order.description}

                        </div>

                    </div>

                ),

            },

            {

                key: "equipment",

                header: i18nT("sidebar.equipment"),

                minWidth: 210,

                sortField: "equipmentName",

                sortValue: (order) => order.equipment?.name ?? "",

                render: (order) => (

                    <div>

                        <div className="font-medium text-gray-800">

                            {order.equipment?.name || "—"}

                        </div>

                        {order.equipment?.inventoryNumber && (

                            <div className="mt-1 text-xs text-gray-400">

                                {order.equipment.inventoryNumber}

                            </div>

                        )}

                    </div>

                ),

            },

            {

                key: "assignee",

                header: i18nT("ordersTable.assignee"),

                minWidth: 190,

                sortField: "assigneeName",

                sortValue: (order) => order.assignee?.fullName ?? "",

                render: (order) =>

                    order.assignee?.fullName || order.brigade?.name || "—",

            },

            {

                field: "priority",

                header: i18nT("orderModal.priority"),

                minWidth: 135,

                render: (order) => <PriorityBadge priority={order.priority} />,

            },

            {

                field: "status",

                header: i18nT("employeeModal.status"),

                minWidth: 155,

                render: (order) => <StatusBadge status={order.status} />,

            },

            {

                field: "deadline",

                header: i18nT("ordersTable.deadline"),

                minWidth: 180,

                sortValue: (order) =>

                    order.deadline ? new Date(order.deadline).getTime() : null,

                render: (order) => (

                    <span

                        className={

                            isOverdue(order)

                                ? "font-semibold text-red-600"

                                : "text-gray-600"

                        }

                    >

                        {formatDate(order.deadline)}

                    </span>

                ),

            },

            {

                key: "open",

                header: "",

                width: 60,

                sortable: false,

                align: "right",

                render: (order) => (

                    <Link

                        to={`/orders/${order.id}`}

                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-blue-200 hover:text-blue-600"

                    >

                        <RiArrowRightLine />

                    </Link>

                ),

            },

        ],

        [ __i18nLocaleToken],

    );

    if (boardQuery.isLoading && !boardQuery.data) {

        return <PageLoader />;

    }

    if (boardQuery.isError && !boardQuery.data) {

        return (

            <PageError

                text={extractError(boardQuery.error)}

                onRetry={boardQuery.refetch}

            />

        );

    }

    return (

        <>
            <style>{`
                .orders-page { width: 100%; max-width: 100%; min-width: 0; overflow-x: clip; }
                .orders-filter-item { min-width: 0; max-width: 100%; }
            `}</style>

            <div className="orders-page mx-auto w-full min-w-0 max-w-[1800px]">

                <div className="mb-5 flex min-w-0 flex-col justify-between gap-4 lg:flex-row lg:items-center">

                    <div>

                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">

                            {i18nT("sidebar.orders")}

                        </h1>

                        <p className="mt-1 text-sm text-gray-500">

                            {isExecutor

                                ? i18nT("ordersPage.myOrders")

                                : i18nT("ordersPage.productionManagement")}

                        </p>

                    </div>

                    <div className="flex flex-wrap items-center gap-2">

                        <button

                            type="button"

                            onClick={refresh}

                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"

                        >

                            <RiRefreshLine size={18} />

                            {i18nT("components.layout.appnavbar.dbe5444")}

                        </button>

                        {canCreate && (

                            <button

                                type="button"

                                onClick={() => setCreateOpen(true)}

                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"

                            >

                                <RiAddLine size={19} />

                                {i18nT("pages.orders.orders.orders.2538d5c")}

                            </button>

                        )}

                    </div>

                </div>

                <div className="mb-5 grid min-w-0 grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">

                    <SmallStat label="Выдано за смену" value={counters.issued ?? 0} />

                    <SmallStat label={i18nT("dashboard.completedShift")} value={counters.completed ?? 0} />

                    <SmallStat label={i18nT("kanban.overdue")} value={counters.overdue ?? 0} danger />

                    <SmallStat

                        label={i18nT("pages.analytics.analytics.0f7ca97")}

                        value={counters.equipmentInDowntime ?? 0}

                    />

                </div>

                <div className="mb-5 min-w-0 rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">

                    <div className="grid min-w-0 grid-cols-2 gap-2.5 sm:gap-3 lg:flex lg:flex-wrap lg:items-center lg:justify-start lg:gap-2.5">

                        <div className="relative col-span-2 min-w-0 lg:col-auto lg:w-[330px] lg:shrink-0 xl:w-[360px]">

                            <RiSearchLine

                                size={18}

                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"

                            />

                            <input

                                value={filters.search}

                                onChange={(event) =>

                                    updateFilter("search", event.target.value)

                                }

                                placeholder={i18nT("pages.orders.orders.orders.431aa2f")}

                                className="h-11 w-full rounded-lg border border-gray-300 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"

                            />

                        </div>

                        <FilterSelect

                            value={filters.areaId}

                            onChange={updateArea}

                            options={[

                                { value: "", label: i18nT("reportModal.allAreas") },

                                ...mapOptions(areas, (item) => item.name),

                            ]}

                            menuWidth={230}

                            ariaLabel="Участок"

                        />

                        <FilterSelect

                            value={filters.equipmentId}

                            onChange={(value) => updateFilter("equipmentId", value)}

                            options={[

                                { value: "", label: i18nT("equipmentDetails.allEquipment") },

                                ...mapOptions(

                                    equipment,

                                    (item) => item.name,

                                    (item) => item.inventoryNumber,

                                ),

                            ]}

                            menuWidth={280}

                            ariaLabel="Оборудование"

                        />

                        {/* Исполнителю фильтры по людям не нужны: сервер отдаёт только его наряды */}

                        {!isExecutor && (

                            <>

                                <FilterSelect

                                    value={filters.assigneeId}

                                    onChange={(value) => updateFilter("assigneeId", value)}

                                    options={[

                                        { value: "", label: i18nT("employeeDetails.allEmployees") },

                                        ...mapOptions(

                                            executors,

                                            (item) => item.fullName,

                                            (item) => item.specialty,

                                        ),

                                    ]}

                                    menuWidth={290}

                                    ariaLabel="Исполнитель"

                                />

                                <FilterSelect

                                    value={filters.brigadeId}

                                    onChange={(value) => updateFilter("brigadeId", value)}

                                    options={[

                                        { value: "", label: i18nT("pages.orders.orders.orders.b8b0a3b") },

                                        ...mapOptions(brigades, (item) => item.name),

                                    ]}

                                    menuWidth={230}

                                    ariaLabel="Бригада"

                                />

                            </>

                        )}

                        <FilterSelect

                            value={filters.type}

                            onChange={(value) => updateFilter("type", value)}

                            options={TYPE_OPTIONS()}

                            menuWidth={180}

                            ariaLabel="Тип"

                        />

                        <FilterSelect

                            value={filters.priority}

                            onChange={(value) => updateFilter("priority", value)}

                            options={PRIORITY_OPTIONS()}

                            menuWidth={190}

                            ariaLabel="Приоритет"

                        />

                        <FilterSelect

                            value={filters.status}

                            onChange={(value) => updateFilter("status", value)}

                            options={STATUS_OPTIONS()}

                            menuWidth={220}

                            ariaLabel="Статус"

                            align="right"

                        />

                    </div>

                    <div className="mt-4 flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">

                        <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-gray-500">

                            <RiFilter3Line size={17} />

                            {i18nT("pages.employees.employees.employees.35dbd85")}

                            <span className="font-semibold text-gray-900">

                                {view === "kanban"

                                    ? boardOrders.length

                                    : filteredOrders.length}

                            </span>

                            {activeFiltersCount > 0 && (

                                <button

                                    type="button"

                                    onClick={resetFilters}

                                    className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"

                                >

                                    <RiCloseLine size={14} />

                                    {i18nT("employeesPage.reset")}

                                </button>

                            )}

                        </div>

                        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">

                            {[

                                ["kanban", "Kanban", RiLayoutGridLine],

                                ["table", "Таблица", RiListCheck2],

                            ].map(([key, label, Icon]) => (

                                <button

                                    key={key}

                                    type="button"

                                    onClick={() => setView(key)}

                                    className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${view === key

                                            ? "bg-white text-gray-900 shadow-sm"

                                            : "text-gray-500 hover:text-gray-900"

                                        }`}

                                >

                                    <Icon size={17} />

                                    {label}

                                </button>

                            ))}

                        </div>

                    </div>

                </div>

                {view === "kanban" ? (

                    <Kanban

                        board={board}

                        search={search}

                        status={filters.status}

                        user={user}

                        onChanged={refresh}

                    />

                ) : ordersQuery.isLoading ? (

                    <InlineLoader />

                ) : ordersQuery.isError ? (

                    <InlineError

                        text={extractError(ordersQuery.error)}

                        onRetry={ordersQuery.refetch}

                    />

                ) : (

                    <SmartTable

                        data={filteredOrders}

                        columns={columns}

                        dataKey="id"

                        mode="sort"

                        stickyHeader

                        striped

                        scrollHeight={LIST_HEIGHT}

                        minWidth={1180}

                        emptyText={i18nT("ordersTable.empty")}

                        emptyDescription={

                            canCreate

                                ? "Измените фильтры или создайте новый наряд"

                                : "Измените фильтры"

                        }

                        rowClassName={() => "cursor-pointer"}

                        onRowClick={(order, _index, event) => {

                            if (

                                event.target.closest(

                                    "button, a, input, select, textarea",

                                )

                            ) {

                                return;

                            }

                            navigate(`/orders/${order.id}`);

                        }}

                    />

                )}

            </div>

            {createOpen && (

                <CreateOrderModal

                    initialEquipmentId={createEquipmentId}

                    onClose={closeCreate}

                    onCreated={(order) => {

                        closeCreate();

                        navigate(`/orders/${order.id}`);

                    }}

                />

            )}

        </>

    );

}

// MARK: Kanban

function Kanban({ board, search, status, user, onChanged }) {

    __useI18nReactive();

    const navigate = useNavigate();

    const [dragging, setDragging] = useState(null);

    const [overKey, setOverKey] = useState(null);

    const [reasonFor, setReasonFor] = useState(null);

    const { run, pendingId, error, clearError } = useWorkOrderAction({

        onDone: onChanged,

    });

    const columns = board?.columns ?? {};

    const visibleColumns =

        status === "OVERDUE"

            ? BOARD_COLUMNS().filter((column) => column.key === "overdue")

            : BOARD_COLUMNS();

    const interactive = visibleColumns.some((column) =>

        DROP_COLUMNS.includes(column.key),

    );

    function handleDragOver(event, column) {

        if (!dragging || !DROP_COLUMNS.includes(column.key)) return;

        if (resolveMove(dragging, column.key, user)) {

            event.preventDefault(); // разрешает drop

            event.dataTransfer.dropEffect = "move";

            setOverKey(column.key);

        }

    }

    async function handleDrop(event, column) {

        event.preventDefault();

        const order = dragging;

        setDragging(null);

        setOverKey(null);

        if (!order) return;

        const move = resolveMove(order, column.key, user);

        if (!move) return;

        // Завершение требует форму: уводим в карточку наряда

        if (move.openCard) {

            navigate(`/orders/${order.id}`);

            return;

        }

        // Нужна причина: спрашиваем в модалке

        if (move.needsComment) {

            setReasonFor({ order, move });

            return;

        }

        await run(order.id, { action: move.action });

    }

    async function submitReason(comment) {

        const { order, move } = reasonFor;

        const result = await run(order.id, { action: move.action, comment });

        if (result) {

            setReasonFor(null);

        }

    }

    return (

        <>

            {error && (

                <div className="mb-3 cursor-pointer" onClick={clearError}>

                    <ErrorBox text={error} />

                </div>

            )}

            <ScrollArea axis="x" className="w-full min-w-0 max-w-full rounded-xl" style={{ height: LIST_HEIGHT, maxWidth: "100%" }}>

                <div

                    className="grid h-full gap-4"

                    style={{

                        minWidth: `${Math.max(1, visibleColumns.length) * 310}px`,

                        gridTemplateColumns: `repeat(${Math.max(

                            1,

                            visibleColumns.length,

                        )}, minmax(290px, 1fr))`,

                    }}

                >

                    {visibleColumns.map((column) => {

                        const items = asArray(columns[column.key]).filter((order) => {

                            if (!matchesSearch(order, search)) return false;

                            if (status && status !== "OVERDUE") {

                                return order.status === status;

                            }

                            return true;

                        });

                        const droppable =

                            Boolean(dragging) &&

                            DROP_COLUMNS.includes(column.key) &&

                            Boolean(resolveMove(dragging, column.key, user));

                        const highlighted = droppable && overKey === column.key;

                        return (

                            <section

                                key={column.key}

                                onDragOver={(event) => handleDragOver(event, column)}

                                onDragLeave={() =>

                                    setOverKey((current) =>

                                        current === column.key ? null : current,

                                    )

                                }

                                onDrop={(event) => handleDrop(event, column)}

                                className={`flex min-h-0 flex-col overflow-hidden rounded-xl border bg-gray-50/70 transition ${highlighted

                                        ? "border-blue-400 ring-2 ring-blue-200"

                                        : droppable

                                            ? "border-dashed border-blue-200"

                                            : column.danger

                                                ? "border-red-200"

                                                : "border-gray-200"

                                    } ${dragging && !droppable ? "opacity-60" : ""}`}

                            >

                                <div

                                    className={`flex shrink-0 items-center justify-between border-b px-4 py-3 backdrop-blur ${column.danger

                                            ? "border-red-100 bg-red-50/80"

                                            : "border-gray-200 bg-gray-50/95"

                                        }`}

                                >

                                    <span

                                        className={`text-sm font-semibold ${column.danger ? "text-red-700" : "text-gray-800"

                                            }`}

                                    >

                                        {column.title}

                                    </span>

                                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-gray-500 shadow-sm">

                                        {items.length}

                                    </span>

                                </div>

                                <ScrollArea axis="y" className="min-h-0 flex-1 p-3">

                                    {items.length === 0 ? (

                                        <div className="flex h-full min-h-[180px] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white px-3 text-center text-xs text-gray-400">

                                            {droppable ? "Отпустите здесь" : i18nT("kanban.empty")}

                                        </div>

                                    ) : (

                                        <div className="space-y-3">

                                            {items.map((order) => (

                                                <OrderCard

                                                    key={order.id}

                                                    order={order}

                                                    draggable={canDrag(order, user)}

                                                    pending={pendingId === order.id}

                                                    onDragStart={() => setDragging(order)}

                                                    onDragEnd={() => {

                                                        setDragging(null);

                                                        setOverKey(null);

                                                    }}

                                                />

                                            ))}

                                        </div>

                                    )}

                                </ScrollArea>

                            </section>

                        );

                    })}

                </div>

            </ScrollArea>

            {interactive && user?.role !== "MANAGER" && (

                <p className="mt-2 text-[11px] text-gray-400">

                    {i18nT("pages.orders.orders.orders.0aa695f")}

                </p>

            )}

            {reasonFor && (

                <ReasonModal

                    title={i18nT("pages.orders.orders.orders.95f5bda")}

                    label="Что нужно исправить"

                    submitText="Вернуть"

                    busy={pendingId === reasonFor.order.id}

                    onClose={() => setReasonFor(null)}

                    onSubmit={submitReason}

                />

            )}

        </>

    );

}

// MARK: Reason modal

function ReasonModal({ title, label, submitText, busy, onClose, onSubmit }) {

    __useI18nReactive();

    const [text, setText] = useState("");

    const valid = text.trim().length >= 3;

    return (

        <Modal title={title} onClose={busy ? () => { } : onClose} width="520px">

            <form

                className="space-y-4"

                onSubmit={(event) => {

                    event.preventDefault();

                    if (valid && !busy) {

                        onSubmit(text.trim());

                    }

                }}

            >

                <Field label={label}>

                    <textarea

                        value={text}

                        onChange={(event) => setText(event.target.value)}

                        rows={4}

                        autoFocus

                        placeholder={i18nT("pages.orders.orders.orders.f2081a3")}

                        className="input min-h-[110px] resize-none py-3"

                    />

                </Field>

                <p className="text-[11px] text-gray-400">

                    {i18nT("pages.orders.orders.orders.ce0438c")}

                </p>

                <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">

                    <button

                        type="button"

                        onClick={onClose}

                        disabled={busy}

                        className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"

                    >

                        {i18nT("employeeModal.cancel")}

                    </button>

                    <button

                        type="submit"

                        disabled={!valid || busy}

                        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"

                    >

                        {busy ? "Отправка..." : submitText}

                    </button>

                </div>

            </form>

        </Modal>

    );

}

// MARK: Card

function OrderCard({

    order,

    draggable = false,

    pending = false,

    onDragStart,

    onDragEnd,

}) {

    __useI18nReactive();

    const overdue = isOverdue(order);

    return (

        <div

            draggable={draggable && !pending}

            onDragStart={(event) => {

                event.dataTransfer.setData("text/plain", String(order.id)); // нужно для Firefox

                event.dataTransfer.effectAllowed = "move";

                onDragStart?.();

            }}

            onDragEnd={onDragEnd}

            className={`relative ${draggable ? "cursor-grab active:cursor-grabbing" : ""

                } ${pending ? "opacity-60" : ""}`}

        >

            {pending && (

                <div className="absolute right-3 top-3 z-10">

                    <RiLoader4Line size={18} className="animate-spin text-blue-600" />

                </div>

            )}

            <Link

                to={`/orders/${order.id}`}

                draggable={false}

                className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"

            >

                <div className="flex items-start justify-between gap-3">

                    <div className="min-w-0">

                        <span className="text-xs font-bold text-blue-600">

                            {order.number}

                        </span>

                        <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-gray-900">

                            {order.description}

                        </p>

                    </div>

                    {overdue && (

                        <RiAlarmWarningLine size={18} className="shrink-0 text-red-500" />

                    )}

                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">

                    <StatusBadge status={order.status} />

                    <PriorityBadge priority={order.priority} />

                </div>

                <div className="mt-4 space-y-2 text-xs text-gray-500">

                    <div className="flex items-center gap-2">

                        <RiToolsLine />

                        <span className="truncate">

                            {order.equipment?.name || "Без оборудования"}

                        </span>

                    </div>

                    <div className="truncate">

                        {order.assignee?.fullName ||

                            order.brigade?.name ||

                            "Исполнитель не указан"}

                    </div>

                </div>

                <div className="mt-4 border-t border-gray-100 pt-3 text-[11px] text-gray-400">

                    {i18nT("pages.orders.orderdetails.orderdetails.57390a2")} {formatDate(order.deadline)}

                </div>

            </Link>

        </div>

    );

}

// MARK: Selects

function getFilterMenuPosition(anchor, menuWidth, optionCount, align = "left") {
    const viewport = window.visualViewport;
    const screenLeft = viewport?.offsetLeft ?? 0;
    const screenTop = viewport?.offsetTop ?? 0;
    const screenWidth = viewport?.width ?? window.innerWidth;
    const screenHeight = viewport?.height ?? window.innerHeight;
    const padding = 10;
    const width = Math.max(0, Math.min(screenWidth - padding * 2, Math.max(menuWidth || 240, anchor.width)));
    const desiredLeft = align === "right" ? anchor.right - width : anchor.left;
    const left = Math.max(screenLeft + padding, Math.min(desiredLeft, screenLeft + screenWidth - width - padding));
    const desiredHeight = Math.min(370, optionCount * 44 + 16 + (optionCount > 7 ? 54 : 0));
    const availableBelow = screenTop + screenHeight - anchor.bottom - padding - 6;
    const availableAbove = anchor.top - screenTop - padding - 6;
    const opensAbove = availableBelow < Math.min(desiredHeight, 210) && availableAbove > availableBelow;
    const available = opensAbove ? availableAbove : availableBelow;
    const maxHeight = Math.max(80, Math.min(desiredHeight, available));
    const top = opensAbove ? anchor.top - maxHeight - 6 : anchor.bottom + 6;
    return { position: "fixed", top, left, width, maxHeight, zIndex: 9999 };
}

function FilterSelect({ ariaLabel, value, onChange, options = [], menuWidth = 240, align = "left" }) {
    const desktopWidths = {
        "Участок": "lg:w-[165px]",
        "Оборудование": "lg:w-[190px]",
        "Исполнитель": "lg:w-[190px]",
        "Бригада": "lg:w-[165px]",
        "Тип": "lg:w-[150px]",
        "Приоритет": "lg:w-[175px]",
        "Статус": "lg:w-[165px]",
    };
    const triggerRef = useRef(null);
    const menuRef = useRef(null);
    const menuId = useId();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [menuStyle, setMenuStyle] = useState(null);
    const currentOption = options.find((option) => String(option.value ?? "") === String(value ?? ""));
    const visibleOptions = useMemo(() => {
        const term = query.trim().toLocaleLowerCase();
        if (!term) return options;
        return options.filter((option) =>
            `${option.label ?? ""} ${option.tag ?? ""}`.toLocaleLowerCase().includes(term),
        );
    }, [options, query]);
    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return;
        setMenuStyle(getFilterMenuPosition(
            triggerRef.current.getBoundingClientRect(), menuWidth, options.length, align,
        ));
    }, [menuWidth, options.length, align]);
    useEffect(() => {
        if (!isOpen) return undefined;
        updatePosition();
        const onPointerDown = (event) => {
            if (triggerRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
            setIsOpen(false);
        };
        const onKeyDown = (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                setIsOpen(false);
                triggerRef.current?.focus();
            }
        };
        const reposition = () => updatePosition();
        // Capture nested scrolling too (for example, the dashboard's main scroll container).
        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        window.addEventListener("resize", reposition);
        window.addEventListener("scroll", reposition, true);
        window.visualViewport?.addEventListener("resize", reposition);
        window.visualViewport?.addEventListener("scroll", reposition);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("resize", reposition);
            window.removeEventListener("scroll", reposition, true);
            window.visualViewport?.removeEventListener("resize", reposition);
            window.visualViewport?.removeEventListener("scroll", reposition);
        };
    }, [isOpen, updatePosition]);
    function toggle() {
        if (isOpen) return setIsOpen(false);
        setQuery("");
        updatePosition();
        setIsOpen(true);
    }
    function selectOption(option) {
        onChange(String(option.value ?? ""));
        setIsOpen(false);
        triggerRef.current?.focus();
    }
    return (
        <div className={`orders-filter-item w-full min-w-0 lg:shrink-0 ${desktopWidths[ariaLabel] || "lg:w-[180px]"}`}>
            <button
                ref={triggerRef}
                type="button"
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-controls={isOpen ? menuId : undefined}
                aria-expanded={isOpen}
                onClick={toggle}
                onKeyDown={(event) => {
                    if (!isOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
                        event.preventDefault();
                        toggle();
                    }
                }}
                className={`flex h-11 w-full min-w-0 items-center justify-between gap-1.5 rounded-lg border bg-gray-50 px-3 text-left text-sm font-medium text-gray-900 transition hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 ${isOpen ? "border-blue-400 ring-2 ring-blue-100" : "border-gray-300"}`}
            >
                <span className="min-w-0 flex-1 truncate">{currentOption?.label ?? options[0]?.label ?? ariaLabel}</span>
                <RiArrowDownSLine size={17} className={`shrink-0 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && menuStyle && createPortal(
                <div
                    ref={menuRef}
                    id={menuId}
                    role="listbox"
                    aria-label={ariaLabel}
                    className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-2xl"
                    style={menuStyle}
                >
                    {options.length > 7 && (
                        <div className="shrink-0 border-b border-gray-100 px-2 pb-2 pt-1">
                            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5">
                                <RiSearchLine className="shrink-0 text-gray-400" size={16} />
                                <input
                                    type="search"
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder="Поиск..."
                                    aria-label={`Поиск: ${ariaLabel}`}
                                    className="h-9 w-full min-w-0 bg-transparent text-sm text-gray-800 outline-none"
                                />
                            </div>
                        </div>
                    )}
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
                        {visibleOptions.length ? visibleOptions.map((option, index) => {
                            const selected = String(option.value ?? "") === String(value ?? "");
                            return (
                                <button
                                    key={`${String(option.value ?? "")}-${index}`}
                                    type="button"
                                    role="option"
                                    aria-selected={selected}
                                    onClick={() => selectOption(option)}
                                    className={`flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-gray-50 ${selected ? "bg-blue-50 text-blue-700" : "text-gray-800"}`}
                                >
                                    <span className="min-w-0 flex-1 break-words font-medium leading-5">{option.label}</span>
                                    {option.tag && <span className="max-w-[32%] shrink-0 truncate text-[11px] font-normal text-gray-400">{option.tag}</span>}
                                    {selected && <RiCheckLine size={16} className="shrink-0 text-blue-600" />}
                                </button>
                            );
                        }) : <div className="px-3 py-5 text-center text-sm text-gray-400">Ничего не найдено</div>}
                    </div>
                </div>,
                document.body,
            )}
        </div>
    );
}

// MARK: UI

function StatusBadge({ status }) {

    return (

        <span

            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[status] || "bg-gray-100 text-gray-600"

                }`}

        >

            {STATUS_LABELS[status] || status}

        </span>

    );

}

function PriorityBadge({ priority }) {

    return (

        <span

            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${PRIORITY_STYLES[priority] || "bg-gray-100 text-gray-600"

                }`}

        >

            {PRIORITY_LABELS[priority] || priority}

        </span>

    );

}

function SmallStat({ label, value, danger = false }) {

    return (

        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">

            <p className="text-xs font-medium text-gray-500">{label}</p>

            <p

                className={`mt-1 text-xl font-bold ${danger ? "text-red-600" : "text-gray-900"

                    }`}

            >

                {value}

            </p>

        </div>

    );

}

function Modal({ title, onClose, children, width = "680px" }) {

    return (

        <div

            className="fixed inset-0 z-[5000] flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm"

            onMouseDown={onClose}

        >

            <div

                className="max-h-[calc(100vh-32px)] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl"

                style={{ maxWidth: width }}

                onMouseDown={(event) => event.stopPropagation()}

            >

                <div className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-5">

                    <h2 className="text-lg font-bold text-gray-900">{title}</h2>

                    <button

                        type="button"

                        onClick={onClose}

                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"

                    >

                        <RiCloseLine size={20} />

                    </button>

                </div>

                <div className="p-6">{children}</div>

            </div>

        </div>

    );

}

function Field({ label, children }) {

    return (

        <div className="block">

            <span className="mb-2 block text-xs font-semibold text-gray-600">

                {label}

            </span>

            {children}

        </div>

    );

}

function ErrorBox({ text }) {

    return (

        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">

            <RiAlarmWarningLine size={18} className="shrink-0" />

            {text}

        </div>

    );

}

function InlineLoader() {

    return (

        <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-gray-200 bg-white">

            <RiLoader4Line size={30} className="animate-spin text-blue-600" />

        </div>

    );

}

function InlineError({ text, onRetry }) {

    __useI18nReactive();

    return (

        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-red-100 bg-white text-center">

            <RiAlarmWarningLine size={30} className="text-red-500" />

            <p className="mt-3 text-sm font-semibold text-gray-900">

                {i18nT("pages.orders.orders.orders.6d184fd")}

            </p>

            <p className="mt-1 max-w-lg text-sm text-gray-500">{text}</p>

            <button

                type="button"

                onClick={onRetry}

                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold"

            >

                <RiRefreshLine />

                {i18nT("components.layout.appnavbar.b914bbb")}

            </button>

        </div>

    );

}

function PageLoader() {

    return (

        <div className="flex min-h-[500px] items-center justify-center">

            <RiLoader4Line size={32} className="animate-spin text-blue-600" />

        </div>

    );

}

function PageError({ text, onRetry }) {

    __useI18nReactive();

    return (

        <div className="flex min-h-[500px] flex-col items-center justify-center">

            <RiAlarmWarningLine size={34} className="text-red-500" />

            <p className="mt-3 text-sm font-semibold text-gray-900">

                {i18nT("pages.orders.orders.orders.ac0c6fb")}

            </p>

            <p className="mt-1 max-w-lg text-center text-sm text-gray-500">{text}</p>

            <button

                type="button"

                onClick={onRetry}

                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold"

            >

                <RiRefreshLine />

                {i18nT("components.layout.appnavbar.b914bbb")}

            </button>

        </div>

    );

}
