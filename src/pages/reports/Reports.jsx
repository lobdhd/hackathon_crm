import {
  useMemo,
  useState,
} from "react";

import {
  RiAlarmWarningLine,
  RiBarChartBoxLine,
  RiCheckboxCircleLine,
  RiCloseLine,
  RiDownload2Line,
  RiFileExcel2Line,
  RiFileList3Line,
  RiFilePdf2Line,
  RiFilter3Line,
  RiLoader4Line,
  RiRefreshLine,
  RiSearchLine,
  RiSparkling2Line,
  RiTeamLine,
  RiTimeLine,
  RiToolsLine,
} from "react-icons/ri";

import SmartTable from "../../react-components/SmartTable/SmartTable.jsx";
import GlideSelect from "../../react-components/GlideSelect/GlideSelect.jsx";
import RubberSegment from "../../react-components/RubberSegment/RubberSegment.jsx";
import RangeDatePicker from "../../react-components/RangeDatePicker/RangeDatePicker.jsx";
import "./Reports.css";
import "./ReportsSummary.css";

import {
  downloadWorkOrderReportPdf,
  exportReport,
} from "../../api/reports.api.js";

import {
  useBrigadeRatings,
  useDowntimeReport,
  useMaterialsReport,
  useRatings,
  useShiftReport,
} from "../../hooks/useReports.js";

import {
  useWorkOrders,
} from "../../hooks/useWorkOrders.js";

import {
  useAreas,
  useBrigades,
  useEquipmentReference,
  useExecutors,
} from "../../hooks/useReferences.js";

import {
  useI18n,
} from "../../i18n/index.js";
import { t as i18nT } from "../../i18n/index.js";


// MARK: Config

const REPORT_TYPES = () => ([
  {
    id: "shift",
    title: i18nT("pages.reports.reports.f8c41b8"),
    description:
      i18nT("pages.reports.reports.fbf250a"),
    icon: RiTimeLine,
    tone: "rp-type-icon",
    preview: true,
  },

  {
    id: "orders",
    title: i18nT("sidebar.orders"),
    description:
      i18nT("pages.reports.reports.d49dbb9"),
    icon: RiFileList3Line,
    tone: "rp-type-icon",
    preview: false,
  },

  {
    id: "ratings",
    title: i18nT("pages.reports.reports.d161594"),
    description:
      i18nT("pages.reports.reports.51ed60d"),
    icon: RiBarChartBoxLine,
    tone: "rp-type-icon",
    preview: true,
  },

  {
    id: "brigades",
    title: i18nT("pages.reports.reports.1d0130f"),
    description:
      i18nT("pages.reports.reports.7131185"),
    icon: RiTeamLine,
    tone: "rp-type-icon",
    preview: true,
  },

  {
    id: "materials",
    title: i18nT("pages.admin.admin.admin.79bfff8"),
    description:
      i18nT("pages.reports.reports.129957d"),
    icon: RiToolsLine,
    tone: "rp-type-icon",
    preview: true,
  },

  {
    id: "downtime",
    title: i18nT("pages.reports.reports.a442cd9"),
    description:
      i18nT("pages.reports.reports.bf74d13"),
    icon: RiAlarmWarningLine,
    tone: "rp-type-icon",
    preview: true,
  },

  {
    id: "anomalies",
    title: i18nT("pages.analytics.analytics.fb6342c"),
    description:
      i18nT("pages.reports.reports.c8f354a"),
    icon: RiSparkling2Line,
    tone: "rp-type-icon",
    preview: false,
  },
]);

const PERIODS = () => ([
  {
    value: "shift",
    label: i18nT("reportModal.shift"),
  },
  {
    value: "day",
    label: i18nT("pages.analytics.analytics.81e7619"),
  },
  {
    value: "week",
    label: i18nT("analyticsPage.week"),
  },
  {
    value: "month",
    label: i18nT("reportModal.thirtyDays"),
  },
]);

const GROUP_BY_OPTIONS = () => ([
  {
    value: "material",
    label: i18nT("pages.reports.reports.2bc8226"),
  },
  {
    value: "area",
    label: i18nT("pages.reports.reports.c281f4e"),
  },
  {
    value: "equipment",
    label: i18nT("pages.reports.reports.1cea1b8"),
  },
  {
    value: "executor",
    label: i18nT("pages.reports.reports.a3436b1"),
  },
]);


// MARK: Helpers

function asArray(value) {
  return Array.isArray(
    value,
  )
    ? value
    : [];
}

function extractError(error) {
  return (
    error?.response?.data
      ?.error ||
    error?.message ||
    "Не удалось выполнить запрос"
  );
}

function formatMinutes(value) {
  const minutes =
    Math.max(
      0,
      Math.round(
        Number(
          value,
        ) || 0,
      ),
    );

  if (minutes < 60) {
    return `${minutes} мин`;
  }

  const hours =
    Math.floor(
      minutes / 60,
    );

  const rest =
    minutes % 60;

  return rest
    ? `${hours} ч ${rest} мин`
    : `${hours} ч`;
}

function formatPercent(value) {
  const number =
    Number(value);

  if (
    !Number.isFinite(
      number,
    )
  ) {
    return "—";
  }

  const normalized =
    number <= 1
      ? number * 100
      : number;

  return `${Math.round(
    normalized,
  )}%`;
}

function getMaterialName(
  item,
) {
  if (
    item?.material &&
    typeof item.material ===
    "object"
  ) {
    return (
      item.material.name ||
      "—"
    );
  }

  return (
    item?.material ||
    "—"
  );
}

function getMaterialUnit(
  item,
) {
  if (
    item?.material &&
    typeof item.material ===
    "object"
  ) {
    return (
      item.material.unit ||
      item.unit ||
      ""
    );
  }

  return (
    item?.unit ||
    ""
  );
}

function formatNumber(
  value,
  digits = 2,
) {
  const number =
    Number(value);

  if (
    !Number.isFinite(
      number,
    )
  ) {
    return "—";
  }

  return number.toLocaleString(
    "ru-RU",
    {
      maximumFractionDigits:
        digits,
    },
  );
}

function toIso(value) {
  if (!value) {
    return undefined;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return undefined;
  }

  return date.toISOString();
}

function downloadBlob(
  blob,
  filename,
) {
  const url =
    URL.createObjectURL(
      blob,
    );

  const anchor =
    document.createElement(
      "a",
    );

  anchor.href =
    url;

  anchor.download =
    filename;

  document.body.appendChild(
    anchor,
  );

  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(
    url,
  );
}


// Translate a selected calendar date into local wall-clock bounds.
// This keeps all of the final day (23:59:59.999) in the backend time range.
function dateBoundaryLocal(date, endOfDay = false) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`;
}

// MARK: Page

export default function Reports() {
  const __i18nLocaleToken = i18nT("sidebar.home");
  useI18n();

  const [
    selectedType,
    setSelectedType,
  ] = useState(
    "shift",
  );

  const [
    filters,
    setFilters,
  ] = useState({
    period: "month",
    from: "",
    to: "",
    areaId: "",
    equipmentId: "",
    executorId: "",
    brigadeId: "",
    groupBy: "material",
  });

  const [
    search,
    setSearch,
  ] = useState("");

  const [dateRange, setDateRange] = useState([null, null]);

  const [
    exportLoading,
    setExportLoading,
  ] = useState("");

  const [
    exportError,
    setExportError,
  ] = useState("");

  const [
    orderReportId,
    setOrderReportId,
  ] = useState("");

  const [
    orderPdfSearch,
    setOrderPdfSearch,
  ] = useState("");
  const [orderSuggestionsOpen, setOrderSuggestionsOpen] = useState(false);
  const [orderSuggestionIndex, setOrderSuggestionIndex] = useState(0);

  const [
    orderPdfLoading,
    setOrderPdfLoading,
  ] = useState(false);

  const [
    orderPdfError,
    setOrderPdfError,
  ] = useState("");


  // MARK: References

  const areasQuery =
    useAreas();

  const equipmentQuery =
    useEquipmentReference(
      filters.areaId
        ? Number(
          filters.areaId,
        )
        : null,
    );

  const executorsQuery =
    useExecutors();

  const brigadesQuery =
    useBrigades();

  const workOrdersQuery =
    useWorkOrders({
      compact: true,
      limit: 500,
      offset: 0,
    });

  const areas =
    asArray(
      areasQuery.data,
    );

  const equipment =
    asArray(
      equipmentQuery.data,
    );

  const executors =
    asArray(
      executorsQuery.data,
    );

  const brigades =
    asArray(
      brigadesQuery.data,
    );

  const workOrders =
    asArray(
      workOrdersQuery.data?.items,
    );

  const selectedOrderReport =
    useMemo(
      () =>
        workOrders.find(
          (order) =>
            Number(
              order.id,
            ) ===
            Number(
              orderReportId,
            ),
        ) ?? null,
      [
        workOrders,
        orderReportId,
        __i18nLocaleToken],
    );

  const orderReportOptions =
    useMemo(() => {
      const searchValue =
        orderPdfSearch
          .trim()
          .toLowerCase();

      const filtered =
        workOrders.filter(
          (order) => {
            if (
              !searchValue
            ) {
              return true;
            }

            return [
              order.number,
              order.description,
              order.equipment?.name,
              order.equipment?.inventoryNumber,
              order.area?.name,
              order.assignee?.fullName,
              order.status,
            ]
              .filter(Boolean)
              .some(
                (value) =>
                  String(
                    value,
                  )
                    .toLowerCase()
                    .includes(
                      searchValue,
                    ),
              );
          },
        );

      const selected =
        workOrders.find(
          (order) =>
            Number(
              order.id,
            ) ===
            Number(
              orderReportId,
            ),
        );

      const source =
        selected &&
          !filtered.some(
            (order) =>
              Number(
                order.id,
              ) ===
              Number(
                selected.id,
              ),
          )
          ? [
            selected,
            ...filtered,
          ]
          : filtered;

      return [
        {
          value: "",
          label: i18nT("pages.reports.reports.18b12b9"),
        },

        ...source.map(
          (order) => ({
            value:
              String(
                order.id,
              ),

            label:
              [
                order.number ||
                `#${order.id}`,
                order.equipment
                  ?.name,
                order.description,
              ]
                .filter(Boolean)
                .join(
                  " — ",
                ),

            tag:
              order.status ||
              undefined,
          }),
        ),
      ];
    }, [
      workOrders,
      orderPdfSearch,
      orderReportId,
      __i18nLocaleToken]);


  // Suggestions for the search input (independent of GlideSelect's built-in search).
  const orderSearchMatches = useMemo(() => {
    const term = orderPdfSearch.trim().toLocaleLowerCase();
    if (!term) return [];
    return workOrders.filter((order) => [
      order.number,
      order.description,
      order.equipment?.name,
      order.equipment?.inventoryNumber,
      order.area?.name,
      order.assignee?.fullName,
      order.status,
    ].filter(Boolean).some((part) => String(part).toLocaleLowerCase().includes(term))).slice(0, 8);
  }, [workOrders, orderPdfSearch]);

  function selectOrderSuggestion(order) {
    setOrderReportId(String(order.id));
    setOrderPdfSearch(String(order.number || `#${order.id}`));
    setOrderSuggestionsOpen(false);
    setOrderPdfError("");
  }

  function handleDateRangeChange(nextRange) {
    const start = nextRange?.[0] ?? null;
    const end = nextRange?.[1] ?? null;
    setDateRange([start, end]);
    // Keep previous API dates until the user finishes selecting both ends.
    // Clearing the picker removes the date filter immediately.
    if (!start || end) {
      setFilters((previous) => ({
        ...previous,
        from: start ? dateBoundaryLocal(start) : "",
        to: end ? dateBoundaryLocal(end, true) : "",
      }));
      setExportError("");
    }
  }

  // MARK: Params

  const reportParams =
    useMemo(() => {
      const params = {
        period:
          filters.period,

        ...(filters.areaId
          ? {
            areaId:
              Number(
                filters.areaId,
              ),
          }
          : {}),

        ...(filters.equipmentId
          ? {
            equipmentId:
              Number(
                filters.equipmentId,
              ),
          }
          : {}),

        ...(filters.executorId
          ? {
            executorId:
              Number(
                filters.executorId,
              ),
          }
          : {}),

        ...(filters.brigadeId
          ? {
            brigadeId:
              Number(
                filters.brigadeId,
              ),
          }
          : {}),
      };

      const from =
        toIso(
          filters.from,
        );

      const to =
        toIso(
          filters.to,
        );

      if (from) {
        params.from =
          from;
      }

      if (to) {
        params.to =
          to;
      }

      return params;
    }, [
      filters,
      __i18nLocaleToken]);


  // MARK: Queries

  const shiftQuery =
    useShiftReport(
      reportParams,
      {
        enabled:
          selectedType ===
          "shift",
      },
    );

  const ratingsQuery =
    useRatings(
      reportParams,
      {
        enabled:
          selectedType ===
          "ratings",
      },
    );

  const brigadeRatingsQuery =
    useBrigadeRatings(
      reportParams,
      {
        enabled:
          selectedType ===
          "brigades",
      },
    );

  const materialsQuery =
    useMaterialsReport(
      {
        ...reportParams,

        groupBy:
          filters.groupBy,
      },
      {
        enabled:
          selectedType ===
          "materials",
      },
    );

  const downtimeQuery =
    useDowntimeReport(
      reportParams,
      {
        enabled:
          selectedType ===
          "downtime",
      },
    );


  // MARK: Filter

  function updateFilter(
    field,
    value,
  ) {
    setFilters(
      (
        previous,
      ) => ({
        ...previous,
        [field]:
          value,
      }),
    );

    setExportError("");
  }

  function resetFilters() {
    setDateRange([null, null]);
    setFilters({
      period: "month",
      from: "",
      to: "",
      areaId: "",
      equipmentId: "",
      executorId: "",
      brigadeId: "",
      groupBy: "material",
    });

    setSearch("");
    setExportError("");
  }

  function handleAreaChange(
    value,
  ) {
    setFilters(
      (
        previous,
      ) => ({
        ...previous,
        areaId:
          value,
        equipmentId:
          "",
      }),
    );
  }

  const activeFilterCount =
    [
      filters.from,
      filters.to,
      filters.areaId,
      filters.equipmentId,
      filters.executorId,
      filters.brigadeId,
    ].filter(
      Boolean,
    ).length;


  // MARK: Data

  const shift =
    shiftQuery.data ??
    {};

  const ratings =
    asArray(
      ratingsQuery.data,
    );

  const brigadeRatings =
    asArray(
      brigadeRatingsQuery.data,
    );

  const materials =
    asArray(
      materialsQuery.data,
    );

  const downtime =
    downtimeQuery.data ??
    {};

  const downtimeItems =
    asArray(
      downtime.items,
    );

  const query =
    search
      .trim()
      .toLowerCase();


  const filteredRatings =
    useMemo(
      () =>
        ratings.filter(
          (
            item,
          ) =>
            !query ||
            String(
              item.fullName ||
              "",
            )
              .toLowerCase()
              .includes(
                query,
              ) ||
            String(
              item.specialty ||
              "",
            )
              .toLowerCase()
              .includes(
                query,
              ),
        ),
      [
        ratings,
        query,
        __i18nLocaleToken],
    );

  const filteredBrigades =
    useMemo(
      () =>
        brigadeRatings.filter(
          (
            item,
          ) =>
            !query ||
            String(
              item.name ||
              "",
            )
              .toLowerCase()
              .includes(
                query,
              ),
        ),
      [
        brigadeRatings,
        query,
        __i18nLocaleToken],
    );

  const filteredMaterials =
    useMemo(
      () =>
        materials.filter(
          (item) =>
            !query ||
            [
              item.group?.name,
              getMaterialName(
                item,
              ),
              getMaterialUnit(
                item,
              ),
            ].some(
              (value) =>
                String(
                  value ||
                  "",
                )
                  .toLowerCase()
                  .includes(
                    query,
                  ),
            ),
        ),
      [
        materials,
        query,
        __i18nLocaleToken],
    );

  const filteredDowntime =
    useMemo(
      () =>
        downtimeItems.filter(
          (
            item,
          ) =>
            !query ||
            [
              item.number,
              item.equipment
                ?.name,
              item.area
                ?.name,
              item.faultCode
                ?.code,
              item.reason,
            ].some(
              (
                value,
              ) =>
                String(
                  value ||
                  "",
                )
                  .toLowerCase()
                  .includes(
                    query,
                  ),
            ),
        ),
      [
        downtimeItems,
        query,
        __i18nLocaleToken],
    );


  // MARK: Export

  async function handleExport(
    format,
  ) {
    setExportError("");

    const key =
      `${selectedType}-${format}`;

    setExportLoading(
      key,
    );

    try {
      const blob =
        await exportReport(
          format,
          {
            ...reportParams,

            report:
              selectedType,

            ...(selectedType ===
              "materials"
              ? {
                groupBy:
                  filters.groupBy,
              }
              : {}),
          },
        );

      const date =
        new Date()
          .toISOString()
          .slice(
            0,
            10,
          );

      downloadBlob(
        blob,
        `naryadai-${selectedType}-${date}.${format}`,
      );
    } catch (
    error
    ) {
      setExportError(
        extractError(
          error,
        ),
      );
    } finally {
      setExportLoading(
        "",
      );
    }
  }


  // MARK: Order PDF

  async function handleOrderPdf(
    event,
  ) {
    event.preventDefault();

    const id =
      Number(
        orderReportId,
      );

    if (
      !Number.isFinite(
        id,
      ) ||
      id <= 0
    ) {
      setOrderPdfError(
        "Выберите наряд",
      );

      return;
    }

    setOrderPdfLoading(
      true,
    );

    setOrderPdfError(
      "",
    );

    try {
      const blob =
        await downloadWorkOrderReportPdf(
          id,
        );

      const filePart =
        String(
          selectedOrderReport?.number ||
          `naryad-${id}`,
        ).replace(
          /[\\/:*?"<>|]+/g,
          "-",
        );

      downloadBlob(
        blob,
        `${filePart}.pdf`,
      );
    } catch (
    error
    ) {
      setOrderPdfError(
        extractError(
          error,
        ),
      );
    } finally {
      setOrderPdfLoading(
        false,
      );
    }
  }


  // MARK: Current report

  const currentType =
    REPORT_TYPES().find(
      (
        item,
      ) =>
        item.id ===
        selectedType,
    ) ??
    REPORT_TYPES()[0];

  const CurrentReportIcon = currentType.icon;

  const currentLoading =
    selectedType ===
      "shift"
      ? shiftQuery.isLoading
      : selectedType ===
        "ratings"
        ? ratingsQuery.isLoading
        : selectedType ===
          "brigades"
          ? brigadeRatingsQuery.isLoading
          : selectedType ===
            "materials"
            ? materialsQuery.isLoading
            : selectedType ===
              "downtime"
              ? downtimeQuery.isLoading
              : false;

  const currentError =
    selectedType ===
      "shift"
      ? shiftQuery.error
      : selectedType ===
        "ratings"
        ? ratingsQuery.error
        : selectedType ===
          "brigades"
          ? brigadeRatingsQuery.error
          : selectedType ===
            "materials"
            ? materialsQuery.error
            : selectedType ===
              "downtime"
              ? downtimeQuery.error
              : null;


  return (
    <div className="rp mx-auto max-w-[1800px] p-7">
      <header className="rp-header">
        <div className="rp-header__copy">
          <h1 className="rp-title">{i18nT("pages.reports.reports.2c687d6")}</h1>
          <p className="rp-subtitle">{i18nT("pages.reports.reports.0c97cf6")}</p>
        </div>
        <div className="rp-header__actions">
          <button type="button" className="rp-button rp-button--soft" disabled={Boolean(exportLoading)} onClick={() => handleExport("xlsx")}>
            {exportLoading === `${selectedType}-xlsx` ? <RiLoader4Line className="rp-spin" size={18} /> : <RiFileExcel2Line size={18} />}
            Excel
          </button>
          <button type="button" className="rp-button rp-button--primary" disabled={Boolean(exportLoading)} onClick={() => handleExport("pdf")}>
            {exportLoading === `${selectedType}-pdf` ? <RiLoader4Line className="rp-spin" size={18} /> : <RiFilePdf2Line size={18} />}
            PDF
          </button>
        </div>
      </header>

      {exportError && (
        <div className="rp-error" role="alert"><RiAlarmWarningLine size={18} />{exportError}</div>
      )}

      <section className="rp-types-section">
        <div className="rp-types-grid">
          {REPORT_TYPES().map((report) => (
            <ReportTypeCard
              key={report.id}
              report={report}
              active={selectedType === report.id}
              onClick={() => {
                setSelectedType(report.id);
                setSearch("");
                setExportError("");
              }}
            />
          ))}
        </div>
      </section>

      <section className="rp-panel rp-filters">
        <div className="rp-filter-top">
          <div className="rp-filter-heading">
            <span className="rp-head-icon"><RiFilter3Line size={18} /></span>
            <div>
              <h2>{i18nT("pages.reports.reports.43a4bd2")}</h2>
              <p>{i18nT("pages.reports.reports.bd6b44b")}</p>
            </div>
          </div>
          <div className="rp-period-wrap">
            <RubberSegment
              items={PERIODS()}
              value={filters.period}
              onChange={(next) => updateFilter("period", next)}
              trackColor="#ffffff"
              thumbColor="#2563eb"
              textColor="#2563eb"
              activeTextColor="#ffffff"
              size="md"
              radius={10}
              inset={3}
              equalSlots
              draggable
              aria-label="Период отчёта"
            />
          </div>
        </div>

        <div className="rp-fields">
          <FilterField label={`${i18nT("reportModal.from")} — ${i18nT("reportModal.to")}`}>
            <RangeDatePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              placeholder="Выберите даты"
              ariaLabel="Диапазон дат отчёта"
            />
          </FilterField>
          <FilterField label={i18nT("ordersTable.area")}>
            <GlideSelect
              className="glide-select--field"
              value={filters.areaId}
              onChange={handleAreaChange}
              options={[{ value: "", label: i18nT("reportModal.allAreas") }, ...areas.map(a => ({ value: String(a.id), label: a.name }))]}
              portal
              searchable
              ariaLabel={i18nT("ordersTable.area")}
            />
          </FilterField>
          <FilterField label={i18nT("sidebar.equipment")}>
            <GlideSelect
              className="glide-select--field"
              value={filters.equipmentId}
              onChange={(next) => updateFilter("equipmentId", next)}
              options={[{ value: "", label: i18nT("equipmentDetails.allEquipment") }, ...equipment.map(item => ({ value: String(item.id), label: item.name }))]}
              portal
              searchable
              ariaLabel={i18nT("sidebar.equipment")}
            />
          </FilterField>
          <FilterField label={i18nT("ordersTable.assignee")}>
            <GlideSelect
              className="glide-select--field"
              value={filters.executorId}
              onChange={(next) => updateFilter("executorId", next)}
              options={[{ value: "", label: i18nT("employeeDetails.allEmployees") }, ...executors.map(e => ({ value: String(e.id), label: e.fullName }))]}
              portal
              searchable
              ariaLabel={i18nT("ordersTable.assignee")}
            />
          </FilterField>
          <FilterField label={i18nT("employeeModal.team")}>
            <GlideSelect
              className="glide-select--field"
              value={filters.brigadeId}
              onChange={(next) => updateFilter("brigadeId", next)}
              options={[{ value: "", label: i18nT("pages.orders.orders.orders.b8b0a3b") }, ...brigades.map(b => ({ value: String(b.id), label: b.name }))]}
              portal
              searchable
              ariaLabel={i18nT("employeeModal.team")}
            />
          </FilterField>
          {selectedType === "materials" && (
            <FilterField label="Группировка">
              <GlideSelect
                className="glide-select--field"
                value={filters.groupBy}
                onChange={(next) => updateFilter("groupBy", next)}
                options={GROUP_BY_OPTIONS()}
                portal
                ariaLabel="Группировка"
              />
            </FilterField>
          )}
        </div>
        <div className="rp-filter-bottom">
          <div className="rp-filter-count">
            <RiFilter3Line size={17} />
            {i18nT("pages.reports.reports.43a4bd2")}
            <span className="rp-count-pill">{activeFilterCount}</span>
            {activeFilterCount > 0 && (
              <button type="button" className="rp-clear" onClick={resetFilters}>
                <RiCloseLine size={16} />{i18nT("employeesPage.reset")}
              </button>
            )}
          </div>
          {currentType.preview && (
            <div className="rp-search">
              <RiSearchLine size={17} aria-hidden="true" />
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={i18nT("pages.reports.reports.926c41b")} aria-label={i18nT("pages.reports.reports.926c41b")} />
            </div>
          )}
        </div>
      </section>

      <section className="rp-panel rp-preview">
        <div className="rp-panel-head">
          <div className="rp-panel-head__copy">
            <div className="rp-panel-head__icon"><CurrentReportIcon size={20} /></div>
            <div>
              <h2>{currentType.title}</h2>
              <p>{currentType.preview ? "Предпросмотр данных с backend" : "Этот отчёт доступен через экспорт"}</p>
            </div>
          </div>
          {currentType.preview && (
            <button type="button" className="rp-button rp-button--outline rp-button--small" onClick={() => {
              if (selectedType === "shift") shiftQuery.refetch();
              else if (selectedType === "ratings") ratingsQuery.refetch();
              else if (selectedType === "brigades") brigadeRatingsQuery.refetch();
              else if (selectedType === "materials") materialsQuery.refetch();
              else if (selectedType === "downtime") downtimeQuery.refetch();
            }}>
              <RiRefreshLine size={16} />
              {i18nT("components.layout.appnavbar.dbe5444")}
            </button>
          )}
        </div>
        <div className="rp-preview-body">
          {currentLoading ? (
            <PreviewLoader />
          ) : currentError ? (
            <ErrorState text={extractError(currentError)} />
          ) : selectedType === "shift" ? (
            <ShiftReport data={shift} />
          ) : selectedType === "ratings" ? (
            <RatingsReport data={filteredRatings} />
          ) : selectedType === "brigades" ? (
            <BrigadesReport data={filteredBrigades} />
          ) : selectedType === "materials" ? (
            <MaterialsReport data={filteredMaterials} />
          ) : selectedType === "downtime" ? (
            <DowntimeReport data={downtime} items={filteredDowntime} />
          ) : (
            <ExportOnly
              type={currentType}
              onXlsx={() => handleExport("xlsx")}
              onPdf={() => handleExport("pdf")}
              loading={exportLoading}
            />
          )}
        </div>
      </section>

      <section className="rp-panel rp-pdf">
        <div className="rp-panel-head">
          <div className="rp-panel-head__copy">
            <div className="rp-panel-head__icon"><RiFilePdf2Line size={20} /></div>
            <div>
              <h2>{i18nT("pages.reports.reports.3d67cbb")}</h2>
              <p>{i18nT("pages.reports.reports.16ffacb")}</p>
            </div>
          </div>
          <span className="rp-pdf__symbol"><RiDownload2Line size={19} /></span>
        </div>
        <form onSubmit={handleOrderPdf} className="rp-pdf-form">
          {orderPdfError && <div className="rp-error" role="alert">{orderPdfError}</div>}
          <div className="rp-pdf-grid">
            <div
              className="rp-search rp-pdf-search"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setOrderSuggestionsOpen(false);
              }}
            >
              <RiSearchLine size={17} aria-hidden="true" />
              <input
                type="search"
                autoComplete="off"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={orderSuggestionsOpen && Boolean(orderPdfSearch.trim())}
                aria-controls="rp-order-search-suggestions"
                value={orderPdfSearch}
                onFocus={() => setOrderSuggestionsOpen(Boolean(orderPdfSearch.trim()))}
                onChange={(event) => {
                  setOrderPdfSearch(event.target.value);
                  setOrderSuggestionIndex(0);
                  setOrderSuggestionsOpen(Boolean(event.target.value.trim()));
                }}
                onKeyDown={(event) => {
                  if (!orderPdfSearch.trim()) return;
                  if (event.key === "Escape") { setOrderSuggestionsOpen(false); return; }
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setOrderSuggestionsOpen(true);
                    setOrderSuggestionIndex((index) => Math.min(index + 1, Math.max(orderSearchMatches.length - 1, 0)));
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setOrderSuggestionIndex((index) => Math.max(0, index - 1));
                  } else if (event.key === "Enter" && orderSuggestionsOpen && orderSearchMatches.length) {
                    event.preventDefault();
                    selectOrderSuggestion(orderSearchMatches[orderSuggestionIndex] || orderSearchMatches[0]);
                  }
                }}
                placeholder={i18nT("pages.reports.reports.74c0c32")}
              />
              {orderSuggestionsOpen && Boolean(orderPdfSearch.trim()) && (
                <div className="rp-order-suggestions" id="rp-order-search-suggestions" role="listbox" aria-label="Подсказки по нарядам">
                  {orderSearchMatches.length ? orderSearchMatches.map((order, index) => (
                    <button
                      type="button"
                      role="option"
                      aria-selected={index === orderSuggestionIndex}
                      key={order.id}
                      className={`rp-order-suggestion${index === orderSuggestionIndex ? " rp-order-suggestion--active" : ""}`}
                      onMouseEnter={() => setOrderSuggestionIndex(index)}
                      onClick={() => selectOrderSuggestion(order)}
                    >
                      <span className="rp-order-suggestion__number">{order.number || `#${order.id}`}</span>
                      <span className="rp-order-suggestion__details">{[order.equipment?.name, order.description].filter(Boolean).join(" — ") || "Наряд"}</span>
                    </button>
                  )) : (
                    <div className="rp-order-suggestions__empty">Наряды не найдены</div>
                  )}
                </div>
              )}
            </div>
            <GlideSelect
              options={orderReportOptions}
              value={orderReportId}
              onChange={(next) => { setOrderReportId(next); setOrderPdfError(""); }}
              placeholder={workOrdersQuery.isLoading ? "Загрузка нарядов..." : i18nT("pages.reports.reports.18b12b9")}
              className="glide-select--field"
              menuWidth={560}
              menuMaxHeight={290}
              placement="top"
              portal
              searchable
              disabled={workOrdersQuery.isLoading}
              ariaLabel={i18nT("pages.reports.reports.18b12b9")}
            />
            <button type="submit" className="rp-button rp-button--primary rp-button--download" disabled={orderPdfLoading || workOrdersQuery.isLoading || !orderReportId}>
              {orderPdfLoading ? <RiLoader4Line size={18} className="rp-spin" /> : <RiDownload2Line size={18} />}
              {i18nT("pages.reports.reports.e546f78")}
            </button>
          </div>
          {workOrdersQuery.isError && (
            <div className="rp-error rp-error--inline">
              <span>{i18nT("pages.reports.reports.a3fe4d3")}</span>
              <button type="button" onClick={() => workOrdersQuery.refetch()}><RiRefreshLine size={16} />{i18nT("components.layout.appnavbar.b914bbb")}</button>
            </div>
          )}
          {!workOrdersQuery.isLoading && !workOrdersQuery.isError && workOrders.length === 0 && (
            <div className="rp-note">{i18nT("pages.reports.reports.50ce7c4")}</div>
          )}
          {selectedOrderReport && <SelectedOrderPdfPreview order={selectedOrderReport} />}
        </form>
      </section>
    </div>
  );
}


// MARK: Selected order PDF

function SelectedOrderPdfPreview({
  order,
}) {
  useI18n();
  return (
    <div className="rp-selected-order">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-blue-600">
              {order.number ||
                `#${order.id}`}
            </span>

            {order.status && (
              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-gray-500 shadow-sm">
                {
                  order.status
                }
              </span>
            )}
          </div>

          <p className="mt-2 line-clamp-2 text-sm font-semibold text-gray-900">
            {order.description ||
              "Описание не указано"}
          </p>
        </div>

        <div className="grid shrink-0 grid-cols-1 gap-1 text-xs text-gray-500 md:min-w-[280px]">
          <p>
            <span className="text-gray-400">
              {i18nT("pages.reports.reports.060640c")}
            </span>{" "}

            <span className="font-medium text-gray-700">
              {order.equipment
                ?.name ||
                "—"}
            </span>
          </p>

          <p>
            <span className="text-gray-400">
              {i18nT("pages.reports.reports.d928b7d")}
            </span>{" "}

            <span className="font-medium text-gray-700">
              {order.area
                ?.name ||
                "—"}
            </span>
          </p>

          <p>
            <span className="text-gray-400">
              {i18nT("pages.reports.reports.1bdb0ac")}
            </span>{" "}

            <span className="font-medium text-gray-700">
              {order.assignee
                ?.fullName ||
                "Не назначен"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}


// MARK: Type Card

function ReportTypeCard({ report, active, onClick }) {
  const Icon = report.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rp-type${active ? " rp-type--active" : ""}`}
    >
      <span className={`rp-type__icon rp-type__icon--${report.id}`}><Icon size={21} /></span>
      <span className="rp-type__title">{report.title}</span>
      <span className="rp-type__desc">{report.description}</span>
      <span className="rp-type__footer">
        <span className="rp-type__dot" aria-hidden="true" />
      </span>
    </button>
  );
}


// MARK: Shift

function ShiftReport({
  data,
}) {
  useI18n();
  const __i18nLocaleToken = i18nT("sidebar.home");
  const load =
    asArray(
      data.load,
    );

  const columns =
    useMemo(
      () => [
        {
          field:
            "fullName",

          header:
            i18nT("ordersTable.assignee"),

          minWidth:
            240,

          render:
            (
              item,
            ) => (
              <div>
                <p className="font-semibold text-gray-900">
                  {
                    item.fullName
                  }
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  {item.specialty ||
                    "—"}
                </p>
              </div>
            ),
        },

        {
          field:
            "assigned",

          header:
            "Назначено",

          minWidth:
            110,
        },

        {
          field:
            "completed",

          header:
            i18nT("ratingTable.completed"),

          minWidth:
            110,
        },

        {
          field:
            "activeNow",

          header:
            "Активно",

          minWidth:
            100,
        },

        {
          field:
            "employeeStatus",

          header:
            i18nT("employeeModal.status"),

          minWidth:
            130,

          render:
            (
              item,
            ) => (
              <EmployeeStatus
                value={
                  item.employeeStatus
                }
              />
            ),
        },

        {
          field:
            "isOnShift",

          header:
            i18nT("pages.admin.admin.admin.958b816"),

          minWidth:
            110,

          render:
            (
              item,
            ) =>
              item.isOnShift
                ? "Да"
                : "Нет",
        },
      ],
      [__i18nLocaleToken],
    );

  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        <MiniKpi
          label={i18nT("kanban.issued")}
          value={
            data.issued ??
            0
          }
        />

        <MiniKpi
          label={i18nT("ratingTable.completed")}
          value={
            data.completed ??
            0
          }
        />

        <MiniKpi
          label={i18nT("ratingPodium.closed")}
          value={
            data.closed ??
            0
          }
        />

        <MiniKpi
          label={i18nT("kanban.overdue")}
          value={
            data.overdue ??
            0
          }
          danger
        />

        <MiniKpi
          label={i18nT("status.inProgress")}
          value={
            data.inProgress ??
            0
          }
        />

        <MiniKpi
          label={i18nT("analytics.downtime.label")}
          value={formatMinutes(
            data.downtime
              ?.minutes,
          )}
        />
      </div>

      {data.aiSummary && (
        <ShiftAISummary summary={data.aiSummary} data={data} />
      )}

      <SmartTable
        data={
          load
        }
        columns={
          columns
        }
        dataKey="id"
        mode="sort"
        compact
        striped
        stickyHeader
        minWidth={
          850
        }
        scrollHeight="420px"
        emptyText="Нет данных по исполнителям"
      />
    </>
  );
}


// MARK: Structured shift AI summary
// The backend already returns the figures in structured form when available.
// The AI text supplies additional indicators (e.g. rejected orders) that
// aren't guaranteed to have their own API field. Do not fabricate time series.

function readSummaryNumber(text, regex) {
  const match = text.match(regex);
  if (!match) return null;
  const result = Number(match[1].replace(/[^\d]/g, ""));
  return Number.isFinite(result) ? result : null;
}

function reportNumber(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const number = Number(value);
    if (Number.isFinite(number) && number >= 0) return number;
  }
  return null;
}

function summaryMetrics(summary, data) {
  const text = String(summary || "");
  const fromText = (regex) => readSummaryNumber(text, regex);
  return {
    issued: reportNumber(data.issued, fromText(/выдано\s+([\d\s\u00a0]+)/i)),
    closed: reportNumber(data.closed, fromText(/закрыто\s+([\d\s\u00a0]+)/i)),
    overdue: reportNumber(data.overdue, fromText(/просрочено\s+([\d\s\u00a0]+)/i)),
    rejected: reportNumber(data.rejected, data.rejectedOrders, fromText(/отклонено\s+([\d\s\u00a0]+)/i)),
    downtimeMinutes: reportNumber(data.downtime?.minutes, fromText(/простой(?:\s+оборудования)?\s+([\d\s\u00a0]+)\s*мин/i)),
    downtimeNow: reportNumber(data.downtime?.equipmentInDowntimeNow, fromText(/сейчас\s+в\s+простое\s+([\d\s\u00a0]+)/i)),
    onShift: reportNumber(data.workload?.executorsOnShift, fromText(/на\s+смене\s+([\d\s\u00a0]+)\s+исполнител/i)),
    busy: reportNumber(data.workload?.busy, fromText(/заняты\s+([\d\s\u00a0]+)/i)),
  };
}

const safePercent = (part, total) =>
  total > 0 && part !== null
    ? Math.max(0, Math.min(100, (part / total) * 100))
    : null;

function SummaryBar({ title, value, total, tone }) {
  if (value === null) return null;
  const percentage = safePercent(value, total);
  return (
    <div className="rp-insight-bar">
      <div className="rp-insight-bar__top">
        <span>{title}</span>
        <strong>{value.toLocaleString("ru-RU")}</strong>
      </div>
      <div
        className="rp-insight-bar__track"
        role={percentage !== null ? "progressbar" : undefined}
        aria-label={title}
        aria-valuemin={percentage !== null ? 0 : undefined}
        aria-valuemax={percentage !== null ? 100 : undefined}
        aria-valuenow={percentage !== null ? Math.round(percentage) : undefined}
      >
        {percentage !== null && (
          <span className={`rp-insight-bar__fill rp-insight-bar__fill--${tone}`} style={{ width: `${percentage}%` }} />
        )}
      </div>
    </div>
  );
}

function ShiftAISummary({ summary, data }) {
  const metrics = summaryMetrics(summary, data);
  const { issued, closed, overdue, rejected, downtimeMinutes, downtimeNow, onShift, busy } = metrics;
  const closurePercent = safePercent(closed, issued);
  const busyPercent = safePercent(busy, onShift);
  const free = onShift !== null && busy !== null ? Math.max(0, onShift - busy) : null;

  const hasOrders = [issued, closed, overdue, rejected].some((n) => n !== null);
  const hasDowntime = downtimeMinutes !== null || downtimeNow !== null;
  const hasWorkers = onShift !== null || busy !== null;
  const haveMetrics = hasOrders || hasDowntime || hasWorkers;

  // Preserve the original recommendations, without turning other AI prose
  // into "facts" or hiding unrecognized text.
  const recommendationMatch = String(summary).match(/(?:Обратите\s+внимание\s*:|Рекомендуется\s*:)([\s\S]*)/i);
  const recommendation = recommendationMatch?.[1]?.trim().replace(/^нужно\s+обратить\s+внимание\s+на\s*/i, "") || "";
  const actionItems = recommendation
    .split(/,\s*(?:а также\s*)?|\s+а также\s+/i)
    .map((entry) => entry.trim().replace(/[.\s]+$/g, ""))
    .filter(Boolean);

  if (!haveMetrics) {
    return (
      <div className="rp-insight-fallback">
        <RiSparkling2Line size={18} />
        <p>{summary}</p>
      </div>
    );
  }

  return (
    <section className="rp-insights" aria-label="Сводка по выбранному периоду">
      <div className="rp-insights__heading">
        <span className="rp-insights__heading-icon"><RiSparkling2Line size={17} /></span>
        <div>
          <h3>Сводка за период</h3>
          <p>Ключевые показатели и рекомендации</p>
        </div>
      </div>

      <div className="rp-insights__grid">
        {hasOrders && (
          <article className="rp-insight-card rp-insight-card--orders">
            <div className="rp-insight-card__heading">
              <span className="rp-insight-card__symbol"><RiFileList3Line size={19} /></span>
              <span>Наряды за период</span>
              {closurePercent !== null && <strong className="rp-insight-card__chip">{closurePercent.toFixed(1).replace(".", ",")}% закрыто</strong>}
            </div>
            <div className="rp-insight-card__main">
              <strong>{issued !== null ? issued.toLocaleString("ru-RU") : "—"}</strong>
              <span>выдано всего</span>
            </div>
            <div className="rp-insight-card__bars">
              <SummaryBar title="Закрыто" value={closed} total={issued} tone="success" />
              <SummaryBar title="Просрочено" value={overdue} total={issued} tone="warning" />
              <SummaryBar title="Отклонено" value={rejected} total={issued} tone="danger" />
            </div>
          </article>
        )}

        {hasDowntime && (
          <article className="rp-insight-card rp-insight-card--downtime">
            <div className="rp-insight-card__heading">
              <span className="rp-insight-card__symbol"><RiTimeLine size={19} /></span>
              <span>Простой оборудования</span>
            </div>
            <div className="rp-insight-card__main">
              <strong className="rp-insight-card__time">{downtimeMinutes !== null ? formatMinutes(downtimeMinutes) : "—"}</strong>
              <span>суммарный простой</span>
            </div>
            {downtimeNow !== null && (
              <div className="rp-insight-downtime">
                <span>В простое сейчас {downtimeNow}</span>               
              </div>
            )}
          </article>
        )}

        {hasWorkers && (
          <article className="rp-insight-card rp-insight-card--team">
            <div className="rp-insight-card__heading">
              <span className="rp-insight-card__symbol"><RiTeamLine size={19} /></span>
              <span>Исполнители на смене</span>
            </div>
            <div className="rp-insight-team">
              <div className="rp-insight-team__ring" style={{ "--rp-fill": `${busyPercent ?? 0}%` }} role="img" aria-label={busyPercent !== null ? `Заняты ${busyPercent.toFixed(0)} процентов исполнителей` : "Нет данных о загруженности"}>
                <div><strong>{busyPercent !== null ? `${Math.round(busyPercent)}%` : "—"}</strong><span>заняты</span></div>
              </div>
              <div className="rp-insight-team__stats">
                {onShift !== null && <div><i className="rp-insight-team__dot rp-insight-team__dot--all" />На смене <strong>{onShift}</strong></div>}
                {busy !== null && <div><i className="rp-insight-team__dot rp-insight-team__dot--busy" />Заняты <strong>{busy}</strong></div>}
                {free !== null && <div><i className="rp-insight-team__dot rp-insight-team__dot--free" />Свободны <strong>{free}</strong></div>}
              </div>
            </div>
          </article>
        )}
      </div>

      {actionItems.length > 0 && (
        <div className="rp-insight-actions">
          <div className="rp-insight-actions__title"><RiAlarmWarningLine size={17} /> Обратить внимание</div>
          <div className="rp-insight-actions__list">
            {actionItems.map((item, index) => <span key={`${index}-${item}`}>{item}</span>)}
          </div>
        </div>
      )}
      <details className="rp-insights__original">
        <summary>Полный текст сводки</summary>
        <p>{summary}</p>
      </details>
    </section>
  );
}

// MARK: Ratings

function RatingsReport({
  data,
}) {
  useI18n();
  const __i18nLocaleToken = i18nT("sidebar.home");
  const columns =
    useMemo(
      () => [
        {
          field:
            "fullName",

          header:
            i18nT("ordersTable.assignee"),

          minWidth:
            240,

          render:
            (
              item,
            ) => (
              <div>
                <p className="font-semibold text-gray-900">
                  {
                    item.fullName
                  }
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  {item.specialty ||
                    "—"}
                </p>
              </div>
            ),
        },

        {
          field:
            "score",

          header:
            i18nT("sidebar.rating"),

          minWidth:
            110,

          render:
            (
              item,
            ) => (
              <ScoreBadge
                value={
                  item.score
                }
              />
            ),
        },

        {
          field:
            "quality",

          header:
            i18nT("analytics.area.quality"),

          minWidth:
            110,
        },

        {
          field:
            "onTimeRate",

          header:
            i18nT("analytics.area.onTime"),

          minWidth:
            110,

          render:
            (
              item,
            ) =>
              formatPercent(
                item.onTimeRate,
              ),
        },

        {
          field:
            "reworkRate",

          header:
            i18nT("pages.rating.rating.399f7c5"),

          minWidth:
            120,

          render:
            (
              item,
            ) =>
              formatPercent(
                item.reworkRate,
              ),
        },

        {
          field:
            "repeatFailureRate",

          header:
            "Повторные",

          minWidth:
            120,

          render:
            (
              item,
            ) =>
              formatPercent(
                item.repeatFailureRate,
              ),
        },

        {
          field:
            "productivity",

          header:
            i18nT("pages.rating.rating.a12969d"),

          minWidth:
            160,
        },

        {
          field:
            "closed",

          header:
            i18nT("ratingPodium.closed"),

          minWidth:
            100,
        },
      ],
      [__i18nLocaleToken],
    );

  const average =
    data.length
      ? data.reduce(
        (
          total,
          item,
        ) =>
          total +
          Number(
            item.score ||
            0,
          ),
        0,
      ) /
      data.length
      : 0;

  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
        <MiniKpi
          label="Исполнителей"
          value={
            data.length
          }
        />

        <MiniKpi
          label="Средний рейтинг"
          value={
            data.length
              ? average.toFixed(
                1,
              )
              : "—"
          }
        />

        <MiniKpi
          label="Лучший"
          value={
            data[0]
              ?.score ??
            "—"
          }
        />
      </div>

      <SmartTable
        data={
          data
        }
        columns={
          columns
        }
        dataKey="id"
        mode="sort"
        compact
        striped
        stickyHeader
        minWidth={
          1150
        }
        scrollHeight="430px"
        emptyText="Рейтинг пуст"
      />
    </>
  );
}


// MARK: Brigades

function BrigadesReport({
  data,
}) {
  useI18n();
  const __i18nLocaleToken = i18nT("sidebar.home");
  const columns =
    useMemo(
      () => [
        {
          field:
            "name",

          header:
            i18nT("employeeModal.team"),

          minWidth:
            230,

          render:
            (
              item,
            ) => (
              <div>
                <p className="font-semibold text-gray-900">
                  {
                    item.name
                  }
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  {i18nT("pages.rating.rating.6cef7a4")}{" "}
                  {Array.isArray(
                    item.members,
                  )
                    ? item
                      .members
                      .length
                    : item.members ??
                    "—"}
                </p>
              </div>
            ),
        },

        {
          field:
            "score",

          header:
            i18nT("sidebar.rating"),

          minWidth:
            110,

          render:
            (
              item,
            ) => (
              <ScoreBadge
                value={
                  item.score
                }
              />
            ),
        },

        {
          field:
            "quality",

          header:
            i18nT("analytics.area.quality"),

          minWidth:
            110,
        },

        {
          field:
            "onTimeRate",

          header:
            i18nT("analytics.area.onTime"),

          minWidth:
            110,

          render:
            (
              item,
            ) =>
              formatPercent(
                item.onTimeRate,
              ),
        },

        {
          field:
            "repeatFailureRate",

          header:
            i18nT("pages.rating.rating.0a7f61c"),

          minWidth:
            160,

          render:
            (
              item,
            ) =>
              formatPercent(
                item.repeatFailureRate,
              ),
        },

        {
          field:
            "closed",

          header:
            i18nT("ratingPodium.closed"),

          minWidth:
            110,
        },
      ],
      [__i18nLocaleToken],
    );

  return (
    <SmartTable
      data={
        data
      }
      columns={
        columns
      }
      dataKey="id"
      mode="sort"
      compact
      striped
      stickyHeader
      minWidth={
        850
      }
      scrollHeight="430px"
      emptyText="Нет данных по бригадам"
    />
  );
}


// MARK: Materials

function MaterialsReport({
  data,
}) {
  useI18n();
  const __i18nLocaleToken = i18nT("sidebar.home");
  const tableData =
    useMemo(
      () =>
        data.map(
          (
            item,
            index,
          ) => ({
            ...item,

            _rowKey:
              `${item.group?.id ?? "all"}-${item.materialId ?? item.material?.id ?? index}-${index}`,
          }),
        ),
      [
        data,
        __i18nLocaleToken],
    );

  const columns =
    useMemo(
      () => [
        {
          key:
            "group",

          header:
            "Группа",

          minWidth:
            220,

          sortValue:
            (
              item,
            ) =>
              item.group
                ?.name ||
              getMaterialName(
                item,
              ),

          render:
            (
              item,
            ) => {
              const groupName =
                item.group
                  ?.name;

              const materialName =
                getMaterialName(
                  item,
                );

              return (
                <div>
                  <p className="font-semibold text-gray-900">
                    {groupName ||
                      materialName}
                  </p>

                  {groupName &&
                    materialName &&
                    groupName !==
                    materialName && (
                      <p className="mt-1 text-xs text-gray-400">
                        {
                          materialName
                        }
                      </p>
                    )}
                </div>
              );
            },
        },

        {
          key:
            "material",

          header:
            i18nT("orderDetails.material"),

          minWidth:
            220,

          sortValue:
            (
              item,
            ) =>
              getMaterialName(
                item,
              ),

          render:
            (
              item,
            ) => (
              <div>
                <p className="font-medium text-gray-900">
                  {getMaterialName(
                    item,
                  )}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  {getMaterialUnit(
                    item,
                  ) ||
                    "Ед. измерения не указана"}
                </p>
              </div>
            ),
        },

        {
          field:
            "quantity",

          header:
            "Расход",

          minWidth:
            120,

          sortValue:
            (
              item,
            ) =>
              Number(
                item.quantity,
              ) || 0,

          render:
            (
              item,
            ) => (
              <span className="font-semibold text-gray-900">
                {formatNumber(
                  item.quantity,
                )}{" "}
                {getMaterialUnit(
                  item,
                )}
              </span>
            ),
        },

        {
          field:
            "normQuantity",

          header:
            i18nT("pages.admin.admin.admin.63ed571"),

          minWidth:
            120,

          sortValue:
            (
              item,
            ) =>
              Number(
                item.normQuantity,
              ) || 0,

          render:
            (
              item,
            ) =>
              item.normQuantity !=
                null
                ? `${formatNumber(
                  item.normQuantity,
                )} ${getMaterialUnit(
                  item,
                )}`
                : "—",
        },

        {
          field:
            "deviationPercent",

          header:
            "Отклонение",

          minWidth:
            125,

          sortValue:
            (
              item,
            ) =>
              Number(
                item.deviationPercent,
              ) || 0,

          render:
            (
              item,
            ) => {
              const value =
                Number(
                  item.deviationPercent,
                );

              if (
                !Number.isFinite(
                  value,
                )
              ) {
                return "—";
              }

              return (
                <span
                  className={
                    value >
                      0
                      ? "font-semibold text-red-600"
                      : value <
                        0
                        ? "font-semibold text-green-600"
                        : "text-gray-500"
                  }
                >
                  {value >
                    0
                    ? "+"
                    : ""}

                  {formatNumber(
                    value,
                  )}
                  %
                </span>
              );
            },
        },

        {
          field:
            "count",

          header:
            "Использований",

          minWidth:
            125,

          sortValue:
            (
              item,
            ) =>
              Number(
                item.count,
              ) || 0,

          render:
            (
              item,
            ) =>
              item.count ??
              0,
        },

        {
          field:
            "overNormCount",

          header:
            "Перерасход",

          minWidth:
            115,

          sortValue:
            (
              item,
            ) =>
              Number(
                item.overNormCount,
              ) || 0,

          render:
            (
              item,
            ) => {
              const count =
                Number(
                  item.overNormCount,
                ) || 0;

              return (
                <span
                  className={
                    count >
                      0
                      ? "inline-flex min-w-[32px] justify-center rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700"
                      : "text-gray-400"
                  }
                >
                  {
                    count
                  }
                </span>
              );
            },
        },
      ],
      [__i18nLocaleToken],
    );

  const totalOver =
    data.reduce(
      (
        total,
        item,
      ) =>
        total +
        Number(
          item.overNormCount ||
          0,
        ),
      0,
    );

  const totalQuantity =
    data.reduce(
      (
        total,
        item,
      ) =>
        total +
        Number(
          item.quantity ||
          0,
        ),
      0,
    );

  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <MiniKpi
          label="Позиций"
          value={
            data.length
          }
        />

        <MiniKpi
          label="Общий расход"
          value={formatNumber(
            totalQuantity,
          )}
        />

        <MiniKpi
          label="Случаев перерасхода"
          value={
            totalOver
          }
          danger={
            totalOver >
            0
          }
        />
      </div>

      <SmartTable
        data={
          tableData
        }
        columns={
          columns
        }
        dataKey="_rowKey"
        mode="sort"
        compact
        striped
        stickyHeader
        minWidth={
          1050
        }
        scrollHeight="430px"
        emptyText="Расход материалов отсутствует"
        emptyDescription="За выбранный период материалы не использовались"
      />
    </>
  );
}

// MARK: Downtime

function DowntimeReport({
  data,
  items,
}) {
  useI18n();
  const __i18nLocaleToken = i18nT("sidebar.home");
  const columns =
    useMemo(
      () => [
        {
          field:
            "number",

          header:
            i18nT("ordersTable.order"),

          minWidth:
            120,
        },

        {
          key:
            "equipment",

          header:
            i18nT("sidebar.equipment"),

          minWidth:
            220,

          sortValue:
            (
              item,
            ) =>
              item.equipment
                ?.name ??
              "",

          render:
            (
              item,
            ) => (
              <div>
                <p className="font-semibold text-gray-900">
                  {item.equipment
                    ?.name ||
                    "—"}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  {item.area
                    ?.name ||
                    "—"}
                </p>
              </div>
            ),
        },

        {
          key:
            "fault",

          header:
            i18nT("pages.admin.admin.admin.74308c4"),

          minWidth:
            130,

          render:
            (
              item,
            ) =>
              item.faultCode
                ?.code ||
              "—",
        },

        {
          field:
            "reason",

          header:
            "Причина",

          minWidth:
            220,

          render:
            (
              item,
            ) =>
              item.reason ||
              "—",
        },

        {
          field:
            "minutes",

          header:
            i18nT("analytics.downtime.label"),

          minWidth:
            120,

          render:
            (
              item,
            ) =>
              formatMinutes(
                item.minutes,
              ),
        },

        {
          field:
            "ongoing",

          header:
            i18nT("pages.dashboard.dashboard.2c2777e"),

          minWidth:
            100,

          render:
            (
              item,
            ) =>
              item.ongoing
                ? (
                  <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                    {i18nT("pages.analytics.analytics.e04af96")}
                  </span>
                )
                : "Нет",
        },
      ],
      [__i18nLocaleToken],
    );

  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniKpi
          label={i18nT("analytics.status.total")}
          value={formatMinutes(
            data.totals
              ?.minutes,
          )}
        />

        <MiniKpi
          label={i18nT("priority.planned")}
          value={formatMinutes(
            data.totals
              ?.plannedMinutes,
          )}
        />

        <MiniKpi
          label={i18nT("priority.emergency")}
          value={formatMinutes(
            data.totals
              ?.unplannedMinutes,
          )}
          danger
        />

        <MiniKpi
          label="Активных простоев"
          value={
            data.totals
              ?.ongoing ??
            0
          }
        />
      </div>

      <SmartTable
        data={
          items
        }
        columns={
          columns
        }
        dataKey="workOrderId"
        mode="sort"
        compact
        striped
        stickyHeader
        minWidth={
          1000
        }
        scrollHeight="430px"
        emptyText="Простоев нет"
      />
    </>
  );
}


// MARK: Export only

function ExportOnly({
  type,
  onXlsx,
  onPdf,
  loading,
}) {
  useI18n();
  const Icon =
    type.icon;

  return (
    <div className="rp-export-only">
      <div className="rp-export-only__inner">
        <div className="rp-export-icon">
          <Icon
            size={
              25
            }
          />
        </div>

        <h3 className="mt-4 text-base font-bold text-gray-900">
          {
            type.title
          }
        </h3>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          {
            type.description
          }
        </p>

        <p className="mt-2 text-xs text-gray-400">
          {i18nT("pages.reports.reports.7adab7b")}
        </p>

        <div className="mt-5 flex justify-center gap-2">
          <button
            type="button"
            onClick={
              onXlsx
            }
            disabled={
              Boolean(
                loading,
              )
            }
            className="rp-button rp-button--soft"
          >
            <RiFileExcel2Line />

            Excel
          </button>

          <button
            type="button"
            onClick={
              onPdf
            }
            disabled={
              Boolean(
                loading,
              )
            }
            className="rp-button rp-button--primary"
          >
            <RiFilePdf2Line />

            PDF
          </button>
        </div>
      </div>
    </div>
  );
}


// MARK: UI

function FilterField({ label, children }) {
  return (
    <div className="rp-field">
      <span className="rp-field__label">{label}</span>
      {children}
    </div>
  );
}

function MiniKpi({ label, value, danger = false }) {
  return (
    <div className={`rp-kpi${danger ? " rp-kpi--danger" : ""}`}>
      <span className="rp-kpi__label">{label}</span>
      <strong className="rp-kpi__value">{value ?? "—"}</strong>
    </div>
  );
}

function ScoreBadge({
  value,
}) {
  const score =
    Number(value);

  let style =
    "bg-gray-100 text-gray-600";

  if (score >= 85) {
    style =
      "bg-green-50 text-green-700";
  } else if (
    score >= 70
  ) {
    style =
      "bg-blue-50 text-blue-700";
  } else if (
    score >= 50
  ) {
    style =
      "bg-orange-50 text-orange-700";
  } else if (
    Number.isFinite(
      score,
    )
  ) {
    style =
      "bg-red-50 text-red-700";
  }

  return (
    <span className={`inline-flex min-w-[58px] justify-center rounded-full px-2.5 py-1 text-xs font-bold ${style}`}>
      {Number.isFinite(
        score,
      )
        ? score
        : "—"}
    </span>
  );
}

function EmployeeStatus({
  value,
}) {
  useI18n();
  const config = {
    AVAILABLE: {
      title:
        i18nT("employeeModal.free"),
      style:
        "bg-green-50 text-green-700",
    },

    BUSY: {
      title:
        i18nT("pages.reports.reports.9b8aa4f"),
      style:
        "bg-amber-50 text-amber-700",
    },

    QUEUED: {
      title:
        i18nT("pages.reports.reports.4c987aa"),
      style:
        "bg-blue-50 text-blue-700",
    },

    OFF_SHIFT: {
      title:
        i18nT("employeeModal.offShift"),
      style:
        "bg-gray-100 text-gray-600",
    },
  };

  const item =
    config[value] ?? {
      title:
        value ||
        "—",
      style:
        "bg-gray-100 text-gray-600",
    };

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.style}`}>
      {
        item.title
      }
    </span>
  );
}

function PreviewLoader() {
  return (
    <div className="rp-skeleton" role="status" aria-label="Загрузка отчёта">
      <div className="rp-skeleton__kpis">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rp-skeleton__kpi"><i /><i /></div>
        ))}
      </div>
      <div className="rp-skeleton__table">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="rp-skeleton__row">
            <i /><i /><i /><i />
          </div>
        ))}
      </div>
    </div>
  );
}


function ErrorState({
  text,
}) {
  useI18n();
  return (
    <div className="flex min-h-[280px] items-center justify-center">
      <div className="max-w-md text-center">
        <RiAlarmWarningLine
          size={
            30
          }
          className="mx-auto text-red-500"
        />

        <p className="mt-3 text-sm font-semibold text-gray-800">
          {i18nT("pages.reports.reports.fd40d9f")}
        </p>

        <p className="mt-2 text-xs leading-5 text-gray-500">
          {
            text
          }
        </p>
      </div>
    </div>
  );
}