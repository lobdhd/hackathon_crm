import Chart from "react-apexcharts";
import { RiDonutChartLine } from "react-icons/ri";
import { t as i18nT, useI18n } from "../../i18n/index.js";
export default function StatusDonutChart({
  data
}) {
  useI18n();
  const options = {
    chart: {
      fontFamily: "inherit"
    },
    colors: ["#f59e0b", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6"],
    labels: data.map(item => item.label),
    stroke: {
      width: 4,
      colors: ["#ffffff"]
    },
    legend: {
      position: "bottom",
      fontSize: "11px",
      labels: {
        colors: "#6b7280"
      },
      markers: {
        width: 8,
        height: 8,
        radius: 8
      },
      itemMargin: {
        horizontal: 6,
        vertical: 4
      }
    },
    dataLabels: {
      enabled: false
    },
    plotOptions: {
      pie: {
        donut: {
          size: "72%",
          labels: {
            show: true,
            name: {
              show: true,
              color: "#6b7280",
              fontSize: "12px"
            },
            value: {
              show: true,
              color: "#111827",
              fontSize: "26px",
              fontWeight: 700
            },
            total: {
              show: true,
              label: i18nT("analytics.status.total"),
              color: "#6b7280",
              fontSize: "12px",
              formatter(w) {
                return w.globals.seriesTotals.reduce((sum, value) => sum + value, 0);
              }
            }
          }
        }
      }
    },
    tooltip: {
      y: {
        formatter(value) {
          return `${value} нарядов`;
        }
      }
    }
  };
  const series = data.map(item => item.value);
  return <section className="
        overflow-hidden
        rounded-xl
        border border-gray-200
        bg-white
        shadow-sm
      ">
            <div className="
          flex items-start
          justify-between gap-4
          border-b border-gray-100
          px-5 py-4
        ">
                <div>
                    <h2 className="text-[15px] font-semibold text-gray-900">{i18nT("analytics.status.title")}</h2>

                    <p className="mt-1 text-xs text-gray-500">{i18nT("analytics.status.current")}</p>
                </div>

                <div className="
            flex h-9 w-9
            items-center
            justify-center
            rounded-lg
            bg-violet-50
            text-violet-600
          ">
                    <RiDonutChartLine size={18} />
                </div>
            </div>

            <div className="px-2 pb-3 pt-3">
                <Chart type="donut" height={330} options={options} series={series} />
            </div>
        </section>;
}
