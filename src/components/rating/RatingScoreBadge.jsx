import { RiStarFill } from "react-icons/ri";
import { t as i18nT, useI18n } from "../../i18n/index.js";
export default function RatingScoreBadge({
  score
}) {
  useI18n();
  if (score == null) {
    return <span className="
          inline-flex items-center
          rounded-lg
          bg-gray-100
          px-2.5 py-1.5
          text-xs font-semibold
          text-gray-500
        ">{i18nT("ratingScore.noScore")}</span>;
  }
  let className = "bg-gray-100 text-gray-700";
  if (score >= 90) {
    className = "bg-green-50 text-green-700";
  } else if (score >= 80) {
    className = "bg-blue-50 text-blue-700";
  } else if (score >= 70) {
    className = "bg-orange-50 text-orange-700";
  } else {
    className = "bg-red-50 text-red-700";
  }
  return <span className={`
        inline-flex items-center
        gap-1.5 rounded-lg
        px-2.5 py-1.5
        text-sm font-bold
        ${className}
      `}>
            <RiStarFill size={14} className={score >= 90 ? "text-amber-400" : ""} />

            {score}
        </span>;
}
