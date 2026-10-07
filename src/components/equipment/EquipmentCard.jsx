import { useNavigate } from "react-router-dom";
import { RiAlarmWarningLine, RiArrowRightSLine, RiFileList3Line, RiMapPinLine, RiTimeLine, RiToolsLine } from "react-icons/ri";
import EquipmentStatus from "./EquipmentStatus";
import EquipmentCriticality from "./EquipmentCriticality";
import { t as i18nT, useI18n } from "../../i18n/index.js";
export default function EquipmentCard({
  equipment,
  area,
  activeOrders = 0,
  emergencyOrders = 0
}) {
  useI18n();
  const navigate = useNavigate();
  return <article onClick={() => navigate(`/equipment/${equipment.id}`)} className="
        group cursor-pointer
        overflow-hidden
        rounded-xl
        border border-gray-200
        bg-white shadow-sm
        transition
        hover:-translate-y-0.5
        hover:border-blue-200
        hover:shadow-md
      ">
            <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="
                flex h-11 w-11
                shrink-0 items-center
                justify-center
                rounded-xl
                bg-blue-50
                text-blue-600
              ">
                            <RiToolsLine size={20} />
                        </div>

                        <div className="min-w-0">
                            <h3 className="
                  truncate
                  text-sm
                  font-semibold
                  text-gray-900
                ">
                                {equipment.name}
                            </h3>

                            <p className="mt-1 text-xs text-gray-400">
                                {equipment.inventoryNumber}
                            </p>
                        </div>
                    </div>

                    <RiArrowRightSLine size={20} className="
              shrink-0
              text-gray-300
              transition
              group-hover:translate-x-0.5
              group-hover:text-blue-500
            " />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    <EquipmentStatus status={equipment.status} />

                    <EquipmentCriticality criticality={equipment.criticality} />
                </div>

                <div className="
            mt-5 flex
            items-center gap-2
            text-xs text-gray-500
          ">
                    <RiMapPinLine size={15} />

                    <span>
                        {area?.name ?? "Участок не указан"}
                    </span>
                </div>

                <div className="mt-2 text-xs text-gray-500">
                    {equipment.type}
                </div>

                <div className="
            mt-5 grid
            grid-cols-3 gap-2
          ">
                    <MiniStat label={i18nT("sidebar.orders")} value={activeOrders} icon={RiFileList3Line} tone="blue" />

                    <MiniStat label="Аварийные" value={emergencyOrders} icon={RiAlarmWarningLine} tone="red" />

                    <MiniStat label={i18nT("analytics.downtime.label")} value={formatMinutes(equipment.downtimeMinutes)} icon={RiTimeLine} tone="orange" />
                </div>
            </div>
        </article>;
}
function MiniStat({
  label,
  value,
  icon: Icon,
  tone
}) {
  const tones = {
    blue: "text-blue-600",
    red: "text-red-600",
    orange: "text-orange-600"
  };
  return <div className="
        min-w-0
        rounded-lg
        border border-gray-100
        bg-gray-50 p-2.5
      ">
            <div className="flex items-center gap-1">
                <Icon size={13} className={tones[tone] ?? tones.blue} />

                <p className="truncate text-[10px] text-gray-500">
                    {label}
                </p>
            </div>

            <p className="mt-1 truncate text-sm font-bold text-gray-900">
                {value}
            </p>
        </div>;
}
function formatMinutes(minutes = 0) {
  if (!minutes) {
    return "0м";
  }
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (!hours) {
    return `${remaining}м`;
  }
  if (!remaining) {
    return `${hours}ч`;
  }
  return `${hours}ч ${remaining}м`;
}
