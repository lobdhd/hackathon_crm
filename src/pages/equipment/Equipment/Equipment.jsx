import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import {
  RiAddLine, RiAlarmWarningLine, RiArrowRightUpLine, RiCloseLine,
  RiFilter3Line, RiMapPinLine,
  RiQrScan2Line, RiRefreshLine, RiSearchLine, RiToolsLine,
  RiShieldCheckLine, RiBuilding2Line, RiLoader4Line,
} from "react-icons/ri";
import SmartTable from "../../../react-components/SmartTable/SmartTable.jsx";
import GlideSelect from "../../../react-components/GlideSelect/GlideSelect.jsx";
import RubberSegment from "../../../react-components/RubberSegment/RubberSegment.jsx";
import { useAuth } from "../../../auth/AuthProvider.jsx";
import { useCreateEquipment } from "../../../hooks/useAdmin.js";
import { useAreas, useEquipmentReference } from "../../../hooks/useReferences.js";
import QrScannerModal from "../../../components/equipment/QrScannerModal.jsx";
import { t as i18nT, useI18n } from "../../../i18n/index.js";
import "./Equipment.css";

const asArray = (value) => Array.isArray(value) ? value : [];
const getErrorMessage = (error) => error?.response?.data?.error || error?.message || "Не удалось выполнить операцию";
const CRITICALITY = {
  1: "Низкая", 2: "Ниже средней", 3: "Средняя", 4: "Высокая", 5: "Критическая",
};
const getCriticalityLabel = (value) => CRITICALITY[Number(value)] || "Не указана";
const clamp = (value) => Math.min(100, Math.max(0, value));

function CriticalityBadge({ value }) {
  const level = Number(value) || 0;
  return (
    <span className={`eq-severity eq-severity--${level || 1}`}>
      <span className="eq-severity__dot" />
      {getCriticalityLabel(value)} · {level || "—"}/5
    </span>
  );
}

function StatCard({ icon: Icon, label, value, description, tone = "blue", progress }) {
  return (
    <div className={`eq-stat eq-stat--${tone}`}>
      <div className="eq-stat__top">
        <span>{label}</span>
        <span className="eq-stat__icon"><Icon size={19} /></span>
      </div>
      <strong>{value}</strong>
      <small>{description}</small>
      {progress !== undefined && (
        <div className="eq-stat__track"><span style={{ width: `${clamp(progress)}%` }} /></div>
      )}
    </div>
  );
}

function EquipmentCard({ item, area }) {
    useI18n();
  return (
    <Link to={`/equipment/${item.id}`} className="eq-item">
      <div className="eq-item__head">
        <div className="eq-item__identity">
          <div className="eq-item__name">
            <strong title={item.name}>{item.name || i18nT("pages.equipment.equipment.equipment.028dc34")}</strong>
            <span>{item.inventoryNumber || i18nT("pages.equipment.equipment.equipment.8927f2c")}</span>
          </div>
        </div>
        <RiArrowRightUpLine className="eq-item__arrow" size={20} />
      </div>
      <div className="eq-item__meta">
        <div><small>{i18nT("pages.admin.admin.admin.b21456e")}</small><b title={item.type}>{item.type || "—"}</b></div>
        <div><small>{i18nT("ordersTable.area")}</small><b title={area?.name}>{area?.name || i18nT("components.employees.createemployeemodal.cdded47")}</b></div>
      </div>
      <div className="eq-item__foot">
        <CriticalityBadge value={item.criticality} />
        <span className="eq-item__open">{i18nT("pages.dashboard.dashboard.db5f55c")}</span>
      </div>
    </Link>
  );
}

function CreateEquipmentModal({ areas, onClose }) {
  useI18n();
  const mutation = useCreateEquipment();
  const [form, setForm] = useState({ name: "", inventoryNumber: "", type: "", criticality: "3", areaId: "" });
  const [error, setError] = useState("");
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === "Escape" && !mutation.isPending) onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, mutation.isPending]);
  const setField = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setError("");
  };
  async function submit(event) {
    event.preventDefault();
    if (!form.areaId) { setError("Выберите участок"); return; }
    setError("");
    try {
      await mutation.mutateAsync({
        name: form.name.trim(),
        inventoryNumber: form.inventoryNumber.trim(),
        type: form.type.trim(),
        criticality: Number(form.criticality),
        areaId: Number(form.areaId),
      });
      onClose();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }
  return createPortal(
    <div className="eq-modal-overlay" onMouseDown={() => { if (!mutation.isPending) onClose(); }}>
      <div
        className="eq-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="eq-create-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="eq-modal__head">
          <span className="eq-modal__icon"><RiToolsLine size={21} /></span>
          <div>
            <h2 id="eq-create-title">{i18nT("pages.equipment.equipment.equipment.77e0765")}</h2>
            <p>{i18nT("pages.equipment.equipment.equipment.766f866")}</p>
          </div>
          <button type="button" className="eq-icon-button" aria-label={i18nT("components.equipment.qrscannermodal.dd9463b")} onClick={onClose}>
            <RiCloseLine size={20} />
          </button>
        </div>
        <form className="eq-modal__form" onSubmit={submit} autoComplete="off">
          {error && <div className="eq-form-error"><RiAlarmWarningLine size={18} />{error}</div>}
          <div className="eq-form-grid">
            <label className="eq-field eq-field--full">
              <span>{i18nT("pages.equipment.equipment.equipment.5bb3bf5")}</span>
              <input value={form.name} onChange={(event) => setField("name", event.target.value)} placeholder={i18nT("pages.equipment.equipment.equipment.52eace0")} required minLength={2} />
            </label>
            <label className="eq-field">
              <span>{i18nT("pages.admin.admin.admin.ad8aabf")}</span>
              <input value={form.inventoryNumber} onChange={(event) => setField("inventoryNumber", event.target.value)} placeholder={i18nT("pages.equipment.equipment.equipment.dab09be")} required />
            </label>
            <label className="eq-field">
              <span>{i18nT("pages.admin.admin.admin.b21456e")}</span>
              <input value={form.type} onChange={(event) => setField("type", event.target.value)} placeholder={i18nT("pages.equipment.equipment.equipment.950ae9a")} required />
            </label>
            <div className="eq-field">
              <span>{i18nT("equipmentModal.criticality")}</span>
              <GlideSelect
                className="glide-select--field"
                options={Object.entries(CRITICALITY).map(([value, label]) => ({ value, label: `${value} — ${label}` }))}
                value={form.criticality}
                onChange={(value) => setField("criticality", value)}
                menuWidth={250}
                portal
              />
            </div>
            <div className="eq-field">
              <span>{i18nT("ordersTable.area")} <b>*</b></span>
              <GlideSelect
                className="glide-select--field"
                options={[{ value: "", label: i18nT("orderModal.selectArea") }, ...areas.map((area) => ({ value: String(area.id), label: area.name }))]}
                value={form.areaId}
                onChange={(value) => setField("areaId", value)}
                searchable
                portal
                menuWidth={290}
              />
            </div>
          </div>
          <div className="eq-modal__footer">
            <button type="button" className="eq-button eq-button--outline" onClick={onClose} disabled={mutation.isPending}>{i18nT("employeeModal.cancel")}</button>
            <button type="submit" className="eq-button eq-button--primary" disabled={mutation.isPending}>
              {mutation.isPending ? <RiLoader4Line className="eq-spin" size={17} /> : <RiAddLine size={17} />}
              {mutation.isPending ? i18nT("components.employees.createemployeemodal.32f23b2") : i18nT("pages.equipment.equipment.equipment.97198e9")}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

export default function Equipment() {
    const __i18nLocaleToken = i18nT("sidebar.home");
  useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [view, setView] = useState("cards");
  const [scanOpen, setScanOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [filters, setFilters] = useState({ search: "", areaId: "", criticality: "", type: "" });
  const equipmentQuery = useEquipmentReference();
  const areasQuery = useAreas();
  const equipment = asArray(equipmentQuery.data);
  const areas = asArray(areasQuery.data);
  const canCreate = user?.role === "ADMIN";
  const updateFilter = (key, value) => setFilters((previous) => ({ ...previous, [key]: value }));
  const resetFilters = () => setFilters({ search: "", areaId: "", criticality: "", type: "" });
  const areasById = useMemo(() => new Map(areas.map((area) => [String(area.id), area])), [areas, __i18nLocaleToken]);
  const types = useMemo(() => [...new Set(equipment.map((item) => item.type).filter(Boolean))].sort(), [equipment, __i18nLocaleToken]);
  const filteredEquipment = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return equipment.filter((item) => {
      const area = areasById.get(String(item.areaId));
      const searchMatch = !search || [item.name, item.inventoryNumber, item.type, area?.name]
        .some((value) => String(value || "").toLowerCase().includes(search));
      return searchMatch && (!filters.areaId || String(item.areaId) === filters.areaId)
        && (!filters.type || item.type === filters.type)
        && (!filters.criticality || String(item.criticality) === filters.criticality);
    });
  }, [equipment, areasById, filters, __i18nLocaleToken]);
  const stats = useMemo(() => {
    const high = equipment.filter((item) => Number(item.criticality) >= 4).length;
    const critical = equipment.filter((item) => Number(item.criticality) === 5).length;
    const knownAreas = new Set(equipment.map((item) => item.areaId).filter((value) => value != null && value !== ""));
    return { total: equipment.length, high, critical, areas: knownAreas.size };
  }, [equipment, __i18nLocaleToken]);
  const activeFilters = [filters.areaId, filters.criticality, filters.type, filters.search].filter(Boolean).length;
  const areaOptions = [{ value: "", label: i18nT("reportModal.allAreas") }, ...areas.map((area) => ({ value: String(area.id), label: area.name }))];
  const typeOptions = [{ value: "", label: i18nT("pages.equipment.equipment.equipment.729d3f6") }, ...types.map((type) => ({ value: type, label: type }))];
  const criticalityOptions = [{ value: "", label: i18nT("pages.equipment.equipment.equipment.daaa627") }, ...Object.entries(CRITICALITY).map(([value, label]) => ({ value, label: `${value} — ${label}` }))];
  const columns = [
    {
      field: "name", header: i18nT("quickOrder.equipment"), minWidth: 260,
      render: (item) => <div className="eq-table-name"><span className="eq-item__icon"><RiToolsLine size={18} /></span><div><strong>{item.name}</strong><small>{item.inventoryNumber || i18nT("pages.equipment.equipment.equipment.94b82a1")}</small></div></div>,
    },
    { field: "inventoryNumber", header: i18nT("pages.equipment.equipment.equipment.026a326"), minWidth: 155 },
    { field: "type", header: i18nT("pages.admin.admin.admin.345805b"), minWidth: 180 },
    {
      key: "area", header: i18nT("ordersTable.area"), minWidth: 190, sortField: "areaName",
      sortValue: (item) => areasById.get(String(item.areaId))?.name || "",
      render: (item) => <span className="eq-table-area"><RiMapPinLine size={15} />{areasById.get(String(item.areaId))?.name || "—"}</span>,
    },
    {
      field: "criticality", header: i18nT("equipmentModal.criticality"), minWidth: 170,
      sortValue: (item) => Number(item.criticality),
      render: (item) => <CriticalityBadge value={item.criticality} />,
    },
  ];
  const isLoading = (equipmentQuery.isLoading && !equipmentQuery.data) || (areasQuery.isLoading && !areasQuery.data);
  return (
    <div className="eq mx-auto max-w-[1800px] p-7">
      <header className="eq-header">
        <div>
          <h1>{i18nT("sidebar.equipment")}</h1>
          <p className="eq-header__subtitle">{i18nT("pages.equipment.equipment.equipment.fd6ddbb")}</p>
        </div>
        <div className="eq-header__actions">
          <button type="button" className="eq-button eq-button--outline" onClick={() => setScanOpen(true)}><RiQrScan2Line size={18} /> {i18nT("qrScanner.scan")}</button>
          {canCreate && <button type="button" className="eq-button eq-button--primary" onClick={() => setCreateOpen(true)}><RiAddLine size={18} /> {i18nT("pages.equipment.equipment.equipment.77e0765")}</button>}
        </div>
      </header>
      {equipmentQuery.isError && (
        <div className="eq-alert"><RiAlarmWarningLine size={20} /><span>{getErrorMessage(equipmentQuery.error)}</span><button type="button" onClick={() => equipmentQuery.refetch()}><RiRefreshLine /> {i18nT("components.layout.appnavbar.b914bbb")}</button></div>
      )}
      <div className="eq-stats">
        <StatCard icon={RiToolsLine} label={i18nT("pages.equipment.equipment.equipment.ca09aae")} value={isLoading ? "—" : stats.total} description={i18nT("pages.equipment.equipment.equipment.93637be")} />
        <StatCard icon={RiAlarmWarningLine} label={i18nT("pages.equipment.equipment.equipment.dda846a")} value={isLoading ? "—" : stats.high} description={i18nT("pages.equipment.equipment.equipment.2e3d3ab")} tone="amber" progress={stats.total ? stats.high / stats.total * 100 : 0} />
        <StatCard icon={RiShieldCheckLine} label={i18nT("pages.equipment.equipment.equipment.3cbfed4")} value={isLoading ? "—" : stats.critical} description={i18nT("pages.equipment.equipment.equipment.aace193")} tone="red" progress={stats.total ? stats.critical / stats.total * 100 : 0} />
        <StatCard icon={RiBuilding2Line} label={i18nT("pages.equipment.equipment.equipment.9d75070")} value={isLoading ? "—" : stats.areas} description={i18nT("pages.equipment.equipment.equipment.515dbc4")} tone="sky" />
      </div>
      <section className="eq-panel eq-catalog">
        <div className="eq-panel__head">
          <span className="eq-section-icon"><RiFilter3Line size={20} /></span>
          <div><h2>{i18nT("pages.equipment.equipment.equipment.1fa8044")}</h2><p>{i18nT("pages.equipment.equipment.equipment.8a5b87a")}</p></div>
          <span className="eq-count">{filteredEquipment.length} {i18nT("pages.equipment.equipment.equipment.9a79d3f")}</span>
        </div>
        <div className="eq-filters">
          <label className="eq-search">
            <RiSearchLine size={19} />
            <input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} placeholder={i18nT("pages.equipment.equipment.equipment.967ae1d")} aria-label={i18nT("pages.equipment.equipment.equipment.160a258")} />
            {filters.search && <button type="button" aria-label={i18nT("pages.employees.employees.employees.30e2d49")} onClick={() => updateFilter("search", "")}><RiCloseLine size={16} /></button>}
          </label>
          <div className="eq-filter-select"><GlideSelect className="glide-select--field" options={areaOptions} value={filters.areaId} onChange={(value) => updateFilter("areaId", value)} searchable portal menuWidth={280} ariaLabel="Участок" /></div>
          <div className="eq-filter-select"><GlideSelect className="glide-select--field" options={typeOptions} value={filters.type} onChange={(value) => updateFilter("type", value)} searchable portal menuWidth={260} ariaLabel="Тип" /></div>
          <div className="eq-filter-select"><GlideSelect className="glide-select--field" options={criticalityOptions} value={filters.criticality} onChange={(value) => updateFilter("criticality", value)} portal menuWidth={245} ariaLabel="Критичность" /></div>
        </div>
        <div className="eq-toolbar">
          <div className="eq-toolbar__meta"><RiFilter3Line size={17} /> {i18nT("employeesPage.found")} <strong>{filteredEquipment.length}</strong>{activeFilters > 0 && <button type="button" onClick={resetFilters}><RiCloseLine size={15} /> {i18nT("ordersPage.resetFilters")}</button>}</div>
          <div className="eq-view-switch">
            <RubberSegment
              items={[{ value: "cards", label: i18nT("pages.employees.employees.employees.152beb3") }, { value: "table", label: i18nT("ordersPage.table") }]}
              value={view}
              onChange={setView}
              trackColor="#ffffff"
              thumbColor="#2563eb"
              textColor="#2563eb"
              activeTextColor="#ffffff"
              size="md"
              radius={10}
              inset={3}
              equalSlots
              draggable
              aria-label={i18nT("pages.equipment.equipment.equipment.6d11110")}
            />
          </div>
        </div>
        {isLoading ? (
          <div className="eq-skeleton-grid">{[1, 2, 3, 4, 5, 6].map((value) => <div key={value} className="eq-skeleton" />)}</div>
        ) : view === "cards" ? (
          <div className="eq-grid-scroll">
            {filteredEquipment.length ? (
              <div className="eq-grid">{filteredEquipment.map((item) => <EquipmentCard key={item.id} item={item} area={areasById.get(String(item.areaId))} />)}</div>
            ) : (
              <div className="eq-empty"><RiToolsLine size={34} /><strong>{i18nT("pages.equipment.equipment.equipment.11a8e6f")}</strong><span>{i18nT("pages.equipment.equipment.equipment.d3dfefe")}</span></div>
            )}
          </div>
        ) : (
          <div className="eq-table-wrap">
            <SmartTable
              className="eq-table"
              data={filteredEquipment}
              columns={columns}
              dataKey="id"
              mode="sort"
              compact
              striped
              stickyHeader
              minWidth={1020}
              scrollHeight="min(530px, 58dvh)"
              rowClassName={() => "cursor-pointer"}
              onRowClick={(item, _index, event) => {
                if (event?.target?.closest?.("button, a, input, select, textarea")) return;
                navigate(`/equipment/${item.id}`);
              }}
              emptyText={i18nT("pages.equipment.equipment.equipment.11a8e6f")}
              emptyDescription={i18nT("pages.equipment.equipment.equipment.3d1bf6e")}
            />
          </div>
        )}
      </section>
      {createOpen && <CreateEquipmentModal areas={areas} onClose={() => setCreateOpen(false)} />}
      {scanOpen && (
        <QrScannerModal
          onClose={() => setScanOpen(false)}
          onDetected={(item) => {
            setScanOpen(false);
            if (item?.id != null) navigate(`/equipment/${item.id}`);
          }}
        />
      )}
    </div>
  );
}
