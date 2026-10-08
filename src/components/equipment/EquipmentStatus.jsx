import { t as i18nT, useI18n } from "../../i18n/index.js";
export default function EquipmentStatus({
  status
}) {
  useI18n();
  const statuses = {
    WORKING: {
      label: i18nT("status.inProgress"),
      wrapper: "bg-green-50 text-green-700",
      dot: "bg-green-500"
    },
    REPAIR: {
      label: i18nT("equipmentModal.inRepair"),
      wrapper: "bg-orange-50 text-orange-700",
      dot: "bg-orange-500"
    },
    DOWNTIME: {
      label: i18nT("analytics.downtime.label"),
      wrapper: "bg-red-50 text-red-700",
      dot: "bg-red-500"
    },
    MAINTENANCE: {
      label: i18nT("equipmentModal.maintenance"),
      wrapper: "bg-blue-50 text-blue-700",
      dot: "bg-blue-500"
    },
    OFFLINE: {
      label: i18nT("equipmentModal.disabled"),
      wrapper: "bg-gray-100 text-gray-600",
      dot: "bg-gray-400"
    }
  };
  const current = statuses[status] ?? statuses.OFFLINE;
  return <span className={`
        inline-flex
        items-center gap-1.5
        rounded-full
        px-2.5 py-1
        text-xs font-semibold
        ${current.wrapper}
      `}>
            <span className={`
          h-1.5 w-1.5
          rounded-full
          ${current.dot}
        `} />

            {current.label}
        </span>;
}
