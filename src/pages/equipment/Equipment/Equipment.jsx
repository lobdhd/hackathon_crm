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
  return (
    <Link to={`/equipment/${item.id}`} className="eq-item">
      <div className="eq-item__head">
        <div className="eq-item__identity">
          <div className="eq-item__name">
            <strong title={item.name}>{item.name || "Оборудование без названия"}</strong>
            <span>{item.inventoryNumber || "Без инвентарного номера"}</span>
          </div>
        </div>
        <RiArrowRightUpLine className="eq-item__arrow" size={20} />
      </div>
      <div className="eq-item__meta">
        <div><small>Тип оборудования</small><b title={item.type}>{item.type || "—"}</b></div>
        <div><small>Участок</small><b title={area?.name}>{area?.name || "Не указан"}</b></div>
      </div>
      <div className="eq-item__foot">
        <CriticalityBadge value={item.criticality} />
        <span className="eq-item__open">Подробнее</span>
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
            <h2 id="eq-create-title">Добавить оборудование</h2>
            <p>Создание новой записи в справочнике оборудования</p>
          </div>
          <button type="button" className="eq-icon-button" aria-label="Закрыть" onClick={onClose}>
            <RiCloseLine size={20} />
          </button>
        </div>
        <form className="eq-modal__form" onSubmit={submit} autoComplete="off">
          {error && <div className="eq-form-error"><RiAlarmWarningLine size={18} />{error}</div>}
          <div className="eq-form-grid">
            <label className="eq-field eq-field--full">
              <span>Название оборудования</span>
              <input value={form.name} onChange={(event) => setField("name", event.target.value)} placeholder="Например, Дробилка КСД-2200" required minLength={2} />
            </label>
            <label className="eq-field">
              <span>Инвентарный номер</span>
              <input value={form.inventoryNumber} onChange={(event) => setField("inventoryNumber", event.target.value)} placeholder="Например, Д-3" required />
            </label>
            <label className="eq-field">
              <span>Тип оборудования</span>
              <input value={form.type} onChange={(event) => setField("type", event.target.value)} placeholder="Например, Дробильное" required />
            </label>
            <div className="eq-field">
              <span>Критичность</span>
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
              <span>Участок <b>*</b></span>
              <GlideSelect
                className="glide-select--field"
                options={[{ value: "", label: "Выберите участок" }, ...areas.map((area) => ({ value: String(area.id), label: area.name }))]}
                value={form.areaId}
                onChange={(value) => setField("areaId", value)}
                searchable
                portal
                menuWidth={290}
              />
            </div>
          </div>
          <div className="eq-modal__footer">
            <button type="button" className="eq-button eq-button--outline" onClick={onClose} disabled={mutation.isPending}>Отмена</button>
            <button type="submit" className="eq-button eq-button--primary" disabled={mutation.isPending}>
              {mutation.isPending ? <RiLoader4Line className="eq-spin" size={17} /> : <RiAddLine size={17} />}
              {mutation.isPending ? "Создание..." : "Создать оборудование"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

export default function Equipment() {
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
  const areasById = useMemo(() => new Map(areas.map((area) => [String(area.id), area])), [areas]);
  const types = useMemo(() => [...new Set(equipment.map((item) => item.type).filter(Boolean))].sort(), [equipment]);
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
  }, [equipment, areasById, filters]);
  const stats = useMemo(() => {
    const high = equipment.filter((item) => Number(item.criticality) >= 4).length;
    const critical = equipment.filter((item) => Number(item.criticality) === 5).length;
    const knownAreas = new Set(equipment.map((item) => item.areaId).filter((value) => value != null && value !== ""));
    return { total: equipment.length, high, critical, areas: knownAreas.size };
  }, [equipment]);
  const activeFilters = [filters.areaId, filters.criticality, filters.type, filters.search].filter(Boolean).length;
  const areaOptions = [{ value: "", label: "Все участки" }, ...areas.map((area) => ({ value: String(area.id), label: area.name }))];
  const typeOptions = [{ value: "", label: "Все типы" }, ...types.map((type) => ({ value: type, label: type }))];
  const criticalityOptions = [{ value: "", label: "Любая критичность" }, ...Object.entries(CRITICALITY).map(([value, label]) => ({ value, label: `${value} — ${label}` }))];
  const columns = [
    {
      field: "name", header: "Оборудование", minWidth: 260,
      render: (item) => <div className="eq-table-name"><span className="eq-item__icon"><RiToolsLine size={18} /></span><div><strong>{item.name}</strong><small>{item.inventoryNumber || "Без номера"}</small></div></div>,
    },
    { field: "inventoryNumber", header: "Инвентарный №", minWidth: 155 },
    { field: "type", header: "Тип", minWidth: 180 },
    {
      key: "area", header: "Участок", minWidth: 190, sortField: "areaName",
      sortValue: (item) => areasById.get(String(item.areaId))?.name || "",
      render: (item) => <span className="eq-table-area"><RiMapPinLine size={15} />{areasById.get(String(item.areaId))?.name || "—"}</span>,
    },
    {
      field: "criticality", header: "Критичность", minWidth: 170,
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
          <p className="eq-header__subtitle">Контроль оборудования, критичности и распределения по участкам</p>
        </div>
        <div className="eq-header__actions">
          <button type="button" className="eq-button eq-button--outline" onClick={() => setScanOpen(true)}><RiQrScan2Line size={18} /> Сканировать QR</button>
          {canCreate && <button type="button" className="eq-button eq-button--primary" onClick={() => setCreateOpen(true)}><RiAddLine size={18} /> Добавить оборудование</button>}
        </div>
      </header>
      {equipmentQuery.isError && (
        <div className="eq-alert"><RiAlarmWarningLine size={20} /><span>{getErrorMessage(equipmentQuery.error)}</span><button type="button" onClick={() => equipmentQuery.refetch()}><RiRefreshLine /> Повторить</button></div>
      )}
      <div className="eq-stats">
        <StatCard icon={RiToolsLine} label="Всего оборудования" value={isLoading ? "—" : stats.total} description="В справочнике" />
        <StatCard icon={RiAlarmWarningLine} label="Высокая критичность" value={isLoading ? "—" : stats.high} description="Уровень 4 и 5" tone="amber" progress={stats.total ? stats.high / stats.total * 100 : 0} />
        <StatCard icon={RiShieldCheckLine} label="Критическая" value={isLoading ? "—" : stats.critical} description="Уровень 5" tone="red" progress={stats.total ? stats.critical / stats.total * 100 : 0} />
        <StatCard icon={RiBuilding2Line} label="Задействовано участков" value={isLoading ? "—" : stats.areas} description="По текущим записям" tone="sky" />
      </div>
      <section className="eq-panel eq-catalog">
        <div className="eq-panel__head">
          <span className="eq-section-icon"><RiFilter3Line size={20} /></span>
          <div><h2>Каталог оборудования</h2><p>Поиск и фильтрация по справочнику</p></div>
          <span className="eq-count">{filteredEquipment.length} записей</span>
        </div>
        <div className="eq-filters">
          <label className="eq-search">
            <RiSearchLine size={19} />
            <input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} placeholder="Поиск по названию, номеру, типу..." aria-label="Поиск оборудования" />
            {filters.search && <button type="button" aria-label="Очистить поиск" onClick={() => updateFilter("search", "")}><RiCloseLine size={16} /></button>}
          </label>
          <div className="eq-filter-select"><GlideSelect className="glide-select--field" options={areaOptions} value={filters.areaId} onChange={(value) => updateFilter("areaId", value)} searchable portal menuWidth={280} ariaLabel="Участок" /></div>
          <div className="eq-filter-select"><GlideSelect className="glide-select--field" options={typeOptions} value={filters.type} onChange={(value) => updateFilter("type", value)} searchable portal menuWidth={260} ariaLabel="Тип" /></div>
          <div className="eq-filter-select"><GlideSelect className="glide-select--field" options={criticalityOptions} value={filters.criticality} onChange={(value) => updateFilter("criticality", value)} portal menuWidth={245} ariaLabel="Критичность" /></div>
        </div>
        <div className="eq-toolbar">
          <div className="eq-toolbar__meta"><RiFilter3Line size={17} /> Найдено: <strong>{filteredEquipment.length}</strong>{activeFilters > 0 && <button type="button" onClick={resetFilters}><RiCloseLine size={15} /> Сбросить фильтры</button>}</div>
          <div className="eq-view-switch">
            <RubberSegment
              items={[{ value: "cards", label: "Карточки" }, { value: "table", label: "Таблица" }]}
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
              aria-label="Режим отображения"
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
              <div className="eq-empty"><RiToolsLine size={34} /><strong>Оборудование не найдено</strong><span>Измените параметры поиска или сбросьте фильтры</span></div>
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
              emptyText="Оборудование не найдено"
              emptyDescription="Попробуйте сбросить фильтры"
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
