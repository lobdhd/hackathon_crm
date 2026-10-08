import { useNavigate } from "react-router-dom";
import { RiArrowRightSLine, RiTimeLine } from "react-icons/ri";
import PriorityBadge from "../common/PriorityBadge";
import StatusBadge from "../common/StatusBadge";
import { t as i18nT, useI18n } from "../../i18n/index.js";
export default function OrdersTable({
  orders,
  areas,
  equipment,
  employees
}) {
  useI18n();
  const navigate = useNavigate();
  return <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left">
                    <thead className="border-b border-gray-200 bg-gray-50">
                        <tr className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            <th className="px-5 py-3.5">{i18nT("ordersTable.order")}</th>
                            <th className="px-5 py-3.5">{i18nT("ordersTable.area")}</th>
                            <th className="px-5 py-3.5">{i18nT("sidebar.equipment")}</th>
                            <th className="px-5 py-3.5">{i18nT("ordersTable.assignee")}</th>
                            <th className="px-5 py-3.5">{i18nT("orderModal.priority")}</th>
                            <th className="px-5 py-3.5">{i18nT("ordersTable.deadline")}</th>
                            <th className="px-5 py-3.5">{i18nT("employeeModal.status")}</th>
                            <th className="w-12 px-3 py-3.5" />
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                        {orders.map(order => {
            const area = areas.find(item => item.id === order.areaId);
            const equipmentItem = equipment.find(item => item.id === order.equipmentId);
            const employee = employees.find(item => item.id === order.employeeId);
            return <tr key={order.id} onClick={() => navigate(`/orders/${order.id}`)} className="cursor-pointer transition hover:bg-gray-50">
                                    <td className="px-5 py-4">
                                        <p className="text-sm font-semibold text-gray-900">
                                            №{order.number}
                                        </p>

                                        <p className="mt-1 max-w-[230px] truncate text-xs text-gray-500">
                                            {order.title}
                                        </p>
                                    </td>

                                    <td className="px-5 py-4 text-sm text-gray-700">
                                        {area?.name}
                                    </td>

                                    <td className="px-5 py-4">
                                        <p className="text-sm font-medium text-gray-800">
                                            {equipmentItem?.name}
                                        </p>

                                        <p className="mt-1 text-xs text-gray-400">
                                            {equipmentItem?.inventoryNumber}
                                        </p>
                                    </td>

                                    <td className="px-5 py-4">
                                        <p className="text-sm font-medium text-gray-800">
                                            {employee?.fullName}
                                        </p>

                                        <p className="mt-1 text-xs text-gray-400">
                                            {employee?.specialty}
                                        </p>
                                    </td>

                                    <td className="px-5 py-4">
                                        <PriorityBadge priority={order.priority} />
                                    </td>

                                    <td className="px-5 py-4">
                                        {order.overdueMinutes > 0 ? <span className="inline-flex items-center gap-1 text-sm font-semibold text-red-600">
                                                <RiTimeLine />
                                                +{order.overdueMinutes}{i18nT("orderCard.minutes")}</span> : <span className="text-sm text-gray-700">
                                                {new Date(order.deadline).toLocaleTimeString("ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                                            </span>}
                                    </td>

                                    <td className="px-5 py-4">
                                        <StatusBadge status={order.status} />
                                    </td>

                                    <td className="px-3 py-4">
                                        <RiArrowRightSLine size={19} className="text-gray-300" />
                                    </td>
                                </tr>;
          })}
                    </tbody>
                </table>
            </div>

            {orders.length === 0 && <div className="py-16 text-center">
                    <p className="text-sm font-medium text-gray-700">{i18nT("ordersTable.empty")}</p>

                    <p className="mt-1 text-xs text-gray-400">{i18nT("ordersTable.filterHint")}</p>
                </div>}
        </div>;
}
