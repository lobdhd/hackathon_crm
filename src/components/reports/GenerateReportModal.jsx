import { useEffect, useMemo, useState } from "react";
import { RiCalendarLine, RiCheckLine, RiCloseLine, RiFileExcel2Line, RiFilePdf2Line, RiMapPinLine } from "react-icons/ri";
import { t as i18nT, useI18n } from "../../i18n/index.js";
export default function GenerateReportModal({
  open,
  onClose,
  areas,
  reportTypes,
  defaultType = "SHIFT",
  onGenerate
}) {
  useI18n();
  const [form, setForm] = useState({
    type: defaultType,
    period: "SHIFT",
    areaId: "",
    from: "2026-10-06",
    to: "2026-10-06",
    format: "PDF"
  });
  useEffect(() => {
    if (open) {
      setForm(prev => ({
        ...prev,
        type: defaultType || "SHIFT"
      }));
    }
  }, [open, defaultType]);
  const selectedReportType = useMemo(() => reportTypes.find(item => item.id === form.type), [form.type, reportTypes]);
  if (!open) {
    return null;
  }
  function updateField(field, value) {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  }
  function getPeriodLabel() {
    if (form.period === "SHIFT") {
      return "06 октября 2026, текущая смена";
    }
    if (form.period === "TODAY") {
      return "06 октября 2026";
    }
    if (form.period === "WEEK") {
      return "30 сентября — 06 октября 2026";
    }
    if (form.period === "MONTH") {
      return "07 сентября — 06 октября 2026";
    }
    return `${formatInputDate(form.from)} — ${formatInputDate(form.to)}`;
  }
  function handleSubmit(event) {
    event.preventDefault();
    const area = areas.find(item => item.id === Number(form.areaId));
    onGenerate({
      type: form.type,
      title: selectedReportType?.title ?? i18nT("reportsPage.report"),
      periodLabel: getPeriodLabel(),
      areaLabel: area?.name ?? i18nT("reportModal.allAreas"),
      format: form.format
    });
    onClose();
  }
  return <>
            <div className="
          fixed inset-0
          z-[70]
          bg-gray-900/45
          backdrop-blur-[1px]
        " onClick={onClose} />

            <div className="
          fixed inset-0
          z-[80]
          overflow-y-auto
          p-4
        ">
                <div className="
            flex min-h-full
            items-center
            justify-center
          ">
                    <div className="
              w-full
              max-w-2xl
              overflow-hidden
              rounded-2xl
              border
              border-gray-200
              bg-white
              shadow-2xl
            ">
                        <div className="
                flex
                items-start
                justify-between
                gap-4
                border-b
                border-gray-100
                px-6 py-5
              ">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">{i18nT("reportModal.generateReport")}</h2>

                                <p className="mt-1 text-sm text-gray-500">{i18nT("reportModal.subtitle")}</p>
                            </div>

                            <button type="button" onClick={onClose} className="
                  rounded-lg
                  p-2
                  text-gray-400
                  transition
                  hover:bg-gray-100
                  hover:text-gray-700
                ">
                                <RiCloseLine size={21} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="space-y-6 p-6">
                                {/* TYPE */}
                                <div>
                                    <FieldLabel>{i18nT("reportModal.reportType")}</FieldLabel>

                                    <select value={form.type} onChange={event => updateField("type", event.target.value)} className={inputClass}>
                                        {reportTypes.map(item => <option key={item.id} value={item.id}>
                                                    {item.title}
                                                </option>)}
                                    </select>

                                    {selectedReportType && <p className="mt-2 text-xs leading-5 text-gray-500">
                                            {selectedReportType.description}
                                        </p>}
                                </div>

                                <div className="border-t border-gray-100" />

                                {/* PERIOD */}
                                <div>
                                    <div className="mb-3 flex items-center gap-2">
                                        <RiCalendarLine size={17} className="text-blue-600" />

                                        <p className="text-sm font-semibold text-gray-900">{i18nT("reportModal.period")}</p>
                                    </div>

                                    <div className="
                      grid
                      grid-cols-2
                      gap-2
                      md:grid-cols-4
                    ">
                                        <PeriodButton active={form.period === "SHIFT"} onClick={() => updateField("period", "SHIFT")}>{i18nT("reportModal.shift")}</PeriodButton>

                                        <PeriodButton active={form.period === "TODAY"} onClick={() => updateField("period", "TODAY")}>{i18nT("reportModal.today")}</PeriodButton>

                                        <PeriodButton active={form.period === "WEEK"} onClick={() => updateField("period", "WEEK")}>{i18nT("reportModal.sevenDays")}</PeriodButton>

                                        <PeriodButton active={form.period === "MONTH"} onClick={() => updateField("period", "MONTH")}>{i18nT("reportModal.thirtyDays")}</PeriodButton>
                                    </div>

                                    <button type="button" onClick={() => updateField("period", "CUSTOM")} className={`
                      mt-2
                      w-full
                      rounded-lg
                      border
                      px-3 py-2.5
                      text-sm
                      font-medium
                      transition
                      ${form.period === "CUSTOM" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}
                    `}>{i18nT("reportModal.customPeriod")}</button>

                                    {form.period === "CUSTOM" && <div className="
                        mt-3
                        grid
                        grid-cols-1
                        gap-3
                        md:grid-cols-2
                      ">
                                                <div>
                                                    <FieldLabel>{i18nT("reportModal.from")}</FieldLabel>

                                                    <input type="date" value={form.from} onChange={event => updateField("from", event.target.value)} className={inputClass} />
                                                </div>

                                                <div>
                                                    <FieldLabel>{i18nT("reportModal.to")}</FieldLabel>

                                                    <input type="date" value={form.to} onChange={event => updateField("to", event.target.value)} className={inputClass} />
                                                </div>
                                            </div>}
                                </div>

                                <div className="border-t border-gray-100" />

                                {/* AREA */}
                                <div>
                                    <div className="mb-3 flex items-center gap-2">
                                        <RiMapPinLine size={17} className="text-blue-600" />

                                        <p className="text-sm font-semibold text-gray-900">{i18nT("ordersTable.area")}</p>
                                    </div>

                                    <select value={form.areaId} onChange={event => updateField("areaId", event.target.value)} className={inputClass}>
                                        <option value="">{i18nT("reportModal.allAreas")}</option>

                                        {areas.map(area => <option key={area.id} value={area.id}>
                                                    {area.name}
                                                </option>)}
                                    </select>
                                </div>

                                <div className="border-t border-gray-100" />

                                {/* FORMAT */}
                                <div>
                                    <FieldLabel>{i18nT("reportModal.documentFormat")}</FieldLabel>

                                    <div className="
                      mt-2
                      grid
                      grid-cols-2
                      gap-3
                    ">
                                        <FormatButton active={form.format === "PDF"} onClick={() => updateField("format", "PDF")} icon={RiFilePdf2Line} title="PDF" description="Для печати и просмотра" tone="red" />

                                        <FormatButton active={form.format === "XLSX"} onClick={() => updateField("format", "XLSX")} icon={RiFileExcel2Line} title="Excel" description="Для работы с данными" tone="green" />
                                    </div>
                                </div>

                                {/* SUMMARY */}
                                <div className="
                    rounded-xl
                    border
                    border-blue-100
                    bg-blue-50/50
                    p-4
                  ">
                                    <div className="flex items-center gap-2">
                                        <RiCheckLine size={17} className="text-blue-600" />

                                        <p className="text-sm font-semibold text-gray-900">{i18nT("reportModal.willBeGenerated")}</p>
                                    </div>

                                    <p className="mt-2 text-xs leading-5 text-gray-600">
                                        {selectedReportType?.title}
                                        {" • "}
                                        {getPeriodLabel()}
                                        {" • "}
                                        {form.format}
                                    </p>
                                </div>
                            </div>

                            <div className="
                  flex
                  justify-end
                  gap-3
                  border-t
                  border-gray-100
                  bg-gray-50/70
                  px-6 py-4
                ">
                                <button type="button" onClick={onClose} className="
                    rounded-lg
                    border
                    border-gray-300
                    bg-white
                    px-4 py-2.5
                    text-sm
                    font-semibold
                    text-gray-700
                    hover:bg-gray-50
                  ">{i18nT("employeeModal.cancel")}</button>

                                <button type="submit" className="
                    rounded-lg
                    bg-blue-600
                    px-5 py-2.5
                    text-sm
                    font-semibold
                    text-white
                    transition
                    hover:bg-blue-700
                  ">{i18nT("reportModal.generate")}</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>;
}
const inputClass = `
  w-full
  rounded-lg
  border border-gray-300
  bg-gray-50
  px-3 py-2.5
  text-sm
  text-gray-900
  outline-none
  transition
  focus:border-blue-500
  focus:bg-white
  focus:ring-2
  focus:ring-blue-100
`;
function FieldLabel({
  children
}) {
  return <label className="mb-2 block text-xs font-medium text-gray-600">
            {children}
        </label>;
}
function PeriodButton({
  active,
  onClick,
  children
}) {
  return <button type="button" onClick={onClick} className={`
        rounded-lg
        border
        px-3 py-2.5
        text-sm
        font-medium
        transition
        ${active ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}
      `}>
            {children}
        </button>;
}
function FormatButton({
  active,
  onClick,
  icon: Icon,
  title,
  description,
  tone
}) {
  const tones = {
    red: "bg-red-50 text-red-600",
    green: "bg-green-50 text-green-600"
  };
  return <button type="button" onClick={onClick} className={`
        flex
        items-center
        gap-3
        rounded-xl
        border
        p-4
        text-left
        transition
        ${active ? "border-blue-400 bg-blue-50/40" : "border-gray-200 bg-white hover:bg-gray-50"}
      `}>
            <div className={`
          flex h-10 w-10
          shrink-0
          items-center
          justify-center
          rounded-lg
          ${tones[tone]}
        `}>
                <Icon size={20} />
            </div>

            <div>
                <p className="text-sm font-semibold text-gray-900">
                    {title}
                </p>

                <p className="mt-1 text-[11px] text-gray-500">
                    {description}
                </p>
            </div>
        </button>;
}
function formatInputDate(value) {
  if (!value) {
    return "—";
  }
  return new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}
