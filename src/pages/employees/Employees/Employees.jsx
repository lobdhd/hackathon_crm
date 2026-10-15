import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  RiArrowRightUpLine, RiCloseLine, RiFilter3Line, RiLayoutGridLine,
  RiListCheck2, RiLoader4Line, RiRefreshLine, RiSearchLine,
  RiTeamLine, RiUserAddLine, RiUserFollowLine, RiUserUnfollowLine,
} from "react-icons/ri";
import SmartTable from "../../../react-components/SmartTable/SmartTable.jsx";
import GlideSelect from "../../../react-components/GlideSelect/GlideSelect.jsx";
import RubberSegment from "../../../react-components/RubberSegment/RubberSegment.jsx";
import CreateEmployeeModal from "../../../components/employees/CreateEmployeeModal.jsx";
import { useAuth } from "../../../auth/AuthProvider.jsx";
import { useBrigades, useExecutors } from "../../../hooks/useReferences.js";
import { useCreateAdminUser } from "../../../hooks/useAdmin.js";
import { t as i18nT, useI18n } from "../../../i18n/index.js";
import "./Employees.css";

const STATUS_LABELS = {
  AVAILABLE: "Свободен", BUSY: "В работе", QUEUED: "Есть очередь", OFF_SHIFT: "Не на смене",
};
const STATUS_OPTIONS = [
  { value: "", label: "Все статусы" },
  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
];
const SHIFT_OPTIONS = [
  { value: "", label: "Все смены" },
  { value: "ON", label: "На смене" },
  { value: "OFF", label: "Не на смене" },
];
const VIEW_OPTIONS = [
  { value: "cards", label: "Карточки" },
  { value: "table", label: "Таблица" },
];
const getInitials = (name) => String(name || "?").trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();

function StatusChip({ status }) {
  return <span className={`emp-status emp-status--${String(status || "unknown").toLowerCase()}`}><span className="emp-status__dot" />{STATUS_LABELS[status] || status || "Не указан"}</span>;
}

function StatCard({ title, value, note, icon: Icon, tone }) {
  return (
    <div className={`emp-stat emp-stat--${tone}`}>
      <div className="emp-stat__top">
        <span>{title}</span>
        <span className="emp-stat__icon"><Icon size={20} /></span>
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function EmployeeTile({ employee }) {
  const count = employee._count?.assignedOrders ?? 0;
  return (
    <Link to={`/employees/${employee.id}`} className="emp-tile">
      <div className="emp-tile__head">
        <span className="emp-tile__avatar">{getInitials(employee.fullName)}</span>
        <StatusChip status={employee.employeeStatus} />
      </div>
      <div className="emp-tile__name" title={employee.fullName}>{employee.fullName}</div>
      <div className="emp-tile__specialty" title={employee.specialty || ""}>{employee.specialty || "Специальность не указана"}</div>
      <div className="emp-tile__details">
        <div><span>Разряд</span><strong>{employee.grade ?? "—"}</strong></div>
        <div><span>Назначено нарядов</span><strong>{count}</strong></div>
      </div>
      <div className="emp-tile__footer">
        <span className={employee.isOnShift ? "emp-shift emp-shift--on" : "emp-shift"}>
          <span />{employee.isOnShift ? "На смене" : "Не на смене"}
        </span>
        <span className="emp-tile__link">Профиль <RiArrowRightUpLine size={16} /></span>
      </div>
    </Link>
  );
}

function PageState({ loading, message, onRetry }) {
  return (
    <div className="emp-page p-7">
      <div className="emp-state">
        <span className="emp-state__icon">{loading ? <RiLoader4Line className="emp-spin" /> : <RiTeamLine />}</span>
        <h2>{loading ? "Загружаем исполнителей" : "Не удалось загрузить исполнителей"}</h2>
        <p>{message}</p>
        {onRetry && <button className="emp-btn emp-btn--primary" type="button" onClick={onRetry}><RiRefreshLine /> Повторить</button>}
      </div>
    </div>
  );
}

export default function Employees() {
  useI18n();
  const localeToken = i18nT("sidebar.home");
  const navigate = useNavigate();
  const { role } = useAuth();
  const [view, setView] = useState("cards");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [filters, setFilters] = useState({ search: "", specialty: "", status: "", shift: "" });
  const executorsQuery = useExecutors();
  const brigadesQuery = useBrigades();
  const createUser = useCreateAdminUser();
  const employees = Array.isArray(executorsQuery.data) ? executorsQuery.data : [];
  const brigades = Array.isArray(brigadesQuery.data) ? brigadesQuery.data : [];
  const isAdmin = role === "ADMIN";
  const updateFilter = (key, value) => setFilters(current => ({ ...current, [key]: value }));
  const resetFilters = () => setFilters({ search: "", specialty: "", status: "", shift: "" });
  const specialtyOptions = useMemo(() => [
    { value: "", label: "Все специальности" },
    ...[...new Set(employees.map(item => item.specialty).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "ru"))
      .map(value => ({ value, label: value })),
  ], [executorsQuery.data, localeToken]);
  const filteredEmployees = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return employees.filter(employee => {
      const searchable = [employee.fullName, employee.specialty, employee.grade].some(value =>
        String(value ?? "").toLowerCase().includes(search)
      );
      return (!search || searchable) &&
        (!filters.specialty || employee.specialty === filters.specialty) &&
        (!filters.status || employee.employeeStatus === filters.status) &&
        (!filters.shift || employee.isOnShift === (filters.shift === "ON"));
    });
  }, [executorsQuery.data, filters]);
  const stats = useMemo(() => ({
    total: employees.length,
    free: employees.filter(e => e.employeeStatus === "AVAILABLE").length,
    busy: employees.filter(e => ["BUSY", "QUEUED"].includes(e.employeeStatus)).length,
    offShift: employees.filter(e => e.employeeStatus === "OFF_SHIFT").length,
  }), [executorsQuery.data]);
  const activeFilters = [filters.specialty, filters.status, filters.shift].filter(Boolean).length;
  const columns = useMemo(() => [
    {
      field: "fullName", header: "Исполнитель", minWidth: 255,
      render: employee => (
        <div className="emp-table-person">
          <span className="emp-table-avatar">{getInitials(employee.fullName)}</span>
          <span><strong>{employee.fullName}</strong><small>{employee.specialty || "Специальность не указана"}</small></span>
        </div>
      ),
    },
    { field: "specialty", header: "Специальность", minWidth: 190, render: employee => employee.specialty || "—" },
    { field: "grade", header: "Разряд", minWidth: 100, render: employee => employee.grade ?? "—" },
    { field: "employeeStatus", header: "Статус", minWidth: 150, render: employee => <StatusChip status={employee.employeeStatus} /> },
    {
      field: "isOnShift", header: "Смена", minWidth: 135,
      sortValue: employee => employee.isOnShift ? 1 : 0,
      render: employee => <span className={employee.isOnShift ? "emp-shift emp-shift--on" : "emp-shift"}><span />{employee.isOnShift ? "На смене" : "Не на смене"}</span>,
    },
    {
      key: "assignedOrders", header: "Назначено нарядов", minWidth: 155,
      sortField: "assignedOrders", sortValue: employee => Number(employee._count?.assignedOrders ?? 0),
      render: employee => <strong className="emp-table-count">{employee._count?.assignedOrders ?? 0}</strong>,
    },
  ], [localeToken]);
  if (executorsQuery.isLoading && !executorsQuery.data) return <PageState loading message="Получаем актуальные данные с сервера" />;
  if (executorsQuery.isError && !executorsQuery.data) return <PageState message={executorsQuery.error?.message || "Повторите запрос"} onRetry={() => executorsQuery.refetch()} />;
  return (
    <div className="emp-page mx-auto max-w-[1800px] p-7">
      <header className="emp-header">
        <div>
          <h1>{i18nT("sidebar.employees")}</h1>
          <p>Состав команды, текущая загрузка и назначенные работы</p>
        </div>
        {isAdmin && (
          <button type="button" className="emp-btn emp-btn--primary" onClick={() => setCreateModalOpen(true)}>
            <RiUserAddLine size={18} /> Добавить исполнителя
          </button>
        )}
      </header>
      <div className="emp-stats">
        <StatCard title="Всего исполнителей" value={stats.total} note="В справочнике" icon={RiTeamLine} tone="blue" />
        <StatCard title="Свободны" value={stats.free} note="Готовы к работе" icon={RiUserFollowLine} tone="green" />
        <StatCard title="Заняты" value={stats.busy} note="Работают или в очереди" icon={RiLoader4Line} tone="orange" />
        <StatCard title="Не на смене" value={stats.offShift} note="Сейчас недоступны" icon={RiUserUnfollowLine} tone="gray" />
      </div>
      <section className="emp-panel">
        <div className="emp-panel__heading">
          <div className="emp-panel__title"><span className="emp-panel__icon"><RiFilter3Line size={19} /></span><div><h2>Список исполнителей</h2><p>Поиск и фильтрация сотрудников</p></div></div>
          <div className="emp-view">
            <RubberSegment
              items={VIEW_OPTIONS}
              value={view}
              onChange={setView}
              trackColor="#ffffff"
              thumbColor="#2563eb"
              textColor="#2563eb"
              activeTextColor="#ffffff"
              radius={10}
              size="md"
              equalSlots
              draggable
              aria-label="Вид списка исполнителей"
            />
          </div>
        </div>
        <div className="emp-filters">
          <label className="emp-search">
            <RiSearchLine size={18} />
            <input
              value={filters.search}
              onChange={event => updateFilter("search", event.target.value)}
              placeholder="ФИО, специальность, разряд..."
              aria-label="Поиск исполнителей"
            />
            {filters.search && <button type="button" onClick={() => updateFilter("search", "")} aria-label="Очистить поиск"><RiCloseLine /></button>}
          </label>
          <div className="emp-filter-select"><GlideSelect options={specialtyOptions} value={filters.specialty} onChange={value => updateFilter("specialty", value)} className="glide-select--field" portal searchable ariaLabel="Специальность" /></div>
          <div className="emp-filter-select"><GlideSelect options={STATUS_OPTIONS} value={filters.status} onChange={value => updateFilter("status", value)} className="glide-select--field" portal ariaLabel="Статус" /></div>
          <div className="emp-filter-select"><GlideSelect options={SHIFT_OPTIONS} value={filters.shift} onChange={value => updateFilter("shift", value)} className="glide-select--field" portal ariaLabel="Смена" /></div>
        </div>
        <div className="emp-panel__meta">
          <div><RiFilter3Line size={15} /><span>Найдено: <strong>{filteredEmployees.length}</strong></span>{(activeFilters > 0 || filters.search) && <button type="button" onClick={resetFilters}><RiCloseLine size={14} /> Сбросить</button>}</div>
          {executorsQuery.isFetching && <span className="emp-refresh"><RiRefreshLine size={14} /> Обновление</span>}
        </div>
        {view === "cards" ? (
          <div className="emp-cards-viewport">
            {filteredEmployees.length ? (
              <div className="emp-cards-grid">{filteredEmployees.map(employee => <EmployeeTile key={employee.id} employee={employee} />)}</div>
            ) : <div className="emp-empty"><RiTeamLine size={28} /><strong>Исполнители не найдены</strong><p>Попробуйте изменить фильтры или строку поиска</p></div>}
          </div>
        ) : (
          <div className="emp-table-wrap">
            <SmartTable
              key="employees"
              className="emp-smart-table"
              data={filteredEmployees}
              columns={columns}
              dataKey="id"
              mode="sort"
              stickyHeader
              striped
              compact
              scrollHeight="clamp(380px, calc(100dvh - 430px), 650px)"
              minWidth={1020}
              emptyText="Исполнители не найдены"
              emptyDescription="Попробуйте изменить фильтры"
              rowClassName={() => "cursor-pointer"}
              onRowClick={(employee, _index, event) => {
                if (event?.target?.closest?.("button, a, input, select, textarea")) return;
                navigate(`/employees/${employee.id}`);
              }}
            />
          </div>
        )}
      </section>
      {isAdmin && (
        <CreateEmployeeModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          brigades={brigades}
          onCreate={payload => createUser.mutateAsync(payload)}
        />
      )}
    </div>
  );
}
