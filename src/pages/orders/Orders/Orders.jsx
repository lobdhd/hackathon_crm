import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import {
    RiAddLine,
    RiAlarmWarningLine,
    RiArrowRightLine,
    RiCloseLine,
    RiFilter3Line,
    RiLoader4Line,
    RiRefreshLine,
    RiSearchLine,
    RiToolsLine,
} from "react-icons/ri";
import GlideSelect from "../../../react-components/GlideSelect/GlideSelect.jsx";
import RubberSegment from "../../../react-components/RubberSegment/RubberSegment.jsx";
import WakeSlider from "../../../react-components/WakeSlider/WakeSlider.jsx";
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
import CreateOrderModal from "../../../components/orders/CreateOrderModal.jsx";
import { DROP_COLUMNS, canDrag, resolveMove } from "./kanbanMoves.js";
import { t as i18nT } from "../../../i18n/index.js";
import "./Orders.css";
import { useI18n as __useI18nReactive } from "../../../i18n/index.js";
// MARK: Config
const LIST_HEIGHT = "clamp(540px, calc(100dvh - 300px), 980px)";
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
    IN_PROGRESS: "bg-amber-100 text-amber-800",
    PAUSED: "bg-amber-50 text-amber-700",
    COMPLETED: "bg-emerald-100 text-emerald-800",
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
    surfaceColor: "#ffffff",
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
        /* The board must scroll inside its own viewport, never move the whole mobile page sideways. */
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
    /* ?create=1[&equipmentId=N] opens the form, e.g. from an equipment card or its QR code. */
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
    /* Общие фильтры для списка и доски */
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
    const board = boardQuery.data ?? { columns: {} };
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
        [__i18nLocaleToken],
    );
    if (view === "kanban" && boardQuery.isLoading && !boardQuery.data) {
        return <PageLoader />;
    }
    if (view === "kanban" && boardQuery.isError && !boardQuery.data) {
        return (
            <PageError
                text={extractError(boardQuery.error)}
                onRetry={boardQuery.refetch}
            />
        );
    }
    return (
        <>
            <div className="orders-page mx-auto w-full min-w-0 max-w-[1800px] p-7">
                <div className="orders-header mb-4 flex min-w-0 flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <div>
                        <h1 className="orders-page__title text-2xl font-bold tracking-tight text-gray-900">
                            {i18nT("sidebar.orders")}
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            {isExecutor
                                ? i18nT("ordersPage.myOrders")
                                : i18nT("ordersPage.productionManagement")}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {canCreate && (
                            <button
                                type="button"
                                onClick={() => setCreateOpen(true)}
                                className="orders-create-btn inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                            >
                                <RiAddLine size={19} />
                                {i18nT("pages.orders.orders.orders.2538d5c")}
                            </button>
                        )}
                    </div>
                </div>
                <div className="orders-filters mb-4 min-w-0 rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="orders-filters__grid grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap lg:items-center">
                        <div className="relative col-span-2 min-w-0 sm:col-span-3 lg:col-auto lg:w-[245px] lg:shrink-0 xl:w-[260px]">
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
                                className="orders-search h-11 w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                        <OrdersSelect
                            value={filters.areaId}
                            onChange={updateArea}
                            options={[
                                { value: "", label: i18nT("reportModal.allAreas") },
                                ...mapOptions(areas, (item) => item.name),
                            ]}
                            menuWidth={230}
                            ariaLabel="Участок"
                        />
                        <OrdersSelect
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
                                <OrdersSelect
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
                                <OrdersSelect
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
                        <OrdersSelect
                            value={filters.type}
                            onChange={(value) => updateFilter("type", value)}
                            options={TYPE_OPTIONS()}
                            menuWidth={180}
                            ariaLabel="Тип"
                        />
                        <OrdersSelect
                            value={filters.priority}
                            onChange={(value) => updateFilter("priority", value)}
                            options={PRIORITY_OPTIONS()}
                            menuWidth={220}
                            ariaLabel="Приоритет"
                        />
                        <OrdersSelect
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
                        <div className="orders-view-switch">
                            <RubberSegment
                                items={[{ value: "kanban", label: "Kanban" }, { value: "table", label: "Таблица" }]}
                                value={view}
                                onChange={setView}
                                trackColor="#ffffff"
                                thumbColor="#2563eb"
                                textColor="#2563eb"
                                activeTextColor="#ffffff"
                                size="md"
                                radius={10}
                                inset={3}
                                equalSlots
                                aria-label="Вид отображения нарядов"
                            />
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
                    <OrdersTable
                        data={filteredOrders}
                        columns={columns}
                        canCreate={canCreate}
                        navigate={navigate}
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
// MARK: Single table view (independent of Kanban lane layout)
function OrdersTable({ data, columns, canCreate, navigate }) {
    const [sort, setSort] = useState({ key: null, direction: "asc" });
    const viewportRef = useRef(null);
    const collator = useMemo(() => new Intl.Collator("ru", { numeric: true, sensitivity: "base" }), []);
    const sorted = useMemo(() => {
        if (!sort.key) return data;
        const column = columns.find((item) => (item.key || item.field) === sort.key);
        if (!column) return data;
        const getValue = (order) => column.sortValue
            ? column.sortValue(order)
            : order[column.sortField || column.field || column.key];
        return [...data].sort((a, b) => {
            const first = getValue(a);
            const second = getValue(b);
            if (first == null || first === "") return second == null || second === "" ? 0 : 1;
            if (second == null || second === "") return -1;
            const comparison = typeof first === "number" && typeof second === "number"
                ? first - second
                : collator.compare(String(first), String(second));
            return sort.direction === "asc" ? comparison : -comparison;
        });
    }, [data, columns, sort, collator]);

    function toggleSort(key) {
        setSort((previous) => {
            if (previous.key !== key) return { key, direction: "asc" };
            if (previous.direction === "asc") return { key, direction: "desc" };
            return { key: null, direction: "asc" };
        });
    }

    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) return undefined;
        const onWheel = (event) => {
            if (!event.shiftKey || event.ctrlKey || event.metaKey) return;
            const delta = (event.deltaY || event.deltaX) * (
                event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? viewport.clientWidth : 1
            );
            if (!delta || viewport.scrollWidth <= viewport.clientWidth) return;
            const next = Math.max(0, Math.min(
                viewport.scrollWidth - viewport.clientWidth, viewport.scrollLeft + delta,
            ));
            if (Math.abs(next - viewport.scrollLeft) < 0.25) return;
            event.preventDefault();
            viewport.scrollLeft = next;
        };
        viewport.addEventListener("wheel", onWheel, { passive: false });
        return () => viewport.removeEventListener("wheel", onWheel);
    }, []);

    return (
        <section className="orders-table-wrap" aria-label="Таблица нарядов">
            <div className="orders-table-toolbar">
                <div>
                    <h2 className="orders-table-toolbar__title">Список нарядов</h2>
                    <p className="orders-table-toolbar__subtitle">Все найденные наряды в одной таблице</p>
                </div>
                <span className="orders-table-toolbar__count">{data.length} нарядов</span>
            </div>
            <div className="orders-table-viewport" ref={viewportRef} style={{ height: LIST_HEIGHT }} tabIndex={0} role="region" aria-label="Таблица с вертикальной и горизонтальной прокруткой">
                <table className="orders-data-table">
                    <colgroup>
                        {columns.map((column) => (
                            <col key={column.key || column.field} className={`orders-data-table__col--${column.key || column.field}`} />
                        ))}
                    </colgroup>
                    <thead>
                        <tr>
                            {columns.map((column) => {
                                const key = column.key || column.field;
                                const sortable = column.sortable !== false;
                                return (
                                    <th key={key} scope="col" aria-sort={sortable && sort.key === key ? (sort.direction === "asc" ? "ascending" : "descending") : undefined}>
                                        {sortable ? (
                                            <button type="button" className="orders-data-table__sort" onClick={() => toggleSort(key)}>
                                                <span>{column.header}</span>
                                                <span className={`orders-data-table__sort-icon ${sort.key === key ? "is-active" : ""}`} aria-hidden="true">
                                                    {sort.key === key ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}
                                                </span>
                                            </button>
                                        ) : column.header}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.length ? sorted.map((order) => (
                            <tr
                                key={order.id}
                                tabIndex={0}
                                className="orders-data-table__row"
                                onClick={(event) => {
                                    if (event.target.closest("a, button, input, select, textarea")) return;
                                    navigate(`/orders/${order.id}`);
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter" && event.target === event.currentTarget) navigate(`/orders/${order.id}`);
                                }}
                            >
                                {columns.map((column) => (
                                    <td key={column.key || column.field}>{column.render?.(order) ?? "—"}</td>
                                ))}
                            </tr>
                        )) : (
                            <tr>
                                <td className="orders-data-table__empty" colSpan={columns.length}>
                                    <strong>{i18nT("ordersTable.empty")}</strong>
                                    <span>{canCreate ? "Измените фильтры или создайте новый наряд" : "Измените фильтры"}</span>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="orders-table-footer">Прокрутка по вертикали — колесом · по горизонтали — Shift + колесо или трекпадом</div>
        </section>
    );
}

// MARK: Kanban
function Kanban({ board, search, status, user, onChanged }) {
    __useI18nReactive();
    const navigate = useNavigate();
    const [dragging, setDragging] = useState(null);
    const [overKey, setOverKey] = useState(null);
    const [reasonFor, setReasonFor] = useState(null);
    const boardViewportRef = useRef(null);
    const boardScrollApiRef = useRef(null); // плавный скролл: { scrollTo, cancel }
    const sliderPressRef = useRef(null); // нажатие на WakeSlider: клик (плавно) или перетаскивание (напрямую)
    const draggingRef = useRef(false);
    const [boardScroll, setBoardScroll] = useState({ left: 0, max: 0 });
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
    draggingRef.current = Boolean(dragging);
    // Scroll logic:
    //  - plain wheel over a lane scrolls only the lane (never leaks to the board or page);
    //  - Shift + wheel moves the board horizontally with smooth inertia;
    //  - horizontal touchpad gestures are native (already smooth).
    useEffect(() => {
        const viewport = boardViewportRef.current;
        const content = viewport?.querySelector(".orders-kanban-grid");
        if (!viewport) return undefined;

        let syncFrame = 0;
        let animFrame = 0;
        let animating = false;
        let lastTime = 0;
        let target = viewport.scrollLeft;
        let tau = 85; /* постоянная времени анимации, мс: больше — плавнее и медленнее */

        const maxScroll = () => Math.max(0, viewport.scrollWidth - viewport.clientWidth);
        const clamp = (value) => Math.max(0, Math.min(maxScroll(), value));

        /* Плавная анимация к target (не зависит от частоты кадров монитора) */
        const step = (time) => {
            const dt = Math.min(48, time - (lastTime || time));
            lastTime = time;
            const diff = target - viewport.scrollLeft;
            if (Math.abs(diff) < 0.5) {
                viewport.scrollLeft = target;
                animating = false;
                animFrame = 0;
                lastTime = 0;
                return;
            }
            const k = 1 - Math.exp(-dt / tau);
            const move = Math.min(Math.abs(diff), Math.max(Math.abs(diff) * k, 0.8));
            viewport.scrollLeft += Math.sign(diff) * move;
            animFrame = requestAnimationFrame(step);
        };
        const start = () => {
            if (animating) return;
            animating = true;
            lastTime = 0;
            animFrame = requestAnimationFrame(step);
        };
        const cancel = () => {
            cancelAnimationFrame(animFrame);
            animating = false;
            animFrame = 0;
            lastTime = 0;
            target = viewport.scrollLeft;
        };

        boardScrollApiRef.current = {
            scrollTo(x, options) {
                tau = options?.slow ? 140 : 85;
                target = clamp(x);
                start();
            },
            cancel,
        };

        const syncPosition = () => {
            /* нативный скролл (трекпад, перетаскивание) — держим target в актуальном состоянии */
            if (!animating) target = viewport.scrollLeft;
            cancelAnimationFrame(syncFrame);
            syncFrame = requestAnimationFrame(() => {
                const max = maxScroll();
                const left = Math.min(max, Math.max(0, viewport.scrollLeft));
                setBoardScroll((previous) =>
                    Math.abs(previous.left - left) < 0.5 && Math.abs(previous.max - max) < 0.5
                        ? previous
                        : { left, max },
                );
            });
        };

        /* Перехватываем ТОЛЬКО Shift + колесо. Всё остальное — нативное поведение:
           вертикальное колесо крутит колонку и никогда не уходит в горизонталь. */
        const onWheel = (event) => {
            if (!event.shiftKey || event.ctrlKey || event.metaKey || draggingRef.current) return;
            if (maxScroll() <= 1) return;
            const scale = event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? viewport.clientWidth : 1;
            const raw = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
            const delta = raw * scale;
            if (Math.abs(delta) < 0.1) return;
            event.preventDefault();
            tau = 85;
            target = clamp((animating ? target : viewport.scrollLeft) + delta);
            start();
        };

        viewport.addEventListener("wheel", onWheel, { passive: false });
        viewport.addEventListener("scroll", syncPosition, { passive: true });
        const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncPosition) : null;
        observer?.observe(viewport);
        if (content) observer?.observe(content);
        window.addEventListener("resize", syncPosition);
        syncPosition();

        return () => {
            viewport.removeEventListener("wheel", onWheel);
            viewport.removeEventListener("scroll", syncPosition);
            window.removeEventListener("resize", syncPosition);
            observer?.disconnect();
            cancelAnimationFrame(syncFrame);
            cancelAnimationFrame(animFrame);
            boardScrollApiRef.current = null;
        };
    }, [visibleColumns.length]);
    function moveToPosition(position) {
        const viewport = boardViewportRef.current;
        if (!viewport) return;
        const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
        const x = (Number(position) / 100) * max; /* position: 0–100 % */
        const press = sliderPressRef.current;
        if (press && !press.dragging) {
            /* просто кликнули по слайдеру — плавно доезжаем до места */
            boardScrollApiRef.current?.scrollTo(x, { slow: true });
            return;
        }
        /* тянем ручку (или клавиатура) — двигаем напрямую, без лага */
        boardScrollApiRef.current?.cancel();
        viewport.scrollLeft = x;
    }
    function autoScrollDuringDrag(event) {
        if (!draggingRef.current) return;
        const viewport = boardViewportRef.current;
        if (!viewport) return;
        const rect = viewport.getBoundingClientRect();
        const edge = Math.min(85, rect.width * 0.17);
        if (event.clientX < rect.left + edge) {
            boardScrollApiRef.current?.cancel();
            viewport.scrollLeft -= 24;
        } else if (event.clientX > rect.right - edge) {
            boardScrollApiRef.current?.cancel();
            viewport.scrollLeft += 24;
        }
    }
    function handleDragOver(event, column) {
        if (!dragging || !DROP_COLUMNS.includes(column.key)) return;
        if (resolveMove(dragging, column.key, user)) {
            event.preventDefault(); /* разрешает drop */
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
        /* Завершение требует форму: уводим в карточку наряда */
        if (move.openCard) {
            navigate(`/orders/${order.id}`);
            return;
        }
        /* Нужна причина: спрашиваем в модалке */
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
            <div className="orders-kanban-root" onDragOverCapture={autoScrollDuringDrag}>
                {boardScroll.max > 2 && (
                    <nav className="orders-kanban-nav" aria-label="Прокрутка Kanban-доски">
                        <span className="orders-kanban-nav__hint">Навигация по колонкам</span>
                        <div
                            className="orders-kanban-nav__controls"
                            onPointerDownCapture={(event) => {
                                sliderPressRef.current = { x: event.clientX, dragging: false };
                            }}
                            onPointerMoveCapture={(event) => {
                                const press = sliderPressRef.current;
                                if (press && !press.dragging && Math.abs(event.clientX - press.x) > 4) {
                                    press.dragging = true;
                                }
                            }}
                            onPointerUpCapture={() => { sliderPressRef.current = null; }}
                            onPointerCancelCapture={() => { sliderPressRef.current = null; }}
                        >
                            <WakeSlider
                                value={boardScroll.max ? (boardScroll.left / boardScroll.max) * 100 : 0}
                                onChange={moveToPosition}
                                min={0}
                                max={100}
                                step={0.1}
                                bars={90}
                                height={50}
                                restHeight={14}
                                gap={3}
                                fillColor="#2563eb"
                                trackColor="#e7edf5"
                                reach={5}
                                glide={0.3}
                                smoothing={100}
                                ariaLabel="Положение Kanban-доски"
                            />
                        </div>
                        <span className="orders-kanban-nav__tip">Колесо — по колонке · Shift + колесо — по доске</span>
                    </nav>
                )}
                <div
                    ref={boardViewportRef}
                    className="orders-kanban-scroll w-full min-w-0 max-w-full rounded-xl"
                    style={{ height: LIST_HEIGHT, maxWidth: "100%" }}
                    role="region"
                    aria-label="Kanban-доска — горизонтальная прокрутка"
                    tabIndex={0}
                >
                    <div
                        className={`orders-kanban-grid ${visibleColumns.length === 1 ? "orders-kanban-grid--single" : ""}`}
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
                                    className={`orders-kanban-lane orders-kanban-lane--${column.key} flex min-h-0 flex-col overflow-hidden rounded-2xl border transition-colors ${highlighted
                                        ? "orders-kanban-lane--over"
                                        : droppable ? "orders-kanban-lane--droppable" : ""
                                        } ${dragging && !droppable ? "opacity-60" : ""}`}
                                >
                                    <div className="orders-kanban-lane__head flex shrink-0 items-center justify-between border-b px-3 py-3">
                                        <span className="orders-kanban-lane__title text-sm font-bold">{column.title}</span>
                                        <span className="orders-kanban-lane__count min-w-7 rounded-full px-2 py-0.5 text-center text-xs font-bold">
                                            {items.length}
                                        </span>
                                    </div>
                                    <div className="orders-kanban-lane__body min-h-0 flex-1 p-2.5" tabIndex={0} aria-label={`Наряды: ${column.title}`} role="region">
                                        {items.length === 0 ? (
                                            <div className="flex h-full min-h-[180px] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white px-3 text-center text-xs text-gray-400">
                                                {droppable ? "Отпустите здесь" : i18nT("kanban.empty")}
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
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
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                </div>
            </div>
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
                event.dataTransfer.setData("text/plain", String(order.id)); /* нужно для Firefox */
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
                className="orders-order-card block rounded-xl border border-gray-200 bg-white p-3.5 transition-colors hover:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
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
                <div className={`mt-4 border-t border-gray-100 pt-3 text-[11px] ${overdue ? "font-semibold text-rose-600" : "text-gray-400"}`}>
                    {i18nT("pages.orders.orderdetails.orderdetails.57390a2")} {formatDate(order.deadline)}
                </div>
            </Link>
        </div>
    );
}
// MARK: Global select adapter
function OrdersSelect({ ariaLabel, ...props }) {
    const filterClasses = {
        "Участок": "orders-filter-area",
        "Оборудование": "orders-filter-equipment",
        "Исполнитель": "orders-filter-assignee",
        "Бригада": "orders-filter-brigade",
        "Тип": "orders-filter-type",
        "Приоритет": "orders-filter-priority",
        "Статус": "orders-filter-status",
    };
    return (
        <GlideSelect
            {...GLIDE_LIGHT}
            {...props}
            portal
            searchable={props.options?.length > 7}
            size="md"
            showTags
            ariaLabel={ariaLabel}
            className={`orders-filter-item ${filterClasses[ariaLabel] || ""}`}
        />
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
function Modal({ title, onClose, children, width = "680px" }) {
    return createPortal(
        <div className="orders-modal-backdrop" onMouseDown={onClose}>
            <div className="orders-modal-dialog" style={{ maxWidth: width }} onMouseDown={(event) => event.stopPropagation()}>
                <div className="orders-modal-head">
                    <h2>{title}</h2>
                    <button type="button" aria-label="Закрыть" onClick={onClose}><RiCloseLine size={20} /></button>
                </div>
                <div className="orders-modal-content">{children}</div>
            </div>
        </div>,
        document.body,
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
