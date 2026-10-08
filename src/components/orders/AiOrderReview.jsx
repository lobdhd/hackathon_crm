import { RiCheckboxCircleLine, RiCloseCircleLine, RiErrorWarningLine, RiSparkling2Line } from "react-icons/ri";
import { t as i18nT, useI18n } from "../../i18n/index.js";
export default function AiOrderReview({
  review,
  onAccept,
  onRework
}) {
  useI18n();
  if (!review) {
    return <section className="
          relative overflow-hidden
          rounded-xl border
          border-violet-200
          bg-white shadow-sm
        ">
        <div className="absolute bottom-0 left-0 top-0 w-[3px] bg-violet-500" />

        <div className="flex items-start gap-4 p-6">
          <div className="
              flex h-11 w-11
              shrink-0 items-center
              justify-center rounded-xl
              bg-violet-100
              text-violet-600
            ">
            <RiSparkling2Line size={22} />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">{i18nT("aiReview.title")}</h3>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">{i18nT("aiReview.waitHint")}</p>

            <div className="
                mt-5 inline-flex
                rounded-lg bg-violet-50
                px-3 py-2
                text-xs font-medium
                text-violet-700
              ">{i18nT("aiReview.waitingCompletion")}</div>
          </div>
        </div>
      </section>;
  }
  const verdicts = {
    ACCEPTED: {
      title: i18nT("aiReview.accepted"),
      className: "bg-green-50 text-green-700 border-green-200"
    },
    ACCEPTED_WITH_REMARKS: {
      title: i18nT("aiReview.acceptedWithNotes"),
      className: "bg-orange-50 text-orange-700 border-orange-200"
    },
    REWORK: {
      title: i18nT("aiReview.needsRework"),
      className: "bg-red-50 text-red-700 border-red-200"
    }
  };
  const verdict = verdicts[review.verdict] ?? {
    title: review.verdict,
    className: "bg-gray-50 text-gray-700 border-gray-200"
  };
  return <section className="
        relative overflow-hidden
        rounded-xl border
        border-violet-200
        bg-white shadow-sm
      ">
      <div className="absolute bottom-0 left-0 top-0 w-[3px] bg-violet-500" />

      <div className="
          flex flex-col
          justify-between gap-4
          border-b border-violet-100
          bg-violet-50/40
          px-6 py-5
          sm:flex-row sm:items-center
        ">
        <div className="flex items-center gap-3">
          <div className="
              flex h-10 w-10
              items-center justify-center
              rounded-xl bg-violet-600
              text-white
            ">
            <RiSparkling2Line size={20} />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">{i18nT("aiReview.title")}</h3>

            <p className="mt-0.5 text-xs text-gray-500">{i18nT("aiReview.analysis")}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-gray-500">{i18nT("aiReview.score")}</p>

            <p className="text-2xl font-bold text-gray-900">
              {review.score}

              <span className="ml-0.5 text-sm font-medium text-gray-400">
                /100
              </span>
            </p>
          </div>

          <div className={`
              rounded-lg border
              px-3 py-2
              text-xs font-semibold
              ${verdict.className}
            `}>
            {verdict.title}
          </div>
        </div>
      </div>

      <div className="p-6">
        <p className="text-sm leading-6 text-gray-600">
          {review.summary}
        </p>

        <div className="mt-5 space-y-2">
          {review.checks?.map(check => <CheckRow key={check.id} check={check} />)}
        </div>

        <div className="
            mt-6 flex flex-col gap-3
            border-t border-gray-100
            pt-5 sm:flex-row
          ">
          <button onClick={onAccept} className="
              flex-1 rounded-lg
              bg-green-600
              px-4 py-2.5
              text-sm font-semibold
              text-white transition
              hover:bg-green-700
            ">{i18nT("aiReview.acceptOrder")}</button>

          <button onClick={onRework} className="
              flex-1 rounded-lg
              border border-red-200
              bg-red-50
              px-4 py-2.5
              text-sm font-semibold
              text-red-700
              transition hover:bg-red-100
            ">{i18nT("aiReview.returnRework")}</button>
        </div>
      </div>
    </section>;
}
function CheckRow({
  check
}) {
  let Icon = RiCheckboxCircleLine;
  let iconClass = "bg-green-50 text-green-600";
  if (check.status === "WARNING") {
    Icon = RiErrorWarningLine;
    iconClass = "bg-orange-50 text-orange-600";
  }
  if (check.status === "ERROR") {
    Icon = RiCloseCircleLine;
    iconClass = "bg-red-50 text-red-600";
  }
  return <div className="
        flex items-start gap-3
        rounded-xl border
        border-gray-100
        bg-gray-50/70 p-3
      ">
      <div className={`
          rounded-lg p-1.5
          ${iconClass}
        `}>
        <Icon size={17} />
      </div>

      <div>
        <p className="text-sm font-medium text-gray-800">
          {check.title}
        </p>

        <p className="mt-1 text-xs text-gray-500">
          {check.message}
        </p>
      </div>
    </div>;
}
