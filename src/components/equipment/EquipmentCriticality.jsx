import { RiAlarmWarningFill, RiErrorWarningLine, RiSubtractLine } from "react-icons/ri";
import { t as i18nT, useI18n } from "../../i18n/index.js";
export default function EquipmentCriticality({
  criticality
}) {
  useI18n();
  const config = {
    HIGH: {
      label: i18nT("equipmentModal.criticalityHigh"),
      icon: RiAlarmWarningFill,
      className: "bg-red-50 text-red-700"
    },
    MEDIUM: {
      label: i18nT("equipmentModal.criticalityMedium"),
      icon: RiErrorWarningLine,
      className: "bg-orange-50 text-orange-700"
    },
    LOW: {
      label: i18nT("equipmentModal.criticalityLow"),
      icon: RiSubtractLine,
      className: "bg-gray-100 text-gray-600"
    }
  };
  const current = config[criticality] ?? config.MEDIUM;
  const Icon = current.icon;
  return <span className={`
        inline-flex
        items-center gap-1
        rounded-md
        px-2 py-1
        text-xs font-semibold
        ${current.className}
      `}>
            <Icon size={13} />

            {current.label}
        </span>;
}
