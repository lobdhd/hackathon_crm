import {
    t as i18nT,
    useI18n,
} from "../../i18n/index.js";

export default function EmployeeStatus({
    status,
}) {
    useI18n();

    const statuses = {
        AVAILABLE: {
            label: i18nT(
                "employeeModal.free",
            ),
            wrapper:
                "bg-green-50 text-green-700",
            dot: "bg-green-500",
        },

        BUSY: {
            label: i18nT(
                "status.inProgress",
            ),
            wrapper:
                "bg-yellow-50 text-yellow-700",
            dot: "bg-yellow-500",
        },

        QUEUED: {
            label: i18nT(
                "employeeModal.hasQueue",
            ),
            wrapper:
                "bg-blue-50 text-blue-700",
            dot: "bg-blue-500",
        },

        OFF_SHIFT: {
            label: i18nT(
                "employeeModal.offShift",
            ),
            wrapper:
                "bg-gray-100 text-gray-600",
            dot: "bg-gray-400",
        },
    };

    const current =
        statuses[status] ??
        statuses.OFF_SHIFT;

    return (
        <span
            className={`
                inline-flex items-center gap-1.5
                rounded-full px-2.5 py-1
                text-xs font-semibold
                ${current.wrapper}
            `}
        >
            <span
                className={`
                    h-1.5 w-1.5 rounded-full
                    ${current.dot}
                `}
            />

            {current.label}
        </span>
    );
}