import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  RiArrowLeftLine, RiBriefcaseLine, RiCalendarCheckLine, RiFileList3Line,
  RiHistoryLine, RiLoader4Line, RiMedalLine, RiRefreshLine,
  RiStackLine, RiTimeLine, RiToolsLine, RiUserLine,
} from "react-icons/ri";
import EmployeeStatus from "../../../components/employees/EmployeeStatus.jsx";
import StatusBadge from "../../../components/common/StatusBadge.jsx";
import PriorityBadge from "../../../components/common/PriorityBadge.jsx";
import SmartTable from "../../../react-components/SmartTable/SmartTable.jsx";
import { useExecutors } from "../../../hooks/useReferences.js";
import { useWorkOrders } from "../../../hooks/useWorkOrders.js";
import { t as i18nT, useI18n } from "../../../i18n/index.js";
import "./EmployeeDetails.css";

const TERMINAL_STATUSES = new Set(["CLOSED", "REJECTED", "CANCELLED"]);
const STATUS_LABELS = {
  AVAILABLE: "Свободен", BUSY: "В работе", QUEUED: "Есть очередь", OFF_SHIFT: "Не на смене",
};
const initials = name => String(name || "?").trim().split(/\s+/).slice(0, 2).map(item => item[0]).join("").toUpperCase();

function isOverdue(order) {
  if (!order?.deadline || TERMINAL_STATUSES.has(order.status)) return false;
  const deadline = new Date(order.deadline).getTime();
  return Number.isFinite(deadline) && deadline < Date.now();
}
function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  }) : "—";
}
function SummaryCard({ label, value, icon: Icon, tone }) {
  return (
    <div className={`ed-summary-card ed-summary-card--${tone}`}>
      <div className="ed-summary-card__top"><span>{label}</span><span><Icon size={19} /></span></div>
      <strong>{value}</strong>
      <div className="ed-summary-card__line" />
    </div>
  );
}
function Panel({ title, description, icon: Icon, children }) {
  return (
    <section className="ed-panel">
      <div className="ed-panel__head">
        <span className="ed-panel__icon"><Icon size={19} /></span>
        <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
      </div>
      <div className="ed-panel__body">{children}</div>
    </section>
  );
}
function OrderRow({ order }) {
    useI18n();
  const navigate = useNavigate();
  return (
    <button type="button" className="ed-order" onClick={() => navigate(`/orders/${order.id}`)}>
      <div className="ed-order__main">
        <div className="ed-order__top">
          <strong>{order.number || `#${order.id}`}</strong>
          <PriorityBadge priority={order.priority} />
          <StatusBadge status={order.status} />
        </div>
        <p title={order.description || ""}>{order.description || i18nT("pages.dashboard.dashboard.c6b09af")}</p>
        <small>{order.area?.name || i18nT("components.equipment.equipmentcard.21c6437")} · {order.equipment?.name || i18nT("components.orders.ordercard.30684a9")}</small>
      </div>
      <span className={isOverdue(order) ? "ed-order__date ed-order__date--overdue" : "ed-order__date"}>
        {isOverdue(order) ? i18nT("pages.assistant.assistant.assistant.0a04820") : `Срок: ${formatDate(order.deadline)}`}
      </span>
    </button>
  );
}
function InfoRow({ label, children }) {
  return <div className="ed-info-row"><span>{label}</span><strong>{children ?? "—"}</strong></div>;
}
function HistoryTable({ orders }) {
    const __i18nLocaleToken = i18nT("sidebar.home");
  useI18n();
  const localeToken = i18nT("sidebar.home");
  const navigate = useNavigate();
  const columns = useMemo(() => [
    {
      field: "number", header: i18nT("pages.employees.employeedetails.employeedetails.5072957"), minWidth: 195,
      render: order => (
        <div className="ed-table-order">
          <Link to={`/orders/${order.id}`}>{order.number || `#${order.id}`}</Link>
          <small title={order.description || ""}>{order.description || i18nT("pages.dashboard.dashboard.c6b09af")}</small>
        </div>
      ),
    },
    {
      key: "equipment", header: i18nT("quickOrder.equipment"), minWidth: 185,
      sortField: "equipmentName", sortValue: order => order.equipment?.name || "",
      render: order => (
        <div className="ed-table-order"><strong>{order.equipment?.name || "—"}</strong><small>{order.equipment?.inventoryNumber || ""}</small></div>
      ),
    },
    {
      field: "priority", header: i18nT("pages.employees.employeedetails.employeedetails.a0f9f1a"), minWidth: 135,
      sortValue: order => ({ EMERGENCY: 4, HIGH: 3, NORMAL: 2, PLANNED: 1 })[order.priority] ?? 0,
      render: order => <PriorityBadge priority={order.priority} />,
    },
    { field: "status", header: i18nT("employeeModal.status"), minWidth: 150, render: order => <StatusBadge status={order.status} /> },
    {
      field: "deadline", header: i18nT("pages.employees.employeedetails.employeedetails.bae913f"), minWidth: 150,
      sortValue: order => order.deadline ? new Date(order.deadline).getTime() : null,
      render: order => <span className={isOverdue(order) ? "ed-table-overdue" : ""}>{isOverdue(order) ? i18nT("pages.assistant.assistant.assistant.0a04820") : formatDate(order.deadline)}</span>,
    },
  ], [localeToken, __i18nLocaleToken]);
  return (
    <div className="ed-table-wrap">
      <SmartTable
        data={orders}
        columns={columns}
        dataKey="id"
        mode="sort"
        removableSort
        compact
        stickyHeader
        scrollHeight="min(480px, 55dvh)"
        minWidth={815}
        rowClassName={() => "cursor-pointer"}
        onRowClick={(order, _index, event) => {
          if (event?.target?.closest?.("a, button, input")) return;
          navigate(`/orders/${order.id}`);
        }}
        emptyText={i18nT("pages.employees.employeedetails.employeedetails.3ad3a72")}
      />
    </div>
  );
}
function PageState({ icon: Icon, title, text, action, spin }) {
  return (
    <div className="ed-page p-7">
      <div className="ed-state">
        <span><Icon className={spin ? "ed-spin" : ""} size={26} /></span>
        <h2>{title}</h2>
        <p>{text}</p>
        {action}
      </div>
    </div>
  );
}

export default function EmployeeDetails() {
    const __i18nLocaleToken = i18nT("sidebar.home");
  useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const employeeId = Number(id);
  const validId = Number.isInteger(employeeId) && employeeId > 0;
  const executorsQuery = useExecutors();
  const ordersQuery = useWorkOrders(
    { assigneeId: employeeId, compact: true, limit: 500, offset: 0 },
    { enabled: validId },
  );
  const employees = Array.isArray(executorsQuery.data) ? executorsQuery.data : [];
  const employee = employees.find(item => Number(item.id) === employeeId);
  const employeeOrders = Array.isArray(ordersQuery.data?.items) ? ordersQuery.data.items : [];
  const activeOrders = useMemo(() => employeeOrders.filter(order => !TERMINAL_STATUSES.has(order.status)), [ordersQuery.data, __i18nLocaleToken]);
  const closedOrders = useMemo(() => employeeOrders.filter(order => order.status === "CLOSED"), [ordersQuery.data, __i18nLocaleToken]);
  const overdueOrders = useMemo(() => employeeOrders.filter(isOverdue), [ordersQuery.data, __i18nLocaleToken]);
  const aiReviewOrders = useMemo(() => employeeOrders.filter(order => order.status === "AI_REVIEW"), [ordersQuery.data, __i18nLocaleToken]);
  if (!validId) return <PageState icon={RiUserLine} title={i18nT("pages.employees.employeedetails.employeedetails.cf2e5f0")} text="Проверьте ссылку на карточку" action={<button className="ed-btn ed-btn--primary" onClick={() => navigate("/employees")}>{i18nT("pages.employees.employeedetails.employeedetails.ec41a8b")}</button>} />;
  if (executorsQuery.isLoading && !executorsQuery.data) return <PageState icon={RiLoader4Line} spin title={i18nT("pages.employees.employeedetails.employeedetails.d9d691b")} text="Получаем актуальные данные" />;
  if (executorsQuery.isError && !executorsQuery.data) return <PageState icon={RiUserLine} title={i18nT("pages.employees.employeedetails.employeedetails.723df7a")} text={executorsQuery.error?.message || "Попробуйте ещё раз"} action={<button className="ed-btn ed-btn--primary" onClick={() => executorsQuery.refetch()}><RiRefreshLine /> {i18nT("components.layout.appnavbar.b914bbb")}</button>} />;
  if (!employee) return <PageState icon={RiUserLine} title={i18nT("pages.employees.employeedetails.employeedetails.fa43d7a")} text="Возможно, сотрудник был удалён из справочника" action={<button className="ed-btn ed-btn--primary" onClick={() => navigate("/employees")}>{i18nT("pages.employees.employeedetails.employeedetails.d38adcb")}</button>} />;
  return (
    <div className="ed-page mx-auto max-w-[1800px] p-7">
      <Link className="ed-back" to="/employees"><RiArrowLeftLine size={17} /> {i18nT("employeeDetails.allEmployees")}</Link>
      <header className="ed-profile">
        <div className="ed-profile__identity">
          <div className="ed-profile__avatar">{initials(employee.fullName)}</div>
          <div className="ed-profile__name">
            <div className="ed-profile__eyebrow">{i18nT("pages.employees.employeedetails.employeedetails.bbf3722")}</div>
            <div className="ed-profile__heading"><h1>{employee.fullName}</h1><EmployeeStatus status={employee.employeeStatus} /></div>
            <div className="ed-profile__sub">
              <span><RiBriefcaseLine size={16} />{employee.specialty || i18nT("components.employees.employeecard.2a2d667")}</span>
              {employee.grade != null && <span><RiMedalLine size={16} />{employee.grade} {i18nT("pages.employees.employeedetails.employeedetails.a375226")}</span>}
            </div>
          </div>
        </div>
        <div className={employee.isOnShift ? "ed-duty ed-duty--on" : "ed-duty"}>
          <RiTimeLine size={20} />
          <div><small>{i18nT("pages.employees.employeedetails.employeedetails.f7cd4fa")}</small><strong>{employee.isOnShift ? i18nT("pages.admin.admin.admin.958b816") : i18nT("employeeModal.offShift")}</strong></div>
        </div>
      </header>
      <div className="ed-summary">
        <SummaryCard label={i18nT("pages.employees.employeedetails.employeedetails.b348229")} value={employeeOrders.length} icon={RiFileList3Line} tone="blue" />
        <SummaryCard label={i18nT("pages.employees.employeedetails.employeedetails.c83f7ab")} value={activeOrders.length} icon={RiTimeLine} tone="orange" />
        <SummaryCard label={i18nT("pages.employees.employeedetails.employeedetails.da81bb8")} value={closedOrders.length} icon={RiCalendarCheckLine} tone="green" />
        <SummaryCard label={i18nT("pages.orders.orders.orders.97a53e1")} value={overdueOrders.length} icon={RiMedalLine} tone={overdueOrders.length ? "red" : "slate"} />
      </div>
      <div className="ed-layout">
        <div className="ed-main">
          <Panel title={i18nT("employeeDetails.currentOrders")} description={i18nT("pages.employees.employeedetails.employeedetails.70633c5")} icon={RiToolsLine}>
            {ordersQuery.isLoading && !ordersQuery.data ? (
              <div className="ed-inline-loading"><RiLoader4Line className="ed-spin" /> {i18nT("pages.employees.employeedetails.employeedetails.c63dba0")}</div>
            ) : ordersQuery.isError && !ordersQuery.data ? (
              <div className="ed-inline-error">{ordersQuery.error?.message || i18nT("pages.orders.orders.orders.ac0c6fb")}<button onClick={() => ordersQuery.refetch()} type="button">{i18nT("components.layout.appnavbar.b914bbb")}</button></div>
            ) : activeOrders.length ? (
              <div className="ed-active-orders">{activeOrders.map(order => <OrderRow key={order.id} order={order} />)}</div>
            ) : <div className="ed-empty">{i18nT("pages.employees.employeedetails.employeedetails.838faf7")}</div>}
          </Panel>
          <Panel title={i18nT("employeeDetails.workHistory")} description={i18nT("pages.employees.employeedetails.employeedetails.e890fe5")} icon={RiHistoryLine}>
            {ordersQuery.isLoading && !ordersQuery.data ? (
              <div className="ed-inline-loading"><RiLoader4Line className="ed-spin" /> {i18nT("pages.employees.employeedetails.employeedetails.3ad8855")}</div>
            ) : ordersQuery.isError && !ordersQuery.data ? (
              <div className="ed-inline-error">{ordersQuery.error?.message || i18nT("pages.integrations.onec.onec.e0e3af6")}</div>
            ) : employeeOrders.length ? <HistoryTable orders={employeeOrders} /> : <div className="ed-empty">{i18nT("pages.employees.employeedetails.employeedetails.7ac2d7a")}</div>}
          </Panel>
        </div>
        <aside className="ed-aside">
          <Panel title={i18nT("pages.employees.employeedetails.employeedetails.be6315c")} description={i18nT("pages.employees.employeedetails.employeedetails.405e724")} icon={RiStackLine}>
            <div className="ed-load-status"><span>{i18nT("employeeModal.status")}</span><EmployeeStatus status={employee.employeeStatus} /></div>
            <div className="ed-load-grid">
              <div><span>{i18nT("pages.employees.employeedetails.employeedetails.424b82c")}</span><strong>{activeOrders.length}</strong></div>
              <div><span>{i18nT("pages.employees.employeedetails.employeedetails.2d63a75")}</span><strong>{aiReviewOrders.length}</strong></div>
            </div>
          </Panel>
          <Panel title={i18nT("pages.orders.orderdetails.orderdetails.a7fd9be")} description={i18nT("employeeDetails.data")} icon={RiUserLine}>
            <InfoRow label={i18nT("components.employees.createemployeemodal.500aacb")}>{employee.specialty || "—"}</InfoRow>
            <InfoRow label={i18nT("employeeModal.grade")}>{employee.grade != null ? `${employee.grade} разряд` : "—"}</InfoRow>
            <InfoRow label={i18nT("reportModal.shift")}>{employee.isOnShift ? i18nT("pages.admin.admin.admin.958b816") : i18nT("employeeModal.offShift")}</InfoRow>
            <InfoRow label={i18nT("employeeModal.status")}>{STATUS_LABELS[employee.employeeStatus] || employee.employeeStatus || "—"}</InfoRow>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
