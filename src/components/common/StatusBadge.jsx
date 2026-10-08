import { t as i18nT, useI18n } from "../../i18n/index.js";
export default function StatusBadge({
  status
}) {
  useI18n();
  const statusConfig = {
    ISSUED: {
      label: i18nT("status.issued"),
      className: "bg-gray-100 text-gray-700"
    },
    ACCEPTED: {
      label: i18nT("status.accepted"),
      className: "bg-cyan-50 text-cyan-700"
    },
    QUEUED: {
      label: i18nT("status.queued"),
      className: "bg-blue-50 text-blue-700"
    },
    IN_PROGRESS: {
      label: i18nT("status.inProgress"),
      className: "bg-yellow-50 text-yellow-700"
    },
    PAUSED: {
      label: i18nT("status.paused"),
      className: "bg-orange-50 text-orange-700"
    },
    COMPLETED: {
      label: i18nT("analytics.orders.completed"),
      className: "bg-emerald-50 text-emerald-700"
    },
    AI_REVIEW: {
      label: i18nT("status.aiReview"),
      className: "bg-violet-50 text-violet-700"
    },
    REWORK: {
      label: i18nT("status.rework"),
      className: "bg-red-50 text-red-700"
    },
    CLOSED: {
      label: i18nT("status.closed"),
      className: "bg-green-50 text-green-700"
    },
    REJECTED: {
      label: i18nT("status.rejected"),
      className: "bg-gray-100 text-gray-500"
    }
  };
  const config = statusConfig[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-600"
  };
  return <span className={`
        inline-flex items-center rounded-md
        px-2 py-1 text-xs font-semibold
        ${config.className}
      `}>
            {config.label}
        </span>;
}
