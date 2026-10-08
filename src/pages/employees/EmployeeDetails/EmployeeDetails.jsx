import {
    useMemo,
} from "react";

import {
    Link,
    useNavigate,
    useParams,
} from "react-router-dom";

import {
    RiArrowLeftLine,
    RiBriefcaseLine,
    RiCalendarCheckLine,
    RiFileList3Line,
    RiHistoryLine,
    RiLoader4Line,
    RiMedalLine,
    RiRefreshLine,
    RiStackLine,
    RiTimeLine,
    RiToolsLine,
    RiUserLine,
} from "react-icons/ri";

import EmployeeStatus from "../../../components/employees/EmployeeStatus";
import StatusBadge from "../../../components/common/StatusBadge";
import PriorityBadge from "../../../components/common/PriorityBadge";

import {
    useExecutors,
} from "../../../hooks/useReferences.js";

import {
    useWorkOrders,
} from "../../../hooks/useWorkOrders.js";

import {
    t as i18nT,
    useI18n,
} from "../../../i18n/index.js";

const TERMINAL_STATUSES =
    new Set([
        "CLOSED",
        "REJECTED",
        "CANCELLED",
    ]);

export default function EmployeeDetails() {
    useI18n();

    const {
        id,
    } = useParams();

    const navigate =
        useNavigate();

    const employeeId =
        Number(id);

    const executorsQuery =
        useExecutors();

    const ordersQuery =
        useWorkOrders(
            {
                assigneeId:
                    employeeId,
                compact: true,
                limit: 500,
                offset: 0,
            },
            {
                enabled:
                    Number.isInteger(
                        employeeId,
                    ) &&
                    employeeId > 0,
            },
        );

    const employees =
        Array.isArray(
            executorsQuery.data,
        )
            ? executorsQuery.data
            : [];

    const employee =
        useMemo(
            () =>
                employees.find(
                    (
                        item,
                    ) =>
                        Number(
                            item.id,
                        ) ===
                        employeeId,
                ),
            [
                employees,
                employeeId,
            ],
        );

    const employeeOrders =
        Array.isArray(
            ordersQuery.data
                ?.items,
        )
            ? ordersQuery.data
                  .items
            : [];

    const activeOrders =
        useMemo(
            () =>
                employeeOrders.filter(
                    (
                        order,
                    ) =>
                        !TERMINAL_STATUSES.has(
                            order.status,
                        ),
                ),
            [employeeOrders],
        );

    const closedOrders =
        useMemo(
            () =>
                employeeOrders.filter(
                    (
                        order,
                    ) =>
                        order.status ===
                        "CLOSED",
                ),
            [employeeOrders],
        );

    const overdueOrders =
        useMemo(
            () =>
                employeeOrders.filter(
                    isOverdue,
                ),
            [employeeOrders],
        );

    const aiReviewOrders =
        useMemo(
            () =>
                employeeOrders.filter(
                    (
                        order,
                    ) =>
                        order.status ===
                        "AI_REVIEW",
                ),
            [employeeOrders],
        );

    if (
        executorsQuery.isLoading
    ) {
        return (
            <StateView
                icon={
                    RiLoader4Line
                }
                spin
                title={i18nT("pages.employees.employeedetails.employeedetails.fa1b991")}
                text="Получаем актуальные данные"
            />
        );
    }

    if (
        executorsQuery.isError
    ) {
        return (
            <StateView
                icon={
                    RiUserLine
                }
                title={i18nT("pages.employees.employeedetails.employeedetails.723df7a")}
                text={
                    executorsQuery
                        .error
                        ?.message ||
                    "Попробуйте ещё раз"
                }
                action={
                    <button
                        type="button"
                        onClick={() =>
                            executorsQuery.refetch()
                        }
                        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
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

    if (!employee) {
        return (
            <StateView
                icon={
                    RiUserLine
                }
                title={i18nT(
                    "employeeDetails.notFound",
                )}
                text={i18nT(
                    "employeeDetails.notFoundHint",
                )}
                action={
                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/employees",
                            )
                        }
                        className="mt-5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                        {i18nT(
                            "employeeDetails.back",
                        )}
                    </button>
                }
            />
        );
    }

    return (
        <div className="mx-auto max-w-[1600px]">
            <Link
                to="/employees"
                className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-900"
            >
                <RiArrowLeftLine
                    size={18}
                />

                {i18nT(
                    "employeeDetails.allEmployees",
                )}
            </Link>

            <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-col justify-between gap-5 p-6 lg:flex-row lg:items-center">
                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-xl font-bold text-blue-700">
                            {getInitials(
                                employee.fullName,
                            )}
                        </div>

                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-2xl font-bold text-gray-900">
                                    {
                                        employee.fullName
                                    }
                                </h1>

                                <EmployeeStatus
                                    status={
                                        employee.employeeStatus
                                    }
                                />
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500">
                                <span className="inline-flex items-center gap-1.5">
                                    <RiBriefcaseLine
                                        size={
                                            16
                                        }
                                    />

                                    {employee.specialty ||
                                        "Специальность не указана"}
                                </span>

                                {employee.grade && (
                                    <span className="inline-flex items-center gap-1.5">
                                        <RiMedalLine
                                            size={
                                                16
                                            }
                                        />

                                        {
                                            employee.grade
                                        }{" "}
                                        {i18nT("employeeModal.gradeLower")}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div
                        className={`
                            flex items-center gap-3
                            rounded-xl border px-5 py-3
                            ${
                                employee.isOnShift
                                    ? "border-green-100 bg-green-50/70"
                                    : "border-gray-200 bg-gray-50"
                            }
                        `}
                    >
                        <RiTimeLine
                            size={22}
                            className={
                                employee.isOnShift
                                    ? "text-green-600"
                                    : "text-gray-400"
                            }
                        />

                        <div>
                            <p className="text-xs text-gray-500">
                                {i18nT("reportModal.shift")}
                            </p>

                            <p className="text-sm font-bold text-gray-900">
                                {employee.isOnShift
                                    ? i18nT("pages.admin.admin.admin.958b816")
                                    : i18nT("employeeModal.offShift")}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-w-0 space-y-6">
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <SmallKpi
                            label="Всего нарядов"
                            value={
                                employeeOrders.length
                            }
                            icon={
                                RiFileList3Line
                            }
                            tone="blue"
                        />

                        <SmallKpi
                            label="Активные"
                            value={
                                activeOrders.length
                            }
                            icon={
                                RiTimeLine
                            }
                            tone="orange"
                        />

                        <SmallKpi
                            label="Закрытые"
                            value={
                                closedOrders.length
                            }
                            icon={
                                RiCalendarCheckLine
                            }
                            tone="green"
                        />

                        <SmallKpi
                            label={i18nT("pages.orders.orders.orders.97a53e1")}
                            value={
                                overdueOrders.length
                            }
                            icon={
                                RiMedalLine
                            }
                            tone={
                                overdueOrders.length >
                                0
                                    ? "red"
                                    : "violet"
                            }
                        />
                    </div>

                    <Section
                        title={i18nT(
                            "employeeDetails.currentOrders",
                        )}
                        description="Текущие назначенные работы"
                        icon={
                            RiToolsLine
                        }
                        tone="orange"
                    >
                        {ordersQuery.isLoading ? (
                            <InlineLoading />
                        ) : activeOrders.length >
                          0 ? (
                            <div className="space-y-3">
                                {activeOrders.map(
                                    (
                                        order,
                                    ) => (
                                        <OrderRow
                                            key={
                                                order.id
                                            }
                                            order={
                                                order
                                            }
                                        />
                                    ),
                                )}
                            </div>
                        ) : (
                            <EmptyText>
                                {i18nT(
                                    "employeeDetails.noActiveOrders",
                                )}
                            </EmptyText>
                        )}
                    </Section>

                    <Section
                        title={i18nT(
                            "employeeDetails.workHistory",
                        )}
                        description="Наряды, назначенные исполнителю"
                        icon={
                            RiHistoryLine
                        }
                        tone="blue"
                    >
                        {ordersQuery.isLoading ? (
                            <InlineLoading />
                        ) : ordersQuery.isError ? (
                            <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                                {ordersQuery
                                    .error
                                    ?.message ||
                                    i18nT("pages.orders.orders.orders.ac0c6fb")}
                            </div>
                        ) : employeeOrders.length >
                          0 ? (
                            <div className="overflow-hidden rounded-xl border border-gray-200">
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[780px] text-left">
                                        <thead className="bg-gray-50">
                                            <tr className="text-xs uppercase text-gray-400">
                                                <th className="px-4 py-3 font-semibold">
                                                    {i18nT("pages.employees.employeedetails.employeedetails.5072957")}
                                                </th>

                                                <th className="px-4 py-3 font-semibold">
                                                    {i18nT("sidebar.equipment")}
                                                </th>

                                                <th className="px-4 py-3 font-semibold">
                                                    {i18nT("pages.employees.employeedetails.employeedetails.a0f9f1a")}
                                                </th>

                                                <th className="px-4 py-3 font-semibold">
                                                    {i18nT("employeeModal.status")}
                                                </th>

                                                <th className="px-4 py-3 font-semibold">
                                                    {i18nT("pages.employees.employeedetails.employeedetails.bae913f")}
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody className="divide-y divide-gray-100">
                                            {employeeOrders.map(
                                                (
                                                    order,
                                                ) => (
                                                    <HistoryRow
                                                        key={
                                                            order.id
                                                        }
                                                        order={
                                                            order
                                                        }
                                                    />
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <EmptyText>
                                {i18nT(
                                    "employeeDetails.noHistory",
                                )}
                            </EmptyText>
                        )}
                    </Section>
                </div>

                <aside className="space-y-5">
                    <Section
                        title={i18nT(
                            "employeeDetails.currentLoad",
                        )}
                        icon={
                            RiStackLine
                        }
                        tone="green"
                    >
                        <p className="text-xs text-gray-500">
                            {i18nT("employeeModal.status")}
                        </p>

                        <div className="mt-2">
                            <EmployeeStatus
                                status={
                                    employee.employeeStatus
                                }
                            />
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                            <MiniValue
                                label="Активных"
                                value={
                                    activeOrders.length
                                }
                            />

                            <MiniValue
                                label="На проверке"
                                value={
                                    aiReviewOrders.length
                                }
                            />
                        </div>

                        <div className="mt-3">
                            <MiniValue
                                label="Назначено по данным сервера"
                                value={
                                    Number(
                                        employee
                                            ?._count
                                            ?.assignedOrders ??
                                            0,
                                    )
                                }
                            />
                        </div>
                    </Section>

                    <Section
                        title={i18nT(
                            "employeeDetails.data",
                        )}
                        icon={
                            RiUserLine
                        }
                        tone="violet"
                    >
                        <InfoRow
                            label="ID"
                            value={
                                employee.id
                            }
                        />

                        <InfoRow
                            label={i18nT("components.employees.createemployeemodal.500aacb")}
                            value={
                                employee.specialty ||
                                "—"
                            }
                        />

                        <InfoRow
                            label={i18nT(
                                "employeeModal.grade",
                            )}
                            value={
                                employee.grade
                                    ? `${employee.grade} разряд`
                                    : "—"
                            }
                        />

                        <InfoRow
                            label={i18nT("pages.admin.admin.admin.958b816")}
                            value={
                                employee.isOnShift
                                    ? "Да"
                                    : "Нет"
                            }
                        />

                        <InfoRow
                            label={i18nT("employeeModal.status")}
                            value={employeeStatusLabel(
                                employee.employeeStatus,
                            )}
                            last
                        />
                    </Section>
                </aside>
            </div>
        </div>
    );
}

function HistoryRow({
    order,
}) {
    const navigate =
        useNavigate();

    return (
        <tr
            onClick={() =>
                navigate(
                    `/orders/${order.id}`,
                )
            }
            className="cursor-pointer transition hover:bg-gray-50"
        >
            <td className="px-4 py-4">
                <p className="text-sm font-semibold text-gray-900">
                    {order.number}
                </p>

                <p className="mt-1 max-w-[240px] truncate text-xs text-gray-400">
                    {order.description ||
                        "Без описания"}
                </p>
            </td>

            <td className="px-4 py-4">
                <p className="text-sm font-medium text-gray-700">
                    {order
                        .equipment
                        ?.name ??
                        "—"}
                </p>

                {order.equipment
                    ?.inventoryNumber && (
                    <p className="mt-1 text-xs text-gray-400">
                        {
                            order
                                .equipment
                                .inventoryNumber
                        }
                    </p>
                )}
            </td>

            <td className="px-4 py-4">
                <PriorityBadge
                    priority={
                        order.priority
                    }
                />
            </td>

            <td className="px-4 py-4">
                <StatusBadge
                    status={
                        order.status
                    }
                />
            </td>

            <td className="px-4 py-4 text-sm">
                {isOverdue(
                    order,
                ) ? (
                    <span className="font-semibold text-red-600">
                        {i18nT("pages.assistant.assistant.assistant.0a04820")}
                    </span>
                ) : (
                    <span className="text-gray-600">
                        {formatDate(
                            order.deadline,
                        )}
                    </span>
                )}
            </td>
        </tr>
    );
}

function OrderRow({
    order,
}) {
    const navigate =
        useNavigate();

    return (
        <button
            type="button"
            onClick={() =>
                navigate(
                    `/orders/${order.id}`,
                )
            }
            className="flex w-full flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/20 sm:flex-row sm:items-center sm:justify-between"
        >
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">
                        {
                            order.number
                        }
                    </span>

                    <PriorityBadge
                        priority={
                            order.priority
                        }
                    />

                    <StatusBadge
                        status={
                            order.status
                        }
                    />
                </div>

                <p className="mt-2 truncate text-sm font-medium text-gray-800">
                    {order.description ||
                        "Без описания"}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                    {order.area
                        ?.name ??
                        "Участок не указан"}

                    {" • "}

                    {order
                        .equipment
                        ?.name ??
                        "Оборудование не указано"}
                </p>
            </div>

            <div className="shrink-0">
                {isOverdue(
                    order,
                ) ? (
                    <span className="text-sm font-semibold text-red-600">
                        {i18nT("pages.assistant.assistant.assistant.0a04820")}
                    </span>
                ) : (
                    <span className="text-xs text-gray-500">
                        {i18nT("pages.employees.employeedetails.employeedetails.538dc63")}{" "}
                        {formatDate(
                            order.deadline,
                        )}
                    </span>
                )}
            </div>
        </button>
    );
}

function Section({
    title,
    description,
    icon: Icon,
    tone = "blue",
    children,
}) {
    const tones = {
        blue:
            "bg-blue-50 text-blue-600",
        green:
            "bg-green-50 text-green-600",
        orange:
            "bg-orange-50 text-orange-600",
        violet:
            "bg-violet-50 text-violet-600",
    };

    return (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
                <div>
                    <h2 className="text-[15px] font-semibold text-gray-900">
                        {title}
                    </h2>

                    {description && (
                        <p className="mt-1 text-xs text-gray-500">
                            {
                                description
                            }
                        </p>
                    )}
                </div>

                {Icon && (
                    <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tones[tone] ?? tones.blue}`}
                    >
                        <Icon
                            size={18}
                        />
                    </div>
                )}
            </div>

            <div className="p-5">
                {children}
            </div>
        </section>
    );
}

function SmallKpi({
    label,
    value,
    icon: Icon,
    tone,
}) {
    const tones = {
        blue:
            "bg-blue-50 text-blue-600",
        orange:
            "bg-orange-50 text-orange-600",
        green:
            "bg-green-50 text-green-600",
        violet:
            "bg-violet-50 text-violet-600",
        red:
            "bg-red-50 text-red-600",
    };

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs text-gray-500">
                        {label}
                    </p>

                    <p className="mt-2 text-2xl font-bold text-gray-900">
                        {value}
                    </p>
                </div>

                <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${tones[tone] ?? tones.blue}`}
                >
                    <Icon
                        size={18}
                    />
                </div>
            </div>
        </div>
    );
}

function MiniValue({
    label,
    value,
}) {
    return (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="text-xs text-gray-500">
                {label}
            </p>

            <p className="mt-1 text-xl font-bold text-gray-900">
                {value}
            </p>
        </div>
    );
}

function InfoRow({
    label,
    value,
    last = false,
}) {
    return (
        <div
            className={`
                flex items-center
                justify-between
                gap-4 py-3
                ${
                    last
                        ? ""
                        : "border-b border-gray-100"
                }
            `}
        >
            <span className="text-xs text-gray-500">
                {label}
            </span>

            <span className="text-right text-sm font-semibold text-gray-900">
                {value}
            </span>
        </div>
    );
}

function EmptyText({
    children,
}) {
    return (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-5 py-10 text-center text-sm text-gray-400">
            {children}
        </div>
    );
}

function InlineLoading() {
    return (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
            <RiLoader4Line
                size={19}
                className="animate-spin"
            />

            {i18nT("pages.employees.employeedetails.employeedetails.43e40d4")}
        </div>
    );
}

function StateView({
    icon: Icon,
    title,
    text,
    action,
    spin = false,
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

                <h1 className="mt-4 text-xl font-bold text-gray-900">
                    {title}
                </h1>

                <p className="mt-2 text-sm text-gray-500">
                    {text}
                </p>

                {action}
            </div>
        </div>
    );
}

function isOverdue(order) {
    if (!order?.deadline) {
        return false;
    }

    if (
        [
            "CLOSED",
            "CANCELLED",
            "REJECTED",
        ].includes(
            order.status,
        )
    ) {
        return false;
    }

    return (
        new Date(
            order.deadline,
        ).getTime() <
        Date.now()
    );
}

function getInitials(
    fullName = "",
) {
    return fullName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map(
            (item) =>
                item[0],
        )
        .join("")
        .toUpperCase();
}

function formatDate(value) {
    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

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
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        },
    );
}

function employeeStatusLabel(
    status,
) {
    const labels = {
        AVAILABLE:
            "Свободен",
        BUSY:
            "В работе",
        QUEUED:
            "Есть очередь",
        OFF_SHIFT:
            "Не на смене",
    };

    return (
        labels[status] ??
        status ??
        "—"
    );
}