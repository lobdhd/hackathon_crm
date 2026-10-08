import {
    useMemo,
    useState,
} from "react";

import { useNavigate } from "react-router-dom";
import {
    RiCloseLine,
    RiFilter3Line,
    RiLayoutGridLine,
    RiListCheck2,
    RiLoader4Line,
    RiRefreshLine,
    RiSearchLine,
    RiTeamLine,
    RiUserAddLine,
    RiUserFollowLine,
    RiUserUnfollowLine,
} from "react-icons/ri";
import SmartTable from "../../../react-components/SmartTable/SmartTable.jsx";
import EmployeeCard from "../../../components/employees/EmployeeCard";
import CreateEmployeeModal from "../../../components/employees/CreateEmployeeModal";
import {
    useAuth,
} from "../../../auth/AuthProvider.jsx";
import {
    useBrigades,
    useExecutors,
} from "../../../hooks/useReferences.js";
import {
    useCreateAdminUser,
} from "../../../hooks/useAdmin.js";
import {
    t as i18nT,
    useI18n,
} from "../../../i18n/index.js";

import ScrollArea from "../../../components/ScrollArea/ScrollArea.jsx";

const LIST_HEIGHT = "clamp(360px, calc(100dvh - 430px), 640px)";

const STATUS_LABELS = { AVAILABLE: "Свободен", BUSY: "В работе", QUEUED: "Есть очередь", OFF_SHIFT: "Не на смене" };
const STATUS_STYLES = { AVAILABLE: "bg-green-50 text-green-700", BUSY: "bg-orange-50 text-orange-700", QUEUED: "bg-blue-50 text-blue-700", OFF_SHIFT: "bg-gray-100 text-gray-600" };

export default function Employees() {
    useI18n();
    const navigate = useNavigate();
    const {
        role,
    } = useAuth();
    const [view, setView] = useState("cards");
    const [
        createModalOpen,
        setCreateModalOpen,
    ] = useState(false);
    const [
        filters,
        setFilters,
    ] = useState({
        search: "",
        specialty: "",
        status: "",
        shift: "",
    });
    const executorsQuery =
        useExecutors();
    const brigadesQuery =
        useBrigades();
    const createUser =
        useCreateAdminUser();
    const employees =
        Array.isArray(
            executorsQuery.data,
        )
            ? executorsQuery.data
            : [];
    const brigades =
        Array.isArray(
            brigadesQuery.data,
        )
            ? brigadesQuery.data
            : [];
    const isAdmin =
        role === "ADMIN";
    function updateFilter(
        field,
        value,
    ) {
        setFilters(
            (current) => ({
                ...current,
                [field]: value,
            }),
        );
    }
    function resetFilters() {
        setFilters({
            search: "",
            specialty: "",
            status: "",
            shift: "",
        });
    }
    async function handleCreateEmployee(
        payload,
    ) {
        return createUser.mutateAsync(
            payload,
        );
    }
    const specialties =
        useMemo(() => {
            return [
                ...new Set(
                    employees
                        .map(
                            (
                                employee,
                            ) =>
                                employee.specialty,
                        )
                        .filter(
                            Boolean,
                        ),
                ),
            ].sort((a, b) =>
                a.localeCompare(
                    b,
                    "ru",
                ),
            );
        }, [employees]);
    const filteredEmployees =
        useMemo(() => {
            const search =
                filters.search
                    .trim()
                    .toLowerCase();
            return employees.filter(
                (
                    employee,
                ) => {
                    const matchesSearch =
                        !search ||
                        employee.fullName
                            ?.toLowerCase()
                            .includes(
                                search,
                            ) ||
                        employee.specialty
                            ?.toLowerCase()
                            .includes(
                                search,
                            ) ||
                        String(
                            employee.grade ??
                            "",
                        ).includes(
                            search,
                        );
                    const matchesSpecialty =
                        !filters.specialty ||
                        employee.specialty ===
                        filters.specialty;
                    const matchesStatus =
                        !filters.status ||
                        employee.employeeStatus ===
                        filters.status;
                    const matchesShift =
                        !filters.shift ||
                        (filters.shift ===
                            "ON"
                            ? employee.isOnShift ===
                            true
                            : employee.isOnShift ===
                            false);
                    return (
                        matchesSearch &&
                        matchesSpecialty &&
                        matchesStatus &&
                        matchesShift
                    );
                },
            );
        }, [
            employees,
            filters,
        ]);
    const stats =
        useMemo(() => {
            return {
                total:
                    employees.length,
                free:
                    employees.filter(
                        (
                            employee,
                        ) =>
                            employee.employeeStatus ===
                            "AVAILABLE",
                    ).length,
                busy:
                    employees.filter(
                        (
                            employee,
                        ) =>
                            employee.employeeStatus ===
                            "BUSY" ||
                            employee.employeeStatus ===
                            "QUEUED",
                    ).length,
                offShift:
                    employees.filter(
                        (
                            employee,
                        ) =>
                            employee.employeeStatus ===
                            "OFF_SHIFT",
                    ).length,
            };
        }, [employees]);
    const activeFiltersCount =
        Object.entries(
            filters,
        ).filter(
            ([key, value]) =>
                key !==
                "search" &&
                Boolean(value),
        ).length;
    const columns = useMemo(() => [
        {
            field: "fullName",
            header: i18nT("ordersTable.assignee"),
            minWidth: 240,
            render: (employee) => (
                <div className="min-w-0">
                    <div className="truncate font-semibold text-gray-900">{employee.fullName}</div>
                    <div className="mt-1 text-xs text-gray-400">ID {employee.id}</div>
                </div>
            ),
        },
        { field: "specialty", header: i18nT("components.employees.createemployeemodal.500aacb"), minWidth: 190, render: (employee) => employee.specialty || "—" },
        { field: "grade", header: i18nT("employeeModal.grade"), width: 100, align: "center", render: (employee) => employee.grade ?? "—" },
        {
            field: "employeeStatus",
            header: i18nT("employeeModal.status"),
            minWidth: 150,
            render: (employee) => (
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[employee.employeeStatus] || "bg-gray-100 text-gray-600"}`}>
                    {STATUS_LABELS[employee.employeeStatus] || employee.employeeStatus}
                </span>
            ),
        },
        {
            field: "isOnShift",
            header: i18nT("reportModal.shift"),
            minWidth: 130,
            sortValue: (employee) => employee.isOnShift ? 1 : 0,
            render: (employee) => (
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${employee.isOnShift ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {employee.isOnShift ? i18nT("pages.admin.admin.admin.958b816") : i18nT("pages.employees.employees.employees.ece3411")}
                </span>
            ),
        },
        {
            key: "assignedOrders",
            header: "Активных нарядов",
            minWidth: 155,
            align: "center",
            sortField: "assignedOrders",
            sortValue: (employee) => Number(employee._count?.assignedOrders ?? 0),
            render: (employee) => <span className="font-semibold text-gray-800">{employee._count?.assignedOrders ?? 0}</span>,
        },
    ], []);

    if (
        executorsQuery.isLoading
    ) {
        return (
            <PageState
                icon={
                    RiLoader4Line
                }
                spin
                title={i18nT("pages.employees.employees.employees.1ad9806")}
                text="Получаем актуальные данные с сервера"
            />
        );
    }
    if (
        executorsQuery.isError
    ) {
        return (
            <PageState
                icon={
                    RiTeamLine
                }
                title={i18nT("pages.employees.employees.employees.c52c210")}
                text={
                    executorsQuery
                        .error
                        ?.message ||
                    "Попробуйте повторить запрос"
                }
                action={
                    <button
                        type="button"
                        onClick={() =>
                            executorsQuery.refetch()
                        }
                        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                        <RiRefreshLine
                            size={
                                17
                            }
                        />
                        {i18nT("components.layout.appnavbar.b914bbb")}
                    </button>
                }
            />
        );
    }
    return (
        <>
            <div className="mx-auto max-w-[1800px]">
                <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                            {i18nT(
                                "sidebar.employees",
                            )}
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            {i18nT("pages.employees.employees.employees.1fe2e0c")}
                        </p>
                    </div>
                    {isAdmin && (
                        <button
                            type="button"
                            onClick={() =>
                                setCreateModalOpen(
                                    true,
                                )
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                        >
                            <RiUserAddLine
                                size={
                                    18
                                }
                            />
                            {i18nT("components.employees.createemployeemodal.698e3c6")}
                        </button>
                    )}
                </div>
                <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
                    <StatCard
                        label="Всего исполнителей"
                        value={
                            stats.total
                        }
                        icon={
                            RiTeamLine
                        }
                        tone="blue"
                    />
                    <StatCard
                        label={i18nT("pages.analytics.analytics.f3fd6df")}
                        value={
                            stats.free
                        }
                        icon={
                            RiUserFollowLine
                        }
                        tone="green"
                    />
                    <StatCard
                        label={i18nT("pages.analytics.analytics.90fc82e")}
                        value={
                            stats.busy
                        }
                        icon={
                            RiLoader4Line
                        }
                        tone="orange"
                    />
                    <StatCard
                        label={i18nT(
                            "employeeModal.offShift",
                        )}
                        value={
                            stats.offShift
                        }
                        icon={
                            RiUserUnfollowLine
                        }
                        tone="gray"
                    />
                </div>
                <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                        <div className="relative flex-1">
                            <RiSearchLine
                                size={
                                    18
                                }
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
                                placeholder={i18nT("pages.employees.employees.employees.ce63a8a")}
                                className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
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
                                {i18nT("pages.employees.employees.employees.a5503eb")}
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
                        <select
                            value={
                                filters.status
                            }
                            onChange={(
                                event,
                            ) =>
                                updateFilter(
                                    "status",
                                    event
                                        .target
                                        .value,
                                )
                            }
                            className="min-w-[180px] rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                        >
                            <option value="">
                                {i18nT("pages.employees.employees.employees.ac1bbd6")}
                            </option>
                            <option value="AVAILABLE">
                                {i18nT("employeeModal.free")}
                            </option>
                            <option value="BUSY">
                                {i18nT("status.inProgress")}
                            </option>
                            <option value="QUEUED">
                                {i18nT("employeeModal.hasQueue")}
                            </option>
                            <option value="OFF_SHIFT">
                                {i18nT("employeeModal.offShift")}
                            </option>
                        </select>
                        <select
                            value={
                                filters.shift
                            }
                            onChange={(
                                event,
                            ) =>
                                updateFilter(
                                    "shift",
                                    event
                                        .target
                                        .value,
                                )
                            }
                            className="min-w-[170px] rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                        >
                            <option value="">
                                {i18nT("pages.employees.employees.employees.e95141c")}
                            </option>
                            <option value="ON">
                                {i18nT("pages.admin.admin.admin.958b816")}
                            </option>
                            <option value="OFF">
                                {i18nT("pages.employees.employees.employees.ece3411")}
                            </option>
                        </select>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <RiFilter3Line
                                size={
                                    17
                                }
                            />
                            {i18nT("pages.employees.employees.employees.35dbd85")}
                            <span className="font-semibold text-gray-900">
                                {
                                    filteredEmployees.length
                                }
                            </span>
                            {activeFiltersCount >
                                0 && (
                                    <button
                                        type="button"
                                        onClick={
                                            resetFilters
                                        }
                                        className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                                    >
                                        <RiCloseLine
                                            size={
                                                14
                                            }
                                        />
                                        {i18nT("pages.employees.employees.employees.02d901c")}
                                    </button>
                                )}
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => executorsQuery.refetch()}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition hover:text-blue-600"
                            >
                                <RiRefreshLine size={15} />
                                {i18nT("components.layout.appnavbar.dbe5444")}
                            </button>

                            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                                <button
                                    type="button"
                                    onClick={() => setView("cards")}
                                    className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${view === "cards" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                                >
                                    <RiLayoutGridLine size={17} />
                                    {i18nT("pages.employees.employees.employees.152beb3")}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setView("table")}
                                    className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${view === "table" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                                >
                                    <RiListCheck2 size={17} />
                                    {i18nT("pages.employees.employees.employees.0f3bd19")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                {view === "cards" ? (
                    <ScrollArea
                        axis="y"
                        className="rounded-xl pr-1"
                        style={{
                            height:
                                LIST_HEIGHT,
                        }}
                    >
                        {filteredEmployees.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                                {filteredEmployees.map(
                                    (
                                        employee,
                                    ) => (
                                        <EmployeeCard
                                            key={
                                                employee.id
                                            }
                                            employee={
                                                employee
                                            }
                                        />
                                    ),
                                )}
                            </div>
                        ) : (
                            <div className="flex h-full min-h-[320px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white px-6 text-center">
                                <div>
                                    <RiTeamLine
                                        size={28}
                                        className="mx-auto text-gray-300"
                                    />

                                    <h3 className="mt-4 text-sm font-semibold text-gray-800">
                                        {i18nT("pages.employees.employees.employees.c132a70")}
                                    </h3>

                                    <p className="mt-1 text-sm text-gray-400">
                                        {i18nT("pages.employees.employees.employees.82f00e1")}
                                    </p>
                                </div>
                            </div>
                        )}
                    </ScrollArea>
                ) : (
                    <SmartTable
                        data={filteredEmployees}
                        columns={columns}
                        dataKey="id"
                        mode="sort"
                        stickyHeader
                        striped
                        scrollHeight={LIST_HEIGHT}
                        minWidth={1000}
                        emptyText={i18nT("pages.employees.employees.employees.c132a70")}
                        emptyDescription={i18nT("pages.employees.employees.employees.82f00e1")}
                        rowClassName={() => "cursor-pointer"}
                        onRowClick={(employee, _index, event) => {
                            if (event.target.closest("button, a, input, select, textarea")) return;
                            navigate(`/employees/${employee.id}`);
                        }}
                    />
                )}
            </div>
            {isAdmin && (
                <CreateEmployeeModal
                    open={
                        createModalOpen
                    }
                    onClose={() =>
                        setCreateModalOpen(
                            false,
                        )
                    }
                    brigades={
                        brigades
                    }
                    onCreate={
                        handleCreateEmployee
                    }
                />
            )}
        </>
    );
}
function StatCard({
    label,
    value,
    icon: Icon,
    tone,
}) {
    const tones = {
        blue: {
            icon:
                "bg-blue-50 text-blue-600",
            value:
                "text-blue-700",
        },
        green: {
            icon:
                "bg-green-50 text-green-600",
            value:
                "text-green-700",
        },
        orange: {
            icon:
                "bg-orange-50 text-orange-600",
            value:
                "text-orange-700",
        },
        gray: {
            icon:
                "bg-gray-100 text-gray-500",
            value:
                "text-gray-800",
        },
    };
    const current =
        tones[tone] ??
        tones.blue;
    return (
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div>
                <p className="text-xs font-medium text-gray-500">
                    {label}
                </p>
                <p
                    className={`mt-1 text-2xl font-bold ${current.value}`}
                >
                    {value}
                </p>
            </div>
            <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${current.icon}`}
            >
                <Icon
                    size={20}
                />
            </div>
        </div>
    );
}
function PageState({
    icon: Icon,
    title,
    text,
    spin = false,
    action = null,
}) {
    return (
        <div className="flex min-h-[520px] items-center justify-center">
            <div className="max-w-md text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                    <Icon
                        size={23}
                        className={
                            spin
                                ? "animate-spin"
                                : ""
                        }
                    />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-gray-900">
                    {title}
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                    {text}
                </p>
                {action}
            </div>
        </div>
    );
}