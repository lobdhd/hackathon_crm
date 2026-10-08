import {
    useNavigate,
} from "react-router-dom";

import {
    RiArrowRightSLine,
    RiBriefcaseLine,
    RiStackLine,
    RiTimeLine,
} from "react-icons/ri";

import EmployeeStatus from "./EmployeeStatus";

import {
    t as i18nT,
    useI18n,
} from "../../i18n/index.js";

export default function EmployeeCard({
    employee,
}) {
    useI18n();

    const navigate =
        useNavigate();

    const assignedOrders =
        Number(
            employee?._count
                ?.assignedOrders ?? 0,
        );

    return (
        <article
            onClick={() =>
                navigate(
                    `/employees/${employee.id}`,
                )
            }
            className="
                group cursor-pointer
                overflow-hidden rounded-xl
                border border-gray-200
                bg-white shadow-sm
                transition
                hover:-translate-y-0.5
                hover:border-blue-200
                hover:shadow-md
            "
        >
            <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <div
                            className="
                                flex h-12 w-12
                                shrink-0 items-center
                                justify-center rounded-xl
                                bg-blue-100
                                text-sm font-bold
                                text-blue-700
                            "
                        >
                            {getInitials(
                                employee.fullName,
                            )}
                        </div>

                        <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold text-gray-900">
                                {
                                    employee.fullName
                                }
                            </h3>

                            <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                                <RiBriefcaseLine
                                    size={14}
                                />

                                <span className="truncate">
                                    {employee.specialty ||
                                        "Специальность не указана"}

                                    {employee.grade
                                        ? ` • ${employee.grade} ${i18nT(
                                              "employeeModal.gradeLower",
                                          )}`
                                        : ""}
                                </span>
                            </div>
                        </div>
                    </div>

                    <RiArrowRightSLine
                        size={20}
                        className="
                            shrink-0 text-gray-300
                            transition
                            group-hover:translate-x-0.5
                            group-hover:text-blue-500
                        "
                    />
                </div>

                <div className="mt-5">
                    <EmployeeStatus
                        status={
                            employee.employeeStatus
                        }
                    />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                    <MiniStat
                        label="Назначено"
                        value={
                            assignedOrders
                        }
                        icon={
                            RiStackLine
                        }
                    />

                    <MiniStat
                        label={i18nT("reportModal.shift")}
                        value={
                            employee.isOnShift
                                ? "На смене"
                                : "Вне смены"
                        }
                        icon={
                            RiTimeLine
                        }
                    />
                </div>

                {assignedOrders > 0 && (
                    <div
                        className="
                            mt-4 flex items-center
                            justify-between rounded-lg
                            bg-blue-50
                            px-3 py-2.5
                        "
                    >
                        <div className="flex items-center gap-2">
                            <RiStackLine className="text-blue-600" />

                            <span className="text-xs font-medium text-blue-800">
                                {i18nT("components.employees.employeecard.c74a439")}
                            </span>
                        </div>

                        <span className="text-xs font-bold text-blue-800">
                            {
                                assignedOrders
                            }
                        </span>
                    </div>
                )}
            </div>
        </article>
    );
}

function MiniStat({
    label,
    value,
    icon: Icon,
}) {
    return (
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-2.5">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                <Icon
                    size={13}
                />

                <span>
                    {label}
                </span>
            </div>

            <div className="mt-1 truncate text-sm font-bold text-gray-900">
                {value}
            </div>
        </div>
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