export const mockAreas = [
    {
        id: 1,
        name: "Участок дробления",
    },
    {
        id: 2,
        name: "Участок обогащения",
    },
    {
        id: 3,
        name: "Ремонтно-механический цех",
    },
    {
        id: 4,
        name: "Транспортный участок",
    },
];

export const mockEquipment = [
    {
        id: 1,
        name: "Дробилка КМД-1750",
        inventoryNumber: "DR-001",
        areaId: 1,
    },
    {
        id: 2,
        name: "Конвейер К-3",
        inventoryNumber: "CNV-003",
        areaId: 1,
    },
    {
        id: 3,
        name: "Грохот ГИЛ-52",
        inventoryNumber: "GR-052",
        areaId: 1,
    },

    {
        id: 4,
        name: "Насос НШ-100",
        inventoryNumber: "NS-100",
        areaId: 2,
    },
    {
        id: 5,
        name: "Флотомашина ФМ-12",
        inventoryNumber: "FM-012",
        areaId: 2,
    },

    {
        id: 6,
        name: "Токарный станок 16К20",
        inventoryNumber: "RM-020",
        areaId: 3,
    },
    {
        id: 7,
        name: "Сварочный пост №3",
        inventoryNumber: "SV-003",
        areaId: 3,
    },

    {
        id: 8,
        name: "БелАЗ 75131 №12",
        inventoryNumber: "TR-012",
        areaId: 4,
    },
];

export const mockEmployees = [
    {
        id: 1,
        fullName: "Ахметов Ерлан",
        specialty: "Слесарь",
        grade: 5,

        // Может работать сразу на нескольких участках
        areaIds: [1, 2, 3],

        status: "FREE",
        queueCount: 0,
        rating: 94,
    },
    {
        id: 2,
        fullName: "Иванов Максим",
        specialty: "Электрик",
        grade: 4,
        areaIds: [1, 2],

        status: "BUSY",
        currentOrderNumber: "147",
        queueCount: 1,
        rating: 91,
    },
    {
        id: 3,
        fullName: "Сериков Али",
        specialty: "Сварщик",
        grade: 5,
        areaIds: [1, 3, 4],

        status: "QUEUE",
        queueCount: 2,
        rating: 87,
    },
    {
        id: 4,
        fullName: "Ким Андрей",
        specialty: "Слесарь",
        grade: 4,
        areaIds: [2, 3],

        status: "FREE",
        queueCount: 0,
        rating: 89,
    },
    {
        id: 5,
        fullName: "Омаров Данияр",
        specialty: "Электрик",
        grade: 5,
        areaIds: [3, 4],

        status: "OFF_SHIFT",
        queueCount: 0,
        rating: 93,
    },
];

export const ORDER_STATUSES = {
    ISSUED: "ISSUED",
    ACCEPTED: "ACCEPTED",
    QUEUED: "QUEUED",
    IN_PROGRESS: "IN_PROGRESS",
    PAUSED: "PAUSED",
    COMPLETED: "COMPLETED",
    AI_REVIEW: "AI_REVIEW",
    REWORK: "REWORK",
    CLOSED: "CLOSED",
    REJECTED: "REJECTED",
};

export const PRIORITIES = {
    EMERGENCY: "EMERGENCY",
    HIGH: "HIGH",
    NORMAL: "NORMAL",
    PLANNED: "PLANNED",
};

export const mockOrders = [
    {
        id: 147,
        number: "147",

        title: "Течь масла в подшипниковом узле",
        description:
            "Обнаружена течь масла в районе подшипникового узла дробилки.",

        workType: "EMERGENCY",
        priority: "EMERGENCY",
        status: "IN_PROGRESS",

        areaId: 1,
        equipmentId: 1,
        employeeId: 2,

        createdAt: "2026-10-06T07:40:00",
        deadline: "2026-10-06T09:30:00",

        overdueMinutes: 45,

        hasPhoto: true,

        lastComment: "Ожидается подшипник со склада",
    },

    {
        id: 148,
        number: "148",

        title: "Проверка натяжения конвейерной ленты",
        description:
            "Провести осмотр натяжения и роликов конвейера.",

        workType: "PLANNED",
        priority: "PLANNED",
        status: "ISSUED",

        areaId: 1,
        equipmentId: 2,
        employeeId: 1,

        createdAt: "2026-10-06T08:05:00",
        deadline: "2026-10-06T11:30:00",

        overdueMinutes: 0,

        hasPhoto: false,
        lastComment: "",
    },

    {
        id: 149,
        number: "149",

        title: "Повышенная вибрация электродвигателя",
        description:
            "Зафиксирована повышенная вибрация при запуске оборудования.",

        workType: "UNPLANNED",
        priority: "HIGH",
        status: "ACCEPTED",

        areaId: 2,
        equipmentId: 4,
        employeeId: 4,

        createdAt: "2026-10-06T08:10:00",
        deadline: "2026-10-06T10:50:00",

        overdueMinutes: 0,

        hasPhoto: true,
        lastComment: "Приступаю к диагностике",
    },

    {
        id: 150,
        number: "150",

        title: "Замена защитного кожуха",
        description:
            "Повреждён защитный кожух привода.",

        workType: "UNPLANNED",
        priority: "NORMAL",
        status: "QUEUED",

        areaId: 3,
        equipmentId: 6,
        employeeId: 3,

        createdAt: "2026-10-06T08:20:00",
        deadline: "2026-10-06T13:00:00",

        overdueMinutes: 0,

        hasPhoto: true,
        lastComment: "",
    },

    {
        id: 151,
        number: "151",

        title: "Замена изношенного ролика",
        description:
            "Обнаружен износ направляющего ролика.",

        workType: "UNPLANNED",
        priority: "HIGH",
        status: "IN_PROGRESS",

        areaId: 1,
        equipmentId: 2,
        employeeId: 3,

        createdAt: "2026-10-06T07:50:00",
        deadline: "2026-10-06T10:20:00",

        overdueMinutes: 0,

        hasPhoto: true,
        lastComment: "Демонтаж завершён",
    },

    {
        id: 152,
        number: "152",

        title: "Проверка системы смазки",
        description:
            "Плановая проверка системы подачи смазочного материала.",

        workType: "PLANNED",
        priority: "NORMAL",
        status: "COMPLETED",

        areaId: 2,
        equipmentId: 5,
        employeeId: 1,

        createdAt: "2026-10-06T06:30:00",
        deadline: "2026-10-06T09:00:00",

        overdueMinutes: 0,

        hasPhoto: true,
        lastComment: "Работы завершены",
    },

    {
        id: 153,
        number: "153",

        title: "Диагностика электропроводки",
        description:
            "Периодическое срабатывание защиты электрической цепи.",

        workType: "UNPLANNED",
        priority: "HIGH",
        status: "PAUSED",

        areaId: 4,
        equipmentId: 8,
        employeeId: 3,

        createdAt: "2026-10-06T07:10:00",
        deadline: "2026-10-06T12:00:00",

        overdueMinutes: 0,

        hasPhoto: false,

        pauseReason: "Ожидается остановка оборудования",
        lastComment: "Продолжим после остановки БелАЗ",
    },

    {
        id: 154,
        number: "154",

        title: "Устранение течи гидролинии",
        description:
            "Обнаружено подтекание рабочей жидкости.",

        workType: "EMERGENCY",
        priority: "EMERGENCY",
        status: "REWORK",

        areaId: 2,
        equipmentId: 4,
        employeeId: 1,

        createdAt: "2026-10-06T05:50:00",
        deadline: "2026-10-06T08:20:00",

        overdueMinutes: 18,

        hasPhoto: true,

        lastComment:
            "ИИ обнаружил несоответствие между заявленными работами и фото",
    },

    {
        id: 155,
        number: "155",

        title: "Замена повреждённого кабеля",
        description:
            "На участке обнаружено повреждение питающего кабеля.",

        workType: "EMERGENCY",
        priority: "EMERGENCY",
        status: "AI_REVIEW",

        areaId: 1,
        equipmentId: 3,
        employeeId: 2,

        createdAt: "2026-10-06T06:40:00",
        deadline: "2026-10-06T08:40:00",

        overdueMinutes: 0,

        hasPhoto: true,
        lastComment: "Отправлено на проверку ИИ",
    },
];