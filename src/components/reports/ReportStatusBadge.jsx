import { RiCheckboxCircleLine, RiLoader4Line, RiErrorWarningLine } from "react-icons/ri";
import { t as i18nT, useI18n } from "../../i18n/index.js";
export default function ReportStatusBadge({
  status
}) {
  useI18n();
  const config = {
    READY: {
      label: i18nT("reportStatus.ready"),
      icon: RiCheckboxCircleLine,
      className: "bg-green-50 text-green-700"
    },
    GENERATING: {
      label: i18nT("reportStatus.generating"),
      icon: RiLoader4Line,
      className: "bg-blue-50 text-blue-700"
    },
    ERROR: {
      label: i18nT("reportStatus.error"),
      icon: RiErrorWarningLine,
      className: "bg-red-50 text-red-700"
    }
  };
  const current = config[status] ?? config.READY;
  const Icon = current.icon;
  return <span className={`
        inline-flex
        items-center
        gap-1.5
        rounded-full
        px-2.5 py-1
        text-xs
        font-semibold
        ${current.className}
      `}>
            <Icon size={13} />

            {current.label}
        </span>;
}
