export const analyticsPeriods = {
  SHIFT: {
    label: "Смена",

    ordersTrend: {
      categories: [
        "06:00",
        "07:00",
        "08:00",
        "09:00",
        "10:00",
        "11:00",
        "12:00",
        "13:00",
        "14:00",
      ],

      created: [
        1,
        3,
        5,
        8,
        10,
        13,
        15,
        17,
        19,
      ],

      completed: [
        0,
        1,
        2,
        4,
        6,
        8,
        11,
        13,
        15,
      ],
    },

    statusDistribution: [
      {
        label: "В работе",
        value: 8,
      },
      {
        label: "В очереди",
        value: 4,
      },
      {
        label: "Исполнено",
        value: 12,
      },
      {
        label: "Просрочено",
        value: 2,
      },
      {
        label: "Проверка ИИ",
        value: 3,
      },
    ],

    kpi: {
      completed: 15,
      onTimePercent: 87,
      averageCloseMinutes: 96,
      downtimeMinutes: 520,
      aiRisks: 4,
    },
  },

  WEEK: {
    label: "Неделя",

    ordersTrend: {
      categories: [
        "Пн",
        "Вт",
        "Ср",
        "Чт",
        "Пт",
        "Сб",
        "Вс",
      ],

      created: [
        24,
        31,
        27,
        36,
        33,
        21,
        18,
      ],

      completed: [
        20,
        28,
        25,
        32,
        30,
        19,
        16,
      ],
    },

    statusDistribution: [
      {
        label: "В работе",
        value: 18,
      },
      {
        label: "В очереди",
        value: 9,
      },
      {
        label: "Исполнено",
        value: 170,
      },
      {
        label: "Просрочено",
        value: 11,
      },
      {
        label: "Проверка ИИ",
        value: 8,
      },
    ],

    kpi: {
      completed: 170,
      onTimePercent: 89,
      averageCloseMinutes: 88,
      downtimeMinutes: 2460,
      aiRisks: 12,
    },
  },

  MONTH: {
    label: "30 дней",

    ordersTrend: {
      categories: [
        "7 сен",
        "12 сен",
        "17 сен",
        "22 сен",
        "27 сен",
        "2 окт",
        "6 окт",
      ],

      created: [
        78,
        155,
        229,
        314,
        399,
        482,
        557,
      ],

      completed: [
        69,
        141,
        211,
        289,
        371,
        451,
        525,
      ],
    },

    statusDistribution: [
      {
        label: "В работе",
        value: 21,
      },
      {
        label: "В очереди",
        value: 11,
      },
      {
        label: "Исполнено",
        value: 525,
      },
      {
        label: "Просрочено",
        value: 24,
      },
      {
        label: "Проверка ИИ",
        value: 9,
      },
    ],

    kpi: {
      completed: 525,
      onTimePercent: 91,
      averageCloseMinutes: 82,
      downtimeMinutes: 9780,
      aiRisks: 31,
    },
  },
};

export const downtimeEquipment = [
  {
    id: 4,
    areaId: 2,
    name: "Насос НШ-100",
    inventoryNumber: "NS-100",
    minutes: 410,
  },
  {
    id: 1,
    areaId: 1,
    name: "Дробилка КМД-1750",
    inventoryNumber: "DR-001",
    minutes: 260,
  },
  {
    id: 8,
    areaId: 4,
    name: "БелАЗ 75131 №12",
    inventoryNumber: "TR-012",
    minutes: 185,
  },
  {
    id: 6,
    areaId: 3,
    name: "Токарный станок 16К20",
    inventoryNumber: "RM-020",
    minutes: 120,
  },
  {
    id: 2,
    areaId: 1,
    name: "Конвейер К-3",
    inventoryNumber: "CNV-003",
    minutes: 85,
  },
  {
    id: 5,
    areaId: 2,
    name: "Флотомашина ФМ-12",
    inventoryNumber: "FM-012",
    minutes: 45,
  },
];

export const failuresByArea = [
  {
    areaId: 1,
    area: "Дробление",
    mechanical: 14,
    electrical: 6,
    hydraulic: 3,
  },
  {
    areaId: 2,
    area: "Обогащение",
    mechanical: 7,
    electrical: 8,
    hydraulic: 10,
  },
  {
    areaId: 3,
    area: "РМЦ",
    mechanical: 9,
    electrical: 4,
    hydraulic: 2,
  },
  {
    areaId: 4,
    area: "Транспорт",
    mechanical: 11,
    electrical: 7,
    hydraulic: 8,
  },
];

export const areaEfficiency = [
  {
    areaId: 1,
    name: "Участок дробления",
    onTime: 92,
    quality: 94,
    load: 84,
  },
  {
    areaId: 2,
    name: "Участок обогащения",
    onTime: 86,
    quality: 91,
    load: 93,
  },
  {
    areaId: 3,
    name: "Ремонтно-механический цех",
    onTime: 95,
    quality: 89,
    load: 71,
  },
  {
    areaId: 4,
    name: "Транспортный участок",
    onTime: 81,
    quality: 85,
    load: 88,
  },
];

export const aiInsights = [
  {
    id: 1,
    type: "DANGER",

    title:
      "Рост отказов насоса НШ-100",

    description:
      "За последние 7 дней оборудование трижды попадало в ремонт. Основная повторяющаяся причина связана с гидравлической системой.",

    metric: "+38%",

    metricLabel:
      "рост неисправностей",

    equipmentId: 4,
  },

  {
    id: 2,
    type: "WARNING",

    title:
      "Перегрузка участка обогащения",

    description:
      "Загрузка исполнителей приблизилась к предельному уровню. При появлении новых аварийных работ возможен рост очереди.",

    metric: "93%",

    metricLabel:
      "текущая загрузка",
  },

  {
    id: 3,
    type: "SUCCESS",

    title:
      "Улучшение сроков закрытия",

    description:
      "Средняя скорость закрытия нарядов улучшилась относительно предыдущего периода.",

    metric: "-12 мин",

    metricLabel:
      "среднее время",
  },

  {
    id: 4,
    type: "INFO",

    title:
      "Повторяющиеся работы по дробилке",

    description:
      "НарядAI обнаружил повторяемость ремонтов подшипникового узла. Рекомендуется проверить первопричину неисправности.",

    metric: "4",

    metricLabel:
      "похожих наряда",
    equipmentId: 1,
  },
];