import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  RiAddLine, RiAlarmWarningLine, RiArrowLeftLine, RiArrowRightUpLine,
  RiCheckboxCircleLine, RiFileList3Line, RiHistoryLine,
  RiInformationLine, RiMapPinLine, RiQrCodeLine, RiRefreshLine,
  RiShieldCheckLine, RiStarLine, RiTimeLine, RiToolsLine, RiLoader4Line,
} from "react-icons/ri";
import { downloadEquipmentQr } from "../../../api/equipment.api.js";
import { useEquipmentHistory } from "../../../hooks/useEquipment.js";
import SmartTable from "../../../react-components/SmartTable/SmartTable.jsx";
import { useAuth } from "../../../auth/AuthProvider.jsx";
import { isOrderStaff } from "../../../auth/roles.js";
import { useI18n } from "../../../i18n/index.js";
import "./EquipmentDetails.css";

const ACTIVE_STATUSES = new Set(["ISSUED", "ACCEPTED", "QUEUED", "IN_PROGRESS", "PAUSED", "REWORK"]);
const STATUS_LABELS = {
  ISSUED: "Выдан", QUEUED: "В очереди", ACCEPTED: "Принят", IN_PROGRESS: "В работе",
  PAUSED: "Приостановлен", COMPLETED: "Выполнен", AI_REVIEW: "На проверке",
  REWORK: "На доработке", CLOSED: "Закрыт", REJECTED: "Отклонён", CANCELLED: "Отменён",
};
const PRIORITY_LABELS = { EMERGENCY: "Аварийный", HIGH: "Высокий", NORMAL: "Обычный", PLANNED: "Плановый" };
const CRITICALITY = { 1: "Низкая", 2: "Ниже средней", 3: "Средняя", 4: "Высокая", 5: "Критическая" };
const asArray = (value) => Array.isArray(value) ? value : [];
const extractError = (error) => error?.response?.data?.error || error?.message || "Не удалось выполнить запрос";
const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};
const formatMinutes = (minutes) => {
  const value = Math.max(0, Math.floor(Number(minutes) || 0));
  if (value < 60) return `${value} мин`;
  const hours = Math.floor(value / 60);
  return value % 60 ? `${hours} ч ${value % 60} мин` : `${hours} ч`;
};
const getDowntimeMinutes = (order) => {
  if (Array.isArray(order?.downtime)) return order.downtime.reduce((sum, part) => sum + (Number(part?.minutes) || 0), 0);
  if (order?.downtime && typeof order.downtime === "object") return Number(order.downtime.minutes) || 0;
  return Number(order?.actualDowntimeMinutes) || 0;
};
const getOrderScore = (order) => order?.aiAssessment?.masterScore ?? order?.aiAssessment?.score ?? null;

function SeverityBadge({ value }) {
  const level = Number(value) || 0;
  return <span className={`eqd-badge eqd-badge--severity-${level || 1}`}><span className="eqd-badge__dot" />{CRITICALITY[level] || "Не указана"} · {level || "—"}/5</span>;
}
function StatusBadge({ value }) {
  const tone = value === "CLOSED" || value === "COMPLETED" ? "success" : value === "REJECTED" || value === "CANCELLED" ? "danger" : value === "PAUSED" || value === "REWORK" ? "warning" : "blue";
  return <span className={`eqd-badge eqd-badge--${tone}`}>{STATUS_LABELS[value] || value || "—"}</span>;
}
function PriorityBadge({ value }) {
  return <span className={`eqd-badge eqd-badge--${value === "EMERGENCY" ? "danger" : value === "HIGH" ? "warning" : "neutral"}`}>{PRIORITY_LABELS[value] || value || "—"}</span>;
}
function Section({ title, description, icon: Icon, children, actions, className = "" }) {
  return (
    <section className={`eqd-panel ${className}`}>
      <div className="eqd-panel__head">
        <span className="eqd-panel__icon"><Icon size={19} /></span>
        <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
        {actions && <div className="eqd-panel__actions">{actions}</div>}
      </div>
      <div className="eqd-panel__body">{children}</div>
    </section>
  );
}
function KpiCard({ title, value, description, icon: Icon, tone = "blue" }) {
  return (
    <div className={`eqd-kpi eqd-kpi--${tone}`}>
      <div className="eqd-kpi__top"><span>{title}</span><span className="eqd-kpi__icon"><Icon size={19} /></span></div>
      <strong>{value}</strong>
      <small>{description}</small>
    </div>
  );
}
function InfoRow({ label, value, mono = false }) {
  return <div className="eqd-info-row"><span>{label}</span><strong className={mono ? "eqd-mono" : ""} title={String(value ?? "")}>{value === null || value === undefined || value === "" ? "—" : value}</strong></div>;
}
function OrderCard({ order }) {
  return (
    <Link className="eqd-order" to={`/orders/${order.id}`}>
      <div className="eqd-order__main">
        <div className="eqd-order__heading">
          <strong>{order.number || `#${order.id}`}</strong>
          <PriorityBadge value={order.priority} />
          <StatusBadge value={order.status} />
        </div>
        <p>{order.description || "Описание наряда отсутствует"}</p>
      </div>
      <div className="eqd-order__end"><span>{formatDate(order.deadline)}</span><RiArrowRightUpLine size={19} /></div>
    </Link>
  );
}
function HistoryTable({ orders }) {
  useI18n();
  const navigate = useNavigate();
  const columns = useMemo(() => [
    {
      field: "number", header: "Наряд", minWidth: 215,
      render: (order) => <div className="eqd-order-cell"><Link to={`/orders/${order.id}`}>{order.number || `#${order.id}`}</Link><small title={order.description || ""}>{order.description || "Без описания"}</small></div>,
    },
    {
      key: "faultCode", header: "Шифр неисправности", minWidth: 150, sortField: "faultCode",
      sortValue: (order) => order.faultCode?.code || "",
      render: (order) => <span>{order.faultCode?.code || "—"}</span>,
    },
    {
      field: "priority", header: "Приоритет", minWidth: 135,
      sortValue: (order) => ({ EMERGENCY: 4, HIGH: 3, NORMAL: 2, PLANNED: 1 })[order.priority] ?? 0,
      render: (order) => <PriorityBadge value={order.priority} />,
    },
    { field: "status", header: "Статус", minWidth: 155, render: (order) => <StatusBadge value={order.status} /> },
    {
      key: "aiScore", header: "AI-оценка", minWidth: 95, sortField: "aiScore",
      sortValue: (order) => getOrderScore(order) == null ? null : Number(getOrderScore(order)),
      render: (order) => <strong>{getOrderScore(order) ?? "—"}</strong>,
    },
    {
      key: "downtime", header: "Простой", minWidth: 135, sortField: "downtime",
      sortValue: getDowntimeMinutes, render: (order) => <span>{formatMinutes(getDowntimeMinutes(order))}</span>,
    },
    {
      key: "materials", header: "Материалов", minWidth: 110, sortField: "materials",
      sortValue: (order) => asArray(order.materialUsages).length,
      render: (order) => <span>{asArray(order.materialUsages).length}</span>,
    },
  ], []);
  return (
    <div className="eqd-history-table">
      <SmartTable
        className="eqd-smart-table"
        data={orders}
        columns={columns}
        dataKey="id"
        mode="sort"
        removableSort
        compact
        stickyHeader
        scrollHeight="min(480px, 55dvh)"
        minWidth={1050}
        rowClassName={() => "cursor-pointer"}
        onRowClick={(order, _index, event) => {
          if (event?.target?.closest?.("a, button, input, select, textarea")) return;
          navigate(`/orders/${order.id}`);
        }}
        emptyText="История нарядов пуста"
      />
    </div>
  );
}

export default function EquipmentDetails() {
  useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreateOrder = isOrderStaff(user?.role);
  const query = useEquipmentHistory(id);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState("");
  const equipment = query.data;
  const orders = useMemo(() => asArray(equipment?.orders), [equipment?.orders]);
  const activeOrders = useMemo(() => orders.filter((order) => ACTIVE_STATUSES.has(order.status)), [orders]);
  const emergencyOrders = useMemo(() => orders.filter((order) => order.type === "EMERGENCY" || order.priority === "EMERGENCY"), [orders]);
  const downtimeMinutes = useMemo(() => orders.reduce((sum, order) => sum + getDowntimeMinutes(order), 0), [orders]);
  const scores = useMemo(() => orders.map(getOrderScore).filter((value) => value != null && Number.isFinite(Number(value))).map(Number), [orders]);
  const averageScore = scores.length ? (scores.reduce((sum, value) => sum + value, 0) / scores.length).toLocaleString("ru-RU", { maximumFractionDigits: 1 }) : "—";
  async function downloadQr() {
    if (!equipment?.id) return;
    setQrError("");
    setQrLoading(true);
    let objectUrl;
    try {
      const blob = await downloadEquipmentQr(equipment.id);
      objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `equipment-${equipment.inventoryNumber || equipment.id}-qr.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (error) {
      setQrError(extractError(error));
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setQrLoading(false);
    }
  }
  if (query.isLoading && !query.data) {
    return <div className="eqd mx-auto max-w-[1800px] p-7"><div className="eqd-loading"><RiLoader4Line className="eqd-spin" size={30} /><span>Загружаем оборудование...</span></div></div>;
  }
  if (query.isError && !query.data) {
    return (
      <div className="eqd mx-auto max-w-[1800px] p-7">
        <div className="eqd-error"><RiAlarmWarningLine size={31} /><h2>Не удалось загрузить оборудование</h2><p>{extractError(query.error)}</p><button type="button" className="eqd-button eqd-button--primary" onClick={() => query.refetch()}><RiRefreshLine /> Повторить</button></div>
      </div>
    );
  }
  if (!equipment) {
    return <div className="eqd mx-auto max-w-[1800px] p-7"><div className="eqd-error"><RiToolsLine size={32} /><h2>Оборудование не найдено</h2><button type="button" className="eqd-button eqd-button--primary" onClick={() => navigate("/equipment")}>К списку оборудования</button></div></div>;
  }
  return (
    <div className="eqd mx-auto max-w-[1800px] p-7">
      <Link to="/equipment" className="eqd-back"><RiArrowLeftLine size={18} /> К списку оборудования</Link>
      {qrError && <div className="eqd-alert"><RiAlarmWarningLine size={18} />{qrError}</div>}
      {query.isError && <div className="eqd-alert"><RiAlarmWarningLine size={18} />{extractError(query.error)} <button type="button" onClick={() => query.refetch()}>Обновить</button></div>}
      <section className="eqd-hero">
        <div className="eqd-hero__info">
          <span className="eqd-hero__icon"><RiToolsLine size={28} /></span>
          <div className="eqd-hero__content">
            <div className="eqd-eyebrow">КАРТОЧКА ОБОРУДОВАНИЯ</div>
            <div className="eqd-hero__title"><h1>{equipment.name}</h1><SeverityBadge value={equipment.criticality} /></div>
            <p>{equipment.inventoryNumber || "Нет инвентарного номера"} <span>·</span> {equipment.type || "Тип не указан"}</p>
            <div className="eqd-hero__location"><RiMapPinLine size={16} />{equipment.area?.name || "Участок не указан"}</div>
          </div>
        </div>
        <div className="eqd-hero__actions">
          {canCreateOrder && (
            <button type="button" className="eqd-button eqd-button--primary" onClick={() => navigate(`/orders?create=1&equipmentId=${equipment.id}`)}><RiAddLine size={18} /> Создать наряд</button>
          )}
          <button type="button" className="eqd-button eqd-button--outline" onClick={downloadQr} disabled={qrLoading}>
            {qrLoading ? <RiLoader4Line className="eqd-spin" size={18} /> : <RiQrCodeLine size={18} />}
            {qrLoading ? "Скачивание..." : "Скачать QR"}
          </button>
        </div>
      </section>
      <div className="eqd-kpis">
        <KpiCard title="Активных нарядов" value={activeOrders.length} description="Ещё не закрыты" icon={RiFileList3Line} />
        <KpiCard title="Аварийных работ" value={emergencyOrders.length} description="За всю историю" icon={RiAlarmWarningLine} tone="red" />
        <KpiCard title="Суммарный простой" value={formatMinutes(downtimeMinutes)} description="По истории нарядов" icon={RiTimeLine} tone="amber" />
        <KpiCard title="Средняя AI-оценка" value={averageScore} description={`${scores.length} работ с оценкой`} icon={RiStarLine} tone="sky" />
      </div>
      <div className="eqd-layout">
        <main className="eqd-main">
          <Section title="Активные наряды" description="Текущие работы по этому оборудованию" icon={RiFileList3Line}>
            {activeOrders.length ? <div className="eqd-orders">{activeOrders.map((order) => <OrderCard key={order.id} order={order} />)}</div> : (
              <div className="eqd-empty"><RiCheckboxCircleLine size={27} /><strong>Активных нарядов нет</strong><span>Для этого оборудования сейчас нет незакрытых работ</span></div>
            )}
          </Section>
          <Section title="История работ" description={`Всего нарядов: ${orders.length}`} icon={RiHistoryLine} className="eqd-panel--history">
            {orders.length ? <HistoryTable orders={orders} /> : <div className="eqd-empty"><RiHistoryLine size={27} /><strong>История пока пуста</strong><span>Здесь появятся наряды, связанные с оборудованием</span></div>}
          </Section>
        </main>
        <aside className="eqd-aside">
          <Section title="Характеристики" description="Основные данные оборудования" icon={RiInformationLine}>
            <div className="eqd-info-list">
              <InfoRow label="ID" value={equipment.id} />
              <InfoRow label="Инвентарный номер" value={equipment.inventoryNumber} />
              <InfoRow label="Тип" value={equipment.type} />
              <InfoRow label="Критичность" value={`${equipment.criticality ?? "—"}/5 · ${CRITICALITY[Number(equipment.criticality)] || "Не указана"}`} />
              <InfoRow label="QR token" value={equipment.qrToken} mono />
            </div>
          </Section>
          <Section title="Расположение" description="Привязка к участку" icon={RiMapPinLine}>
            <div className="eqd-area"><span><RiMapPinLine size={20} /></span><div><strong>{equipment.area?.name || "Участок не указан"}</strong><small>Производственный участок</small></div></div>
          </Section>
          <Section title="Качество работ" description="По оценённым нарядам" icon={RiShieldCheckLine}>
            <div className="eqd-quality"><div><small>Работ с AI-оценкой</small><strong>{scores.length}</strong></div><div><small>Средняя оценка</small><strong>{averageScore}</strong></div></div>
          </Section>
        </aside>
      </div>
    </div>
  );
}
