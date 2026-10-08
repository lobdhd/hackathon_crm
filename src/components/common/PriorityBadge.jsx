import { RiAlarmWarningFill, RiArrowUpLine, RiSubtractLine, RiCalendarCheckLine } from "react-icons/ri";
import { t as i18nT, useI18n } from "../../i18n/index.js";
export default function PriorityBadge({
  priority
}) {
  useI18n();
  const priorities = {
    EMERGENCY: {
      label: i18nT("priority.emergency"),
      icon: RiAlarmWarningFill,
      className: "bg-red-50 text-red-700"
    },
    HIGH: {
      label: i18nT("priority.high"),
      icon: RiArrowUpLine,
      className: "bg-orange-50 text-orange-700"
    },
    NORMAL: {
      label: i18nT("priority.normal"),
      icon: RiSubtractLine,
      className: "bg-blue-50 text-blue-700"
    },
    PLANNED: {
      label: i18nT("priority.planned"),
      icon: RiCalendarCheckLine,
      className: "bg-gray-100 text-gray-700"
    }
  };
  const config = priorities[priority];
  if (!config) return null;
  const Icon = config.icon;
  return <span className={`
        inline-flex items-center gap-1 rounded-md
        px-2 py-1 text-xs font-semibold
        ${config.className}
      `}>
            <Icon size={13} />
            {config.label}
        </span>;
}
