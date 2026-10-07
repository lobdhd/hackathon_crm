import { useEffect, useMemo, useState } from "react";
import { RiCloseLine, RiInformationLine, RiUserLine } from "react-icons/ri";
import { t as i18nT, useI18n } from "../../i18n/index.js";
export default function CreateOrderModal({
  open,
  onClose,
  areas,
  equipment,
  employees,
  onCreate
}) {
  useI18n();
  const [form, setForm] = useState({
    workType: "UNPLANNED",
    title: "",
    areaId: "",
    equipmentId: "",
    employeeId: "",
    priority: "NORMAL",
    deadline: "",
    comment: ""
  });
  const availableEquipment = useMemo(() => {
    if (!form.areaId) return [];
    return equipment.filter(item => item.areaId === Number(form.areaId));
  }, [equipment, form.areaId]);
  const availableEmployees = useMemo(() => {
    if (!form.areaId) return [];
    const areaId = Number(form.areaId);
    return employees.filter(employee => employee.areaIds.includes(areaId));
  }, [employees, form.areaId]);
  useEffect(() => {
    setForm(prev => ({
      ...prev,
      equipmentId: "",
      employeeId: ""
    }));
  }, [form.areaId]);
  if (!open) return null;
  function updateField(field, value) {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  }
  function handleSubmit(event) {
    event.preventDefault();
    if (!form.title || !form.areaId || !form.equipmentId || !form.employeeId || !form.deadline) {
      alert(i18nT("orderModal.requiredFields"));
      return;
    }
    onCreate({
      ...form,
      areaId: Number(form.areaId),
      equipmentId: Number(form.equipmentId),
      employeeId: Number(form.employeeId)
    });
    setForm({
      workType: "UNPLANNED",
      title: "",
      areaId: "",
      equipmentId: "",
      employeeId: "",
      priority: "NORMAL",
      deadline: "",
      comment: ""
    });
    onClose();
  }
  return <>
            <div className="fixed inset-0 z-[60] bg-gray-900/50" onClick={onClose} />

            <div className="fixed inset-0 z-[70] overflow-y-auto p-4">
                <div className="flex min-h-full items-center justify-center">
                    <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">{i18nT("orderModal.title")}</h2>

                                <p className="mt-1 text-sm text-gray-500">{i18nT("orderModal.subtitle")}</p>
                            </div>

                            <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                                <RiCloseLine size={22} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5 p-6">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">{i18nT("orderModal.workType")}</label>

                                    <select value={form.workType} onChange={event => updateField("workType", event.target.value)} className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500">
                                        <option value="PLANNED">{i18nT("priority.planned")}</option>

                                        <option value="UNPLANNED">{i18nT("orderModal.unplanned")}</option>

                                        <option value="EMERGENCY">{i18nT("priority.emergency")}</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">{i18nT("orderModal.priority")}</label>

                                    <select value={form.priority} onChange={event => updateField("priority", event.target.value)} className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500">
                                        <option value="EMERGENCY">{i18nT("priority.emergency")}</option>

                                        <option value="HIGH">{i18nT("priority.high")}</option>

                                        <option value="NORMAL">{i18nT("priority.normal")}</option>

                                        <option value="PLANNED">{i18nT("priority.planned")}</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">{i18nT("orderModal.description")}</label>

                                <textarea rows={3} value={form.title} onChange={event => updateField("title", event.target.value)} placeholder={i18nT("orderModal.problemExample")} className="w-full resize-none rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">{i18nT("equipmentModal.area")}</label>

                                    <select value={form.areaId} onChange={event => updateField("areaId", event.target.value)} className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500">
                                        <option value="">{i18nT("orderModal.selectArea")}</option>

                                        {areas.map(area => <option key={area.id} value={area.id}>
                                                {area.name}
                                            </option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">{i18nT("orderModal.equipment")}</label>

                                    <select disabled={!form.areaId} value={form.equipmentId} onChange={event => updateField("equipmentId", event.target.value)} className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50 focus:border-blue-500">
                                        <option value="">{i18nT("orderModal.selectEquipment")}</option>

                                        {availableEquipment.map(item => <option key={item.id} value={item.id}>
                                                {item.name}
                                            </option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">{i18nT("orderModal.assignee")}</label>

                                <select disabled={!form.areaId} value={form.employeeId} onChange={event => updateField("employeeId", event.target.value)} className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50 focus:border-blue-500">
                                    <option value="">{i18nT("orderModal.selectAssignee")}</option>

                                    {availableEmployees.map(employee => {
                  const status = employee.status === "FREE" ? "свободен" : employee.status === "BUSY" ? `в работе №${employee.currentOrderNumber}` : employee.status === "QUEUE" ? `очередь: ${employee.queueCount}` : "не на смене";
                  return <option key={employee.id} value={employee.id}>
                                                {employee.fullName} —{" "}
                                                {employee.specialty} — {status}
                                            </option>;
                })}
                                </select>

                                {form.areaId && <div className="mt-2 flex items-start gap-2 text-xs text-gray-500">
                                        <RiInformationLine size={15} className="mt-0.5 shrink-0" />

                                        <span>{i18nT("orderModal.areaEmployeesHint")}</span>
                                    </div>}
                            </div>

                            {form.employeeId && <SelectedEmployee employee={employees.find(employee => employee.id === Number(form.employeeId))} areas={areas} />}

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">{i18nT("orderModal.deadline")}</label>

                                <input type="datetime-local" value={form.deadline} onChange={event => updateField("deadline", event.target.value)} className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">{i18nT("orderModal.comment")}</label>

                                <textarea rows={2} value={form.comment} onChange={event => updateField("comment", event.target.value)} placeholder={i18nT("orderModal.additionalInfo")} className="w-full resize-none rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
                            </div>

                            <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
                                <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">{i18nT("employeeModal.cancel")}</button>

                                <button type="submit" className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">{i18nT("orderModal.create")}</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>;
}
function SelectedEmployee({
  employee,
  areas
}) {
  useI18n();
  if (!employee) return null;
  const employeeAreas = areas.filter(area => employee.areaIds.includes(area.id));
  return <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4">
            <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
                    <RiUserLine size={18} />
                </div>

                <div>
                    <p className="text-sm font-semibold text-gray-900">
                        {employee.fullName}
                    </p>

                    <p className="mt-0.5 text-xs text-gray-500">
                        {employee.specialty} • {employee.grade}{i18nT("orderModal.gradeRating")}{employee.rating}
                    </p>

                    <p className="mt-2 text-xs text-gray-500">{i18nT("orderModal.availableAreas")}{" "}
                        <span className="font-medium text-gray-700">
                            {employeeAreas.map(area => area.name).join(", ")}
                        </span>
                    </p>
                </div>
            </div>
        </div>;
}
