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
const STATUS_OPTIONS = () => ([
  { value: "", label: i18nT("pages.employees.employees.employees.ac1bbd6") },
  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
]);
const SHIFT_OPTIONS = () => ([
  { value: "", label: i18nT("pages.employees.employees.employees.66a2d3d") },
  { value: "ON", label: i18nT("pages.admin.admin.admin.958b816") },
  { value: "OFF", label: i18nT("employeeModal.offShift") },
]);
const VIEW_OPTIONS = () => ([
  { value: "cards", label: i18nT("pages.employees.employees.employees.152beb3") },
  { value: "table", label: i18nT("pages.employees.employees.employees.0f3bd19") },
]);
const getInitials = (name) => String(name || "?").trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();

function StatusChip({ status }) {
    useI18n();
  return <span className={`emp-status emp-status--${String(status || "unknown").toLowerCase()}`}><span className="emp-status__dot" />{STATUS_LABELS[status] || status || i18nT("components.employees.createemployeemodal.cdded47")}</span>;
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
    useI18n();
  const count = employee._count?.assignedOrders ?? 0;
  return (
    <Link to={`/employees/${employee.id}`} className="emp-tile">
      <div className="emp-tile__head">
        <span className="emp-tile__avatar">{getInitials(employee.fullName)}</span>
        <StatusChip status={employee.employeeStatus} />
      </div>
      <div className="emp-tile__name" title={employee.fullName}>{employee.fullName}</div>
      <div className="emp-tile__specialty" title={employee.specialty || ""}>{employee.specialty || i18nT("components.employees.employeecard.2a2d667")}</div>
      <div className="emp-tile__details">
        <div><span>{i18nT("employeeModal.grade")}</span><strong>{employee.grade ?? "—"}</strong></div>
        <div><span>{i18nT("pages.employees.employees.employees.2a32073")}</span><strong>{count}</strong></div>
      </div>
      <div className="emp-tile__footer">
        <span className={employee.isOnShift ? "emp-shift emp-shift--on" : "emp-shift"}>
          <span />{employee.isOnShift ? i18nT("pages.admin.admin.admin.958b816") : i18nT("employeeModal.offShift")}
        </span>
        <span className="emp-tile__link">{i18nT("pages.employees.employees.employees.a46c372")} <RiArrowRightUpLine size={16} /></span>
      </div>
    </Link>
  );
}

function PageState({ loading, message, onRetry }) {
    useI18n();
  return (
    <div className="emp-page p-7">
      <div className="emp-state">
        <span className="emp-state__icon">{loading ? <RiLoader4Line className="emp-spin" /> : <RiTeamLine />}</span>
        <h2>{loading ? i18nT("pages.employees.employees.employees.1ad9806") : i18nT("pages.employees.employees.employees.c52c210")}</h2>
        <p>{message}</p>
        {onRetry && <button className="emp-btn emp-btn--primary" type="button" onClick={onRetry}><RiRefreshLine /> {i18nT("components.layout.appnavbar.b914bbb")}</button>}
      </div>
    </div>
  );
}

export default function Employees() {
    const __i18nLocaleToken = i18nT("sidebar.home");
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
    { value: "", label: i18nT("pages.employees.employees.employees.a5503eb") },
    ...[...new Set(employees.map(item => item.specialty).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "ru"))
      .map(value => ({ value, label: value })),
  ], [executorsQuery.data, localeToken, __i18nLocaleToken]);
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
  }, [executorsQuery.data, filters, __i18nLocaleToken]);
  const stats = useMemo(() => ({
    total: employees.length,
    free: employees.filter(e => e.employeeStatus === "AVAILABLE").length,
    busy: employees.filter(e => ["BUSY", "QUEUED"].includes(e.employeeStatus)).length,
    offShift: employees.filter(e => e.employeeStatus === "OFF_SHIFT").length,
  }), [executorsQuery.data, __i18nLocaleToken]);
  const activeFilters = [filters.specialty, filters.status, filters.shift].filter(Boolean).length;
  const columns = useMemo(() => [
    {
      field: "fullName", header: i18nT("ordersTable.assignee"), minWidth: 255,
      render: employee => (
        <div className="emp-table-person">
          <span className="emp-table-avatar">{getInitials(employee.fullName)}</span>
          <span><strong>{employee.fullName}</strong><small>{employee.specialty || i18nT("components.employees.employeecard.2a2d667")}</small></span>
        </div>
      ),
    },
    { field: "specialty", header: i18nT("components.employees.createemployeemodal.500aacb"), minWidth: 190, render: employee => employee.specialty || "—" },
    { field: "grade", header: i18nT("employeeModal.grade"), minWidth: 100, render: employee => employee.grade ?? "—" },
    { field: "employeeStatus", header: i18nT("employeeModal.status"), minWidth: 150, render: employee => <StatusChip status={employee.employeeStatus} /> },
    {
      field: "isOnShift", header: i18nT("reportModal.shift"), minWidth: 135,
      sortValue: employee => employee.isOnShift ? 1 : 0,
      render: employee => <span className={employee.isOnShift ? "emp-shift emp-shift--on" : "emp-shift"}><span />{employee.isOnShift ? i18nT("pages.admin.admin.admin.958b816") : i18nT("employeeModal.offShift")}</span>,
    },
    {
      key: "assignedOrders", header: i18nT("pages.employees.employees.employees.2a32073"), minWidth: 155,
      sortField: "assignedOrders", sortValue: employee => Number(employee._count?.assignedOrders ?? 0),
      render: employee => <strong className="emp-table-count">{employee._count?.assignedOrders ?? 0}</strong>,
    },
  ], [localeToken, __i18nLocaleToken]);
  if (executorsQuery.isLoading && !executorsQuery.data) return <PageState loading message="Получаем актуальные данные с сервера" />;
  if (executorsQuery.isError && !executorsQuery.data) return <PageState message={executorsQuery.error?.message || "Повторите запрос"} onRetry={() => executorsQuery.refetch()} />;
  return (
    <div className="emp-page mx-auto max-w-[1800px] p-7">
      <header className="emp-header">
        <div>
          <h1>{i18nT("sidebar.employees")}</h1>
          <p>{i18nT("pages.employees.employees.employees.521ab07")}</p>
        </div>
        {isAdmin && (
          <button type="button" className="emp-btn emp-btn--primary" onClick={() => setCreateModalOpen(true)}>
            <RiUserAddLine size={18} /> {i18nT("components.employees.createemployeemodal.698e3c6")}
          </button>
        )}
      </header>
      <div className="emp-stats">
        <StatCard title={i18nT("pages.employees.employees.employees.87d81f1")} value={stats.total} note="В справочнике" icon={RiTeamLine} tone="blue" />
        <StatCard title={i18nT("pages.analytics.analytics.f3fd6df")} value={stats.free} note="Готовы к работе" icon={RiUserFollowLine} tone="green" />
        <StatCard title={i18nT("pages.analytics.analytics.90fc82e")} value={stats.busy} note="Работают или в очереди" icon={RiLoader4Line} tone="orange" />
        <StatCard title={i18nT("employeeModal.offShift")} value={stats.offShift} note="Сейчас недоступны" icon={RiUserUnfollowLine} tone="gray" />
      </div>
      <section className="emp-panel">
        <div className="emp-panel__heading">
          <div className="emp-panel__title"><span className="emp-panel__icon"><RiFilter3Line size={19} /></span><div><h2>{i18nT("pages.employees.employees.employees.787420f")}</h2><p>{i18nT("pages.employees.employees.employees.c7004f2")}</p></div></div>
          <div className="emp-view">
            <RubberSegment
              items={VIEW_OPTIONS()}
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
              aria-label={i18nT("pages.employees.employees.employees.db816fb")}
            />
          </div>
        </div>
        <div className="emp-filters">
          <label className="emp-search">
            <RiSearchLine size={18} />
            <input
              value={filters.search}
              onChange={event => updateFilter("search", event.target.value)}
              placeholder={i18nT("pages.employees.employees.employees.5490321")}
              aria-label={i18nT("pages.employees.employees.employees.17dc763")}
            />
            {filters.search && <button type="button" onClick={() => updateFilter("search", "")} aria-label={i18nT("pages.employees.employees.employees.30e2d49")}><RiCloseLine /></button>}
          </label>
          <div className="emp-filter-select"><GlideSelect options={specialtyOptions} value={filters.specialty} onChange={value => updateFilter("specialty", value)} className="glide-select--field" portal searchable ariaLabel="Специальность" /></div>
          <div className="emp-filter-select"><GlideSelect options={STATUS_OPTIONS()} value={filters.status} onChange={value => updateFilter("status", value)} className="glide-select--field" portal ariaLabel="Статус" /></div>
          <div className="emp-filter-select"><GlideSelect options={SHIFT_OPTIONS()} value={filters.shift} onChange={value => updateFilter("shift", value)} className="glide-select--field" portal ariaLabel="Смена" /></div>
        </div>
        <div className="emp-panel__meta">
          <div><RiFilter3Line size={15} /><span>{i18nT("employeesPage.found")} <strong>{filteredEmployees.length}</strong></span>{(activeFilters > 0 || filters.search) && <button type="button" onClick={resetFilters}><RiCloseLine size={14} /> {i18nT("pages.employees.employees.employees.02d901c")}</button>}</div>
          {executorsQuery.isFetching && <span className="emp-refresh"><RiRefreshLine size={14} /> {i18nT("pages.employees.employees.employees.06f6e08")}</span>}
        </div>
        {view === "cards" ? (
          <div className="emp-cards-viewport">
            {filteredEmployees.length ? (
              <div className="emp-cards-grid">{filteredEmployees.map(employee => <EmployeeTile key={employee.id} employee={employee} />)}</div>
            ) : <div className="emp-empty"><RiTeamLine size={28} /><strong>{i18nT("pages.employees.employees.employees.c132a70")}</strong><p>{i18nT("pages.employees.employees.employees.77bc5ba")}</p></div>}
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
              emptyText={i18nT("pages.employees.employees.employees.c132a70")}
              emptyDescription={i18nT("pages.employees.employees.employees.acd9750")}
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
