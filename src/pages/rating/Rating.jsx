import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  RiBarChartBoxLine,
  RiCheckboxCircleLine,
  RiCloseLine,
  RiFilter3Line,
  RiMedalLine,
  RiRefreshLine,
  RiSearchLine,
  RiShieldCheckLine,
  RiSparkling2Line,
  RiStarFill,
  RiTeamLine,
  RiTrophyLine,
  RiUser3Line,
  RiArrowRightUpLine,
  RiInformationLine,
} from "react-icons/ri";
import Chart from "react-apexcharts";
import SmartTable from "../../react-components/SmartTable/SmartTable.jsx";
import GlideSelect from "../../react-components/GlideSelect/GlideSelect.jsx";
import RubberSegment from "../../react-components/RubberSegment/RubberSegment.jsx";
import { useAuth } from "../../auth/AuthProvider.jsx";
import { useBrigadeRatings, useMyRating, useRatings } from "../../hooks/useReports.js";
import { useAreas } from "../../hooks/useReferences.js";
import { t as i18nT, useI18n } from "../../i18n/index.js";
import "./Rating.css";

const PERIODS = () => [
  { value: "shift", label: i18nT("reportModal.shift") },
  { value: "week", label: i18nT("analyticsPage.week") },
  { value: "month", label: i18nT("pages.rating.rating.aeb10f7") },
];
const MODES = () => [
  { value: "executors", label: i18nT("sidebar.employees") },
  { value: "brigades", label: i18nT("pages.admin.admin.admin.bfbd755") },
];
const asArray = (value) => (Array.isArray(value) ? value : []);
const asObject = (value) => (Array.isArray(value) ? value[0] || null : value && typeof value === "object" ? value : null);
const finite = (value) => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
const numberValue = (value, digits = 1) => finite(value) ? Number(value).toLocaleString("ru-RU", { maximumFractionDigits: digits }) : "—";
const scoreValue = (value) => numberValue(value, 1);
const percent = (value) => {
  if (!finite(value)) return "—";
  const n = Number(value);
  return `${Math.round(n <= 1 ? n * 100 : n)}%`;
};
const toPercent = (value) => {
  if (!finite(value)) return null;
  const n = Number(value);
  return n <= 1 ? n * 100 : n;
};
const getErrorMessage = (error) => error?.response?.data?.error || error?.message || "Не удалось загрузить рейтинг";
const initials = (name) => String(name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();

function PeriodControl({ value, onChange }) {
  useI18n();
  return (
    <div className="rt-period">
      <RubberSegment
        items={PERIODS()}
        value={value}
        onChange={onChange}
        trackColor="#ffffff"
        thumbColor="#2563eb"
        textColor="#2563eb"
        activeTextColor="#ffffff"
        size="md"
        radius={10}
        inset={3}
        equalSlots
        draggable
        aria-label={i18nT("pages.rating.rating.3c00456")}
      />
    </div>
  );
}

function MetricCard({ title, value, note, icon: Icon, tone = "blue", progress }) {
  return (
    <div className={`rt-metric rt-metric--${tone}`}>
      <div className="rt-metric__heading"><span>{title}</span><span className="rt-metric__icon"><Icon size={19} /></span></div>
      <strong className="rt-metric__value">{value}</strong>
      <div className="rt-metric__bottom"><span title={note}>{note}</span>{progress != null && <div className="rt-metric__track"><span style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} /></div>}</div>
    </div>
  );
}

function ScoreBadge({ value }) {
  const valid = finite(value);
  const score = valid ? Number(value) : 0;
  const tone = !valid ? "neutral" : score >= 85 ? "great" : score >= 70 ? "good" : score >= 50 ? "mid" : "low";
  return <span className={`rt-score rt-score--${tone}`}>{valid ? scoreValue(score) : "—"}<small>{valid ? "/100" : ""}</small></span>;
}

function LeaderCard({ item, rank, isBrigade, onClick }) {
    useI18n();
  const Icon = isBrigade ? RiTeamLine : RiUser3Line;
  const subtitle = isBrigade
    ? `${i18nT("pages.rating.rating.6cef7a4")} ${Array.isArray(item.members) ? item.members.length : item.members ?? "—"}`
    : item.specialty || "Специальность не указана";
  return (
    <button type="button" className={`rt-leader rt-leader--${rank}`} onClick={onClick} disabled={!onClick}>
      <div className="rt-leader__top"><span className="rt-leader__place"><RiMedalLine size={17} /> {i18nT("pages.rating.rating.0a7f305")} {rank}</span><span className="rt-leader__avatar">{isBrigade ? <Icon size={21} /> : initials(item.fullName)}</span></div>
      <strong className="rt-leader__name">{isBrigade ? item.name : item.fullName}</strong>
      <span className="rt-leader__subtitle">{subtitle}</span>
      <div className="rt-leader__footer"><span><b>{scoreValue(item.score)}</b> / 100</span><span>{item.closed ?? 0} {i18nT("pages.rating.rating.04aadcb")} {onClick && <RiArrowRightUpLine size={16} />}</span></div>
      <div className="rt-leader__progress"><span style={{ width: `${Math.max(0, Math.min(100, Number(item.score) || 0))}%` }} /></div>
    </button>
  );
}

function RatingBreakdown({ rating, subtitle, personal = false }) {
  useI18n();
  const pointValues = rating.points || {};
  const criteria = [
    {
      key: "quality",
      title: i18nT("pages.equipment.equipmentdetails.equipmentdetails.235ca37"),
      maximum: 45,
      note: finite(rating.quality)
        ? `Средняя оценка ${numberValue(rating.quality, 2)} из 5`
        : "Оценки выполненных работ",
    },
    {
      key: "onTime",
      title: i18nT("ratingPage.onTime"),
      maximum: 25,
      note: `Выполнено в срок: ${percent(rating.onTimeRate)}`,
    },
    {
      key: "noReturns",
      title: i18nT("pages.rating.rating.a09c947"),
      maximum: 15,
      note: `Доработки: ${percent(rating.reworkRate)} · Повторные поломки: ${percent(rating.repeatFailureRate)}`,
    },
    {
      key: "volume",
      title: i18nT("pages.rating.rating.83c9a27"),
      maximum: 10,
      note: `Закрыто нарядов: ${rating.closed ?? "—"}`,
    },
    {
      key: "complexity",
      title: i18nT("pages.rating.rating.871414e"),
      maximum: 5,
      note: finite(rating.complexityBonus)
        ? `Бонус за сложность: ${numberValue(rating.complexityBonus)}`
        : "Дополнительные баллы за сложные работы",
    },
  ].map((criterion) => {
    const points = pointValues[criterion.key];
    return {
      ...criterion,
      points,
      valid: finite(points),
      share: finite(points)
        ? Math.max(0, Math.min(100, Number(points) / criterion.maximum * 100))
        : null,
    };
  });
  const available = criteria.filter((item) => item.valid);
  const strongest = available.length
    ? available.reduce((best, item) => item.share > best.share ? item : best)
    : null;
  const growth = available.filter((item) => item.share < 100 && (available.length < 2 || item.key !== strongest?.key)).reduce(
    (worst, item) => !worst || item.share < worst.share ? item : worst,
    null,
  );
  const penalty = finite(pointValues.rejects) ? Number(pointValues.rejects) : null;
  const rejects = finite(rating.unjustifiedRejects) ? Number(rating.unjustifiedRejects) : null;
  const hasCorrections = (penalty !== null && penalty !== 0) || (rejects !== null && rejects > 0);
  const total = finite(rating.score) ? Math.max(0, Math.min(100, Number(rating.score))) : null;
  const recommendation = String(rating.explanation || "").match(
    /Больше всего баллов можно добавить[^.!?]*[.!?]?/i,
  )?.[0] || "";
  const shortAdvice = recommendation
    .replace(/^Больше всего баллов можно добавить,?\s*если\s*/i, "")
    .replace(/^./, (char) => char.toUpperCase());

  return (
    <section className="rt-panel rt-breakdown">
      <div className="rt-panel__head rt-breakdown__header">
        <span className="rt-section-icon"><RiShieldCheckLine size={20} /></span>
        <div className="rt-breakdown__heading">
          <h3>{i18nT("pages.rating.rating.938f99a")}</h3>
          <p>{personal ? i18nT("pages.rating.rating.f3dc477") : subtitle}</p>
        </div>
        <span className="rt-breakdown__source-tag">{i18nT("pages.rating.rating.09ab85c")}</span>
      </div>
      <div className="rt-breakdown__body">
        <div className="rt-breakdown__total">
          <div className="rt-breakdown__total-heading">
            <div>
              <span className="rt-breakdown__eyebrow">{i18nT("pages.orders.orderdetails.orderdetails.8a9901b")}</span>
              <strong>{total === null ? "—" : scoreValue(total)}<small> /100</small></strong>
            </div>
            <p>{i18nT("pages.rating.rating.43a5679")}</p>
          </div>
          <div
            className="rt-breakdown__total-track"
            role="progressbar"
            aria-label={i18nT("pages.rating.rating.47fcdf7")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={total ?? 0}
          >
            <span style={{ width: `${total ?? 0}%` }} />
          </div>
        </div>
        <div className="rt-breakdown__subheading">
          <h4>{i18nT("pages.rating.rating.6edf2fc")}</h4>
          <span>{i18nT("pages.rating.rating.15b36f1")}</span>
        </div>
        <div className="rt-breakdown__criteria">
          {criteria.map((criterion) => (
            <div className="rt-breakdown__criterion" key={criterion.key}>
              <div className="rt-breakdown__criterion-top">
                <strong>{criterion.title}</strong>
                <div className="rt-breakdown__criterion-score">
                  {criterion.valid ? numberValue(criterion.points) : "—"}
                  <small> / {criterion.maximum}</small>
                </div>
              </div>
              <div
                className="rt-breakdown__criterion-track"
                role="progressbar"
                aria-label={criterion.title}
                aria-valuemin={0}
                aria-valuemax={criterion.maximum}
                aria-valuenow={criterion.valid ? Math.max(0, Math.min(criterion.maximum, Number(criterion.points))) : 0}
              >
                <span style={{ width: `${criterion.share ?? 0}%` }} />
              </div>
              <p>{criterion.note}</p>
            </div>
          ))}
        </div>
        {(strongest || growth || hasCorrections) && (
          <div className="rt-breakdown__insights">
            {strongest && (
              <div className="rt-breakdown__insight">
                <RiTrophyLine size={19} />
                <div>
                  <span>{i18nT("pages.rating.rating.adc6125")}</span>
                  <strong>{strongest.title}</strong>
                  <small>{Math.round(strongest.share)}{i18nT("pages.rating.rating.25e763b")}</small>
                </div>
              </div>
            )}
            {growth && (
              <div className="rt-breakdown__insight rt-breakdown__insight--growth">
                <RiArrowRightUpLine size={19} />
                <div>
                  <span>{i18nT("pages.rating.rating.c43aade")}</span>
                  <strong>{growth.title}</strong>
                  <small>{Math.round(growth.share)}{i18nT("pages.rating.rating.25e763b")}</small>
                </div>
              </div>
            )}
            {hasCorrections && (
              <div className="rt-breakdown__insight rt-breakdown__insight--penalty">
                <RiInformationLine size={19} />
                <div>
                  <span>{i18nT("pages.rating.rating.6b843ab")}</span>
                  {penalty !== null && penalty !== 0 && <strong>{numberValue(penalty)} {i18nT("pages.rating.rating.ac80cfd")}</strong>}
                  {rejects !== null && rejects > 0 && (
                    <small>{i18nT("pages.rating.rating.307fcc1")} {numberValue(rejects, 0)}</small>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        {shortAdvice && (
          <div className="rt-breakdown__advice">
            <RiSparkling2Line size={19} />
            <div>
              <strong>{i18nT("pages.rating.rating.7c70c3b")}</strong>
              <p>{shortAdvice}</p>
            </div>
          </div>
        )}
        {(rating.explanation || rating.formula) && (
          <details className="rt-breakdown__details">
            <summary><RiInformationLine size={17} /> {i18nT("pages.rating.rating.35f4ff4")}</summary>
            <div className="rt-breakdown__details-content">
              {rating.explanation && <p>{rating.explanation}</p>}
              {rating.formula && (
                <div>
                  <strong>{i18nT("pages.rating.rating.a4eb114")}</strong>
                  <p>{rating.formula}</p>
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </section>
  );
}

function ErrorBox({ text, onRetry }) {
    useI18n();
  return (
    <div className="rt-alert" role="alert">
      <RiInformationLine size={19} />
      <span>{text}</span>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          <RiRefreshLine size={15} /> {i18nT("components.layout.appnavbar.b914bbb")}
        </button>
      )}
    </div>
  );
}

function Skeleton({ className = "" }) {
  return <span className={`rt-skeleton ${className}`} />;
}

function RatingSkeleton() {
  return (
    <div className="rt-loading">
      <div className="rt-stats">
        {[1, 2, 3, 4].map((index) => (
          <div className="rt-loading__card" key={index}>
            <Skeleton className="rt-loading__line" />
            <Skeleton className="rt-loading__value" />
            <Skeleton className="rt-loading__line" />
          </div>
        ))}
      </div>
      <div className="rt-loading__wide">
        <Skeleton className="rt-loading__line" />
        {[1, 2, 3, 4].map((index) => (
          <Skeleton className="rt-loading__row" key={index} />
        ))}
      </div>
    </div>
  );
}

export default function Rating() {
    const __i18nLocaleToken = i18nT("sidebar.home");
  useI18n();
  const localeToken = i18nT("sidebar.home");
  const navigate = useNavigate();
  const auth = useAuth();
  const role = auth?.role ?? auth?.user?.role;
  const isExecutor = role === "EXECUTOR";
  const [mode, setMode] = useState("executors");
  const [filters, setFilters] = useState({ search: "", areaId: "", specialty: "", period: "month" });
  const updateFilter = (field, value) => setFilters(prev => ({ ...prev, [field]: value }));
  const params = useMemo(() => ({ period: filters.period, ...(filters.areaId ? { areaId: Number(filters.areaId) } : {}) }), [filters.period, filters.areaId, __i18nLocaleToken]);
  const ratingsQuery = useRatings(params, { enabled: !isExecutor });
  const brigadesQuery = useBrigadeRatings(params, { enabled: !isExecutor });
  const myRatingQuery = useMyRating({ period: filters.period }, { enabled: isExecutor });
  const areasQuery = useAreas();
  const employees = asArray(ratingsQuery.data);
  const brigades = asArray(brigadesQuery.data);
  const areas = asArray(areasQuery.data);
  const specialties = useMemo(() => [...new Set(employees.map(item => item.specialty).filter(Boolean))].sort(), [employees, __i18nLocaleToken]);
  const areaOptions = useMemo(() => [{ value: "", label: i18nT("reportModal.allAreas") }, ...areas.map(item => ({ value: String(item.id), label: item.name }))], [areas, localeToken, __i18nLocaleToken]);
  const specialtyOptions = useMemo(() => [{ value: "", label: i18nT("employeesPage.allSpecialties") }, ...specialties.map(item => ({ value: item, label: item }))], [specialties, localeToken, __i18nLocaleToken]);
  const search = filters.search.trim().toLowerCase();
  const filteredEmployees = useMemo(() => employees.filter(item => {
    const matchesText = !search || [item.fullName, item.specialty].some(v => String(v || "").toLowerCase().includes(search));
    return matchesText && (!filters.specialty || item.specialty === filters.specialty);
  }).sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0)), [employees, search, filters.specialty, __i18nLocaleToken]);
  const filteredBrigades = useMemo(() => brigades.filter(item => !search || String(item.name || "").toLowerCase().includes(search)).sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0)), [brigades, search, __i18nLocaleToken]);
  const isBrigades = mode === "brigades";
  const rows = isBrigades ? filteredBrigades : filteredEmployees;
  const scoredRows = rows.filter(row => finite(row.score));
  const best = scoredRows[0] || null;
  const averageRating = scoredRows.length ? scoredRows.reduce((sum, row) => sum + Number(row.score), 0) / scoredRows.length : null;
  const timedRows = rows.map(row => toPercent(row.onTimeRate)).filter(v => v != null);
  const averageOnTime = timedRows.length ? timedRows.reduce((sum, value) => sum + value, 0) / timedRows.length : null;
  const totalClosed = rows.reduce((sum, row) => sum + (Number(row.closed) || 0), 0);
  const activeFiltersCount = [filters.areaId, !isBrigades && filters.specialty].filter(Boolean).length;
  const employeeColumns = [
    { key: "place", header: "№", minWidth: 62, sortable: false, render: (_, index) => <span className="rt-table-rank">{index + 1}</span> },
    { field: "fullName", header: i18nT("ordersTable.assignee"), minWidth: 235, render: item => <div className="rt-person"><span className="rt-person__avatar">{initials(item.fullName)}</span><div><strong>{item.fullName}</strong><small>{item.specialty || i18nT("components.employees.employeecard.2a2d667")}</small></div></div> },
    { field: "score", header: i18nT("pages.rating.rating.304ce2c"), minWidth: 105, sortValue: row => Number(row.score), render: row => <ScoreBadge value={row.score} /> },
    { field: "quality", header: i18nT("pages.rating.rating.cfedc14"), minWidth: 100, render: row => numberValue(row.quality) },
    { field: "onTimeRate", header: i18nT("pages.rating.rating.a67436e"), minWidth: 115, render: row => <span className="rt-table-rate">{percent(row.onTimeRate)}</span> },
    { field: "reworkRate", header: i18nT("pages.rating.rating.399f7c5"), minWidth: 110, render: row => percent(row.reworkRate) },
    { field: "repeatFailureRate", header: i18nT("pages.rating.rating.0a7f61c"), minWidth: 140, render: row => percent(row.repeatFailureRate) },
    { field: "productivity", header: i18nT("pages.rating.rating.a12969d"), minWidth: 135, render: row => numberValue(row.productivity) },
    { field: "closed", header: i18nT("pages.rating.rating.54a16b9"), minWidth: 105 },
  ];
  const brigadeColumns = [
    { field: "name", header: i18nT("employeeModal.team"), minWidth: 270, render: item => <div className="rt-person"><span className="rt-person__avatar"><RiTeamLine size={17} /></span><div><strong>{item.name}</strong><small>{i18nT("pages.rating.rating.6cef7a4")} {Array.isArray(item.members) ? item.members.length : item.members ?? "—"}</small></div></div> },
    { field: "score", header: i18nT("pages.rating.rating.304ce2c"), minWidth: 125, render: row => <ScoreBadge value={row.score} /> },
    { field: "quality", header: i18nT("pages.rating.rating.cfedc14"), minWidth: 110, render: row => numberValue(row.quality) },
    { field: "onTimeRate", header: i18nT("pages.rating.rating.a67436e"), minWidth: 125, render: row => percent(row.onTimeRate) },
    { field: "repeatFailureRate", header: i18nT("pages.rating.rating.0a7f61c"), minWidth: 145, render: row => percent(row.repeatFailureRate) },
    { field: "closed", header: i18nT("pages.rating.rating.54a16b9"), minWidth: 110 },
  ];

  if (isExecutor) return <MyRatingView period={filters.period} onPeriodChange={value => updateFilter("period", value)} query={myRatingQuery} />;
  const currentQuery = isBrigades ? brigadesQuery : ratingsQuery;
  const loading = currentQuery.isLoading && !currentQuery.data;
  return (
    <div className="rt mx-auto max-w-[1800px] p-7">
      <header className="rt-header">
        <div>
          <h1>{i18nT("pages.rating.rating.304ce2c")}</h1>
          <p>{i18nT("pages.rating.rating.1bf7492")}</p>
        </div>
        <PeriodControl
          value={filters.period}
          onChange={(value) => updateFilter("period", value)}
        />
      </header>
      {currentQuery.isError && <ErrorBox text={getErrorMessage(currentQuery.error)} onRetry={() => currentQuery.refetch()} />}
      {loading ? <RatingSkeleton /> : <>
        <div className="rt-stats">
          <MetricCard
            title={i18nT("pages.rating.rating.d3ad6a2")}
            value={best ? scoreValue(best.score) : "—"}
            note={best ? (isBrigades ? best.name : best.fullName) : "Нет данных"}
            icon={RiTrophyLine}
            tone="blue"
            progress={best && finite(best.score) ? Number(best.score) : null}
          />
          <MetricCard
            title={i18nT("pages.rating.rating.d077e25")}
            value={averageRating == null ? "—" : numberValue(averageRating)}
            note={isBrigades ? "Среди бригад" : "Среди исполнителей"}
            icon={RiStarFill}
            tone="sky"
            progress={averageRating}
          />
          <MetricCard
            title={i18nT("pages.rating.rating.3aff70d")}
            value={averageOnTime == null ? "—" : `${Math.round(averageOnTime)}%`}
            note="Средний показатель"
            icon={RiCheckboxCircleLine}
            tone="green"
            progress={averageOnTime}
          />
          <MetricCard
            title={i18nT("pages.rating.rating.54a16b9")}
            value={totalClosed.toLocaleString("ru-RU")}
            note="За выбранный период"
            icon={RiBarChartBoxLine}
            tone="slate"
          />
        </div>
        {scoredRows.length > 0 && (
          <section className="rt-panel rt-leaders-panel">
            <div className="rt-panel__head rt-panel__head--split">
              <div className="rt-panel__head-main">
                <span className="rt-section-icon"><RiMedalLine size={20} /></span>
                <div>
                  <h2>{i18nT("pages.rating.rating.6fe16c2")}</h2>
                  <p>{isBrigades ? i18nT("pages.rating.rating.0136acf") : i18nT("pages.rating.rating.73799f5")}</p>
                </div>
              </div>
              <span className="rt-head-meta">{i18nT("pages.rating.rating.0a7f305")} {Math.min(scoredRows.length, 3)}</span>
            </div>
            <div className="rt-leaders-grid">
              {scoredRows.slice(0, 3).map((item, index) => (
                <LeaderCard
                  key={item.id ?? index}
                  item={item}
                  rank={index + 1}
                  isBrigade={isBrigades}
                  onClick={isBrigades ? undefined : () => navigate(`/employees/${item.id}`)}
                />
              ))}
            </div>
          </section>
        )}
      </>}
      <section className="rt-panel rt-list-panel">
        <div className="rt-panel__head rt-panel__head--split">
          <div className="rt-panel__head-main">
            <span className="rt-section-icon"><RiFilter3Line size={20} /></span>
            <div>
              <h2>{isBrigades ? i18nT("pages.reports.reports.1d0130f") : i18nT("ratingPage.title")}</h2>
              <p>{i18nT("pages.rating.rating.347239a")}</p>
            </div>
          </div>
          <div className="rt-mode">
            <RubberSegment
              items={MODES()}
              value={mode}
              onChange={setMode}
              trackColor="#ffffff"
              thumbColor="#2563eb"
              textColor="#2563eb"
              activeTextColor="#ffffff"
              size="md"
              radius={10}
              inset={3}
              equalSlots
              draggable
              aria-label={i18nT("pages.rating.rating.2517404")}
            />
          </div>
        </div>
        <div className="rt-filters">
          <label className="rt-search">
            <RiSearchLine size={19} />
            <input
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder={isBrigades ? "Поиск бригады..." : "Поиск исполнителя..."}
              aria-label={i18nT("pages.rating.rating.61c38ae")}
            />
            {filters.search && (
              <button type="button" aria-label={i18nT("pages.employees.employees.employees.30e2d49")} onClick={() => updateFilter("search", "")}>
                <RiCloseLine />
              </button>
            )}
          </label>
          <div className="rt-filter-select">
            <GlideSelect
              options={areaOptions}
              value={filters.areaId}
              onChange={(value) => updateFilter("areaId", value)}
              className="glide-select--field"
              portal
              searchable
              menuWidth={240}
              ariaLabel="Участок"
            />
          </div>
          {!isBrigades && (
            <div className="rt-filter-select">
              <GlideSelect
                options={specialtyOptions}
                value={filters.specialty}
                onChange={(value) => updateFilter("specialty", value)}
                className="glide-select--field"
                portal
                searchable
                menuWidth={240}
                ariaLabel="Специальность"
              />
            </div>
          )}
        </div>
        <div className="rt-list-meta"><div><RiFilter3Line size={15} /><span>{i18nT("employeesPage.found")} <strong>{rows.length}</strong></span>{activeFiltersCount > 0 && <button type="button" onClick={() => setFilters(prev => ({ ...prev, areaId: "", specialty: "", search: "" }))}><RiCloseLine size={15} /> {i18nT("employeesPage.reset")}</button>}</div>{currentQuery.isFetching && !loading && <span className="rt-updating"><RiRefreshLine size={14} /> {i18nT("pages.rating.rating.ac69b22")}</span>}</div>
        <div className="rt-table-wrap">
          {loading ? <RatingSkeleton /> : (
            <SmartTable
              key={mode}
              className="rt-rating-table"
              data={rows}
              columns={isBrigades ? brigadeColumns : employeeColumns}
              dataKey="id"
              mode="sort"
              compact
              striped
              stickyHeader
              minWidth={isBrigades ? 950 : 1260}
              scrollHeight="520px"
              rowClassName={isBrigades ? undefined : () => "cursor-pointer"}
              onRowClick={isBrigades ? undefined : (employee) => navigate(`/employees/${employee.id}`)}
              emptyText={isBrigades ? "Рейтинг бригад пуст" : "Рейтинг исполнителей пуст"}
              emptyDescription={i18nT("pages.rating.rating.6f73dab")}
            />
          )}
        </div>
      </section>
      {!isBrigades && best && (
        <RatingBreakdown rating={best} subtitle={best.fullName} />
      )}
    </div>
  );
}

function MyRatingView({ period, onPeriodChange, query }) {
    const __i18nLocaleToken = i18nT("sidebar.home");
  useI18n();
  const rating = asObject(query.data);
  const validScore = finite(rating?.score);
  const score = validScore ? Number(rating.score) : 0;
  const radialOptions = useMemo(() => ({
    chart: {
      type: "radialBar",
      sparkline: { enabled: true },
      animations: { enabled: true, speed: 450 },
    },
    colors: ["#2563eb"],
    stroke: { lineCap: "round" },
    plotOptions: {
      radialBar: {
        startAngle: -125,
        endAngle: 125,
        hollow: { size: "72%" },
        track: { background: "#eaf1fc", strokeWidth: "100%" },
        dataLabels: {
          name: { show: false },
          value: {
            show: true,
            offsetY: 11,
            fontSize: "36px",
            fontWeight: 750,
            color: "#16345a",
            formatter: () => validScore ? scoreValue(score) : "—",
          },
        },
      },
    },
    tooltip: { enabled: false },
  }), [score, validScore, __i18nLocaleToken]);
  const metrics = rating ? [
    { label: i18nT("pages.rating.rating.cfedc14"), value: numberValue(rating.quality), icon: RiStarFill, tone: "sky" },
    { label: i18nT("pages.rating.rating.a67436e"), value: percent(rating.onTimeRate), icon: RiCheckboxCircleLine, tone: "green" },
    { label: i18nT("pages.rating.rating.399f7c5"), value: percent(rating.reworkRate), icon: RiRefreshLine, tone: "slate" },
    { label: i18nT("pages.rating.rating.0a7f61c"), value: percent(rating.repeatFailureRate), icon: RiBarChartBoxLine, tone: "red" },
    { label: i18nT("pages.rating.rating.ca8a107"), value: percent(rating.returnRate), icon: RiCloseLine, tone: "slate" },
    { label: i18nT("pages.rating.rating.a12969d"), value: numberValue(rating.productivity), icon: RiBarChartBoxLine, tone: "blue" },
    { label: i18nT("pages.rating.rating.86be933"), value: rating.unjustifiedRejects ?? "—", icon: RiShieldCheckLine, tone: "red" },
    { label: i18nT("pages.rating.rating.54a16b9"), value: rating.closed ?? 0, icon: RiCheckboxCircleLine, tone: "green" },
  ] : [];
  return (
    <div className="rt mx-auto max-w-[1800px] p-7">
      <header className="rt-header">
        <div>
          <div className="rt-eyebrow"><RiTrophyLine size={15} /> {i18nT("pages.rating.rating.2af2058")}</div>
          <h1>{i18nT("pages.rating.rating.34bfde9")}</h1>
          <p>{i18nT("pages.rating.rating.df8f838")}</p>
        </div>
        <PeriodControl value={period} onChange={onPeriodChange} />
      </header>
      {query.isError && (
        <ErrorBox text={getErrorMessage(query.error)} onRetry={() => query.refetch()} />
      )}
      {query.isLoading && !query.data ? (
        <RatingSkeleton />
      ) : !rating ? (
        <div className="rt-panel rt-personal-empty">
          <RiTrophyLine size={34} />
          <h2>{i18nT("pages.rating.rating.5cfc524")}</h2>
          <p>{i18nT("pages.rating.rating.93022fc")}</p>
        </div>
      ) : (
        <>
          <section className="rt-panel rt-personal">
            <div className="rt-personal__score">
              <div className="rt-personal__label">{i18nT("pages.rating.rating.bb560ce")}</div>
              <div className="rt-personal__chart">
                <Chart
                  type="radialBar"
                  width="100%"
                  height={202}
                  series={[Math.max(0, Math.min(100, score))]}
                  options={radialOptions}
                />
                <span>{i18nT("pages.rating.rating.0791eff")}</span>
              </div>
              <div className="rt-personal__identity">
                <strong>{rating.fullName || i18nT("pages.rating.rating.0c03d60")}</strong>
                <small>{rating.specialty || i18nT("ordersTable.assignee")}</small>
              </div>
            </div>
            <div className="rt-personal__metrics">
              {metrics.map((metric) => (
                <div className="rt-personal__metric" key={metric.label}>
                  <span className={`rt-personal__metric-icon rt-personal__metric-icon--${metric.tone}`}>
                    <metric.icon size={17} />
                  </span>
                  <p>{metric.label}</p>
                  <strong>{metric.value}</strong>
                </div>
              ))}
            </div>
          </section>
            <RatingBreakdown rating={rating} personal />
        </>
      )}
    </div>
  );
}
