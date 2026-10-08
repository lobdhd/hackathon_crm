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
    tone:
      "bg-blue-50 text-blue-600",
    preview: true,
  },

  {
    id: "orders",
    title: i18nT("sidebar.orders"),
    description:
      i18nT("pages.reports.reports.d49dbb9"),
    icon: RiFileList3Line,
    tone:
      "bg-indigo-50 text-indigo-600",
    preview: false,
  },

  {
    id: "ratings",
    title: i18nT("pages.reports.reports.d161594"),
    description:
      i18nT("pages.reports.reports.51ed60d"),
    icon: RiBarChartBoxLine,
    tone:
      "bg-violet-50 text-violet-600",
    preview: true,
  },

  {
    id: "brigades",
    title: i18nT("pages.reports.reports.1d0130f"),
    description:
      i18nT("pages.reports.reports.7131185"),
    icon: RiTeamLine,
    tone:
      "bg-cyan-50 text-cyan-600",
    preview: true,
  },

  {
    id: "materials",
    title: i18nT("pages.admin.admin.admin.79bfff8"),
    description:
      i18nT("pages.reports.reports.129957d"),
    icon: RiToolsLine,
    tone:
      "bg-green-50 text-green-600",
    preview: true,
  },

  {
    id: "downtime",
    title: i18nT("pages.reports.reports.a442cd9"),
    description:
      i18nT("pages.reports.reports.bf74d13"),
    icon: RiAlarmWarningLine,
    tone:
      "bg-orange-50 text-orange-600",
    preview: true,
  },

  {
    id: "anomalies",
    title: i18nT("pages.analytics.analytics.fb6342c"),
    description:
      i18nT("pages.reports.reports.c8f354a"),
    icon: RiSparkling2Line,
    tone:
      "bg-purple-50 text-purple-600",
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
    <div className="mx-auto max-w-[1800px]">

      {/* HEADER */}

      <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {i18nT("pages.reports.reports.2c687d6")}
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            {i18nT("pages.reports.reports.0c97cf6")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              handleExport(
                "xlsx",
              )
            }
            disabled={
              Boolean(
                exportLoading,
              )
            }
            className="inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700 transition hover:bg-green-100 disabled:opacity-50"
          >
            {exportLoading ===
              `${selectedType}-xlsx` ? (
              <RiLoader4Line className="animate-spin" />
            ) : (
              <RiFileExcel2Line />
            )}

            Excel
          </button>

          <button
            type="button"
            onClick={() =>
              handleExport(
                "pdf",
              )
            }
            disabled={
              Boolean(
                exportLoading,
              )
            }
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
          >
            {exportLoading ===
              `${selectedType}-pdf` ? (
              <RiLoader4Line className="animate-spin" />
            ) : (
              <RiFilePdf2Line />
            )}

            PDF
          </button>
        </div>
      </div>


      {/* EXPORT ERROR */}

      {exportError && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <RiAlarmWarningLine
            size={
              18
            }
            className="shrink-0"
          />

          {
            exportError
          }
        </div>
      )}


      {/* TYPES */}

      <section className="mb-6">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            {i18nT("pages.reports.reports.31a2928")}
          </h2>

          <p className="mt-1 text-xs text-gray-500">
            {i18nT("pages.reports.reports.bd6b44b")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          {REPORT_TYPES().map(
            (
              report,
            ) => (
              <ReportTypeCard
                key={
                  report.id
                }
                report={
                  report
                }
                active={
                  selectedType ===
                  report.id
                }
                onClick={() => {
                  setSelectedType(
                    report.id,
                  );

                  setSearch(
                    "",
                  );

                  setExportError(
                    "",
                  );
                }}
              />
            ),
          )}
        </div>
      </section>


      {/* FILTERS */}

      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {PERIODS().map(
              (
                item,
              ) => (
                <button
                  key={
                    item.value
                  }
                  type="button"
                  onClick={() =>
                    updateFilter(
                      "period",
                      item.value,
                    )
                  }
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${filters.period ===
                      item.value
                      ? "bg-blue-600 text-white shadow-sm"
                      : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                    }`}
                >
                  {
                    item.label
                  }
                </button>
              ),
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <FilterField
              label={i18nT("reportModal.from")}
            >
              <input
                type="datetime-local"
                value={
                  filters.from
                }
                onChange={(
                  event,
                ) =>
                  updateFilter(
                    "from",
                    event
                      .target
                      .value,
                  )
                }
                className="reports-input"
              />
            </FilterField>

            <FilterField
              label={i18nT("reportModal.to")}
            >
              <input
                type="datetime-local"
                value={
                  filters.to
                }
                onChange={(
                  event,
                ) =>
                  updateFilter(
                    "to",
                    event
                      .target
                      .value,
                  )
                }
                className="reports-input"
              />
            </FilterField>

            <FilterField
              label={i18nT("ordersTable.area")}
            >
              <select
                value={
                  filters.areaId
                }
                onChange={(
                  event,
                ) =>
                  handleAreaChange(
                    event
                      .target
                      .value,
                  )
                }
                className="reports-input"
              >
                <option value="">
                  {i18nT("reportModal.allAreas")}
                </option>

                {areas.map(
                  (
                    area,
                  ) => (
                    <option
                      key={
                        area.id
                      }
                      value={
                        area.id
                      }
                    >
                      {
                        area.name
                      }
                    </option>
                  ),
                )}
              </select>
            </FilterField>

            <FilterField
              label={i18nT("sidebar.equipment")}
            >
              <select
                value={
                  filters.equipmentId
                }
                onChange={(
                  event,
                ) =>
                  updateFilter(
                    "equipmentId",
                    event
                      .target
                      .value,
                  )
                }
                className="reports-input"
              >
                <option value="">
                  {i18nT("equipmentDetails.allEquipment")}
                </option>

                {equipment.map(
                  (
                    item,
                  ) => (
                    <option
                      key={
                        item.id
                      }
                      value={
                        item.id
                      }
                    >
                      {
                        item.name
                      }
                    </option>
                  ),
                )}
              </select>
            </FilterField>

            <FilterField
              label={i18nT("ordersTable.assignee")}
            >
              <select
                value={
                  filters.executorId
                }
                onChange={(
                  event,
                ) =>
                  updateFilter(
                    "executorId",
                    event
                      .target
                      .value,
                  )
                }
                className="reports-input"
              >
                <option value="">
                  {i18nT("employeeDetails.allEmployees")}
                </option>

                {executors.map(
                  (
                    executor,
                  ) => (
                    <option
                      key={
                        executor.id
                      }
                      value={
                        executor.id
                      }
                    >
                      {
                        executor.fullName
                      }
                    </option>
                  ),
                )}
              </select>
            </FilterField>

            <FilterField
              label={i18nT("employeeModal.team")}
            >
              <select
                value={
                  filters.brigadeId
                }
                onChange={(
                  event,
                ) =>
                  updateFilter(
                    "brigadeId",
                    event
                      .target
                      .value,
                  )
                }
                className="reports-input"
              >
                <option value="">
                  {i18nT("pages.orders.orders.orders.b8b0a3b")}
                </option>

                {brigades.map(
                  (
                    brigade,
                  ) => (
                    <option
                      key={
                        brigade.id
                      }
                      value={
                        brigade.id
                      }
                    >
                      {
                        brigade.name
                      }
                    </option>
                  ),
                )}
              </select>
            </FilterField>

            {selectedType ===
              "materials" && (
                <FilterField
                  label="Группировка"
                >
                  <select
                    value={
                      filters.groupBy
                    }
                    onChange={(
                      event,
                    ) =>
                      updateFilter(
                        "groupBy",
                        event
                          .target
                          .value,
                      )
                    }
                    className="reports-input"
                  >
                    {GROUP_BY_OPTIONS().map(
                      (
                        item,
                      ) => (
                        <option
                          key={
                            item.value
                          }
                          value={
                            item.value
                          }
                        >
                          {
                            item.label
                          }
                        </option>
                      ),
                    )}
                  </select>
                </FilterField>
              )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <RiFilter3Line />

              {i18nT("pages.reports.reports.43a4bd2")}

              <span className="font-semibold text-gray-900">
                {
                  activeFilterCount
                }
              </span>

              {activeFilterCount >
                0 && (
                  <button
                    type="button"
                    onClick={
                      resetFilters
                    }
                    className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600"
                  >
                    <RiCloseLine />

                    {i18nT("employeesPage.reset")}
                  </button>
                )}
            </div>

            {currentType.preview && (
              <div className="relative w-full sm:w-[280px]">
                <RiSearchLine
                  size={
                    17
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  value={
                    search
                  }
                  onChange={(
                    event,
                  ) =>
                    setSearch(
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder={i18nT("pages.reports.reports.926c41b")}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            )}
          </div>
        </div>
      </section>


      {/* PREVIEW */}

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900">
              {
                currentType.title
              }
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              {currentType.preview
                ? "Предпросмотр данных с backend"
                : "Этот отчёт доступен через экспорт"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (
                selectedType ===
                "shift"
              ) {
                shiftQuery.refetch();
              } else if (
                selectedType ===
                "ratings"
              ) {
                ratingsQuery.refetch();
              } else if (
                selectedType ===
                "brigades"
              ) {
                brigadeRatingsQuery.refetch();
              } else if (
                selectedType ===
                "materials"
              ) {
                materialsQuery.refetch();
              } else if (
                selectedType ===
                "downtime"
              ) {
                downtimeQuery.refetch();
              }
            }}
            disabled={
              !currentType.preview
            }
            className="inline-flex items-center gap-2 self-start rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 disabled:opacity-40"
          >
            <RiRefreshLine />

            {i18nT("components.layout.appnavbar.dbe5444")}
          </button>
        </div>

        <div className="p-5">
          {currentLoading ? (
            <PreviewLoader />
          ) : currentError ? (
            <ErrorState
              text={extractError(
                currentError,
              )}
            />
          ) : selectedType ===
            "shift" ? (
            <ShiftReport
              data={
                shift
              }
            />
          ) : selectedType ===
            "ratings" ? (
            <RatingsReport
              data={
                filteredRatings
              }
            />
          ) : selectedType ===
            "brigades" ? (
            <BrigadesReport
              data={
                filteredBrigades
              }
            />
          ) : selectedType ===
            "materials" ? (
            <MaterialsReport
              data={
                filteredMaterials
              }
            />
          ) : selectedType ===
            "downtime" ? (
            <DowntimeReport
              data={
                downtime
              }
              items={
                filteredDowntime
              }
            />
          ) : (
            <ExportOnly
              type={
                currentType
              }
              onXlsx={() =>
                handleExport(
                  "xlsx",
                )
              }
              onPdf={() =>
                handleExport(
                  "pdf",
                )
              }
              loading={
                exportLoading
              }
            />
          )}
        </div>
      </section>


      {/* ORDER PDF */}

      <section className="mt-6 overflow-visible rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900">
              {i18nT("pages.reports.reports.3d67cbb")}
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              {i18nT("pages.reports.reports.16ffacb")}
            </p>
          </div>

          <RiFilePdf2Line
            size={
              20
            }
            className="text-red-500"
          />
        </div>

        <form
          onSubmit={
            handleOrderPdf
          }
          className="p-5"
        >
          {orderPdfError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {
                orderPdfError
              }
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.7fr)_auto]">
            <div className="relative">
              <RiSearchLine
                size={
                  17
                }
                className="absolute left-3 top-1/2 z-10 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={
                  orderPdfSearch
                }
                onChange={(
                  event,
                ) =>
                  setOrderPdfSearch(
                    event
                      .target
                      .value,
                  )
                }
                placeholder={i18nT("pages.reports.reports.74c0c32")}
                className="reports-input !pl-10"
              />
            </div>

            <div className="min-w-0">
              <GlideSelect
                options={
                  orderReportOptions
                }
                value={
                  orderReportId
                }
                onChange={(
                  value,
                ) => {
                  setOrderReportId(
                    value,
                  );

                  setOrderPdfError(
                    "",
                  );
                }}
                placeholder={
                  workOrdersQuery.isLoading
                    ? "Загрузка нарядов..."
                    : i18nT("pages.reports.reports.18b12b9")
                }
                className="glide-select--field"
                menuWidth={
                  560
                }
                disabled={
                  workOrdersQuery.isLoading
                }
              />
            </div>

            <button
              type="submit"
              disabled={
                orderPdfLoading ||
                workOrdersQuery.isLoading ||
                !orderReportId
              }
              className="inline-flex h-[42px] shrink-0 items-center justify-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {orderPdfLoading ? (
                <RiLoader4Line className="animate-spin" />
              ) : (
                <RiDownload2Line />
              )}

              {i18nT("pages.reports.reports.e546f78")}
            </button>
          </div>

          {workOrdersQuery.isError && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5">
              <p className="text-xs text-red-700">
                {i18nT("pages.reports.reports.a3fe4d3")}
              </p>

              <button
                type="button"
                onClick={() =>
                  workOrdersQuery.refetch()
                }
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700"
              >
                <RiRefreshLine />

                {i18nT("components.layout.appnavbar.b914bbb")}
              </button>
            </div>
          )}

          {!workOrdersQuery.isLoading &&
            !workOrdersQuery.isError &&
            workOrders.length === 0 && (
            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-500">
              {i18nT("pages.reports.reports.50ce7c4")}
            </div>
          )}

          {selectedOrderReport && (
            <SelectedOrderPdfPreview
              order={
                selectedOrderReport
              }
            />
          )}
        </form>
      </section>


      {/* LOCAL CSS */}

      <style>
        {`
                    .reports-input {
                        width: 100%;
                        height: 42px;
                        box-sizing: border-box;
                        border: 1px solid #d1d5db;
                        border-radius: 0.5rem;
                        background: #f9fafb;
                        padding: 0 0.75rem;
                        font-size: 0.875rem;
                        color: #111827;
                        outline: none;
                    }

                    .reports-input:focus {
                        border-color: #3b82f6;
                        background: #ffffff;
                        box-shadow: 0 0 0 2px #dbeafe;
                    }
                `}
      </style>
    </div>
  );
}


// MARK: Selected order PDF

function SelectedOrderPdfPreview({
  order,
}) {
    useI18n();
  return (
    <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
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

function ReportTypeCard({
  report,
  active,
  onClick,
}) {
  const Icon =
    report.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${active
          ? "border-blue-300 bg-blue-50/40 shadow-sm"
          : "border-gray-200 bg-white hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-sm"
        }`}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${report.tone}`}>
        <Icon
          size={
            19
          }
        />
      </div>

      <h3 className="mt-4 text-sm font-bold text-gray-900">
        {
          report.title
        }
      </h3>

      <p className="mt-2 line-clamp-3 text-xs leading-5 text-gray-500">
        {
          report.description
        }
      </p>
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
      [ __i18nLocaleToken],
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
        <div className="mb-5 flex gap-3 rounded-xl border border-violet-100 bg-violet-50/50 p-4">
          <RiSparkling2Line
            size={
              20
            }
            className="shrink-0 text-violet-600"
          />

          <p className="text-sm leading-6 text-violet-900">
            {
              data.aiSummary
            }
          </p>
        </div>
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
      [ __i18nLocaleToken],
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
      [ __i18nLocaleToken],
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
        [ __i18nLocaleToken],
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
      [ __i18nLocaleToken],
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
    <div className="flex min-h-[320px] items-center justify-center">
      <div className="max-w-lg text-center">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${type.tone}`}>
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
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
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
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
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

function FilterField({
  label,
  children,
}) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-semibold text-gray-500">
        {label}
      </span>

      {children}
    </label>
  );
}

function MiniKpi({
  label,
  value,
  danger = false,
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p className={`mt-1 text-xl font-bold ${danger
          ? "text-red-600"
          : "text-gray-900"
        }`}>
        {value ??
          "—"}
      </p>
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
    <div className="flex min-h-[320px] items-center justify-center">
      <RiLoader4Line
        size={
          30
        }
        className="animate-spin text-blue-600"
      />
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