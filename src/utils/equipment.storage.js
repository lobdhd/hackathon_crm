import {
  mockEquipment,
} from "../mocks/orders.mock";

const STORAGE_KEY =
  "hackathon_equipment";

const baseEquipmentMeta = {
  1: {
    type: "Дробильное оборудование",
    status: "REPAIR",
    criticality: "HIGH",
    manufacturer: "Уралмаш",
    model: "КМД-1750",
    commissioningDate: "2022-04-12",
    downtimeMinutes: 260,
    avgRepairMinutes: 95,
    failuresMonth: 4,
    downtimeHistory: [
      { label: "30 сен", minutes: 0 },
      { label: "1 окт", minutes: 35 },
      { label: "2 окт", minutes: 0 },
      { label: "3 окт", minutes: 70 },
      { label: "4 окт", minutes: 15 },
      { label: "5 окт", minutes: 0 },
      { label: "6 окт", minutes: 140 },
    ],
  },

  2: {
    type: "Конвейерное оборудование",
    status: "WORKING",
    criticality: "HIGH",
    manufacturer: "КМЗ",
    model: "К-3",
    commissioningDate: "2021-08-20",
    downtimeMinutes: 85,
    avgRepairMinutes: 42,
    failuresMonth: 2,
    downtimeHistory: [
      { label: "30 сен", minutes: 0 },
      { label: "1 окт", minutes: 0 },
      { label: "2 окт", minutes: 20 },
      { label: "3 окт", minutes: 0 },
      { label: "4 окт", minutes: 35 },
      { label: "5 окт", minutes: 30 },
      { label: "6 окт", minutes: 0 },
    ],
  },

  3: {
    type: "Сортировочное оборудование",
    status: "WORKING",
    criticality: "MEDIUM",
    manufacturer: "Механобр",
    model: "ГИЛ-52",
    commissioningDate: "2023-02-03",
    downtimeMinutes: 35,
    avgRepairMinutes: 38,
    failuresMonth: 1,
    downtimeHistory: [
      { label: "30 сен", minutes: 0 },
      { label: "1 окт", minutes: 0 },
      { label: "2 окт", minutes: 0 },
      { label: "3 окт", minutes: 0 },
      { label: "4 окт", minutes: 35 },
      { label: "5 окт", minutes: 0 },
      { label: "6 окт", minutes: 0 },
    ],
  },

  4: {
    type: "Насосное оборудование",
    status: "DOWNTIME",
    criticality: "HIGH",
    manufacturer: "Ливгидромаш",
    model: "НШ-100",
    commissioningDate: "2020-11-15",
    downtimeMinutes: 410,
    avgRepairMinutes: 130,
    failuresMonth: 5,
    downtimeHistory: [
      { label: "30 сен", minutes: 45 },
      { label: "1 окт", minutes: 60 },
      { label: "2 окт", minutes: 0 },
      { label: "3 окт", minutes: 75 },
      { label: "4 окт", minutes: 0 },
      { label: "5 окт", minutes: 110 },
      { label: "6 окт", minutes: 120 },
    ],
  },

  5: {
    type: "Обогатительное оборудование",
    status: "WORKING",
    criticality: "MEDIUM",
    manufacturer: "Механобр",
    model: "ФМ-12",
    commissioningDate: "2022-09-10",
    downtimeMinutes: 45,
    avgRepairMinutes: 55,
    failuresMonth: 1,
    downtimeHistory: [
      { label: "30 сен", minutes: 0 },
      { label: "1 окт", minutes: 0 },
      { label: "2 окт", minutes: 45 },
      { label: "3 окт", minutes: 0 },
      { label: "4 окт", minutes: 0 },
      { label: "5 окт", minutes: 0 },
      { label: "6 окт", minutes: 0 },
    ],
  },

  6: {
    type: "Станочное оборудование",
    status: "MAINTENANCE",
    criticality: "LOW",
    manufacturer: "Красный пролетарий",
    model: "16К20",
    commissioningDate: "2019-05-05",
    downtimeMinutes: 120,
    avgRepairMinutes: 65,
    failuresMonth: 1,
    downtimeHistory: [
      { label: "30 сен", minutes: 0 },
      { label: "1 окт", minutes: 0 },
      { label: "2 окт", minutes: 0 },
      { label: "3 окт", minutes: 120 },
      { label: "4 окт", minutes: 0 },
      { label: "5 окт", minutes: 0 },
      { label: "6 окт", minutes: 0 },
    ],
  },

  7: {
    type: "Сварочное оборудование",
    status: "WORKING",
    criticality: "LOW",
    manufacturer: "Сварог",
    model: "REAL ARC",
    commissioningDate: "2024-01-18",
    downtimeMinutes: 0,
    avgRepairMinutes: 25,
    failuresMonth: 0,
    downtimeHistory: [
      { label: "30 сен", minutes: 0 },
      { label: "1 окт", minutes: 0 },
      { label: "2 окт", minutes: 0 },
      { label: "3 окт", minutes: 0 },
      { label: "4 окт", minutes: 0 },
      { label: "5 окт", minutes: 0 },
      { label: "6 окт", minutes: 0 },
    ],
  },

  8: {
    type: "Карьерный транспорт",
    status: "REPAIR",
    criticality: "HIGH",
    manufacturer: "БелАЗ",
    model: "75131",
    commissioningDate: "2021-06-28",
    downtimeMinutes: 185,
    avgRepairMinutes: 105,
    failuresMonth: 3,
    downtimeHistory: [
      { label: "30 сен", minutes: 0 },
      { label: "1 окт", minutes: 55 },
      { label: "2 окт", minutes: 0 },
      { label: "3 окт", minutes: 0 },
      { label: "4 окт", minutes: 70 },
      { label: "5 окт", minutes: 0 },
      { label: "6 окт", minutes: 60 },
    ],
  },
};

function normalizeBaseEquipment(item) {
  const meta =
    baseEquipmentMeta[item.id] ?? {};

  return {
    ...item,

    type:
      meta.type ??
      "Промышленное оборудование",

    status:
      meta.status ??
      "WORKING",

    criticality:
      meta.criticality ??
      "MEDIUM",

    manufacturer:
      meta.manufacturer ?? "—",

    model:
      meta.model ?? "—",

    commissioningDate:
      meta.commissioningDate ?? null,

    downtimeMinutes:
      meta.downtimeMinutes ?? 0,

    avgRepairMinutes:
      meta.avgRepairMinutes ?? null,

    failuresMonth:
      meta.failuresMonth ?? 0,

    downtimeHistory:
      meta.downtimeHistory ?? [],
  };
}

export function getCustomEquipment() {
  try {
    const raw =
      localStorage.getItem(
        STORAGE_KEY,
      );

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

export function getAllEquipment() {
  return [
    ...mockEquipment.map(
      normalizeBaseEquipment,
    ),
    ...getCustomEquipment(),
  ];
}

export function getEquipmentById(id) {
  return getAllEquipment().find(
    (item) =>
      item.id === Number(id),
  );
}

export function createEquipment(input) {
  const custom =
    getCustomEquipment();

  const all =
    getAllEquipment();

  const maxId =
    all.length > 0
      ? Math.max(
          ...all.map(
            (item) =>
              Number(item.id),
          ),
        )
      : 0;

  const equipment = {
    id: maxId + 1,

    name:
      input.name.trim(),

    inventoryNumber:
      input.inventoryNumber.trim(),

    type:
      input.type.trim(),

    areaId:
      Number(input.areaId),

    criticality:
      input.criticality,

    status:
      input.status,

    manufacturer:
      input.manufacturer?.trim() ||
      "—",

    model:
      input.model?.trim() || "—",

    commissioningDate:
      input.commissioningDate || null,

    downtimeMinutes: 0,

    avgRepairMinutes: null,

    failuresMonth: 0,

    downtimeHistory: [
      { label: "30 сен", minutes: 0 },
      { label: "1 окт", minutes: 0 },
      { label: "2 окт", minutes: 0 },
      { label: "3 окт", minutes: 0 },
      { label: "4 окт", minutes: 0 },
      { label: "5 окт", minutes: 0 },
      { label: "6 окт", minutes: 0 },
    ],

    createdAt:
      new Date().toISOString(),
  };

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([
      ...custom,
      equipment,
    ]),
  );

  return equipment;
}