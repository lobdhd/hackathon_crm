import { useMemo, useState } from "react";
import Chart from "react-apexcharts";
import "./AssistantCharts.css";

/**
 * Charts for the Assistant's EXISTING API intents.
 * Numbers must come from the response data or exact numbers in the response text.
 * A comparison of equipment is NOT a time series; line/area need real dates.
 */
const STATUS_NAMES = {
  ISSUED: "Выдан", ACCEPTED: "Принят", QUEUED: "В очереди",
  IN_PROGRESS: "В работе", PAUSED: "Приостановлен", COMPLETED: "Выполнен",
  AI_REVIEW: "На проверке", REWORK: "На доработке", CLOSED: "Закрыт",
  REJECTED: "Отклонён", CANCELLED: "Отменён",
};
const PALETTE = ["#2563eb", "#0891b2", "#4f46e5", "#16a34a", "#d97706", "#64748b", "#be185d", "#0f766e"];
const VIEW_NAMES = {
  bar: "Столбцы", line: "Линия", area: "Область", donut: "Кольцо",
  semi: "Полукруг", radar: "Радар",
  treemap: "Карта блоков", heatmap: "Тепловая карта", rangeBar: "Временные интервалы", table: "Таблица",
};
export const ASSISTANT_CHART_VIEW_NAMES = VIEW_NAMES;

const validNum = (value) => value !== null && value !== undefined && value !== "" && typeof value !== "boolean" && Number.isFinite(Number(value));
const num = (value) => Number(value);
const object = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const list = (value) => Array.isArray(value) ? value : [];
const first = (...values) => values.find((v) => v !== undefined && v !== null && v !== "");
const textName = (value) => typeof value === "string" ? value.trim() : "";
const named = (value) => textName(value) || "Не указано";
const percent = (value) => Math.min(100, Math.max(0, num(value) <= 1 ? num(value) * 100 : num(value)));
const statusName = (value) => STATUS_NAMES[value] || named(value);
const timestamp = (value) => {
  if (!value) return NaN;
  const date = new Date(value).getTime();
  return Number.isFinite(date) ? date : NaN;
};
const formatNumber = (value, digits = 1) => Number(value).toLocaleString("ru-RU", { maximumFractionDigits: digits });

function field(item, ...keys) {
  for (const key of keys) {
    const sections = key.split(".");
    let value = item;
    for (const section of sections) value = value?.[section];
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return undefined;
}
function fieldNumber(item, ...keys) {
  const value = field(item, ...keys);
  return validNum(value) ? num(value) : undefined;
}
function labelValue(item, ...keys) {
  for (const key of keys) {
    const value = field(item, key);
    if (typeof value === "string" && value.trim()) return value.trim();
    if (value && typeof value === "object") {
      const name = first(value.name, value.title, value.fullName, value.label);
      if (textName(name)) return name.trim();
    }
  }
  return "";
}
function equipmentName(item, i) {
  return labelValue(item, "equipment.name", "equipment", "equipmentName", "asset.name", "assetName", "machineName")
    || (first(item?.equipmentId, item?.id) != null ? `Оборудование #${first(item?.equipmentId, item?.id)}` : `Оборудование ${i + 1}`);
}
function orderName(item, i) {
  return labelValue(item, "orderNumber", "number", "code", "order.number", "workOrder.number", "title", "name")
    || (item?.id != null ? `Наряд #${item.id}` : `Наряд ${i + 1}`);
}
function countGroups(values, limit = 9) {
  const counts = new Map();
  values.forEach((raw) => {
    const key = named(raw);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  const entries = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"));
  if (entries.length <= limit) return entries;
  return [...entries.slice(0, limit - 1), ["Остальные", entries.slice(limit - 1).reduce((acc, item) => acc + item[1], 0)]];
}
function groupedConfig(title, description, entries, extra = {}) {
  if (!entries.length) return null;
  return {
    title, description, categories: entries.map(([k]) => k), values: entries.map(([, v]) => v), unit: "шт.",
    views: entries.length > 1 ? ["bar", "donut", "treemap", "table"] : ["bar", "table"],
    ...extra,
  };
}
function rowsFor(items, makeRow) { return items.slice(0, 250).map(makeRow); }
function appendViews(config, candidates) {
  config.views = [...new Set([...config.views, ...candidates])];
  return config;
}
function datesTimeline(items, dateKeys, maxDays = 120) {
  // A time series must use ONE consistent date field, never a mix of creation
  // and completion timestamps which could imply a false trend.
  for (const dateKey of dateKeys) {
    const byDate = new Map();
    for (const item of items) {
      const date = timestamp(field(item, dateKey));
      if (!Number.isFinite(date)) continue;
      const day = new Date(date).toISOString().slice(0, 10);
      byDate.set(day, (byDate.get(day) || 0) + 1);
    }
    const entries = [...byDate].sort((a, b) => a[0].localeCompare(b[0]));
    if (entries.length < 2 || entries.length > maxDays) continue;
    const label = dateKey === "completedAt" ? "Выполнено за день"
      : dateKey === "closedAt" ? "Закрыто за день" : "Создано за день";
    return {
      categories: entries.map(([date]) => date), values: entries.map(([, count]) => count),
      unit: "шт.", label,
    };
  }
  return null;
}

function workIntervals(items, makeName) {
  const results = [];
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    // These are REAL work intervals, not guessed overdue windows.
    const from = timestamp(field(item, "startedAt", "startAt", "workStartedAt"));
    const to = timestamp(field(item, "completedAt", "finishedAt", "closedAt", "endedAt", "endAt"));
    if (Number.isFinite(from) && Number.isFinite(to) && to > from) {
      results.push({ x: makeName(item, i), y: [from, to] });
    }
  }
  return results.length >= 2 ? results.slice(0, 18) : null;
}
function crossHeatmap(items) {
  const cells = new Map();
  const groups = new Set();
  const statuses = new Set();
  for (const item of items) {
    const group = labelValue(item, "area.name", "area", "section.name", "section", "department.name", "department", "site.name", "site", "workshop.name", "workshop");
    const status = field(item, "status");
    if (!group || !status) continue;
    groups.add(group); statuses.add(statusName(status));
    const key = `${group}\u0000${statusName(status)}`;
    cells.set(key, (cells.get(key) || 0) + 1);
  }
  if (groups.size < 2 || statuses.size < 2 || groups.size > 12 || statuses.size > 9) return null;
  return [...statuses].map((status) => ({
    name: status,
    data: [...groups].map((group) => ({ x: group, y: cells.get(`${group}\u0000${status}`) || 0 })),
  }));
}

function parseShift(text) {
  const result = {};
  const patterns = {
    total: /на смене\s+(\d+)\s+исполнител/iu,
    busy: /(\d+)\s+занят(?:ы|ых)?(?=\s|[,.!?;]|$)/iu,
    free: /(\d+)\s+свободн(?:ы|ых)?(?=\s|[,.!?;]|$)/iu,
    issued: /(\d+)\s+выдан(?:о|ы|ных)?(?=\s|[,.!?;]|$)/iu,
    completed: /(\d+)\s+выполнен(?:о|ы|ных)?(?=\s|[,.!?;]|$)/iu,
    closed: /(\d+)\s+закрыт(?:о|ы|ых)?(?=\s|[,.!?;]|$)/iu,
    overdue: /(\d+)\s+просрочен(?:о|ы|ных)?(?=\s|[,.!?;]|$)/iu,
    rejected: /(\d+)\s+отклонен(?:о|ы|ных)?(?=\s|[,.!?;]|$)/iu,
  };
  Object.entries(patterns).forEach(([key, re]) => {
    const match = String(text || "").match(re);
    if (match) result[key] = Number(match[1]);
  });
  return result;
}
function parseOverdueText(text) {
  const source = String(text || "");
  const seen = new Set();
  const items = [];
  // Only an explicit order number AND an explicit overdue duration are accepted.
  const re = /([№NНH]?[—-]?[A-Za-zА-Яа-я]?[-–]?\d{4,6})\s*[—–-]\s*([^;\n]+?)\s*,?\s*просрочен(?:а|о|ы)?\s*(\d+)\s*ч(?:ас(?:ов|а)?)?\s*(?:(\d+)\s*мин)?/giu;
  for (const match of source.matchAll(re)) {
    const code = match[1].trim();
    if (seen.has(code)) continue;
    const minutes = Number(match[3]) * 60 + Number(match[4] || 0);
    seen.add(code);
    items.push({ number: code, equipmentName: match[2].trim(), overdueMinutes: minutes });
  }
  return items;
}
function parseForecastText(text) {
  const source = String(text || "");
  const results = [];
  const re = /(?:^|[;\n]|:\s)([^;\n]+?)\s*[—–-]\s*(\d{1,3}(?:[.,]\d+)?)\s*%/gu;
  for (const match of source.matchAll(re)) {
    const name = match[1].trim().replace(/^(?:прогноз\s+отказов\s+за\s+\d+\s+дн(?:ей|я|ь):?\s*)/iu, "");
    const probability = Number(match[2].replace(",", "."));
    if (name.length > 2 && name.length < 120 && probability >= 0 && probability <= 100) {
      results.push({ equipmentName: name, probability });
    }
  }
  return results;
}
function parseNames(text) {
  const source = String(text || "").replace(/[.!]+$/, "").trim();
  const parts = source.split(/,\s*/).map((v) => v.trim()).filter(Boolean);
  if (parts.length < 2 || parts.length > 80) return [];
  return parts.every((v) => /^[\p{L}\s.'-]{5,100}$/u.test(v) && v.split(/\s+/).length >= 2)
    ? parts.map((fullName) => ({ fullName })) : [];
}
/**
 * Some old history messages contain only the assistant's plain answer text.
 * Recognize only unambiguous, known answer formats; do not invent missing data.
 * Never override a real API intent when it is available.
 */
function inferIntentFromText(answerText) {
  const source = String(answerText || "").trim();
  if (!source) return null;

  // Example: "На смене 10 исполнителей, 5 заняты, 5 свободны..."
  const shift = parseShift(source);
  if (/на\s+смене\s+\d+\s+исполнител/iu.test(source)
    && (shift.busy !== undefined || shift.free !== undefined)) {
    return "SHIFT_REPORT";
  }

  // Equipment risks must contain explicit percentages for each equipment.
  if (/прогноз\s+(?:отказов|рисков)/iu.test(source) && parseForecastText(source).length) {
    return "FAILURE_FORECAST";
  }

  // Overdue orders can be listed with durations or explicit order numbers.
  if (parseOverdueText(source).length) return "OVERDUE";
  if (/\d+\s+просроченн(?:ых|ые|ый)\s+(?:нарядов|заказов|наряда|заказа)/iu.test(source)
    && /(?:№|[НHНN][-–]?)\d{4,6}/iu.test(source)) {
    return "OVERDUE";
  }

  // Infer names only when every entry looks like a complete person name.
  // parseNames alone permits ordinary comma-separated prose; that is too broad here.
  const people = parseNames(source);
  const fullNamePattern = /^\p{Lu}\p{Ll}{1,}(?:-\p{Lu}\p{Ll}{1,})?(?:\s+\p{Lu}\p{Ll}{1,}(?:-\p{Lu}\p{Ll}{1,})?){1,2}$/u;
  if (people.length >= 2 && people.every(({ fullName }) => fullNamePattern.test(fullName))) {
    return "FREE_EXECUTORS";
  }
  return null;
}

function normalizeRecords(raw, keys) {
  if (Array.isArray(raw)) return raw.filter((x) => x && typeof x === "object");
  const base = object(raw);
  for (const key of keys) if (Array.isArray(base[key])) return base[key];
  return [];
}

/** Returns null only when NO credible chart/table data exist. */
export function getAssistantChartConfig(intent, data, answerText = "") {
  const apiKind = typeof intent === "string" ? intent : intent?.intent;
  const kind = apiKind || inferIntentFromText(answerText);
  if (!kind) return null;
  const base = object(data);
  if (kind === "SHIFT_REPORT") {
    const fromText = parseShift(answerText);
    const sources = [base, object(base.summary), object(base.orders), object(base.executors), fromText];
    const get = (...keys) => {
      for (const source of sources) {
        const n = fieldNumber(source, ...keys);
        if (n !== undefined) return Math.max(0, n);
      }
      return undefined;
    };
    const orders = [
      ["Выдано", get("issued", "issuedOrders")],
      ["Выполнено", get("completed", "completedOrders")],
      ["Закрыто", get("closed", "closedOrders")],
      ["Просрочено", get("overdue", "overdueOrders")],
      ["В работе", get("inProgress", "in_progress", "activeOrders")],
      ["Отклонено", get("rejected", "rejectedOrders")],
    ].filter(([, v]) => v !== undefined);
    let busy = get("busy", "busyExecutors", "occupied");
    let free = get("free", "freeExecutors", "available");
    const total = get("total", "totalExecutors", "executorsTotal");
    if (busy === undefined && free !== undefined && total !== undefined && total >= free) busy = total - free;
    if (free === undefined && busy !== undefined && total !== undefined && total >= busy) free = total - busy;
    const people = busy !== undefined && free !== undefined ? { busy, free, total: busy + free } : null;
    if (!orders.length && !people) return null;
    const primary = orders.length ? orders : [["Заняты", people.busy], ["Свободны", people.free]];
    return {
      title: "Показатели смены",
      description: orders.length ? "Фактические показатели смены. Статусы нарядов могут пересекаться." : "Распределение исполнителей на смене.",
      categories: primary.map(([name]) => name), values: primary.map(([, v]) => v), unit: "шт.",
      views: people && orders.length && orders.every(([, v]) => v === 0)
        ? ["donut", "semi", "bar", "table"]
        : ["bar", ...(people ? ["donut", "semi"] : []), "table"],
      people,
      rows: [
        ...orders.map(([name, v]) => ({ label: name, value: v, detail: "Наряды" })),
        ...(people ? [{ label: "Заняты", value: people.busy, detail: "Исполнители" }, { label: "Свободны", value: people.free, detail: "Исполнители" }] : []),
        ...(fieldNumber(base, "downtime.minutes", "downtimeMinutes") !== undefined
          ? [{ label: "Простой", value: `${formatNumber(fieldNumber(base, "downtime.minutes", "downtimeMinutes") / 60)} ч`, detail: "Суммарное время" }] : []),
      ],
    };
  }
  if (kind === "FREE_EXECUTORS") {
    let items = normalizeRecords(data, ["items", "executors", "employees", "data"]);
    if (!items.length) items = parseNames(answerText);
    if (!items.length) return null;
    const groups = countGroups(items.map((v) => labelValue(v, "specialty", "specialization", "position.name", "position", "profession", "department.name") || "Специальность не указана"));
    const config = groupedConfig("Свободные исполнители", "Количество доступных сотрудников по специальностям.", groups, { unit: "чел.",
      rows: rowsFor(items, (item, i) => ({
        label: labelValue(item, "fullName", "name", "fio") || `Исполнитель ${i + 1}`,
        value: labelValue(item, "specialty", "specialization", "position.name", "profession") || "—",
        detail: labelValue(item, "department.name", "department", "grade") || "",
      })),
    });
    return config;
  }
  if (kind === "FAILURE_FORECAST") {
    let items = normalizeRecords(data, ["items", "forecasts", "equipment", "data"]);
    if (!items.length) items = parseForecastText(answerText);
    const valid = items.filter((item) => validNum(field(item, "probability", "failureProbability", "riskProbability", "risk")));
    if (!valid.length) return null;
    const sorted = valid.map((item, i) => ({ name: equipmentName(item, i), p: percent(field(item, "probability", "failureProbability", "riskProbability", "risk")), item }))
      .sort((a, b) => b.p - a.p);
    const bands = [["Высокий (80–100%)", 0], ["Средний (50–79%)", 0], ["Низкий (0–49%)", 0]];
    sorted.forEach(({ p }) => { bands[p >= 80 ? 0 : p >= 50 ? 1 : 2][1] += 1; });
    const average = sorted.reduce((s, item) => s + item.p, 0) / sorted.length;
    const config = {
      title: "Прогноз рисков", description: "Вероятность отказа по каждой единице оборудования. Это сравнение, не график по дням.",
      categories: sorted.map(({ name }) => name), values: sorted.map(({ p }) => p), unit: "%", maxValue: 100,
      views: ["bar", ...(sorted.length >= 3 ? ["radar"] : []), "donut", "semi", "table"],
      bands: bands.filter(([, count]) => count > 0), gauge: { label: "Средний риск", value: average },
      rows: sorted.map(({ name, p, item }) => ({
        label: name, value: `${formatNumber(p)}%`,
        detail: first(field(item, "failuresCount", "failureCount", "incidents"), field(item, "faultsCount")) !== undefined
          ? `Отказов: ${first(field(item, "failuresCount", "failureCount", "incidents"), field(item, "faultsCount"))}` : "",
      })),
    };
    return config;
  }
  if (kind === "ANOMALIES") {
    const items = normalizeRecords(data, ["items", "anomalies", "data"]);
    if (!items.length) return null;
    const severity = items.filter((item) => validNum(field(item, "severity", "severityLevel")));
    if (severity.length) {
      const entries = severity.map((item, i) => [labelValue(item, "title", "name", "equipment.name") || `Аномалия ${i + 1}`,
        Math.max(0, Math.min(5, num(field(item, "severity", "severityLevel"))))]);
      const config = {
        title: "Серьёзность аномалий", description: "Оценка выраженности аномалий по шкале от 0 до 5.",
        categories: entries.map(([k]) => k), values: entries.map(([, v]) => v), unit: "/5", maxValue: 5,
        views: ["bar", ...(entries.length >= 3 ? ["radar"] : []), "semi", "table"],
        gauge: { label: "Средняя серьёзность", value: entries.reduce((sum, [, v]) => sum + v, 0) / entries.length / 5 * 100 },
        rows: rowsFor(items, (item, i) => ({ label: labelValue(item, "title", "name") || `Аномалия ${i + 1}`,
          value: validNum(item.severity) ? `${formatNumber(item.severity)}/5` : "—",
          detail: equipmentName(item, i), })),
      };
      return config;
    }
    const groups = countGroups(items.map((item) => labelValue(item, "type", "category", "equipment.name", "status") || "Без категории"));
    return groupedConfig("Аномалии по категориям", "Количество обнаруженных аномалий.", groups, {
      rows: rowsFor(items, (item, i) => ({ label: labelValue(item, "title", "name") || `Аномалия ${i + 1}`,
        value: labelValue(item, "status", "type", "category") || "—", detail: equipmentName(item, i) })),
    });
  }
  if (kind === "OVERDUE" || kind === "EQUIPMENT_HISTORY") {
    let items = normalizeRecords(data, ["items", "orders", "history", "data", "records"]);
    if (!items.length && kind === "OVERDUE") items = parseOverdueText(answerText);
    if (!items.length && kind === "OVERDUE") {
      const source = String(answerText || "");
      const count = source.match(/(\d+)\s+просроченн(?:ых|ые|ый)\s+(?:нарядов|заказов|наряда|заказа)/iu);
      const ids = [...new Set([...source.matchAll(/(?:№|\b)[НHНN][-–]?\d{4,6}\b/giu)].map((m) => m[0]))];
      if (count) {
        return {
          title: "Просроченные наряды", description: "Общее количество из ответа помощника; детализация недоступна без данных API.",
          categories: ["Просроченные наряды"], values: [Number(count[1])], unit: "шт.", views: ["bar", "table"],
          rows: ids.length ? ids.map((id) => ({ label: id, value: "Просрочен", detail: "Номер из ответа" }))
            : [{ label: "Просроченные наряды", value: Number(count[1]), detail: "Всего" }],
        };
      }
    }
    if (!items.length) return null;
    const title = kind === "OVERDUE" ? "Просроченные наряды" : "История оборудования";
    const durationFields = ["overdueMinutes", "lateMinutes", "delayMinutes", "minutesOverdue", "overdueByMinutes"];
    const timed = items.map((item, i) => ({ item, i, minutes: fieldNumber(item, ...durationFields) }))
      .filter(({ minutes }) => minutes !== undefined && minutes >= 0);
    const statuses = items.filter((item) => field(item, "status") != null);
    const countsByStatus = countGroups(statuses.map((item) => statusName(item.status)));
    const equipment = countGroups(items.map((item, i) => equipmentName(item, i)));
    const departments = countGroups(items.map((item) => labelValue(item, "area.name", "section.name", "department.name", "workshop.name") || "Не указан"));
    const useDurations = kind === "OVERDUE" && timed.length >= 2;
    let entries;
    let unit;
    let description;
    if (useDurations) {
      entries = timed.map(({ item, i, minutes }) => [orderName(item, i), Math.round(minutes * 10 / 60) / 10])
        .sort((a, b) => b[1] - a[1]).slice(0, 24);
      unit = "ч";
      description = "Фактическая длительность просрочки по каждому наряду (из ответа API).";
    } else if (kind === "EQUIPMENT_HISTORY" && countsByStatus.length > 1) {
      entries = countsByStatus; unit = "шт."; description = "Распределение записей истории по текущему статусу.";
    } else if (departments.length > 1 && !departments.some(([k]) => k === "Не указан")) {
      entries = departments; unit = "шт."; description = "Количество нарядов по участкам.";
    } else {
      entries = equipment; unit = "шт.";
      description = "Количество нарядов по оборудованию; одинаковые статусы не мешают построению графика.";
    }
    const config = {
      title, description, categories: entries.map(([k]) => k), values: entries.map(([, v]) => v), unit,
      views: ["bar", ...(unit === "шт." && entries.length > 1 ? ["donut", "treemap"] : []), "table"],
      rows: rowsFor(items, (item, i) => ({
        label: orderName(item, i),
        value: (() => { const n = fieldNumber(item, ...durationFields);
          return n !== undefined ? `${formatNumber(n / 60)} ч` : statusName(field(item, "status") || "—"); })(),
        detail: equipmentName(item, i),
      })),
    };
    const timeline = datesTimeline(items, ["completedAt", "closedAt", "createdAt", "date"]);
    if (timeline) { config.timeline = timeline; appendViews(config, ["line", "area"]); }
    const ranges = workIntervals(items, orderName);
    if (ranges) { config.ranges = ranges; appendViews(config, ["rangeBar"]); }
    const heatmap = crossHeatmap(items);
    if (heatmap) { config.heatmap = heatmap; appendViews(config, ["heatmap"]); }
    return config;
  }
  return null;
}

const quantity = (value, unit) => `${formatNumber(value)}${unit === "%" || unit === "/5" ? unit : ` ${unit || ""}`}`;

function DataTable({ rows }) {
  return <div className="ai-chart-table-wrap"><table className="ai-chart-table">
    <thead><tr><th>Позиция</th><th>Показатель</th><th>Дополнительно</th></tr></thead>
    <tbody>{rows.map((row, i) => <tr key={`${row.label}-${i}`}>
      <td>{row.label}</td><td>{typeof row.value === "number" ? formatNumber(row.value) : String(row.value ?? "—")}</td><td>{row.detail || "—"}</td>
    </tr>)}</tbody>
  </table></div>;
}

export default function AssistantChart({ config, view: requestedView }) {
  const [selectedView, setSelectedView] = useState(null);
  const effectiveView = requestedView === "charts"
    ? (config?.views?.includes(selectedView) ? selectedView : config?.views?.[0])
    : requestedView;
  // The whole component remains hook-safe even when config/view are absent.
  const rendered = useMemo(() => {
    if (!config || !config.views?.includes(effectiveView) || effectiveView === "table") return null;
    const view = effectiveView;
    const normalLabels = config.categories || [];
    const normalValues = config.values || [];
    const isTime = (view === "line" || view === "area") && config.timeline;
    const cats = isTime ? config.timeline.categories : normalLabels;
    const vals = isTime ? config.timeline.values : normalValues;
    const unit = isTime ? config.timeline.unit : config.unit;
    const yFormat = (v) => quantity(v, unit);
    const axisText = { colors: "#8695ab", fontSize: "11px", fontWeight: 500 };
    const base = {
      chart: { background: "transparent", toolbar: { show: false }, animations: { enabled: false, animateGradually: { enabled: false }, dynamicAnimation: { enabled: false } },
        fontFamily: "inherit", parentHeightOffset: 0, redrawOnParentResize: true, zoom: { enabled: false },
        foreColor: "#526783" },
      theme: { mode: "light" }, colors: PALETTE,
      dataLabels: { enabled: false }, fill: { type: "solid", opacity: 1 },
      legend: { position: "bottom", fontSize: "11px", labels: { colors: "#526783" },
        markers: { size: 8 }, itemMargin: { horizontal: 9, vertical: 4 } },
      grid: { borderColor: "#e8edf5", strokeDashArray: 4, xaxis: { lines: { show: false } },
        padding: { left: 8, right: 12, top: 6 } },
      tooltip: { theme: "light", y: { formatter: yFormat } },
      states: { active: { filter: { type: "none" } }, hover: { filter: { type: "lighten", value: 0.06 } } },
    };
    if (view === "donut") {
      const entries = config.people
        ? [["Заняты", config.people.busy], ["Свободны", config.people.free]]
        : config.bands || normalLabels.map((label, i) => [label, normalValues[i]]);
      return { type: "donut", height: 345, series: entries.map(([, count]) => count),
        options: { ...base, labels: entries.map(([name]) => name),
          colors: config.people ? ["#2563eb", "#16a34a"] : config.bands ? entries.map(([label]) => label.startsWith("Высокий") ? "#dc2626" : label.startsWith("Средний") ? "#d97706" : "#16a34a") : PALETTE,
          stroke: { width: 3, colors: ["#fff"] },
          plotOptions: { pie: { expandOnClick: false, donut: { size: "73%",
            labels: { show: true, name: { show: true, fontSize: "12px", color: "#7890ad" },
              value: { show: true, fontSize: "21px", fontWeight: 750, color: "#163458" },
              total: { show: true, showAlways: true, label: config.people ? "Исполнителей" : config.bands ? "Оборудования" : "Всего",
                fontSize: "12px", color: "#7e91aa", formatter: () => formatNumber(entries.reduce((sum, [, v]) => sum + v, 0), 0) } } } } },
          tooltip: { ...base.tooltip, y: { formatter: (v) => `${formatNumber(v)} ${config.people ? "чел." : config.bands ? "ед." : config.unit}` } },
        } };
    }
    if (view === "semi") {
      const gauge = config.people
        ? { label: "Занятость", value: config.people.total > 0 ? config.people.busy / config.people.total * 100 : 0 }
        : config.gauge;
      if (!gauge) return null;
      // ApexCharts uses radialBar internally to draw the HALF-circle gauge.
      // Full circular indicators are intentionally not available as a view.
      return {
        type: "radialBar", height: 295, series: [gauge.value],
        options: { ...base, labels: [gauge.label], colors: ["#2563eb"],
          legend: { show: false }, stroke: { lineCap: "round" },
          plotOptions: { radialBar: {
            startAngle: -105, endAngle: 105,
            hollow: { size: "68%" },
            track: { background: "#eaf0f8", strokeWidth: "100%", margin: 6 },
            dataLabels: { show: true,
              name: { show: true, fontSize: "12px", fontWeight: 500, color: "#7d90a8", offsetY: 18 },
              value: { show: true, fontSize: "35px", fontWeight: 750, color: "#163458",
                offsetY: -21, formatter: (v) => `${Math.round(v)}%` },
              total: { show: false },
            },
          } },
        },
      };
    }
    if (view === "radar") {
      return { type: "radar", height: 335, series: [{ name: unit === "/5" ? "Серьёзность" : "Вероятность", data: vals.slice(0, 8) }],
        options: { ...base, xaxis: { categories: cats.slice(0, 8).map((v) => v.length > 23 ? v.slice(0, 22) + "…" : v), labels: { style: { colors: cats.slice(0, 8).map(() => "#637a99"), fontSize: "10px" } } },
          yaxis: { show: false, min: 0, max: config.maxValue || undefined, tickAmount: 5 },
          stroke: { width: 2.5, colors: ["#2563eb"] }, fill: { type: "solid", opacity: 0.1 },
          markers: { size: 4, colors: ["#2563eb"], strokeColors: "#fff", strokeWidth: 2 },
          plotOptions: { radar: { size: 112, polygons: { strokeColors: "#e0e8f2", connectorColors: "#e0e8f2",
            fill: { colors: ["#fff", "#f6f9fd"] } } } },
        } };
    }
    if (view === "treemap") {
      return { type: "treemap", height: 305, series: [{ data: normalLabels.map((name, i) => ({ x: name, y: normalValues[i] })) }],
        options: { ...base, legend: { show: false }, colors: PALETTE,
          plotOptions: { treemap: { distributed: true, enableShades: false } },
          dataLabels: { enabled: true, style: { fontSize: "12px", fontWeight: 600 }, formatter: (v, opts) => {
            const n = opts?.w?.config?.series?.[0]?.data?.[opts.dataPointIndex]?.y;
            return [v, typeof n === "number" ? formatNumber(n) : ""];
          } },
        } };
    }
    if (view === "heatmap" && config.heatmap) {
      return { type: "heatmap", height: Math.max(260, Math.min(460, config.heatmap.length * 46 + 110)),
        series: config.heatmap, options: { ...base, legend: { show: false },
          plotOptions: { heatmap: { radius: 4, enableShades: false,
            colorScale: { ranges: [{ from: 0, to: 0, color: "#eef3fa" }, { from: 1, to: 2, color: "#bfdbfe" },
              { from: 3, to: 5, color: "#60a5fa" }, { from: 6, to: 1000000, color: "#2563eb" }] } } },
          xaxis: { labels: { style: axisText, rotate: -25, trim: true } },
          dataLabels: { enabled: true, style: { fontSize: "11px", fontWeight: 650, colors: ["#173457"] } },
        } };
    }
    if (view === "rangeBar" && config.ranges) {
      return { type: "rangeBar", height: Math.max(255, Math.min(620, config.ranges.length * 35 + 90)),
        series: [{ name: "Период работы", data: config.ranges }],
        options: { ...base, colors: ["#2563eb"], plotOptions: { bar: { horizontal: true, barHeight: "42%", borderRadius: 4 } },
          xaxis: { type: "datetime", labels: { style: axisText, datetimeUTC: false } },
          yaxis: { labels: { style: axisText, maxWidth: 130 } },
          tooltip: { theme: "light", x: { format: "dd MMM yyyy" } },
        } };
    }
    const horizontal = view === "bar" && (normalLabels.length > 6 || normalLabels.some((s) => s.length > 22));
    const height = horizontal ? Math.max(280, Math.min(760, normalLabels.length * 37 + 95)) : 315;
    return { type: view, height: isTime ? 320 : height, series: [{ name: isTime ? config.timeline.label : "Показатель", data: vals }],
      options: { ...base, colors: ["#2563eb"], legend: { show: false },
        chart: { ...base.chart, type: view },
        xaxis: { categories: cats, labels: { style: axisText, rotate: !horizontal && cats.length > 6 ? -30 : 0,
          hideOverlappingLabels: true, trim: true, maxHeight: 80,
          formatter: horizontal ? (v) => formatNumber(v, config.unit === "/5" ? 1 : 0) : undefined },
          axisBorder: { show: false }, axisTicks: { show: false }, tooltip: { enabled: false } },
        yaxis: { min: 0, max: isTime ? undefined : config.maxValue,
          labels: { style: axisText, maxWidth: horizontal ? 200 : 55,
            formatter: (v) => horizontal ? (String(v).length > 33 ? `${String(v).slice(0, 32)}…` : String(v))
              : formatNumber(v, config.unit === "/5" ? 1 : 0) } },
        plotOptions: { bar: { horizontal, columnWidth: "47%", barHeight: "54%", borderRadius: 5, borderRadiusApplication: "end" } },
        markers: { size: view === "line" || view === "area" ? 4 : 0, strokeWidth: 2, strokeColors: "#fff", hover: { size: 6 } },
        stroke: { width: view === "line" || view === "area" ? 2.7 : 0, curve: "smooth" },
        fill: { type: "solid", opacity: view === "area" ? 0.13 : 1 },
      } };
  }, [config, effectiveView]);

  if (!config || !config.views?.includes(effectiveView)) return null;
  const view = effectiveView;
  const viewLabel = VIEW_NAMES[view] || view;
  const viewDescription = view === "semi" && config.unit === "/5"
    ? "Серьёзность в процентах от максимального уровня шкалы 5."
    : view === "radar" && config.categories.length > 8
    ? "Сравнение первых восьми позиций. Отбор по убыванию показателя, не изменение во времени."
    : view === "donut" && config.people ? "Занятые и свободные исполнители на смене."
    : view === "donut" && config.bands ? "Количество единиц оборудования по диапазонам риска."
      : view === "semi" && config.people ? "Доля занятых исполнителей среди доступных на смене."
        : view === "semi" && config.gauge ? "Средняя вероятность отказа по выбранному оборудованию."
          : view === "line" || view === "area" ? "Количество записей по датам, присутствующим в ответе API."
            : view === "rangeBar" ? "Реальные даты начала и окончания работы из ответа API."
              : view === "heatmap" ? "Количество записей по участкам и статусам." : config.description;
  return <section className="ai-visualization ai-chart-v2" aria-label={`${config.title}: ${viewLabel}`}>
    <div className="ai-chart-v2__head">
      <div className="ai-chart-v2__heading">
        <h4>{config.title}</h4><p>{viewDescription}</p></div>
      <span className="ai-chart-v2__type">{viewLabel}</span>
    </div>
    {config.views.length > 1 && <div className="ai-chart-v2__tabs" role="group" aria-label="Вид аналитики">
      {config.views.map((key) => <button key={key} type="button"
        className={`ai-chart-v2__tab ${key === view ? "ai-chart-v2__tab--active" : ""}`} style={{ transition: "none" }}
        aria-pressed={key === view} onClick={() => setSelectedView(key)}>{VIEW_NAMES[key] || key}</button>)}
    </div>}
    {view === "table" ? <DataTable rows={config.rows?.length ? config.rows : config.categories.map((label, i) => ({ label, value: quantity(config.values[i], config.unit) }))} />
      : rendered && <div className="ai-chart-v2__plot"><Chart key={view} options={rendered.options} series={rendered.series} type={rendered.type} height={rendered.height} width="100%" /></div>}
    <div className="ai-chart-v2__foot"><span>Источник: текущий ответ помощника</span><span>{config.categories.length} позиций</span></div>
  </section>;
}
