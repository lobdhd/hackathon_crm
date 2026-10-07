import Chart from "react-apexcharts";
import { RiTimeLine } from "react-icons/ri";
import { t as i18nT, useI18n } from "../../i18n/index.js";
export default function DowntimeChart({
  equipment
}) {
  useI18n();
  const sorted = [...equipment].sort((a, b) => b.minutes - a.minutes).slice(0, 6);
  const options = {
    chart: {
      toolbar: {
        show: false
      },
      fontFamily: "inherit"
    },
    colors: ["#f97316"],
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 5,
        barHeight: "52%",
        distributed: false
      }
    },
    dataLabels: {
      enabled: false
    },
    grid: {
      borderColor: "#f3f4f6",
      strokeDashArray: 4
    },
    xaxis: {
      categories: sorted.map(item => item.name),
      labels: {
        formatter(value) {
          return `${Math.round(value / 60)}ч`;
        },
        style: {
          colors: "#9ca3af",
          fontSize: "11px"
        }
      },
      axisBorder: {
        show: false
      },
      axisTicks: {
        show: false
      }
    },
    yaxis: {
      labels: {
        maxWidth: 190,
        style: {
          colors: "#4b5563",
          fontSize: "11px"
        }
      }
    },
    tooltip: {
      y: {
        formatter(value) {
          const hours = Math.floor(value / 60);
          const minutes = value % 60;
          return `${hours} ч ${minutes} мин`;
        }
      }
    }
  };
  const series = [{
    name: i18nT("analytics.downtime.label"),
    data: sorted.map(item => item.minutes)
  }];
  return <section className="
        overflow-hidden
        rounded-xl
        border border-gray-200
        bg-white
        shadow-sm
      ">
            <div className="
          flex items-start
          justify-between
          gap-4
          border-b
          border-gray-100
          px-5 py-4
        ">
                <div>
                    <h2 className="text-[15px] font-semibold text-gray-900">{i18nT("analytics.downtime.title")}</h2>

                    <p className="mt-1 text-xs text-gray-500">{i18nT("analytics.downtime.topEquipment")}</p>
                </div>

                <div className="
            flex h-9 w-9
            items-center
            justify-center
            rounded-lg
            bg-orange-50
            text-orange-600
          ">
                    <RiTimeLine size={18} />
                </div>
            </div>

            <div className="px-3 pb-3 pt-2">
                <Chart type="bar" height={340} options={options} series={series} />
            </div>
        </section>;
}
