import { useNavigate } from "react-router-dom";
import { RiArrowDownLine, RiArrowRightSLine, RiArrowUpLine, RiMapPinLine, RiSubtractLine } from "react-icons/ri";
import RatingScoreBadge from "./RatingScoreBadge";
import EmployeeStatus from "../employees/EmployeeStatus";
import { t as i18nT, useI18n } from "../../i18n/index.js";
export default function RatingTable({
  employees,
  areas
}) {
  useI18n();
  const navigate = useNavigate();
  return <div className="
        overflow-hidden
        rounded-xl
        border border-gray-200
        bg-white
        shadow-sm
      ">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[1250px] text-left">
                    <thead className="
              border-b
              border-gray-200
              bg-gray-50
            ">
                        <tr className="
                text-xs
                font-semibold
                uppercase
                tracking-wide
                text-gray-500
              ">
                            <th className="w-16 px-5 py-3.5">{i18nT("ratingTable.place")}</th>

                            <th className="px-5 py-3.5">{i18nT("ordersTable.assignee")}</th>

                            <th className="px-5 py-3.5">{i18nT("ratingTable.areas")}</th>

                            <th className="px-5 py-3.5">{i18nT("ratingTable.completed")}</th>

                            <th className="px-5 py-3.5">{i18nT("analytics.area.onTime")}</th>

                            <th className="px-5 py-3.5">{i18nT("analytics.area.quality")}</th>

                            <th className="px-5 py-3.5">{i18nT("ratingTable.returns")}</th>

                            <th className="px-5 py-3.5">{i18nT("sidebar.rating")}</th>

                            <th className="px-5 py-3.5">{i18nT("ratingTable.trend")}</th>

                            <th className="w-12 px-3 py-3.5" />
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                        {employees.map((employee, index) => {
            const employeeAreas = areas.filter(area => employee.areaIds?.includes(area.id));
            return <tr key={employee.id} onClick={() => navigate(`/employees/${employee.id}`)} className="
                      cursor-pointer
                      transition
                      hover:bg-blue-50/30
                    ">
                                        <td className="px-5 py-4">
                                            <PlaceBadge place={index + 1} />
                                        </td>

                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="
                            flex h-10 w-10
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            bg-blue-100
                            text-xs
                            font-bold
                            text-blue-700
                          ">
                                                    {getInitials(employee.fullName)}
                                                </div>

                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {employee.fullName}
                                                    </p>

                                                    <p className="mt-1 text-xs text-gray-400">
                                                        {employee.specialty}
                                                        {" • "}
                                                        {employee.grade}{" "}{i18nT("employeeModal.gradeLower")}</p>

                                                    <div className="mt-2">
                                                        <EmployeeStatus status={employee.status} />
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-5 py-4">
                                            <div className="flex max-w-[250px] flex-wrap gap-1.5">
                                                {employeeAreas.slice(0, 2).map(area => <span key={area.id} className="
                                  inline-flex
                                  items-center
                                  gap-1
                                  rounded-md
                                  border
                                  border-blue-100
                                  bg-blue-50
                                  px-2 py-1
                                  text-[10px]
                                  font-medium
                                  text-blue-700
                                ">
                                                                <RiMapPinLine size={11} />

                                                                {area.name}
                                                            </span>)}

                                                {employeeAreas.length > 2 && <span className="
                              rounded-md
                              bg-gray-100
                              px-2 py-1
                              text-[10px]
                              font-semibold
                              text-gray-500
                            ">
                                                            +
                                                            {employeeAreas.length - 2}
                                                        </span>}
                                            </div>
                                        </td>

                                        <td className="px-5 py-4">
                                            <MetricNumber value={employee.completedCount} tone="blue" />
                                        </td>

                                        <td className="px-5 py-4">
                                            <PercentMetric value={employee.onTimePercent} type="time" />
                                        </td>

                                        <td className="px-5 py-4">
                                            <PercentMetric value={employee.qualityScore} type="quality" />
                                        </td>

                                        <td className="px-5 py-4">
                                            <span className={`
                          text-sm
                          font-semibold
                          ${employee.reworkCount === 0 ? "text-green-600" : employee.reworkCount <= 1 ? "text-orange-600" : "text-red-600"}
                        `}>
                                                {employee.reworkCount}
                                            </span>
                                        </td>

                                        <td className="px-5 py-4">
                                            <RatingScoreBadge score={employee.rating} />
                                        </td>

                                        <td className="px-5 py-4">
                                            <Trend value={employee.trend} />
                                        </td>

                                        <td className="px-3 py-4">
                                            <RiArrowRightSLine size={19} className="text-gray-300" />
                                        </td>
                                    </tr>;
          })}
                    </tbody>
                </table>
            </div>

            {employees.length === 0 && <div className="py-16 text-center">
                        <p className="text-sm font-semibold text-gray-700">{i18nT("ratingTable.empty")}</p>

                        <p className="mt-1 text-xs text-gray-400">{i18nT("ratingTable.filterHint")}</p>
                    </div>}
        </div>;
}
function PlaceBadge({
  place
}) {
  let className = "bg-gray-100 text-gray-600";
  if (place === 1) {
    className = "bg-amber-100 text-amber-700";
  }
  if (place === 2) {
    className = "bg-slate-100 text-slate-600";
  }
  if (place === 3) {
    className = "bg-orange-100 text-orange-700";
  }
  return <span className={`
        flex h-8 w-8
        items-center
        justify-center
        rounded-lg
        text-sm
        font-bold
        ${className}
      `}>
            {place}
        </span>;
}
function MetricNumber({
  value,
  tone
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-700"
  };
  return <span className={`
        inline-flex
        min-w-10
        justify-center
        rounded-lg
        px-2.5 py-1.5
        text-sm
        font-bold
        ${tones[tone]}
      `}>
            {value}
        </span>;
}
function PercentMetric({
  value,
  type
}) {
  const highClass = type === "quality" ? "bg-violet-50 text-violet-700" : "bg-green-50 text-green-700";
  let className = "bg-red-50 text-red-700";
  if (value >= 90) {
    className = highClass;
  } else if (value >= 80) {
    className = "bg-blue-50 text-blue-700";
  } else if (value >= 70) {
    className = "bg-orange-50 text-orange-700";
  }
  return <span className={`
        inline-flex
        rounded-lg
        px-2.5 py-1.5
        text-xs
        font-bold
        ${className}
      `}>
            {value}%
        </span>;
}
function Trend({
  value = 0
}) {
  if (value > 0) {
    return <span className="
          inline-flex
          items-center gap-1
          rounded-lg
          bg-green-50
          px-2 py-1.5
          text-xs
          font-semibold
          text-green-700
        ">
                <RiArrowUpLine size={14} />

                {value}
            </span>;
  }
  if (value < 0) {
    return <span className="
          inline-flex
          items-center gap-1
          rounded-lg
          bg-red-50
          px-2 py-1.5
          text-xs
          font-semibold
          text-red-700
        ">
                <RiArrowDownLine size={14} />

                {Math.abs(value)}
            </span>;
  }
  return <span className="
        inline-flex
        items-center gap-1
        rounded-lg
        bg-gray-100
        px-2 py-1.5
        text-xs
        font-semibold
        text-gray-500
      ">
            <RiSubtractLine size={14} />

            0
        </span>;
}
function getInitials(fullName = "") {
  return fullName.split(" ").filter(Boolean).slice(0, 2).map(word => word[0]).join("").toUpperCase();
}
