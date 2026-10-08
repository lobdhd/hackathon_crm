import { RiCheckboxCircleFill, RiTimeLine } from "react-icons/ri";
import { t as i18nT, useI18n } from "../../i18n/index.js";
export default function OrderTimeline({
  items = []
}) {
  useI18n();
  if (!items.length) {
    return <div className="
          rounded-xl border
          border-dashed border-gray-200
          bg-gray-50/60
          py-10 text-center
          text-sm text-gray-400
        ">{i18nT("orderTimeline.empty")}</div>;
  }
  return <div className="relative">
      <div className="
          absolute bottom-4 left-[15px]
          top-4 w-px bg-gray-200
        " />

      <div className="space-y-6">
        {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return <div key={item.id} className="relative flex gap-4">
                <div className={`
                    relative z-10
                    flex h-8 w-8
                    shrink-0 items-center
                    justify-center
                    rounded-full
                    border-4 border-white
                    ${isLast ? "bg-blue-600 text-white" : "bg-green-100 text-green-600"}
                  `}>
                  {isLast ? <RiTimeLine size={14} /> : <RiCheckboxCircleFill size={16} />}
                </div>

                <div className="min-w-0 flex-1 pb-1">
                  <div className="
                      flex flex-col
                      justify-between gap-1
                      sm:flex-row
                    ">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {item.title}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {item.user}
                      </p>
                    </div>

                    <span className="shrink-0 text-xs text-gray-400">
                      {new Date(item.time).toLocaleString("ru-RU", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
                    </span>
                  </div>

                  {item.comment && <div className="
                        mt-2 rounded-lg
                        border border-gray-100
                        bg-gray-50
                        px-3 py-2
                        text-sm text-gray-600
                      ">
                      {item.comment}
                    </div>}
                </div>
              </div>;
      })}
      </div>
    </div>;
}
