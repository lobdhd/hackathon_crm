import Chart from "react-apexcharts";
import { RiLineChartLine } from "react-icons/ri";
import { t as i18nT, useI18n } from "../../i18n/index.js";
export default function OrdersChart({
  data
}) {
  useI18n();
  const options = {
    chart: {
      toolbar: {
        show: false
      },
      zoom: {
        enabled: false
      },
      fontFamily: "inherit",
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 600
      }
    },
    colors: ["#2563eb", "#10b981"],
    stroke: {
      curve: "smooth",
      width: [3, 3]
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.28,
        opacityTo: 0.03,
        stops: [0, 90, 100]
      }
    },
    dataLabels: {
      enabled: false
    },
    grid: {
      borderColor: "#f3f4f6",
      strokeDashArray: 4,
      padding: {
        left: 8,
        right: 8
      }
    },
    legend: {
      position: "top",
      horizontalAlign: "right",
      markers: {
        width: 8,
        height: 8,
        radius: 8
      },
      fontSize: "12px",
      labels: {
        colors: "#6b7280"
      }
    },
    tooltip: {
      shared: true,
      intersect: false
    },
    markers: {
      size: 0,
      hover: {
        size: 5
      }
    },
    xaxis: {
      categories: data.categories,
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
        },
        formatter(value) {
          return Math.round(value);
        }
      }
    }
  };
  const series = [{
    name: i18nT("analytics.orders.created"),
    data: data.created
  }, {
    name: i18nT("analytics.orders.completed"),
    data: data.completed
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
                    <h2 className="text-[15px] font-semibold text-gray-900">{i18nT("analytics.orders.title")}</h2>

                    <p className="mt-1 text-xs text-gray-500">{i18nT("analytics.orders.subtitle")}</p>
                </div>

                <div className="
            flex h-9 w-9
            items-center
            justify-center
            rounded-lg
            bg-blue-50
            text-blue-600
          ">
                    <RiLineChartLine size={18} />
                </div>
            </div>

            <div className="px-3 pb-3 pt-2">
                <Chart type="area" height={330} options={options} series={series} />
            </div>
        </section>;
}
