import { useState } from "react";
import { RiCloseLine, RiMapPinLine, RiToolsLine } from "react-icons/ri";
import { t as i18nT, useI18n } from "../../i18n/index.js";
const TYPES = ["Дробильное оборудование", "Конвейерное оборудование", "Сортировочное оборудование", "Насосное оборудование", "Обогатительное оборудование", "Станочное оборудование", "Сварочное оборудование", "Карьерный транспорт", "Прочее"];
const initialForm = {
  name: "",
  inventoryNumber: "",
  type: "",
  areaId: "",
  criticality: "MEDIUM",
  status: "WORKING",
  manufacturer: "",
  model: "",
  commissioningDate: ""
};
export default function CreateEquipmentModal({
  open,
  onClose,
  areas,
  onCreate
}) {
  useI18n();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  if (!open) {
    return null;
  }
  function updateField(field, value) {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
    setErrors(prev => ({
      ...prev,
      [field]: ""
    }));
  }
  function validate() {
    const next = {};
    if (!form.name.trim()) {
      next.name = "Введите название оборудования";
    }
    if (!form.inventoryNumber.trim()) {
      next.inventoryNumber = "Введите инвентарный номер";
    }
    if (!form.type) {
      next.type = "Выберите тип оборудования";
    }
    if (!form.areaId) {
      next.areaId = i18nT("orderModal.selectArea");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }
  function closeModal() {
    setForm(initialForm);
    setErrors({});
    onClose();
  }
  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) {
      return;
    }
    onCreate({
      ...form,
      areaId: Number(form.areaId)
    });
    setForm(initialForm);
    setErrors({});
    onClose();
  }
  return <>
            <div className="
          fixed inset-0 z-[70]
          bg-gray-900/45
          backdrop-blur-[1px]
        " onClick={closeModal} />

            <div className="
          fixed inset-0 z-[80]
          overflow-y-auto p-4
        ">
                <div className="
            flex min-h-full
            items-center
            justify-center
          ">
                    <div className="
              w-full max-w-2xl
              overflow-hidden
              rounded-2xl
              border border-gray-200
              bg-white
              shadow-2xl
            " onClick={event => event.stopPropagation()}>
                        <div className="
                flex items-start
                justify-between gap-4
                border-b
                border-gray-100
                px-6 py-5
              ">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">{i18nT("equipmentModal.title")}</h2>

                                <p className="mt-1 text-sm text-gray-500">{i18nT("equipmentModal.subtitle")}</p>
                            </div>

                            <button type="button" onClick={closeModal} className="
                  rounded-lg p-2
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
                                <div>
                                    <SectionTitle icon={RiToolsLine} title={i18nT("equipmentModal.basicInfo")} />

                                    <div className="
                      mt-4 grid
                      grid-cols-1
                      gap-4
                      md:grid-cols-2
                    ">
                                        <div className="md:col-span-2">
                                            <FieldLabel>{i18nT("equipmentModal.name")}</FieldLabel>

                                            <input value={form.name} onChange={event => updateField("name", event.target.value)} placeholder={i18nT("equipmentModal.nameExample")} className={inputClass(errors.name)} />

                                            {errors.name && <ErrorText>
                                                    {errors.name}
                                                </ErrorText>}
                                        </div>

                                        <div>
                                            <FieldLabel>{i18nT("equipmentModal.inventoryNumber")}</FieldLabel>

                                            <input value={form.inventoryNumber} onChange={event => updateField("inventoryNumber", event.target.value)} placeholder="DR-001" className={inputClass(errors.inventoryNumber)} />

                                            {errors.inventoryNumber && <ErrorText>
                                                    {errors.inventoryNumber}
                                                </ErrorText>}
                                        </div>

                                        <div>
                                            <FieldLabel>{i18nT("equipmentModal.type")}</FieldLabel>

                                            <select value={form.type} onChange={event => updateField("type", event.target.value)} className={inputClass(errors.type)}>
                                                <option value="">{i18nT("equipmentModal.selectType")}</option>

                                                {TYPES.map(type => <option key={type} value={type}>
                                                            {type}
                                                        </option>)}
                                            </select>

                                            {errors.type && <ErrorText>
                                                    {errors.type}
                                                </ErrorText>}
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-gray-100" />

                                <div>
                                    <SectionTitle icon={RiMapPinLine} title={i18nT("equipmentModal.locationState")} />

                                    <div className="
                      mt-4 grid
                      grid-cols-1
                      gap-4
                      md:grid-cols-3
                    ">
                                        <div>
                                            <FieldLabel>{i18nT("equipmentModal.area")}</FieldLabel>

                                            <select value={form.areaId} onChange={event => updateField("areaId", event.target.value)} className={inputClass(errors.areaId)}>
                                                <option value="">{i18nT("employeeModal.select")}</option>

                                                {areas.map(area => <option key={area.id} value={area.id}>
                                                            {area.name}
                                                        </option>)}
                                            </select>

                                            {errors.areaId && <ErrorText>
                                                    {errors.areaId}
                                                </ErrorText>}
                                        </div>

                                        <div>
                                            <FieldLabel>{i18nT("equipmentModal.criticality")}</FieldLabel>

                                            <select value={form.criticality} onChange={event => updateField("criticality", event.target.value)} className={inputClass()}>
                                                <option value="HIGH">{i18nT("equipmentModal.criticalityHigh")}</option>

                                                <option value="MEDIUM">{i18nT("equipmentModal.criticalityMedium")}</option>

                                                <option value="LOW">{i18nT("equipmentModal.criticalityLow")}</option>
                                            </select>
                                        </div>

                                        <div>
                                            <FieldLabel>{i18nT("equipmentModal.condition")}</FieldLabel>

                                            <select value={form.status} onChange={event => updateField("status", event.target.value)} className={inputClass()}>
                                                <option value="WORKING">{i18nT("status.inProgress")}</option>

                                                <option value="REPAIR">{i18nT("equipmentModal.inRepair")}</option>

                                                <option value="DOWNTIME">{i18nT("analytics.downtime.label")}</option>

                                                <option value="MAINTENANCE">{i18nT("equipmentModal.maintenance")}</option>

                                                <option value="OFFLINE">{i18nT("equipmentModal.disabled")}</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-gray-100" />

                                <div>
                                    <SectionTitle icon={RiToolsLine} title={i18nT("equipmentModal.technicalData")} />

                                    <div className="
                      mt-4 grid
                      grid-cols-1
                      gap-4
                      md:grid-cols-3
                    ">
                                        <div>
                                            <FieldLabel>{i18nT("equipmentModal.manufacturer")}</FieldLabel>

                                            <input value={form.manufacturer} onChange={event => updateField("manufacturer", event.target.value)} placeholder={i18nT("equipmentModal.manufacturerExample")} className={inputClass()} />
                                        </div>

                                        <div>
                                            <FieldLabel>{i18nT("equipmentModal.model")}</FieldLabel>

                                            <input value={form.model} onChange={event => updateField("model", event.target.value)} placeholder={i18nT("equipmentModal.modelExample")} className={inputClass()} />
                                        </div>

                                        <div>
                                            <FieldLabel>{i18nT("equipmentModal.commissioned")}</FieldLabel>

                                            <input type="date" value={form.commissioningDate} onChange={event => updateField("commissioningDate", event.target.value)} className={inputClass()} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="
                  flex items-center
                  justify-end gap-3
                  border-t
                  border-gray-100
                  bg-gray-50/70
                  px-6 py-4
                ">
                                <button type="button" onClick={closeModal} className="
                    rounded-lg
                    border border-gray-300
                    bg-white
                    px-4 py-2.5
                    text-sm font-semibold
                    text-gray-700
                    transition
                    hover:bg-gray-50
                  ">{i18nT("employeeModal.cancel")}</button>

                                <button type="submit" className="
                    inline-flex
                    items-center gap-2
                    rounded-lg
                    bg-blue-600
                    px-5 py-2.5
                    text-sm font-semibold
                    text-white
                    transition
                    hover:bg-blue-700
                  ">
                                    <RiToolsLine size={17} />{i18nT("equipmentModal.add")}</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>;
}
function SectionTitle({
  icon: Icon,
  title
}) {
  return <div className="flex items-center gap-2">
            <div className="
          flex h-8 w-8
          items-center
          justify-center
          rounded-lg
          bg-blue-50
          text-blue-600
        ">
                <Icon size={16} />
            </div>

            <p className="text-sm font-semibold text-gray-900">
                {title}
            </p>
        </div>;
}
function FieldLabel({
  children
}) {
  return <label className="mb-2 block text-xs font-medium text-gray-600">
            {children}
        </label>;
}
function ErrorText({
  children
}) {
  return <p className="mt-1.5 text-xs font-medium text-red-600">
            {children}
        </p>;
}
function inputClass(error) {
  return `
    w-full
    rounded-lg
    border
    ${error ? "border-red-300" : "border-gray-300"}
    bg-gray-50
    px-3 py-2.5
    text-sm
    text-gray-900
    outline-none
    transition
    focus:bg-white
    focus:border-blue-500
    focus:ring-2
    focus:ring-blue-100
  `;
}
