import { useNavigate } from "react-router-dom";
import { RiMapPinLine, RiUserLine, RiTimeLine, RiToolsLine, RiCameraLine, RiArrowRightSLine } from "react-icons/ri";
import PriorityBadge from "../common/PriorityBadge";
import StatusBadge from "../common/StatusBadge";
import { t as i18nT, useI18n } from "../../i18n/index.js";
export default function OrderCard({
  order,
  area,
  equipment,
  employee
}) {
  useI18n();
  const navigate = useNavigate();
  const isOverdue = order.overdueMinutes > 0;
  return <article onClick={() => navigate(`/orders/${order.id}`)} className={`
        group cursor-pointer rounded-xl border bg-white p-4
        shadow-sm transition
        hover:-translate-y-0.5 hover:shadow-md
        ${isOverdue ? "border-red-200" : "border-gray-200"}
      `}>
            <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">
                            №{order.number}
                        </span>

                        <PriorityBadge priority={order.priority} />
                    </div>

                    <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-gray-900">
                        {order.title}
                    </h3>
                </div>

                <RiArrowRightSLine size={19} className="shrink-0 text-gray-300 transition group-hover:text-blue-500" />
            </div>

            <div className="mb-4 space-y-2">
                <div className="flex items-start gap-2 text-xs text-gray-500">
                    <RiMapPinLine size={15} className="mt-0.5 shrink-0" />

                    <span>{area?.name ?? "Участок не указан"}</span>
                </div>

                <div className="flex items-start gap-2 text-xs text-gray-500">
                    <RiToolsLine size={15} className="mt-0.5 shrink-0" />

                    <span className="line-clamp-1">
                        {equipment?.name ?? "Оборудование не указано"}
                    </span>
                </div>

                <div className="flex items-start gap-2 text-xs text-gray-500">
                    <RiUserLine size={15} className="mt-0.5 shrink-0" />

                    <span>
                        {employee?.fullName ?? i18nT("orderDetails.noAssignee")}
                    </span>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
                <StatusBadge status={order.status} />

                <div className="flex items-center gap-2">
                    {order.hasPhoto && <RiCameraLine size={16} className="text-gray-400" />}

                    {isOverdue ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                            <RiTimeLine size={14} />
                            +{order.overdueMinutes}{i18nT("orderCard.minutes")}</span> : <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <RiTimeLine size={14} />
                            {new Date(order.deadline).toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit"
          })}
                        </span>}
                </div>
            </div>
        </article>;
}
