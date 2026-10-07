import { useNavigate } from "react-router-dom";
import { RiMedalLine, RiStarFill, RiTrophyFill } from "react-icons/ri";
import { t as i18nT, useI18n } from "../../i18n/index.js";
export default function RatingPodium({
  employees = []
}) {
  const navigate = useNavigate();
  const first = employees[0];
  const second = employees[1];
  const third = employees[2];
  if (!first) {
    return null;
  }
  return <div className="
        grid grid-cols-1
        gap-4
        xl:grid-cols-3
      ">
            {/* SECOND */}
            {second && <PodiumCard employee={second} place={2} tone="silver" onClick={() => navigate(`/employees/${second.id}`)} />}

            {/* FIRST */}
            <PodiumCard employee={first} place={1} tone="gold" featured onClick={() => navigate(`/employees/${first.id}`)} />

            {/* THIRD */}
            {third && <PodiumCard employee={third} place={3} tone="bronze" onClick={() => navigate(`/employees/${third.id}`)} />}
        </div>;
}
function PodiumCard({
  employee,
  place,
  tone,
  featured = false,
  onClick
}) {
  useI18n();
  const tones = {
    gold: {
      wrapper: "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-yellow-50",
      icon: "bg-amber-100 text-amber-600",
      place: "bg-amber-500 text-white",
      score: "text-amber-700"
    },
    silver: {
      wrapper: "border-slate-200 bg-gradient-to-br from-slate-50 via-white to-gray-50",
      icon: "bg-slate-100 text-slate-500",
      place: "bg-slate-500 text-white",
      score: "text-slate-700"
    },
    bronze: {
      wrapper: "border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50",
      icon: "bg-orange-100 text-orange-600",
      place: "bg-orange-500 text-white",
      score: "text-orange-700"
    }
  };
  const current = tones[tone];
  return <button type="button" onClick={onClick} className={`
        relative
        overflow-hidden
        rounded-2xl
        border
        p-5
        text-left
        shadow-sm
        transition
        hover:-translate-y-1
        hover:shadow-md
        ${current.wrapper}
        ${featured ? "xl:-translate-y-2 xl:hover:-translate-y-3" : ""}
      `}>
            {/* PLACE */}
            <div className={`
          absolute
          right-4 top-4
          flex h-8 w-8
          items-center
          justify-center
          rounded-full
          text-sm font-bold
          shadow-sm
          ${current.place}
        `}>
                {place}
            </div>

            <div className={`
          flex h-11 w-11
          items-center
          justify-center
          rounded-xl
          ${current.icon}
        `}>
                {place === 1 ? <RiTrophyFill size={22} /> : <RiMedalLine size={22} />}
            </div>

            <div className="mt-5 flex items-center gap-3">
                <div className="
            flex h-12 w-12
            shrink-0 items-center
            justify-center
            rounded-xl
            bg-white
            text-sm font-bold
            text-blue-700
            shadow-sm
          ">
                    {getInitials(employee.fullName)}
                </div>

                <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-900">
                        {employee.fullName}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                        {employee.specialty}
                        {" • "}
                        {employee.grade}{i18nT("employeeModal.gradeLower")}</p>
                </div>
            </div>

            <div className="
          mt-5
          flex items-end
          justify-between
          gap-4
          border-t
          border-gray-200/70
          pt-4
        ">
                <div>
                    <p className="text-xs text-gray-500">{i18nT("ratingPodium.totalRating")}</p>

                    <div className={`
              mt-1 flex
              items-center gap-1.5
              text-3xl
              font-bold
              ${current.score}
            `}>
                        <RiStarFill size={19} className="text-amber-400" />

                        {employee.rating}
                    </div>
                </div>

                <div className="text-right">
                    <p className="text-xs text-gray-500">{i18nT("ratingPodium.closed")}</p>

                    <p className="mt-1 text-xl font-bold text-gray-900">
                        {employee.completedCount}
                    </p>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
                <MiniMetric label={i18nT("analytics.area.onTime")} value={`${employee.onTimePercent}%`} tone="green" />

                <MiniMetric label={i18nT("analytics.area.quality")} value={`${employee.qualityScore}%`} tone="violet" />
            </div>
        </button>;
}
function MiniMetric({
  label,
  value,
  tone
}) {
  const tones = {
    green: "bg-green-50 text-green-700",
    violet: "bg-violet-50 text-violet-700"
  };
  return <div className={`
        rounded-lg
        px-3 py-2
        ${tones[tone]}
      `}>
            <p className="text-[10px] opacity-70">
                {label}
            </p>

            <p className="mt-0.5 text-sm font-bold">
                {value}
            </p>
        </div>;
}
function getInitials(fullName = "") {
  return fullName.split(" ").filter(Boolean).slice(0, 2).map(word => word[0]).join("").toUpperCase();
}
