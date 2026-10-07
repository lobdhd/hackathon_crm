import Chart from "react-apexcharts";
import { RiAlarmWarningLine } from "react-icons/ri";
import { t as i18nT, useI18n } from "../../i18n/index.js";
export default function FailuresChart({
  data
}) {
  useI18n();
  const options = {
    chart: {
      stacked: true,
      toolbar: {
        show: false
      },
      fontFamily: "inherit"
    },
    colors: ["#3b82f6", "#8b5cf6", "#f97316"],
    plotOptions: {
      bar: {
        borderRadius: 5,
        columnWidth: "48%"
      }
    },
    dataLabels: {
      enabled: false
    },
    grid: {
      borderColor: "#f3f4f6",
      strokeDashArray: 4
    },
    legend: {
      position: "top",
      horizontalAlign: "right",
      labels: {
        colors: "#6b7280"
      },
      fontSize: "11px",
      markers: {
        width: 8,
        height: 8,
        radius: 8
      }
    },
    xaxis: {
      categories: data.map(item => item.area),
      axisBorder: {
        show: false
      },
      axisTicks: {
        show: false
      },
      labels: {
        style: {
          colors: "#9ca3af",
          fontSize: "11px"
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: "#9ca3af",
          fontSize: "11px"
        }
      }
    },
    tooltip: {
      shared: true,
      intersect: false
    }
  };
  const series = [{
    name: i18nT("analytics.failures.mechanical"),
    data: data.map(item => item.mechanical)
  }, {
    name: i18nT("analytics.failures.electrical"),
    data: data.map(item => item.electrical)
  }, {
    name: i18nT("analytics.failures.hydraulic"),
    data: data.map(item => item.hydraulic)
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
                    <h2 className="text-[15px] font-semibold text-gray-900">{i18nT("analytics.failures.title")}</h2>

                    <p className="mt-1 text-xs text-gray-500">{i18nT("analytics.failures.byArea")}</p>
                </div>

                <div className="
            flex h-9 w-9
            items-center
            justify-center
            rounded-lg
            bg-red-50
            text-red-600
          ">
                    <RiAlarmWarningLine size={18} />
                </div>
            </div>

            <div className="px-3 pb-3 pt-2">
                <Chart type="bar" height={340} options={options} series={series} />
            </div>
        </section>;
}
