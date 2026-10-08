import { useMemo, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import {
    RiAddLine,
    RiAlarmWarningLine,
    RiArrowRightLine,
    RiCheckLine,
    RiCloseLine,
    RiFilter3Line,
    RiLayoutGridLine,
    RiListCheck2,
    RiLoader4Line,
    RiMicFill,
    RiRefreshLine,
    RiSearchLine,
    RiSparkling2Line,
    RiToolsLine,
    RiUserStarLine,
} from "react-icons/ri";

import SmartTable from "../../../react-components/SmartTable/SmartTable.jsx";
import GlideSelect from "../../../react-components/GlideSelect/GlideSelect.jsx";

import { useAuth } from "../../../auth/AuthProvider.jsx";
import { isOrderStaff } from "../../../auth/roles.js";

import { uploadWorkOrderFile } from "../../../api/workOrders.api.js";

import {
    useAreas,
    useBrigades,
    useEquipmentReference,
    useExecutors,
    useFaultCodes,
    useNormatives,
} from "../../../hooks/useReferences.js";

import {
    useCreateWorkOrder,
    useWorkOrderBoard,
    useWorkOrders,
} from "../../../hooks/useWorkOrders.js";

import {
    useRecommendExecutors,
    useRecommendWork,
} from "../../../hooks/useRecommendations.js";

import { useWorkOrderAction } from "../../../hooks/useWorkOrderAction.js";

import ScrollArea from "../../../components/ScrollArea/ScrollArea.jsx";

import { useVoiceInput } from "../../../hooks/useVoiceInput.js";

import { DROP_COLUMNS, canDrag, resolveMove } from "./kanbanMoves.js";


// MARK: Config

const LIST_HEIGHT = "clamp(380px, calc(100dvh - 430px), 660px)";

const MAX_FILE_SIZE = 15 * 1024 * 1024;

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

const BOARD_COLUMNS = [
    { key: "issued", title: "Выданные" },
    { key: "queued", title: "В очереди" },
    { key: "accepted", title: "Принятые" },
    { key: "inProgress", title: "В работе" },
    { key: "completed", title: "Выполненные" },
    { key: "overdue", title: "Просроченные", danger: true },
];

const TYPE_OPTIONS = [
    { value: "", label: "Все типы" },
    { value: "EMERGENCY", label: "Аварийный" },
    { value: "PLANNED", label: "Плановый" },
];

const PRIORITY_OPTIONS = [
    { value: "", label: "Все приоритеты" },
    ...Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label })),
];

const STATUS_OPTIONS = [
    { value: "", label: "Все статусы" },
    ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
    { value: "OVERDUE", label: "Просроченные" },
];

const ASSIGNMENT_OPTIONS = [
    { value: "executor", label: "Исполнитель" },
    { value: "brigade", label: "Бригада" },
    { value: "brigade_executor", label: "Бригада + исполнитель" },
];

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
    const navigate = useNavigate();

    const auth = useAuth();

    const user = auth?.user ?? null;
    const role = auth?.role ?? user?.role;

    const isExecutor = role === "EXECUTOR";
    const canCreate = isOrderStaff(role);

    const [view, setView] = useState("kanban");
    const [createOpen, setCreateOpen] = useState(false);
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
    ]);

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
        [baseParams, filters.status],
    );

    const boardParams = useMemo(
        () => ({ hours: 12, ...baseParams }),
        [baseParams],
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
        [orders, search],
    );

    const boardOrders = useMemo(
        () =>
            uniqueBoardOrders(board.columns).filter((order) => {
                if (!matchesSearch(order, search)) return false;

                if (filters.status === "OVERDUE") return isOverdue(order);

                if (filters.status) return order.status === filters.status;

                return true;
            }),
        [board.columns, search, filters.status],
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
                header: "Наряд",
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
                header: "Оборудование",
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
                header: "Исполнитель",
                minWidth: 190,
                sortField: "assigneeName",
                sortValue: (order) => order.assignee?.fullName ?? "",
                render: (order) =>
                    order.assignee?.fullName || order.brigade?.name || "—",
            },
            {
                field: "priority",
                header: "Приоритет",
                minWidth: 135,
                render: (order) => <PriorityBadge priority={order.priority} />,
            },
            {
                field: "status",
                header: "Статус",
                minWidth: 155,
                render: (order) => <StatusBadge status={order.status} />,
            },
            {
                field: "deadline",
                header: "Срок",
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
        [],
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
            <div className="mx-auto max-w-[1800px]">
                <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                            Наряды
                        </h1>

                        <p className="mt-1 text-sm text-gray-500">
                            {isExecutor
                                ? "Ваши наряды"
                                : "Управление производственными работами"}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={refresh}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                            <RiRefreshLine size={18} />
                            Обновить
                        </button>

                        {canCreate && (
                            <button
                                type="button"
                                onClick={() => setCreateOpen(true)}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                            >
                                <RiAddLine size={19} />
                                Создать наряд
                            </button>
                        )}
                    </div>
                </div>

                <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                    <SmallStat label="Выдано за смену" value={counters.issued ?? 0} />
                    <SmallStat label="Выполнено за смену" value={counters.completed ?? 0} />
                    <SmallStat label="Просрочено" value={counters.overdue ?? 0} danger />
                    <SmallStat
                        label="Оборудование в простое"
                        value={counters.equipmentInDowntime ?? 0}
                    />
                </div>

                <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center">
                        <div className="relative min-w-[260px] flex-1">
                            <RiSearchLine
                                size={18}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />

                            <input
                                value={filters.search}
                                onChange={(event) =>
                                    updateFilter("search", event.target.value)
                                }
                                placeholder="Номер, оборудование, участок, исполнитель..."
                                className="h-11 w-full rounded-lg border border-gray-300 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        <FilterSelect
                            value={filters.areaId}
                            onChange={updateArea}
                            options={[
                                { value: "", label: "Все участки" },
                                ...mapOptions(areas, (item) => item.name),
                            ]}
                            menuWidth={230}
                            ariaLabel="Участок"
                        />

                        <FilterSelect
                            value={filters.equipmentId}
                            onChange={(value) => updateFilter("equipmentId", value)}
                            options={[
                                { value: "", label: "Всё оборудование" },
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
                                        { value: "", label: "Все исполнители" },
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
                                        { value: "", label: "Все бригады" },
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
                            options={TYPE_OPTIONS}
                            menuWidth={180}
                            ariaLabel="Тип"
                        />

                        <FilterSelect
                            value={filters.priority}
                            onChange={(value) => updateFilter("priority", value)}
                            options={PRIORITY_OPTIONS}
                            menuWidth={190}
                            ariaLabel="Приоритет"
                        />

                        <FilterSelect
                            value={filters.status}
                            onChange={(value) => updateFilter("status", value)}
                            options={STATUS_OPTIONS}
                            menuWidth={220}
                            ariaLabel="Статус"
                            align="right"
                        />
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <RiFilter3Line size={17} />
                            Найдено
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
                                    Сбросить
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
                                    className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                                        view === key
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
                        emptyText="Наряды не найдены"
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
                    onClose={() => setCreateOpen(false)}
                    onCreated={(order) => {
                        setCreateOpen(false);
                        navigate(`/orders/${order.id}`);
                    }}
                />
            )}
        </>
    );
}


// MARK: Kanban

function Kanban({ board, search, status, user, onChanged }) {
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
            ? BOARD_COLUMNS.filter((column) => column.key === "overdue")
            : BOARD_COLUMNS;

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

            <ScrollArea axis="x" className="rounded-xl" style={{ height: LIST_HEIGHT }}>
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
                                className={`flex min-h-0 flex-col overflow-hidden rounded-xl border bg-gray-50/70 transition ${
                                    highlighted
                                        ? "border-blue-400 ring-2 ring-blue-200"
                                        : droppable
                                            ? "border-dashed border-blue-200"
                                            : column.danger
                                                ? "border-red-200"
                                                : "border-gray-200"
                                } ${dragging && !droppable ? "opacity-60" : ""}`}
                            >
                                <div
                                    className={`flex shrink-0 items-center justify-between border-b px-4 py-3 backdrop-blur ${
                                        column.danger
                                            ? "border-red-100 bg-red-50/80"
                                            : "border-gray-200 bg-gray-50/95"
                                    }`}
                                >
                                    <span
                                        className={`text-sm font-semibold ${
                                            column.danger ? "text-red-700" : "text-gray-800"
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
                                            {droppable ? "Отпустите здесь" : "Нет нарядов"}
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
                    Перетащите карточку в другую колонку, чтобы сменить статус.
                    «Приостановить», «Отклонить» и «Закрыть» выполняются в карточке наряда.
                </p>
            )}

            {reasonFor && (
                <ReasonModal
                    title="Вернуть на доработку"
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
    const [text, setText] = useState("");

    const valid = text.trim().length >= 3;

    return (
        <Modal title={title} onClose={busy ? () => {} : onClose} width="520px">
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
                        placeholder="Например: нет замера вибрации"
                        className="input min-h-[110px] resize-none py-3"
                    />
                </Field>

                <p className="text-[11px] text-gray-400">
                    Причина попадает в память AI и учитывается при проверке похожих отчётов.
                </p>

                <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        Отмена
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
            className={`relative ${
                draggable ? "cursor-grab active:cursor-grabbing" : ""
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
                    Срок: {formatDate(order.deadline)}
                </div>
            </Link>
        </div>
    );
}


// MARK: Create

function CreateOrderModal({ onClose, onCreated }) {
    const [form, setForm] = useState({
        type: "PLANNED",
        description: "",
        areaId: "",
        equipmentId: "",
        assignmentMode: "executor",
        assigneeId: "",
        brigadeId: "",
        priority: "NORMAL",
        normativeId: "",
        deadline: "",
        comment: "",
    });

    const [beforeFiles, setBeforeFiles] = useState([]);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const areasQuery = useAreas();

    const equipmentQuery = useEquipmentReference(
        form.areaId ? Number(form.areaId) : null,
    );

    const executorsQuery = useExecutors();
    const brigadesQuery = useBrigades();

    const normativesQuery = useNormatives(
        form.equipmentId ? Number(form.equipmentId) : null,
    );

    const faultCodesQuery = useFaultCodes();

    const createMutation = useCreateWorkOrder();
    const executorRecommendation = useRecommendExecutors();
    const workRecommendation = useRecommendWork();

    const areas = asArray(areasQuery.data);
    const equipment = asArray(equipmentQuery.data);
    const executors = asArray(executorsQuery.data);
    const brigades = asArray(brigadesQuery.data);
    const normatives = asArray(normativesQuery.data);
    const faultCodes = asArray(faultCodesQuery.data);
    const suggestedExecutors = asArray(executorRecommendation.data);
    const workSuggestion = workRecommendation.data;

    const selectedBrigade = useMemo(
        () =>
            brigades.find((item) => String(item.id) === String(form.brigadeId)) ??
            null,
        [brigades, form.brigadeId],
    );

    const assignmentExecutors = useMemo(() => {
        if (form.assignmentMode !== "brigade_executor" || !selectedBrigade) {
            return executors;
        }

        const memberIds = new Set(
            asArray(selectedBrigade.members).map((member) => String(member.id)),
        );

        return executors.filter((executor) => memberIds.has(String(executor.id)));
    }, [executors, form.assignmentMode, selectedBrigade]);

    function change(field, value) {
        setForm((previous) => ({ ...previous, [field]: value }));
        setError("");
    }

    function changeDescription(value) {
        setForm((previous) => ({ ...previous, description: value }));
        workRecommendation.reset();
        executorRecommendation.reset();
        setError("");
    }

    function changeArea(value) {
        setForm((previous) => ({
            ...previous,
            areaId: value,
            equipmentId: "",
            normativeId: "",
        }));

        executorRecommendation.reset();
        workRecommendation.reset();
        setError("");
    }

    function changeEquipment(value) {
        setForm((previous) => ({
            ...previous,
            equipmentId: value,
            normativeId: "",
            assigneeId: "",
        }));

        executorRecommendation.reset();
        workRecommendation.reset();
        setError("");
    }

    function changeAssignmentMode(value) {
        setForm((previous) => ({
            ...previous,
            assignmentMode: value,
            assigneeId: value === "brigade" ? "" : previous.assigneeId,
            brigadeId: value === "executor" ? "" : previous.brigadeId,
        }));

        executorRecommendation.reset();
    }

    function changeBrigade(value) {
        const brigade =
            brigades.find((item) => String(item.id) === String(value)) ?? null;

        const memberIds = new Set(
            asArray(brigade?.members).map((member) => String(member.id)),
        );

        setForm((previous) => {
            let assigneeId = previous.assigneeId;

            if (
                previous.assignmentMode === "brigade_executor" &&
                assigneeId &&
                value &&
                !memberIds.has(String(assigneeId))
            ) {
                assigneeId = "";
            }

            return { ...previous, brigadeId: value, assigneeId };
        });

        executorRecommendation.reset();
        setError("");
    }

    function handleBeforeFiles(event) {
        const files = Array.from(event.target.files || []);

        if (files.length > 5) {
            setBeforeFiles([]);
            setError("Можно загрузить максимум 5 фотографий");
            event.target.value = "";
            return;
        }

        const oversized = files.find((file) => file.size > MAX_FILE_SIZE);

        if (oversized) {
            setBeforeFiles([]);
            setError(`Файл ${oversized.name} больше 15 МБ`);
            event.target.value = "";
            return;
        }

        setBeforeFiles(files);
        setError("");
    }

    function handleClose() {
        if (isSubmitting) {
            return;
        }

        onClose();
    }

    async function recommendExecutors() {
        setError("");

        if (!form.equipmentId) {
            setError("Сначала выберите оборудование");
            return;
        }

        try {
            await executorRecommendation.mutateAsync({
                equipmentId: Number(form.equipmentId),
                description: form.description.trim() || undefined,
                faultCodeId: workSuggestion?.faultCodeId
                    ? Number(workSuggestion.faultCodeId)
                    : undefined,
                brigadeId: form.brigadeId ? Number(form.brigadeId) : undefined,
            });
        } catch (requestError) {
            setError(extractError(requestError));
        }
    }

    async function recommendWork() {
        setError("");

        if (!form.equipmentId) {
            setError("Сначала выберите оборудование");
            return;
        }

        if (form.description.trim().length < 3) {
            setError("Введите описание неисправности");
            return;
        }

        try {
            await workRecommendation.mutateAsync({
                equipmentId: Number(form.equipmentId),
                description: form.description.trim(),
            });
        } catch (requestError) {
            setError(extractError(requestError));
        }
    }

    function applyWorkSuggestion() {
        if (workSuggestion?.normativeId) {
            change("normativeId", String(workSuggestion.normativeId));
        }
    }

    function selectSuggestedExecutor(executor) {
        setForm((previous) => ({
            ...previous,
            assigneeId: String(executor.id),
            assignmentMode: previous.brigadeId ? "brigade_executor" : "executor",
        }));
    }

    async function submit(event) {
        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        setError("");

        if (form.description.trim().length < 3) {
            setError("Описание должно содержать минимум 3 символа");
            return;
        }

        if (!form.areaId || !form.equipmentId) {
            setError("Выберите участок и оборудование");
            return;
        }

        const needsExecutor = ["executor", "brigade_executor"].includes(
            form.assignmentMode,
        );

        const needsBrigade = ["brigade", "brigade_executor"].includes(
            form.assignmentMode,
        );

        if (needsExecutor && !form.assigneeId) {
            setError("Выберите исполнителя");
            return;
        }

        if (needsBrigade && !form.brigadeId) {
            setError("Выберите бригаду");
            return;
        }

        if (needsExecutor && needsBrigade) {
            const brigade = brigades.find(
                (item) => String(item.id) === String(form.brigadeId),
            );

            const memberIds = new Set(
                asArray(brigade?.members).map((member) => String(member.id)),
            );

            if (!memberIds.has(String(form.assigneeId))) {
                setError("Выбранный исполнитель не состоит в выбранной бригаде");
                return;
            }
        }

        if (!form.deadline && !form.normativeId) {
            setError("Укажите срок или норматив");
            return;
        }

        if (beforeFiles.length > 5) {
            setError("Можно загрузить максимум 5 фотографий");
            return;
        }

        if (typeof navigator !== "undefined" && !navigator.onLine) {
            setError(
                "Нет соединения. Создание наряда не ставится в офлайн-очередь, чтобы не создать дубль.",
            );
            return;
        }

        setIsSubmitting(true);

        try {
            const beforePhotoUrls = [];

            for (const file of beforeFiles) {
                if (file.size > MAX_FILE_SIZE) {
                    throw new Error(`Файл ${file.name} больше 15 МБ`);
                }

                const uploaded = await uploadWorkOrderFile(file);

                beforePhotoUrls.push(uploaded.url);
            }

            const payload = {
                type: form.type,
                description: form.description.trim(),
                areaId: Number(form.areaId),
                equipmentId: Number(form.equipmentId),
                priority: form.priority,
            };

            if (needsExecutor) payload.assigneeId = Number(form.assigneeId);
            if (needsBrigade) payload.brigadeId = Number(form.brigadeId);

            if (form.deadline) {
                payload.deadline = new Date(form.deadline).toISOString();
            }

            if (form.normativeId) payload.normativeId = Number(form.normativeId);
            if (form.comment.trim()) payload.comment = form.comment.trim();
            if (beforePhotoUrls.length) payload.beforePhotoUrls = beforePhotoUrls;

            const order = await createMutation.mutateAsync(payload);

            onCreated(order);
        } catch (requestError) {
            if (!requestError?.response) {
                setError(
                    "Соединение оборвалось. Не повторяйте создание сразу: сначала обновите список нарядов и проверьте, не был ли наряд уже создан.",
                );
            } else {
                setError(extractError(requestError));
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    const suggestedFaultCode = faultCodes.find(
        (item) => Number(item.id) === Number(workSuggestion?.faultCodeId),
    );

    const suggestedNormative = normatives.find(
        (item) => Number(item.id) === Number(workSuggestion?.normativeId),
    );

    return (
        <Modal title="Создание наряда" onClose={handleClose} width="900px">
            <form onSubmit={submit} className="space-y-5">
                {error && <ErrorBox text={error} />}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="Тип">
                        <FieldSelect
                            value={form.type}
                            onChange={(value) => change("type", value)}
                            options={TYPE_OPTIONS.filter((item) => item.value)}
                            ariaLabel="Тип наряда"
                        />
                    </Field>

                    <Field label="Приоритет">
                        <FieldSelect
                            value={form.priority}
                            onChange={(value) => change("priority", value)}
                            options={PRIORITY_OPTIONS.filter((item) => item.value)}
                            ariaLabel="Приоритет"
                        />
                    </Field>

                    <div className="md:col-span-2">
                        <Field label="Описание">
                            <div className="relative">
                                <textarea
                                    value={form.description}
                                    onChange={(event) =>
                                        changeDescription(event.target.value)
                                    }
                                    rows={4}
                                    minLength={3}
                                    required
                                    placeholder="Опишите неисправность или необходимую работу..."
                                    className="input min-h-[126px] resize-none py-3 pb-14 pr-16"
                                />

                                <OrderDescriptionVoice
                                    disabled={isSubmitting || createMutation.isPending}
                                    onText={(recognizedText) =>
                                        changeDescription(
                                            [form.description.trim(), recognizedText]
                                                .filter(Boolean)
                                                .join(" "),
                                        )
                                    }
                                    onError={setError}
                                />
                            </div>

                            <p className="mt-2 text-[11px] text-gray-400">
                                Можно ввести описание вручную или надиктовать его через
                                микрофон.
                            </p>
                        </Field>
                    </div>

                    <Field label="Участок">
                        <FieldSelect
                            value={form.areaId}
                            onChange={changeArea}
                            options={[
                                { value: "", label: "Выберите участок" },
                                ...mapOptions(areas, (item) => item.name),
                            ]}
                            menuWidth={310}
                            ariaLabel="Участок"
                        />
                    </Field>

                    <Field label="Оборудование">
                        <FieldSelect
                            value={form.equipmentId}
                            onChange={changeEquipment}
                            options={[
                                { value: "", label: "Выберите оборудование" },
                                ...mapOptions(
                                    equipment,
                                    (item) => item.name,
                                    (item) => item.inventoryNumber,
                                ),
                            ]}
                            menuWidth={340}
                            ariaLabel="Оборудование"
                            disabled={!form.areaId}
                        />
                    </Field>

                    <Field label="Кому выдать">
                        <FieldSelect
                            value={form.assignmentMode}
                            onChange={changeAssignmentMode}
                            options={ASSIGNMENT_OPTIONS}
                            menuWidth={260}
                            ariaLabel="Способ назначения"
                        />
                    </Field>

                    {form.assignmentMode !== "executor" && (
                        <Field label="Бригада">
                            <FieldSelect
                                value={form.brigadeId}
                                onChange={changeBrigade}
                                options={[
                                    { value: "", label: "Выберите бригаду" },
                                    ...mapOptions(
                                        brigades,
                                        (item) => item.name,
                                        (item) => `${asArray(item.members).length} чел.`,
                                    ),
                                ]}
                                menuWidth={300}
                                ariaLabel="Бригада"
                            />
                        </Field>
                    )}

                    {form.assignmentMode !== "brigade" && (
                        <Field label="Исполнитель">
                            <FieldSelect
                                value={form.assigneeId}
                                onChange={(value) => change("assigneeId", value)}
                                options={[
                                    { value: "", label: "Выберите исполнителя" },
                                    ...mapOptions(
                                        assignmentExecutors,
                                        (item) => item.fullName,
                                        (item) => item.statusText || item.specialty,
                                    ),
                                ]}
                                menuWidth={360}
                                ariaLabel="Исполнитель"
                            />
                        </Field>
                    )}

                    <Field label="Норматив">
                        <FieldSelect
                            value={form.normativeId}
                            onChange={(value) => change("normativeId", value)}
                            options={[
                                { value: "", label: "Без норматива" },
                                ...mapOptions(
                                    normatives,
                                    (item) => item.name,
                                    (item) => `${item.hours} ч`,
                                ),
                            ]}
                            menuWidth={360}
                            ariaLabel="Норматив"
                            disabled={!form.equipmentId}
                        />
                    </Field>

                    <Field label="Срок">
                        <input
                            type="datetime-local"
                            value={form.deadline}
                            onChange={(event) => change("deadline", event.target.value)}
                            className="input"
                        />
                    </Field>

                    <div className="md:col-span-2">
                        <div className="flex flex-wrap gap-2.5">
                            <button
                                type="button"
                                onClick={recommendExecutors}
                                disabled={
                                    executorRecommendation.isPending || !form.equipmentId
                                }
                                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                            >
                                {executorRecommendation.isPending ? (
                                    <RiLoader4Line className="animate-spin" />
                                ) : (
                                    <RiUserStarLine />
                                )}
                                Подобрать исполнителя
                            </button>

                            <button
                                type="button"
                                onClick={recommendWork}
                                disabled={workRecommendation.isPending}
                                className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50"
                            >
                                {workRecommendation.isPending ? (
                                    <RiLoader4Line className="animate-spin" />
                                ) : (
                                    <RiSparkling2Line />
                                )}
                                Подобрать шифр и норматив
                            </button>
                        </div>
                    </div>

                    {workSuggestion && (
                        <div className="md:col-span-2">
                            <RecommendationCard
                                suggestion={workSuggestion}
                                faultCode={suggestedFaultCode}
                                normative={suggestedNormative}
                                onApply={applyWorkSuggestion}
                            />
                        </div>
                    )}

                    {suggestedExecutors.length > 0 && (
                        <div className="md:col-span-2">
                            <ExecutorRecommendations
                                items={suggestedExecutors}
                                selectedId={form.assigneeId}
                                onSelect={selectSuggestedExecutor}
                            />
                        </div>
                    )}

                    <div className="md:col-span-2">
                        <Field label="Комментарий">
                            <textarea
                                value={form.comment}
                                onChange={(event) => change("comment", event.target.value)}
                                rows={3}
                                className="input min-h-[90px] resize-none py-3"
                            />
                        </Field>
                    </div>

                    <div className="md:col-span-2">
                        <Field label="Фото до выполнения">
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleBeforeFiles}
                                className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm"
                            />

                            {beforeFiles.length > 0 && (
                                <p className="mt-2 text-xs text-gray-500">
                                    Выбрано: {beforeFiles.length}
                                </p>
                            )}
                        </Field>
                    </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-gray-100 pt-5">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Отмена
                    </button>

                    <button
                        type="submit"
                        disabled={isSubmitting || createMutation.isPending}
                        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSubmitting ? "Создание..." : "Создать наряд"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}


// MARK: Order description voice

function OrderDescriptionVoice({ onText, onError, disabled = false }) {
    const { recording, transcribing, startRecording, stopRecording, cancelRecording } =
        useVoiceInput({
            disabled,
            onError,
            onText: (recognizedText) => {
                const text = String(recognizedText ?? "").trim();

                if (text) {
                    onText?.(text);
                }
            },
        });

    if (recording) {
        return (
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full border border-red-200 bg-white p-1 shadow-sm">
                <div className="flex items-center gap-1.5 px-2 text-[11px] font-semibold text-red-600">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                    Запись
                </div>

                <button
                    type="button"
                    onClick={cancelRecording}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                    title="Отменить запись"
                >
                    <RiCloseLine size={17} />
                </button>

                <button
                    type="button"
                    onClick={stopRecording}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700"
                    title="Остановить и распознать"
                >
                    <RiCheckLine size={17} />
                </button>
            </div>
        );
    }

    if (transcribing) {
        return (
            <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-2 text-[11px] font-semibold text-blue-600 shadow-sm">
                <RiLoader4Line size={15} className="animate-spin" />
                Распознаём…
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={startRecording}
            disabled={disabled}
            className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            title="Надиктовать описание"
        >
            <RiMicFill size={17} />
        </button>
    );
}


// MARK: Recommendations

function RecommendationCard({ suggestion, faultCode, normative, onApply }) {
    return (
        <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-bold text-violet-900">
                        <RiSparkling2Line />
                        Рекомендация AI
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-gray-600 sm:grid-cols-3">
                        <div className="rounded-lg bg-white/80 p-3">
                            <p className="text-gray-400">Шифр</p>
                            <p className="mt-1 font-semibold text-gray-800">
                                {faultCode
                                    ? `${faultCode.code} — ${faultCode.name}`
                                    : suggestion.faultCodeId
                                        ? `#${suggestion.faultCodeId}`
                                        : "Не определён"}
                            </p>
                        </div>

                        <div className="rounded-lg bg-white/80 p-3">
                            <p className="text-gray-400">Норматив</p>
                            <p className="mt-1 font-semibold text-gray-800">
                                {normative
                                    ? normative.name
                                    : suggestion.normativeId
                                        ? `#${suggestion.normativeId}`
                                        : "Не определён"}
                            </p>
                        </div>

                        <div className="rounded-lg bg-white/80 p-3">
                            <p className="text-gray-400">Оценка времени</p>
                            <p className="mt-1 font-semibold text-gray-800">
                                {suggestion.estimatedHours != null
                                    ? `${suggestion.estimatedHours} ч`
                                    : "—"}
                            </p>
                        </div>
                    </div>

                    {suggestion.explanation && (
                        <p className="mt-3 text-sm leading-6 text-violet-900">
                            {suggestion.explanation}
                        </p>
                    )}
                </div>

                <button
                    type="button"
                    onClick={onApply}
                    disabled={!suggestion.normativeId}
                    className="shrink-0 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                >
                    Применить норматив
                </button>
            </div>
        </div>
    );
}

function ExecutorRecommendations({ items, selectedId, onSelect }) {
    return (
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
            <div className="mb-3 flex items-center gap-2">
                <RiUserStarLine className="text-blue-600" />
                <p className="text-sm font-bold text-gray-900">
                    Рекомендуемые исполнители
                </p>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                {items.slice(0, 6).map((item) => {
                    const selected = String(item.id) === String(selectedId);

                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => onSelect(item)}
                            className={`rounded-xl border p-3 text-left transition ${
                                selected
                                    ? "border-blue-400 bg-white ring-2 ring-blue-100"
                                    : "border-blue-100 bg-white hover:border-blue-300"
                            }`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-gray-900">
                                        {item.fullName}
                                    </p>

                                    <p className="mt-1 truncate text-xs text-gray-500">
                                        {item.specialty || "Без специальности"}
                                    </p>
                                </div>

                                <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
                                    {Number(item.score || 0).toFixed(1)}
                                </span>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-500">
                                <span>Очередь: {item.queue ?? 0}</span>
                                <span>Рейтинг: {item.equipmentRating ?? "—"}</span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}


// MARK: Selects

function FilterSelect(props) {
    return (
        <GlideSelect
            {...GLIDE_LIGHT}
            {...props}
            size="lg"
            className="glide-select--filter"
            showTags
        />
    );
}

function FieldSelect(props) {
    return (
        <GlideSelect
            {...GLIDE_LIGHT}
            {...props}
            size="lg"
            className="glide-select--field"
            showTags
        />
    );
}


// MARK: UI

function StatusBadge({ status }) {
    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                STATUS_STYLES[status] || "bg-gray-100 text-gray-600"
            }`}
        >
            {STATUS_LABELS[status] || status}
        </span>
    );
}

function PriorityBadge({ priority }) {
    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                PRIORITY_STYLES[priority] || "bg-gray-100 text-gray-600"
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
                className={`mt-1 text-xl font-bold ${
                    danger ? "text-red-600" : "text-gray-900"
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
    return (
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-red-100 bg-white text-center">
            <RiAlarmWarningLine size={30} className="text-red-500" />

            <p className="mt-3 text-sm font-semibold text-gray-900">
                Не удалось загрузить список
            </p>

            <p className="mt-1 max-w-lg text-sm text-gray-500">{text}</p>

            <button
                type="button"
                onClick={onRetry}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold"
            >
                <RiRefreshLine />
                Повторить
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
    return (
        <div className="flex min-h-[500px] flex-col items-center justify-center">
            <RiAlarmWarningLine size={34} className="text-red-500" />

            <p className="mt-3 text-sm font-semibold text-gray-900">
                Не удалось загрузить наряды
            </p>

            <p className="mt-1 max-w-lg text-center text-sm text-gray-500">{text}</p>

            <button
                type="button"
                onClick={onRetry}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold"
            >
                <RiRefreshLine />
                Повторить
            </button>
        </div>
    );
}
