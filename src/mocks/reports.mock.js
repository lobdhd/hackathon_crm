export const reportTypes = [
    {
        id: "SHIFT",
        title: "Отчёт по смене",
        description:
            "Сводка по нарядам, исполнителям, просрочкам и событиям за смену.",
        icon: "shift",
        tone: "blue",
    },

    {
        id: "ORDERS",
        title: "Отчёт по нарядам",
        description:
            "Все выданные, активные, завершённые и просроченные наряды.",
        icon: "orders",
        tone: "green",
    },

    {
        id: "EQUIPMENT",
        title: "Оборудование и простои",
        description:
            "Неисправности, ремонты и время простоя производственного оборудования.",
        icon: "equipment",
        tone: "orange",
    },

    {
        id: "EMPLOYEES",
        title: "Эффективность исполнителей",
        description:
            "Количество работ, сроки выполнения, возвраты и рейтинг сотрудников.",
        icon: "employees",
        tone: "violet",
    },

    {
        id: "AI",
        title: "Отчёт НарядAI",
        description:
            "Повторяющиеся неисправности, риски и автоматически найденные тенденции.",
        icon: "ai",
        tone: "purple",
    },
];

export const initialReports = [
    {
        id: 1,
        type: "SHIFT",
        title: "Отчёт по смене",
        periodLabel: "06 октября 2026, смена №1",
        areaLabel: "Все участки",
        format: "PDF",
        createdBy: "Иванов Алексей",
        createdAt: "2026-10-06T08:15:00",
        status: "READY",
        size: "1.2 МБ",
    },

    {
        id: 2,
        type: "EQUIPMENT",
        title: "Оборудование и простои",
        periodLabel: "30 сентября — 06 октября 2026",
        areaLabel: "Участок дробления",
        format: "XLSX",
        createdBy: "Иванов Алексей",
        createdAt: "2026-10-06T07:42:00",
        status: "READY",
        size: "780 КБ",
    },

    {
        id: 3,
        type: "EMPLOYEES",
        title: "Эффективность исполнителей",
        periodLabel: "01 — 06 октября 2026",
        areaLabel: "Все участки",
        format: "PDF",
        createdBy: "Иванов Алексей",
        createdAt: "2026-10-06T06:58:00",
        status: "READY",
        size: "950 КБ",
    },

    {
        id: 4,
        type: "AI",
        title: "Отчёт НарядAI",
        periodLabel: "01 — 06 октября 2026",
        areaLabel: "Все участки",
        format: "PDF",
        createdBy: "Иванов Алексей",
        createdAt: "2026-10-05T18:20:00",
        status: "READY",
        size: "1.6 МБ",
    },
];