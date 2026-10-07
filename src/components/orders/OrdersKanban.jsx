import OrderCard from "./OrderCard";
import { t as i18nT, useI18n } from "../../i18n/index.js";
export default function OrdersKanban({
  orders,
  areas,
  equipment,
  employees
}) {
  useI18n();
  const columns = [{
    id: "ISSUED",
    title: i18nT("kanban.issued"),
    dotClass: "bg-gray-400"
  }, {
    id: "ACCEPTED",
    title: i18nT("aiReview.accepted"),
    dotClass: "bg-cyan-500"
  }, {
    id: "QUEUED",
    title: i18nT("status.queued"),
    dotClass: "bg-blue-500"
  }, {
    id: "IN_PROGRESS",
    title: i18nT("status.inProgress"),
    dotClass: "bg-yellow-500"
  }, {
    id: "COMPLETED",
    title: i18nT("analytics.orders.completed"),
    dotClass: "bg-emerald-500"
  }, {
    id: "OVERDUE",
    title: i18nT("kanban.overdue"),
    dotClass: "bg-red-500"
  }];
  function getOrdersForColumn(columnId) {
    if (columnId === "OVERDUE") {
      return orders.filter(order => order.overdueMinutes > 0 && order.status !== "CLOSED");
    }
    return orders.filter(order => {
      if (order.overdueMinutes > 0) {
        return false;
      }
      return order.status === columnId;
    });
  }
  return <div className="overflow-x-auto pb-3">
            <div className="flex min-w-max gap-4">
                {columns.map(column => {
        const columnOrders = getOrdersForColumn(column.id);
        return <section key={column.id} className="w-[310px] shrink-0 rounded-xl bg-gray-100/70 p-3">
                            <div className="mb-3 flex items-center justify-between px-1">
                                <div className="flex items-center gap-2">
                                    <span className={`h-2 w-2 rounded-full ${column.dotClass}`} />

                                    <h3 className="text-sm font-semibold text-gray-800">
                                        {column.title}
                                    </h3>
                                </div>

                                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-2 text-xs font-semibold text-gray-600 shadow-sm">
                                    {columnOrders.length}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {columnOrders.length === 0 && <div className="rounded-lg border border-dashed border-gray-300 bg-white/60 px-4 py-8 text-center text-xs text-gray-400">{i18nT("kanban.empty")}</div>}

                                {columnOrders.map(order => <OrderCard key={order.id} order={order} area={areas.find(area => area.id === order.areaId)} equipment={equipment.find(item => item.id === order.equipmentId)} employee={employees.find(employee => employee.id === order.employeeId)} />)}
                            </div>
                        </section>;
      })}
            </div>
        </div>;
}
