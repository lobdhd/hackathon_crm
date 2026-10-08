import Chart from "react-apexcharts";
import { RiBarChartGroupedLine } from "react-icons/ri";
import { t as i18nT, useI18n } from "../../i18n/index.js";
export default function AreaEfficiencyChart({
  data
}) {
  useI18n();
  const options = {
    chart: {
      toolbar: {
        show: false
      },
      fontFamily: "inherit"
    },
    colors: ["#10b981", "#8b5cf6", "#3b82f6"],
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: "52%"
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
      fontSize: "11px",
      labels: {
        colors: "#6b7280"
      },
      markers: {
        width: 8,
        height: 8,
        radius: 8
      }
    },
    xaxis: {
      categories: data.map(item => {
        if (item.name.includes("дробления")) {
          return "Дробление";
        }
        if (item.name.includes("обогащения")) {
          return "Обогащение";
        }
        if (item.name.includes("Ремонтно")) {
          return "РМЦ";
        }
        return "Транспорт";
      }),
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
      min: 0,
      max: 100,
      labels: {
        formatter(value) {
          return `${value}%`;
        },
        style: {
          colors: "#9ca3af",
          fontSize: "11px"
        }
      }
    },
    tooltip: {
      y: {
        formatter(value) {
          return `${value}%`;
        }
      }
    }
  };
  const series = [{
    name: i18nT("analytics.area.onTime"),
    data: data.map(item => item.onTime)
  }, {
    name: i18nT("analytics.area.quality"),
    data: data.map(item => item.quality)
  }, {
    name: i18nT("analytics.area.load"),
    data: data.map(item => item.load)
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
                    <h2 className="text-[15px] font-semibold text-gray-900">{i18nT("analytics.area.title")}</h2>

                    <p className="mt-1 text-xs text-gray-500">{i18nT("analytics.area.subtitle")}</p>
                </div>

                <div className="
            flex h-9 w-9
            items-center
            justify-center
            rounded-lg
            bg-green-50
            text-green-600
          ">
                    <RiBarChartGroupedLine size={18} />
                </div>
            </div>

            <div className="px-3 pb-3 pt-2">
                <Chart type="bar" height={340} options={options} series={series} />
            </div>
        </section>;
}
