import { useEffect, useMemo, useRef, useState } from "react";

import {
    RiAlarmWarningLine,
    RiArrowDownSLine,
    RiCheckLine,
    RiCloseLine,
    RiFileAddLine,
    RiLoader4Line,
    RiMapPin2Line,
    RiMicFill,
    RiQrScan2Line,
    RiSearchLine,
    RiSendPlaneFill,
    RiSettings3Line,
    RiSparkling2Line,
    RiStarFill,
    RiTimeLine,
    RiToolsLine,
} from "react-icons/ri";

import { uploadWorkOrderFile } from "../../api/workOrders.api.js";

import {
    useAreas,
    useBrigades,
    useEquipmentReference,
    useExecutors,
    useFaultCodes,
    useNormatives,
} from "../../hooks/useReferences.js";

import { useCreateWorkOrder } from "../../hooks/useWorkOrders.js";

import {
    useExecutorSuggestions,
    useWorkSuggestion,
} from "../../hooks/useRecommendations.js";

import { useVoiceInput } from "../../hooks/useVoiceInput.js";

import QrScannerModal from "../equipment/QrScannerModal.jsx";

import { t, useI18n } from "../../i18n/index.js";


// Quick order form. The case asks for "issue an order from a phone in a minute, in at most 6 taps":
// tap the equipment → describe the problem (type or dictate) → AI fills the fault code, normative and
// executor → "Выдать". Everything else has a sensible default and sits under "Дополнительно".

// MARK: Config

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_PHOTOS = 5;
const DESCRIPTION_DEBOUNCE_MS = 800;
const DEADLINE_HOURS = [1, 2, 4, 8];
const DEFAULT_DEADLINE_HOURS = 2;

const PRIORITIES = [
    { value: "EMERGENCY", labelKey: "priority.emergency", fallback: "Аварийный", dot: "bg-red-500", active: "bg-red-600 text-white shadow-sm shadow-red-200" },
    { value: "HIGH", labelKey: "priority.high", fallback: "Высокий", dot: "bg-orange-500", active: "bg-white text-orange-700 shadow-sm" },
    { value: "NORMAL", labelKey: "priority.normal", fallback: "Обычный", dot: "bg-blue-500", active: "bg-white text-blue-700 shadow-sm" },
    { value: "PLANNED", labelKey: "priority.planned", fallback: "Плановый", dot: "bg-slate-400", active: "bg-white text-slate-700 shadow-sm" },
];

const AVATAR_COLORS = [
    "from-blue-500 to-indigo-500",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-orange-500",
    "from-violet-500 to-fuchsia-500",
    "from-sky-500 to-cyan-500",
    "from-rose-500 to-pink-500",
];


// MARK: Helpers

function asArray(value) {
    return Array.isArray(value) ? value : [];
}

function label(key, fallback) {
    const value = t(key);
    return !value || value === key ? fallback : value;
}

function extractError(error) {
    const data = error?.data ?? error?.response?.data;
    const message = data?.error?.message || data?.error || data?.message || error?.message;
    return typeof message === "string" && message ? message : "Не удалось выдать наряд";
}

function initials(name) {
    return String(name || "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
}

function formatTime(date) {
    const sameDay = new Date().toDateString() === date.toDateString();

    return date.toLocaleString("ru-RU", sameDay
        ? { hour: "2-digit", minute: "2-digit" }
        : { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// [pill, dot] classes for the executor's live status.
function statusTone(executor) {
    if (executor.isOnShift === false || executor.statusText === "не на смене") return ["bg-slate-100 text-slate-500", "bg-slate-400"];
    if (executor.statusText === "свободен") return ["bg-emerald-50 text-emerald-700", "bg-emerald-500"];
    if (String(executor.statusText || "").startsWith("выполняет")) return ["bg-amber-50 text-amber-700", "bg-amber-500"];
    return ["bg-sky-50 text-sky-700", "bg-sky-500"];
}

// Short "why" chips for an executor card; the full sentences stay in executor.reasons.
function reasonChips(executor) {
    const chips = [];

    if (executor.specialtyMatch === true) chips.push({ tone: "ok", text: label("quickOrder.reasonSpecialty", "нужная специальность") });
    if (executor.specialtyMatch === false) chips.push({ tone: "warn", text: t("quickOrder.reasonNeeds", { specialty: executor.requiredSpecialty }) });

    if (executor.equipmentOrders > 0) {
        chips.push({ tone: "rating", text: t("quickOrder.reasonRating", { rating: Number(executor.equipmentRating).toFixed(1), count: executor.equipmentOrders }) });
    } else if (executor.equipmentOrders === 0) {
        chips.push({ tone: "warn", text: label("quickOrder.reasonNoHistory", "не работал с этим типом") });
    }

    return chips;
}

function avatarColor(name) {
    let hash = 0;
    for (const char of String(name || "")) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function shortName(fullName) {
    const [last, ...rest] = String(fullName || "").split(/\s+/).filter(Boolean);
    return [last, ...rest.map((part) => `${part[0]}.`)].join(" ");
}

// Current time for deadline previews, refreshed while the form is open.
function useNow(intervalMs = 30_000) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), intervalMs);
        return () => clearInterval(timer);
    }, [intervalMs]);

    return now;
}

function useDebouncedValue(value, delay) {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debounced;
}


// MARK: Modal

export default function CreateOrderModal({ onClose, onCreated, initialEquipmentId = null }) {
    useI18n();

    const [equipmentId, setEquipmentId] = useState(initialEquipmentId ? String(initialEquipmentId) : "");
    const [equipmentSearch, setEquipmentSearch] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState("NORMAL");

    // Manual choices win over AI suggestions; until touched, fields follow the AI.
    // null = follow the AI.
    const [manualWork, setManualWork] = useState(null);
    const [manualAssigneeId, setManualAssigneeId] = useState(null);

    const [deadlineHours, setDeadlineHours] = useState(DEFAULT_DEADLINE_HOURS);
    const [customDeadline, setCustomDeadline] = useState("");
    const [brigadeId, setBrigadeId] = useState("");
    const [comment, setComment] = useState("");
    const [photos, setPhotos] = useState([]);

    const [showWorkEditor, setShowWorkEditor] = useState(false);
    const [showAllExecutors, setShowAllExecutors] = useState(false);
    const [showMore, setShowMore] = useState(false);
    const [scanOpen, setScanOpen] = useState(false);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const descriptionRef = useRef(null);
    const now = useNow();

    const areasQuery = useAreas();
    const equipmentQuery = useEquipmentReference(null);
    const executorsQuery = useExecutors();
    const brigadesQuery = useBrigades();
    const faultCodesQuery = useFaultCodes();
    const normativesQuery = useNormatives(equipmentId ? Number(equipmentId) : null);
    const createMutation = useCreateWorkOrder();

    const areas = asArray(areasQuery.data);
    const allEquipment = asArray(equipmentQuery.data);
    const allExecutors = asArray(executorsQuery.data);
    const brigades = asArray(brigadesQuery.data);
    const faultCodes = asArray(faultCodesQuery.data);
    const normatives = equipmentId ? asArray(normativesQuery.data) : [];

    const equipment = allEquipment.find((item) => String(item.id) === equipmentId) ?? null;
    const areaName = (areaId) => areas.find((area) => area.id === areaId)?.name ?? "";

    const problem = useDebouncedValue(description.trim(), DESCRIPTION_DEBOUNCE_MS);

    // Fast answer from similar closed orders first, then the LLM refines it.
    const fastWork = useWorkSuggestion({ equipmentId: equipmentId ? Number(equipmentId) : null, description: problem, fast: true });
    const fullWork = useWorkSuggestion({ equipmentId: equipmentId ? Number(equipmentId) : null, description: problem });
    const suggestion = fullWork.data ?? (fastWork.data?.faultCodeId ? fastWork.data : null);

    const faultCodeId = manualWork ? manualWork.faultCodeId : suggestion?.faultCodeId ? String(suggestion.faultCodeId) : "";
    const normativeId = manualWork ? manualWork.normativeId : suggestion?.normativeId ? String(suggestion.normativeId) : "";

    const executorParams = {
        equipmentId: equipmentId ? Number(equipmentId) : null,
        description: problem || undefined,
        faultCodeId: faultCodeId ? Number(faultCodeId) : undefined,
        brigadeId: brigadeId ? Number(brigadeId) : undefined,
    };
    const suggestionsQuery = useExecutorSuggestions(executorParams);
    const suggested = equipmentId ? asArray(suggestionsQuery.data) : [];

    const assigneeId = manualAssigneeId ?? (suggested[0]?.id ? String(suggested[0].id) : "");

    // MARK: Derived

    const filteredEquipment = useMemo(() => {
        const query = equipmentSearch.trim().toLowerCase();
        const list = query
            ? allEquipment.filter((item) =>
                [item.name, item.inventoryNumber, item.type, areaName(item.areaId)]
                    .some((value) => String(value || "").toLowerCase().includes(query)))
            : allEquipment;

        return list.slice(0, 60);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allEquipment, equipmentSearch, areas]);

    const brigade = brigades.find((item) => String(item.id) === brigadeId) ?? null;
    const brigadeMemberIds = new Set(asArray(brigade?.members).map((member) => String(member.id)));

    const otherExecutors = allExecutors
        .filter((executor) => !brigade || brigadeMemberIds.has(String(executor.id)))
        .filter((executor) => !suggested.some((item) => item.id === executor.id))
        .sort((a, b) => Number(b.isOnShift) - Number(a.isOnShift) || a.fullName.localeCompare(b.fullName, "ru"));

    const selectedNormative = normatives.find((item) => String(item.id) === normativeId) ?? null;
    const selectedFaultCode = faultCodes.find((item) => String(item.id) === faultCodeId) ?? null;

    const deadline = customDeadline
        ? new Date(customDeadline)
        : new Date(now + (selectedNormative ? Number(selectedNormative.hours) : deadlineHours) * 3_600_000);

    const missing = !equipment
        ? label("quickOrder.missingEquipment", "Выберите оборудование")
        : description.trim().length < 3
            ? label("quickOrder.missingProblem", "Опишите проблему")
            : !assigneeId && !brigadeId
                ? label("quickOrder.missingExecutor", "Выберите исполнителя")
                : "";

    // MARK: Handlers

    function chooseEquipment(item) {
        setEquipmentId(String(item.id));
        setEquipmentSearch("");
        setManualWork(null);
        setManualAssigneeId(null);
        setError("");

        // Next step is the problem: open the keyboard right away.
        setTimeout(() => descriptionRef.current?.focus(), 50);
    }

    function changeEquipment() {
        setEquipmentId("");
        setManualWork(null);
        setManualAssigneeId(null);
    }

    function chooseExecutor(executor) {
        setManualAssigneeId(String(executor.id));
        setError("");
    }

    function chooseBrigade(value) {
        setBrigadeId(value);
        setManualAssigneeId(null);
    }

    function handlePhotos(event) {
        const files = Array.from(event.target.files || []);

        if (files.length > MAX_PHOTOS) {
            setError(`Можно загрузить максимум ${MAX_PHOTOS} фотографий`);
            event.target.value = "";
            return;
        }

        const oversized = files.find((file) => file.size > MAX_FILE_SIZE);

        if (oversized) {
            setError(`Файл ${oversized.name} больше 15 МБ`);
            event.target.value = "";
            return;
        }

        setPhotos(files);
        setError("");
    }

    async function submit(event) {
        event.preventDefault();

        if (submitting) return;

        if (missing) {
            setError(missing);
            return;
        }

        if (typeof navigator !== "undefined" && !navigator.onLine) {
            setError("Нет соединения. Создание наряда не ставится в офлайн-очередь, чтобы не создать дубль.");
            return;
        }

        setSubmitting(true);
        setError("");

        try {
            const beforePhotoUrls = [];

            for (const file of photos) {
                const uploaded = await uploadWorkOrderFile(file);
                beforePhotoUrls.push(uploaded.url);
            }

            const payload = {
                type: priority === "EMERGENCY" ? "EMERGENCY" : "PLANNED",
                priority,
                description: description.trim(),
                areaId: Number(equipment.areaId),
                equipmentId: Number(equipment.id),
            };

            if (assigneeId) payload.assigneeId = Number(assigneeId);
            if (brigadeId) payload.brigadeId = Number(brigadeId);
            if (normativeId) payload.normativeId = Number(normativeId);
            if (faultCodeId) payload.faultCodeId = Number(faultCodeId);
            // With a normative the server counts the deadline from its hours.
            if (customDeadline || !normativeId) payload.deadline = deadline.toISOString();
            if (comment.trim()) payload.comment = comment.trim();
            if (beforePhotoUrls.length) payload.beforePhotoUrls = beforePhotoUrls;

            const order = await createMutation.mutateAsync(payload);

            onCreated(order);
        } catch (requestError) {
            setError(
                requestError?.status === 0 || (!requestError?.status && !requestError?.response)
                    ? "Соединение оборвалось. Не повторяйте создание сразу: сначала обновите список нарядов и проверьте, не был ли наряд уже создан."
                    : extractError(requestError),
            );
        } finally {
            setSubmitting(false);
        }
    }

    // MARK: Render

    const assignee = [...suggested, ...allExecutors].find((item) => String(item.id) === assigneeId) ?? null;
    const priorityItem = PRIORITIES.find((item) => item.value === priority);
    const steps = [
        { title: label("quickOrder.equipment", "Оборудование"), done: Boolean(equipment) },
        { title: label("quickOrder.problem", "Что случилось"), done: description.trim().length >= 3 },
        { title: label("quickOrder.executor", "Исполнитель"), done: Boolean(assigneeId || brigadeId) },
    ];

    return (
        <div
            className="fixed inset-0 z-[5000] flex bg-slate-900/60 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
            onMouseDown={() => !submitting && onClose()}
        >
            <form
                onSubmit={submit}
                onMouseDown={(event) => event.stopPropagation()}
                className="flex h-full w-full flex-col overflow-hidden bg-slate-50 shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-32px)] sm:max-w-[760px] sm:rounded-3xl"
            >
                {/* Header */}
                <div className="border-b border-slate-200 bg-white px-4 pb-3 pt-4 sm:px-6 sm:pt-5">
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-200">
                            <RiFileAddLine size={22} />
                        </div>

                        <div className="min-w-0 flex-1">
                            <h2 className="text-lg font-bold leading-6 text-slate-900">
                                {label("quickOrder.title", "Новый наряд")}
                            </h2>
                            <p className="text-xs text-slate-500">
                                {label("quickOrder.subtitle", "Три шага — остальное подскажет ИИ")}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="-mr-2 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            aria-label="Закрыть"
                        >
                            <RiCloseLine size={22} />
                        </button>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                        {steps.map((step, index) => (
                            <div key={step.title} className="flex min-w-0 flex-1 flex-col gap-1.5">
                                <div className={`h-1.5 rounded-full transition-colors duration-300 ${step.done ? "bg-blue-600" : "bg-slate-200"}`} />
                                <span className={`truncate text-[11px] font-semibold ${step.done ? "text-blue-700" : "text-slate-400"}`}>
                                    {index + 1}. {step.title}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 sm:space-y-4 sm:px-6 sm:py-5">
                    {/* 1. Equipment */}
                    <StepCard
                        number={1}
                        done={Boolean(equipment)}
                        title={label("quickOrder.equipment", "Оборудование")}
                        aside={equipment && (
                            <button
                                type="button"
                                onClick={changeEquipment}
                                className="-my-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                            >
                                {label("quickOrder.change", "Сменить")}
                            </button>
                        )}
                    >
                        {equipment ? (
                            <div className="flex items-center gap-3">
                                <EquipmentIcon />

                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[15px] font-semibold text-slate-900">{equipment.name}</p>
                                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">{equipment.inventoryNumber}</span>
                                        <span className="inline-flex items-center gap-1"><RiMapPin2Line size={13} />{areaName(equipment.areaId)}</span>
                                        <Criticality value={equipment.criticality} />
                                    </div>
                                </div>

                            </div>
                        ) : (
                            <div>
                                <button
                                    type="button"
                                    onClick={() => setScanOpen(true)}
                                    className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99]"
                                >
                                    <RiQrScan2Line size={19} />
                                    {label("qrScanner.scanEquipment", "Сканировать QR на оборудовании")}
                                </button>

                                <div className="relative">
                                    <RiSearchLine className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        value={equipmentSearch}
                                        onChange={(event) => setEquipmentSearch(event.target.value)}
                                        placeholder={label("quickOrder.equipmentSearch", "Название, инв. номер или участок")}
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                                    />
                                </div>

                                <div className="-mx-1 mt-2 max-h-[264px] overflow-y-auto px-1">
                                    {equipmentQuery.isLoading && <InlineLoader />}

                                    {!equipmentQuery.isLoading && filteredEquipment.length === 0 && (
                                        <p className="py-6 text-center text-sm text-slate-400">
                                            {label("quickOrder.equipmentEmpty", "Ничего не найдено")}
                                        </p>
                                    )}

                                    {filteredEquipment.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => chooseEquipment(item)}
                                            className="group flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-blue-50 active:scale-[0.99] active:bg-blue-100"
                                        >
                                            <EquipmentIcon small />

                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-medium text-slate-900">{item.name}</span>
                                                <span className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                                                    <span className="font-mono text-[11px]">{item.inventoryNumber}</span>
                                                    <span className="truncate">· {areaName(item.areaId)}</span>
                                                </span>
                                            </span>

                                            <Criticality value={item.criticality} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </StepCard>

                    {/* 2. Problem + priority */}
                    <StepCard number={2} done={description.trim().length >= 3} title={label("quickOrder.problem", "Что случилось")}>
                        <div className="relative rounded-2xl border border-slate-200 bg-slate-50 transition focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100">
                            <textarea
                                ref={descriptionRef}
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                                rows={3}
                                placeholder={label("quickOrder.problemPlaceholder", "Например: гул и нагрев подшипника, вибрация")}
                                className="block min-h-[100px] w-full resize-none rounded-2xl bg-transparent px-4 py-3 pr-16 text-[15px] leading-6 text-slate-900 outline-none placeholder:text-slate-400"
                            />

                            <DescriptionVoice
                                disabled={submitting}
                                onText={(text) => setDescription((previous) => [previous.trim(), text].filter(Boolean).join(" "))}
                                onError={setError}
                            />
                        </div>

                        <p className="mb-2 mt-4 text-xs font-semibold text-slate-500">
                            {label("quickOrder.priority", "Приоритет")}
                        </p>

                        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 sm:grid-cols-4">
                            {PRIORITIES.map((item) => {
                                const active = priority === item.value;

                                return (
                                    <button
                                        key={item.value}
                                        type="button"
                                        onClick={() => setPriority(item.value)}
                                        className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                                            active ? item.active : "text-slate-500 hover:text-slate-800"
                                        }`}
                                    >
                                        {item.value === "EMERGENCY"
                                            ? <RiAlarmWarningLine size={16} className={active ? "" : "text-red-500"} />
                                            : <span className={`h-2 w-2 rounded-full ${item.dot}`} />}
                                        {label(item.labelKey, item.fallback)}
                                    </button>
                                );
                            })}
                        </div>
                    </StepCard>

                    {/* AI: fault code, normative, deadline */}
                    <WorkSuggestion
                        ready={Boolean(equipment) && problem.length >= 3}
                        loading={fastWork.isFetching || fullWork.isFetching}
                        refining={fullWork.isFetching && Boolean(suggestion)}
                        suggestion={suggestion}
                        failed={fullWork.isError && !suggestion}
                        faultCode={selectedFaultCode}
                        normative={selectedNormative}
                        deadline={deadline}
                        customDeadline={Boolean(customDeadline)}
                        deadlineHours={deadlineHours}
                        onDeadlineHours={setDeadlineHours}
                        editorOpen={showWorkEditor}
                        onToggleEditor={() => setShowWorkEditor((value) => !value)}
                        faultCodes={faultCodes}
                        normatives={normatives}
                        faultCodeId={faultCodeId}
                        normativeId={normativeId}
                        onFaultCode={(value) => {
                            const paired = normatives.find((item) => String(item.faultCodeId) === value);
                            setManualWork({ faultCodeId: value, normativeId: paired ? String(paired.id) : normativeId });
                        }}
                        onNormative={(value) => setManualWork({ faultCodeId, normativeId: value })}
                    />

                    {/* 3. Executor */}
                    <StepCard
                        number={3}
                        done={Boolean(assigneeId || brigadeId)}
                        title={label("quickOrder.executor", "Исполнитель")}
                        aside={suggestionsQuery.isFetching && <RiLoader4Line className="animate-spin text-blue-500" size={16} />}
                    >
                        {!equipment ? (
                            <p className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">
                                {label("quickOrder.selectEquipmentFirst", "Сначала выберите оборудование")}
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {suggestionsQuery.isLoading && <ExecutorSkeleton />}

                                {!suggestionsQuery.isLoading && suggested.length === 0 && (
                                    <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
                                        {label("quickOrder.noExecutors", "На смене нет исполнителей")}
                                    </p>
                                )}

                                {suggested.slice(0, showAllExecutors ? suggested.length : 3).map((executor, index) => (
                                    <ExecutorOption
                                        key={executor.id}
                                        executor={executor}
                                        recommended={index === 0}
                                        selected={String(executor.id) === assigneeId}
                                        onSelect={() => chooseExecutor(executor)}
                                    />
                                ))}

                                {showAllExecutors && otherExecutors.map((executor) => (
                                    <ExecutorOption
                                        key={executor.id}
                                        executor={executor}
                                        selected={String(executor.id) === assigneeId}
                                        onSelect={() => chooseExecutor(executor)}
                                    />
                                ))}

                                <ShowAllButton
                                    open={showAllExecutors}
                                    count={suggested.length + otherExecutors.length}
                                    onClick={() => setShowAllExecutors((value) => !value)}
                                />
                            </div>
                        )}
                    </StepCard>

                    {/* Optional */}
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <button
                            type="button"
                            onClick={() => setShowMore((value) => !value)}
                            className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                        >
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                                <RiSettings3Line size={17} />
                            </span>
                            <span className="flex-1">
                                <span className="block text-sm font-semibold text-slate-800">{label("quickOrder.more", "Дополнительно")}</span>
                                <span className="block text-xs text-slate-400">{label("quickOrder.moreHint", "Бригада, точный срок, комментарий, фото")}</span>
                            </span>
                            <RiArrowDownSLine size={20} className={`text-slate-400 transition-transform ${showMore ? "rotate-180" : ""}`} />
                        </button>

                        {showMore && (
                            <div className="grid grid-cols-1 gap-4 border-t border-slate-100 p-4 sm:grid-cols-2">
                                <Field label={label("quickOrder.brigade", "Выдать бригаде")}>
                                    <select value={brigadeId} onChange={(event) => chooseBrigade(event.target.value)} className={CONTROL}>
                                        <option value="">{label("quickOrder.noBrigade", "Без бригады")}</option>
                                        {brigades.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.name} · {asArray(item.members).length} чел.
                                            </option>
                                        ))}
                                    </select>
                                </Field>

                                <Field label={label("quickOrder.customDeadline", "Точный срок")}>
                                    <input
                                        type="datetime-local"
                                        value={customDeadline}
                                        onChange={(event) => setCustomDeadline(event.target.value)}
                                        className={CONTROL}
                                    />
                                </Field>

                                <div className="sm:col-span-2">
                                    <Field label={label("quickOrder.comment", "Комментарий")}>
                                        <textarea
                                            value={comment}
                                            onChange={(event) => setComment(event.target.value)}
                                            rows={2}
                                            className={`${CONTROL} resize-none`}
                                        />
                                    </Field>
                                </div>

                                <div className="sm:col-span-2">
                                    <Field label={label("quickOrder.photos", "Фото до выполнения")}>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handlePhotos}
                                            className="block w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-blue-700"
                                        />
                                        {photos.length > 0 && (
                                            <p className="mt-2 text-xs text-slate-500">
                                                {t("quickOrder.photosSelected", { count: photos.length })}
                                            </p>
                                        )}
                                    </Field>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 bg-white px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.15)] sm:px-6 sm:pb-5 sm:pt-4">
                    {error && (
                        <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            <RiAlarmWarningLine size={18} className="shrink-0" />
                            {error}
                        </div>
                    )}

                    {!missing && (
                        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                            {assignee && (
                                <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                                    <span className={`flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br text-[9px] font-bold text-white ${avatarColor(assignee.fullName)}`}>
                                        {initials(assignee.fullName)}
                                    </span>
                                    {shortName(assignee.fullName)}
                                </span>
                            )}
                            {brigade && <span>{brigade.name}</span>}
                            <span className="inline-flex items-center gap-1.5">
                                <span className={`h-2 w-2 rounded-full ${priorityItem.dot}`} />
                                {label(priorityItem.labelKey, priorityItem.fallback)}
                            </span>
                            {selectedFaultCode && <span className="font-mono">{selectedFaultCode.code}</span>}
                            <span className="inline-flex items-center gap-1">
                                <RiTimeLine size={13} />
                                {t("quickOrder.deadlineUntil", { time: formatTime(deadline) })}
                            </span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting || Boolean(missing)}
                        className={`flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-base font-semibold transition active:scale-[0.99] ${
                            missing
                                ? "cursor-not-allowed bg-slate-100 text-slate-400"
                                : priority === "EMERGENCY"
                                    ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-200 hover:brightness-110"
                                    : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200 hover:brightness-110"
                        }`}
                    >
                        {submitting ? <RiLoader4Line className="animate-spin" size={18} /> : !missing && <RiSendPlaneFill size={18} />}
                        {submitting
                            ? label("quickOrder.submitting", "Выдаём…")
                            : missing || label("quickOrder.submit", "Выдать наряд")}
                    </button>
                </div>
            </form>

            {scanOpen && (
                <QrScannerModal
                    onClose={() => setScanOpen(false)}
                    onDetected={(item) => {
                        setScanOpen(false);
                        chooseEquipment(item);
                    }}
                />
            )}
        </div>
    );
}


const CONTROL = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100";


// MARK: AI suggestion

function WorkSuggestion({
    ready,
    loading,
    refining,
    suggestion,
    failed,
    faultCode,
    normative,
    deadline,
    customDeadline,
    deadlineHours,
    onDeadlineHours,
    editorOpen,
    onToggleEditor,
    faultCodes,
    normatives,
    faultCodeId,
    normativeId,
    onFaultCode,
    onNormative,
}) {
    const done = ready && !loading && (faultCode || normative);
    const explanation = suggestion?.explanation;

    return (
        <section className="relative overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-4 shadow-sm sm:p-5">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-200/40 blur-2xl" />

            <div className="relative mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm shadow-violet-200">
                        <RiSparkling2Line size={17} />
                    </span>
                    <span className="text-sm font-bold text-slate-900">{label("quickOrder.ai", "Подсказка ИИ")}</span>
                </div>

                {ready && loading && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-200">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500" />
                        </span>
                        {refining ? label("quickOrder.aiRefining", "ИИ уточняет…") : label("quickOrder.aiThinking", "Подбираем…")}
                    </span>
                )}

                {done && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                        <RiCheckLine size={13} />
                        {label("quickOrder.aiDone", "Заполнено")}
                    </span>
                )}
            </div>

            {!ready && (
                <p className="relative text-sm leading-6 text-slate-500">
                    {label("quickOrder.aiWaiting", "Опишите проблему — ИИ предложит шифр и норматив")}
                </p>
            )}

            {ready && failed && !faultCode && (
                <p className="relative mb-3 text-sm text-violet-800/80">
                    {label("quickOrder.aiNone", "ИИ не нашёл подходящий шифр — выберите вручную")}
                </p>
            )}

            {ready && (
                <div className="relative grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <SuggestionTile title={label("quickOrder.faultCode", "Шифр неисправности")} pending={loading && !faultCode}>
                        {faultCode ? (
                            <div className="flex items-start gap-2">
                                <span className="shrink-0 rounded-lg bg-violet-100 px-2 py-0.5 font-mono text-xs font-bold text-violet-700">{faultCode.code}</span>
                                <span className="text-sm font-semibold leading-5 text-slate-900">{faultCode.name}</span>
                            </div>
                        ) : (
                            <span className="text-sm text-slate-400">{label("quickOrder.notSelected", "Не выбран")}</span>
                        )}
                    </SuggestionTile>

                    <SuggestionTile title={label("quickOrder.normative", "Норматив")} pending={loading && !normative}>
                        {normative ? (
                            <div className="flex items-start justify-between gap-2">
                                <span className="text-sm font-semibold leading-5 text-slate-900">{normative.name}</span>
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
                                    <RiTimeLine size={12} />
                                    {t("quickOrder.inHours", { hours: Number(normative.hours) })}
                                </span>
                            </div>
                        ) : (
                            <span className="text-sm text-slate-400">{label("quickOrder.notSelected", "Не выбран")}</span>
                        )}
                    </SuggestionTile>
                </div>
            )}

            {ready && explanation && (
                <p className="relative mt-3 border-l-2 border-violet-300 pl-3 text-xs leading-5 text-slate-600">
                    {explanation}
                    {suggestion.basedOn > 0 && !/похож/i.test(explanation) && ` (${t("quickOrder.aiBasedOn", { count: suggestion.basedOn })})`}
                </p>
            )}

            <div className="relative mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-white/70 px-3 py-2.5 ring-1 ring-violet-100">
                <RiTimeLine size={16} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-500">{label("quickOrder.deadline", "Срок")}</span>

                {normative || customDeadline ? (
                    <span className="text-sm font-bold text-slate-900">
                        {t("quickOrder.deadlineUntil", { time: formatTime(deadline) })}
                        {normative && !customDeadline && (
                            <span className="ml-1.5 hidden text-xs font-medium text-slate-400 sm:inline">
                                {label("quickOrder.byNormative", "по нормативу")}
                            </span>
                        )}
                    </span>
                ) : (
                    <div className="flex gap-1">
                        {DEADLINE_HOURS.map((hours) => (
                            <button
                                key={hours}
                                type="button"
                                onClick={() => onDeadlineHours(hours)}
                                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                                    deadlineHours === hours
                                        ? "bg-blue-600 text-white shadow-sm"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                            >
                                {t("quickOrder.inHours", { hours })}
                            </button>
                        ))}
                    </div>
                )}

                <button
                    type="button"
                    onClick={onToggleEditor}
                    className="ml-auto rounded-lg px-2 py-1 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                >
                    {editorOpen ? label("quickOrder.hide", "Скрыть") : label("quickOrder.edit", "Изменить")}
                </button>
            </div>

            {editorOpen && (
                <div className="relative mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label={label("quickOrder.faultCode", "Шифр неисправности")}>
                        <select value={faultCodeId} onChange={(event) => onFaultCode(event.target.value)} className={CONTROL}>
                            <option value="">{label("quickOrder.notSelected", "Не выбран")}</option>
                            {faultCodes.map((item) => (
                                <option key={item.id} value={item.id}>{item.code} · {item.name}</option>
                            ))}
                        </select>
                    </Field>

                    <Field label={label("quickOrder.normative", "Норматив")}>
                        <select value={normativeId} onChange={(event) => onNormative(event.target.value)} className={CONTROL}>
                            <option value="">{label("quickOrder.notSelected", "Не выбран")}</option>
                            {normatives.map((item) => (
                                <option key={item.id} value={item.id}>{item.name} · {Number(item.hours)} ч</option>
                            ))}
                        </select>
                    </Field>
                </div>
            )}
        </section>
    );
}

function SuggestionTile({ title, pending, children }) {
    return (
        <div className="rounded-xl bg-white/90 p-3 ring-1 ring-violet-100">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</p>
            {pending ? (
                <div className="space-y-1.5">
                    <div className="h-3.5 w-3/4 animate-pulse rounded bg-violet-100" />
                    <div className="h-3.5 w-1/2 animate-pulse rounded bg-violet-100" />
                </div>
            ) : children}
        </div>
    );
}


// MARK: Executor option

export function ExecutorOption({ executor, recommended = false, selected, onSelect }) {
    const offShift = executor.isOnShift === false;
    const [pill, dot] = statusTone(executor);
    const chips = reasonChips(executor);

    return (
        <button
            type="button"
            onClick={onSelect}
            className={`relative flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.99] ${
                selected
                    ? "border-blue-500 bg-blue-50/60 shadow-sm ring-2 ring-blue-500/20"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
            } ${offShift ? "opacity-60" : ""}`}
        >
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shadow-sm ${avatarColor(executor.fullName)}`}>
                {initials(executor.fullName)}
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-slate-900">{executor.fullName}</span>

                    {recommended && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            <RiSparkling2Line size={11} />
                            {label("quickOrder.aiPick", "ИИ рекомендует")}
                        </span>
                    )}
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${pill}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                        {executor.statusText || (offShift ? label("quickOrder.offShift", "не на смене") : "—")}
                    </span>

                    <span className="text-xs text-slate-500">
                        {[executor.specialty, executor.grade ? t("quickOrder.grade", { grade: executor.grade }) : null].filter(Boolean).join(" · ")}
                    </span>
                </div>

                {chips.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                        {chips.map((chip) => (
                            <span
                                key={chip.text}
                                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                                    chip.tone === "warn" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"
                                }`}
                            >
                                {chip.tone === "rating" && <RiStarFill size={10} className="text-amber-400" />}
                                {chip.tone === "ok" && <RiCheckLine size={11} className="text-emerald-500" />}
                                {chip.text}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                selected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"
            }`}>
                {selected && <RiCheckLine size={14} />}
            </span>
        </button>
    );
}

export function ShowAllButton({ open, count, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-300 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
        >
            {open
                ? label("quickOrder.showRecommended", "Только рекомендованные")
                : t("quickOrder.showAll", { count })}
            <RiArrowDownSLine size={18} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
    );
}

function ExecutorSkeleton() {
    return (
        <div className="space-y-2">
            {[0, 1].map((key) => (
                <div key={key} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3">
                    <div className="h-11 w-11 animate-pulse rounded-full bg-slate-100" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-1/2 animate-pulse rounded bg-slate-100" />
                        <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
                    </div>
                </div>
            ))}
        </div>
    );
}


// MARK: Voice

function DescriptionVoice({ onText, onError, disabled = false }) {
    const { recording, transcribing, startRecording, stopRecording, cancelRecording } = useVoiceInput({
        disabled,
        onError,
        onText: (text) => {
            const value = String(text ?? "").trim();
            if (value) onText(value);
        },
    });

    if (recording) {
        return (
            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full bg-white p-1 shadow-lg ring-1 ring-red-200">
                <span className="flex items-center gap-1.5 px-2 text-[11px] font-semibold text-red-600">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                    {label("quickOrder.recording", "Запись")}
                </span>

                <button type="button" onClick={cancelRecording} className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-red-50">
                    <RiCloseLine size={18} />
                </button>

                <button type="button" onClick={stopRecording} className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white">
                    <RiCheckLine size={18} />
                </button>
            </div>
        );
    }

    if (transcribing) {
        return (
            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-2 rounded-full bg-white px-3 py-2 text-[11px] font-semibold text-blue-600 shadow-lg ring-1 ring-blue-100">
                <RiLoader4Line size={15} className="animate-spin" />
                {label("quickOrder.transcribing", "Распознаём…")}
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={startRecording}
            disabled={disabled}
            title={label("quickOrder.voice", "Надиктовать")}
            className="absolute bottom-2.5 right-2.5 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-200 transition hover:brightness-110 active:scale-95 disabled:opacity-50"
        >
            <RiMicFill size={19} />
        </button>
    );
}


// MARK: UI

function StepCard({ number, title, done, aside = null, children }) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center gap-2.5">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                    done ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                    {done ? <RiCheckLine size={14} /> : number}
                </span>
                <h3 className="flex-1 text-sm font-bold text-slate-900">{title}</h3>
                {aside}
            </div>
            {children}
        </section>
    );
}

function EquipmentIcon({ small = false }) {
    return (
        <div className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600 ${small ? "h-9 w-9" : "h-12 w-12"}`}>
            <RiToolsLine size={small ? 17 : 22} />
        </div>
    );
}

// Criticality 1–5 as five bars; 4–5 turn red.
function Criticality({ value }) {
    const level = Number(value) || 0;
    if (!level) return null;
    const tone = level >= 4 ? "bg-red-500" : level === 3 ? "bg-amber-500" : "bg-emerald-500";

    return (
        <span className="inline-flex shrink-0 items-end gap-0.5" title={`Критичность ${level}/5`}>
            {[1, 2, 3, 4, 5].map((step) => (
                <span key={step} className={`w-1 rounded-sm ${step <= level ? tone : "bg-slate-200"}`} style={{ height: 4 + step * 2 }} />
            ))}
        </span>
    );
}

function Field({ label: title, children }) {
    return (
        <div className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">{title}</span>
            {children}
        </div>
    );
}

function InlineLoader() {
    return (
        <div className="flex items-center justify-center p-4 text-blue-600">
            <RiLoader4Line className="animate-spin" size={20} />
        </div>
    );
}
