import { useNavigate } from "react-router-dom";
import { RiAlarmWarningLine, RiArrowRightLine, RiCheckboxCircleLine, RiErrorWarningLine, RiInformationLine } from "react-icons/ri";
import { t as i18nT, useI18n } from "../../i18n/index.js";
export default function AiInsightCard({
  insight
}) {
  useI18n();
  const navigate = useNavigate();
  const config = {
    DANGER: {
      icon: RiAlarmWarningLine,
      iconClass: "bg-red-100 text-red-600",
      metricClass: "bg-red-50 text-red-700",
      borderClass: "border-red-200"
    },
    WARNING: {
      icon: RiErrorWarningLine,
      iconClass: "bg-orange-100 text-orange-600",
      metricClass: "bg-orange-50 text-orange-700",
      borderClass: "border-orange-200"
    },
    SUCCESS: {
      icon: RiCheckboxCircleLine,
      iconClass: "bg-green-100 text-green-600",
      metricClass: "bg-green-50 text-green-700",
      borderClass: "border-green-200"
    },
    INFO: {
      icon: RiInformationLine,
      iconClass: "bg-blue-100 text-blue-600",
      metricClass: "bg-blue-50 text-blue-700",
      borderClass: "border-blue-200"
    }
  };
  const current = config[insight.type] ?? config.INFO;
  const Icon = current.icon;
  return <article className={`
        rounded-xl
        border
        bg-white
        p-4
        transition
        hover:shadow-sm
        ${current.borderClass}
      `}>
            <div className="flex items-start gap-3">
                {/* ICON */}
                <div className={`
            flex h-10 w-10
            shrink-0
            items-center
            justify-center
            rounded-xl
            ${current.iconClass}
          `}>
                    <Icon size={18} />
                </div>

                {/* CONTENT */}
                <div className="min-w-0 flex-1">
                    <div className="
              flex items-start
              justify-between
              gap-4
            ">
                        <h3 className="
                min-w-0
                pt-1
                text-sm
                font-bold
                leading-5
                text-gray-900
              ">
                            {insight.title}
                        </h3>

                        {/* METRIC BADGE */}
                        <div className={`
                min-w-[106px]
                shrink-0
                rounded-xl
                px-3 py-2
                text-right
                ${current.metricClass}
              `}>
                            <p className="
                  text-base
                  font-extrabold
                  leading-none
                ">
                                {insight.metric}
                            </p>

                            <p className="
                  mt-1.5
                  text-[11px]
                  font-semibold
                  leading-4
                  opacity-80
                ">
                                {insight.metricLabel}
                            </p>
                        </div>
                    </div>

                    <p className="
              mt-4
              text-xs
              leading-5
              text-gray-500
            ">
                        {insight.description}
                    </p>

                    {insight.equipmentId && <button type="button" onClick={() => navigate(`/equipment/${insight.equipmentId}`)} className="
                mt-3
                inline-flex
                items-center
                gap-1.5
                text-xs
                font-semibold
                text-blue-600
                transition
                hover:text-blue-700
              ">{i18nT("analytics.insight.openEquipment")}<RiArrowRightLine size={14} />
                        </button>}
                </div>
            </div>
        </article>;
}
