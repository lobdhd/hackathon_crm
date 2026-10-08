import {
    useMemo,
    useState,
} from "react";
import {
    Link,
    useNavigate,
} from "react-router-dom";
import {
    RiAddLine,
    RiCloseLine,
    RiFilter3Line,
    RiLayoutGridLine,
    RiListCheck2,
    RiMapPinLine,
    RiQrScan2Line,
    RiRefreshLine,  
    RiSearchLine,
    RiToolsLine,
} from "react-icons/ri";
import SmartTable from "../../../react-components/SmartTable/SmartTable.jsx";

import {
    useAuth,
} from "../../../auth/AuthProvider.jsx";
import {
    useCreateEquipment,
} from "../../../hooks/useAdmin.js";
import {
    useAreas,
    useEquipmentReference,
} from "../../../hooks/useReferences.js";

import ScrollArea from "../../../components/ScrollArea/ScrollArea.jsx";
import QrScannerModal from "../../../components/equipment/QrScannerModal.jsx";
import { t as i18nT } from "../../../i18n/index.js";
import { useI18n as __useI18nReactive } from "../../../i18n/index.js";

const LIST_HEIGHT = "clamp(360px, calc(100dvh - 430px), 640px)";

// MARK: Helpers
function asArray(value) {
    return Array.isArray(
        value,
    )
        ? value
        : [];
}
function extractError(error) {
    return (
        error?.response?.data
            ?.error ||
        error?.message ||
        "Не удалось выполнить операцию"
    );
}
function getCriticalityLabel(
    value,
) {
    const labels = {
        1: "Низкая",
        2: "Ниже средней",
        3: "Средняя",
        4: "Высокая",
        5: "Критическая",
    };
    return (
        labels[
        Number(value)
        ] ||
        value ||
        "—"
    );
}
function getCriticalityStyle(
    value,
) {
    const number =
        Number(value);
    if (number >= 5) {
        return "bg-red-50 text-red-700";
    }
    if (number >= 4) {
        return "bg-orange-50 text-orange-700";
    }
    if (number >= 3) {
        return "bg-amber-50 text-amber-700";
    }
    return "bg-green-50 text-green-700";
}
// MARK: Page
export default function Equipment() {
    __useI18nReactive();
    const __i18nLocaleToken = i18nT("sidebar.home");
    const navigate = useNavigate();
    const {
        user,
    } = useAuth();
    const [view, setView] = useState("cards");
    const [scanOpen, setScanOpen] = useState(false);
    const [
        createOpen,
        setCreateOpen,
    ] = useState(false);
    const [
        filters,
        setFilters,
    ] = useState({
        search: "",
        areaId: "",
        criticality: "",
        type: "",
    });
    const equipmentQuery =
        useEquipmentReference();
    const areasQuery =
        useAreas();
    const equipment =
        asArray(
            equipmentQuery.data,
        );
    const areas =
        asArray(
            areasQuery.data,
        );
    const areasById =
        useMemo(() =>
            new Map(
                areas.map((area) => [Number(area.id), area]),
            ),
            [areas, __i18nLocaleToken]);
    const canCreate =
        user?.role ===
        "ADMIN";
    function updateFilter(
        field,
        value,
    ) {
        setFilters(
            (previous) => ({
                ...previous,
                [field]: value,
            }),
        );
    }
    function resetFilters() {
        setFilters({
            search: "",
            areaId: "",
            criticality: "",
            type: "",
        });
    }
    const types =
        useMemo(() => {
            return [
                ...new Set(
                    equipment
                        .map(
                            (item) =>
                                item.type,
                        )
                        .filter(
                            Boolean,
                        ),
                ),
            ].sort();
        }, [
            equipment,
         __i18nLocaleToken]);
    const filteredEquipment =
        useMemo(() => {
            const search =
                filters.search
                    .trim()
                    .toLowerCase();
            return equipment.filter(
                (item) => {
                    const area =
                        areasById.get(
                            Number(item.areaId),
                        );
                    const matchesSearch =
                        !search ||
                        [
                            item.name,
                            item.inventoryNumber,
                            item.type,
                            area?.name,
                        ].some(
                            (value) =>
                                String(
                                    value ||
                                    "",
                                )
                                    .toLowerCase()
                                    .includes(
                                        search,
                                    ),
                        );
                    const matchesArea =
                        !filters.areaId ||
                        Number(
                            item.areaId,
                        ) ===
                        Number(
                            filters.areaId,
                        );
                    const matchesCriticality =
                        !filters.criticality ||
                        Number(
                            item.criticality,
                        ) ===
                        Number(
                            filters.criticality,
                        );
                    const matchesType =
                        !filters.type ||
                        item.type ===
                        filters.type;
                    return (
                        matchesSearch &&
                        matchesArea &&
                        matchesCriticality &&
                        matchesType
                    );
                },
            );
        }, [
            equipment,
            areasById,
            filters,
         __i18nLocaleToken]);
    const stats =
        useMemo(
            () => ({
                total:
                    equipment.length,
                high:
                    equipment.filter(
                        (item) =>
                            Number(
                                item.criticality,
                            ) >= 4,
                    ).length,
                critical:
                    equipment.filter(
                        (item) =>
                            Number(
                                item.criticality,
                            ) === 5,
                    ).length,
                areas:
                    new Set(
                        equipment
                            .map(
                                (item) =>
                                    item.areaId,
                            )
                            .filter(
                                Boolean,
                            ),
                    ).size,
            }),
            [
                equipment,
             __i18nLocaleToken],
        );
    const activeFilters =
        Object.entries(
            filters,
        ).filter(
            ([key, value]) =>
                key !==
                "search" &&
                Boolean(value),
        ).length;
    const columns = useMemo(() => [
        {
            field: "name", header: i18nT("sidebar.equipment"), minWidth: 240,
            render: (item) => (
                <div className="min-w-0">
                    <div className="truncate font-semibold text-gray-900">{item.name}</div>
                </div>
            ),
        },
        { field: "inventoryNumber", header: "Инвентарный №", minWidth: 170 },
        { field: "type", header: i18nT("pages.admin.admin.admin.345805b"), minWidth: 180 },
        {
            key: "area", header: i18nT("ordersTable.area"), minWidth: 210, sortField: "areaName",
            sortValue: (item) => areasById.get(Number(item.areaId))?.name ?? "",
            render: (item) => (
                <div className="flex items-center gap-2 text-gray-600">
                    <RiMapPinLine size={15} className="shrink-0 text-gray-400" />
                    <span className="truncate">{areasById.get(Number(item.areaId))?.name || "—"}</span>
                </div>
            ),
        },
        {
            field: "criticality", header: i18nT("equipmentModal.criticality"), minWidth: 160,
            sortValue: (item) => Number(item.criticality),
            render: (item) => (
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${getCriticalityStyle(item.criticality)}`}>
                    {item.criticality}/5
                </span>
            ),
        },
    ], [areasById, __i18nLocaleToken]);

    if (
        equipmentQuery.isLoading ||
        areasQuery.isLoading
    ) {
        return (
            <div className="flex min-h-[500px] items-center justify-center">
                <div className="text-sm text-gray-500">
                    {i18nT("pages.equipment.equipment.equipment.f12ef70")}
                </div>
            </div>
        );
    }
    if (
        equipmentQuery.isError
    ) {
        return (
            <div className="flex min-h-[500px] flex-col items-center justify-center">
                <RiToolsLine
                    size={36}
                    className="text-red-400"
                />
                <h2 className="mt-4 text-lg font-bold text-gray-900">
                    {i18nT("pages.equipment.equipment.equipment.ed7658e")}
                </h2>
                <button
                    type="button"
                    onClick={() =>
                        equipmentQuery.refetch()
                    }
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700"
                >
                    <RiRefreshLine />
                    {i18nT("components.layout.appnavbar.b914bbb")}
                </button>
            </div>
        );
    }
    return (
        <>
            <div className="mx-auto max-w-[1800px]">
                <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                            {i18nT("sidebar.equipment")}
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            {i18nT("pages.equipment.equipment.equipment.0c76acb")}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setScanOpen(true)}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:flex-none"
                        >
                            <RiQrScan2Line size={18} />
                            {i18nT("qrScanner.scan")}
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                equipmentQuery.refetch()
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                            <RiRefreshLine
                                size={18}
                            />
                            {i18nT("components.layout.appnavbar.dbe5444")}
                        </button>
                        {canCreate && (
                            <button
                                type="button"
                                onClick={() =>
                                    setCreateOpen(
                                        true,
                                    )
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                            >
                                <RiAddLine
                                    size={18}
                                />
                                {i18nT("pages.equipment.equipment.equipment.77e0765")}
                            </button>
                        )}
                    </div>
                </div>
                <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
                    <StatCard
                        label="Всего оборудования"
                        value={
                            stats.total
                        }
                        tone="blue"
                    />
                    <StatCard
                        label="Высокая критичность"
                        value={
                            stats.high
                        }
                        tone="orange"
                    />
                    <StatCard
                        label="Критическая"
                        value={
                            stats.critical
                        }
                        tone="red"
                    />
                    <StatCard
                        label="Участков"
                        value={
                            stats.areas
                        }
                        tone="green"
                    />
                </div>
                <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                        <div className="relative flex-1">
                            <RiSearchLine
                                size={18}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                                value={
                                    filters.search
                                }
                                onChange={(
                                    event,
                                ) =>
                                    updateFilter(
                                        "search",
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                placeholder={i18nT("pages.equipment.equipment.equipment.6c29c39")}
                                className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                        <select
                            value={
                                filters.areaId
                            }
                            onChange={(
                                event,
                            ) =>
                                updateFilter(
                                    "areaId",
                                    event
                                        .target
                                        .value,
                                )
                            }
                            className={selectClass}
                        >
                            <option value="">
                                {i18nT("reportModal.allAreas")}
                            </option>
                            {areas.map(
                                (
                                    area,
                                ) => (
                                    <option
                                        key={
                                            area.id
                                        }
                                        value={
                                            area.id
                                        }
                                    >
                                        {
                                            area.name
                                        }
                                    </option>
                                ),
                            )}
                        </select>
                        <select
                            value={
                                filters.type
                            }
                            onChange={(
                                event,
                            ) =>
                                updateFilter(
                                    "type",
                                    event
                                        .target
                                        .value,
                                )
                            }
                            className={selectClass}
                        >
                            <option value="">
                                {i18nT("pages.equipment.equipment.equipment.729d3f6")}
                            </option>
                            {types.map(
                                (
                                    type,
                                ) => (
                                    <option
                                        key={
                                            type
                                        }
                                        value={
                                            type
                                        }
                                    >
                                        {
                                            type
                                        }
                                    </option>
                                ),
                            )}
                        </select>
                        <select
                            value={
                                filters.criticality
                            }
                            onChange={(
                                event,
                            ) =>
                                updateFilter(
                                    "criticality",
                                    event
                                        .target
                                        .value,
                                )
                            }
                            className={selectClass}
                        >
                            <option value="">
                                {i18nT("pages.equipment.equipment.equipment.daaa627")}
                            </option>
                            {[1, 2, 3, 4, 5].map(
                                (
                                    value,
                                ) => (
                                    <option
                                        key={
                                            value
                                        }
                                        value={
                                            value
                                        }
                                    >
                                        {
                                            value
                                        }{" "}
                                        —{" "}
                                        {getCriticalityLabel(
                                            value,
                                        )}
                                    </option>
                                ),
                            )}
                        </select>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <RiFilter3Line
                                size={17}
                            />
                            {i18nT("pages.employees.employees.employees.35dbd85")}
                            <span className="font-semibold text-gray-900">
                                {
                                    filteredEquipment.length
                                }
                            </span>
                            {activeFilters >
                                0 && (
                                    <button
                                        type="button"
                                        onClick={
                                            resetFilters
                                        }
                                        className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                                    >
                                        <RiCloseLine
                                            size={
                                                14
                                            }
                                        />
                                        {i18nT("employeesPage.reset")}
                                    </button>
                                )}
                        </div>

                        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                            <button type="button" onClick={() => setView("cards")} className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${view === "cards" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}>
                                <RiLayoutGridLine size={17} />{i18nT("pages.employees.employees.employees.152beb3")}
                            </button>
                            <button type="button" onClick={() => setView("table")} className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${view === "table" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}>
                                <RiListCheck2 size={17} />{i18nT("ordersPage.table")}
                            </button>
                        </div>
                    </div>
                </div>
                {view === "cards" ? (
                    <ScrollArea
                        axis="y"
                        className="rounded-xl pr-1"
                        style={{
                            height:
                                LIST_HEIGHT,
                        }}
                    >
                        {filteredEquipment.length >
                            0 ? (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                                {filteredEquipment.map(
                                    (
                                        item,
                                    ) => (
                                        <EquipmentCard
                                            key={
                                                item.id
                                            }
                                            item={
                                                item
                                            }
                                            area={
                                                areasById.get(
                                                    Number(
                                                        item.areaId,
                                                    ),
                                                )
                                            }
                                        />
                                    ),
                                )}
                            </div>
                        ) : (
                            <div className="flex h-full min-h-[320px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white px-6 text-center">
                                <div>
                                    <RiToolsLine
                                        size={28}
                                        className="mx-auto text-gray-300"
                                    />

                                    <h3 className="mt-4 text-sm font-semibold text-gray-800">
                                        {i18nT("pages.equipment.equipment.equipment.11a8e6f")}
                                    </h3>

                                    <p className="mt-1 text-sm text-gray-400">
                                        {i18nT("pages.employees.employees.employees.82f00e1")}
                                    </p>
                                </div>
                            </div>
                        )}
                    </ScrollArea>
                ) : (
                    <SmartTable
                        data={filteredEquipment}
                        columns={columns}
                        dataKey="id"
                        mode="sort"
                        stickyHeader
                        striped
                        scrollHeight={LIST_HEIGHT}
                        minWidth={980}
                        emptyText={i18nT("pages.equipment.equipment.equipment.11a8e6f")}
                        emptyDescription={i18nT("pages.employees.employees.employees.82f00e1")}
                        rowClassName={() => "cursor-pointer"}
                        onRowClick={(item, _index, event) => {
                            if (event.target.closest("button, a, input, select, textarea")) return;
                            navigate(`/equipment/${item.id}`);
                        }}
                    />
                )}
            </div>
            {createOpen && (
                <CreateEquipmentModal
                    areas={areas}
                    onClose={() =>
                        setCreateOpen(
                            false,
                        )
                    }
                />
            )}
            {scanOpen && (
                <QrScannerModal
                    onClose={() => setScanOpen(false)}
                    onDetected={(item) => {
                        setScanOpen(false);
                        navigate(`/equipment/${item.id}`);
                    }}
                />
            )}
        </>
    );
}
// MARK: Card
function EquipmentCard({
    item,
    area,
}) {
    __useI18nReactive();
    return (
        <Link
            to={`/equipment/${item.id}`}
            className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <RiToolsLine
                            size={21}
                        />
                    </div>
                    <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-gray-900 group-hover:text-blue-600">
                            {
                                item.name
                            }
                        </h3>
                        <p className="mt-1 truncate text-xs text-gray-500">
                            {
                                item.inventoryNumber
                            }
                        </p>
                    </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${getCriticalityStyle(
                    item.criticality,
                )}`}>
                    {
                        item.criticality
                    }
                    /5
                </span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-[10px] font-semibold uppercase text-gray-400">
                        {i18nT("pages.admin.admin.admin.345805b")}
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-gray-800">
                        {item.type ||
                            "—"}
                    </p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-[10px] font-semibold uppercase text-gray-400">
                        {i18nT("equipmentModal.criticality")}
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-gray-800">
                        {getCriticalityLabel(
                            item.criticality,
                        )}
                    </p>
                </div>
            </div>
            <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-4 text-xs text-gray-500">
                <RiMapPinLine
                    size={15}
                />
                <span className="truncate">
                    {area?.name ||
                        "Участок не указан"}
                </span>
            </div>
        </Link>
    );
}
// MARK: Create modal
function CreateEquipmentModal({
    areas,
    onClose,
}) {
    __useI18nReactive();
    const mutation =
        useCreateEquipment();
    const [
        form,
        setForm,
    ] = useState({
        name: "",
        inventoryNumber: "",
        type: "",
        criticality: 3,
        areaId: "",
    });
    const [
        error,
        setError,
    ] = useState("");
    function change(
        field,
        value,
    ) {
        setForm(
            (previous) => ({
                ...previous,
                [field]: value,
            }),
        );
        setError("");
    }
    async function submit(
        event,
    ) {
        event.preventDefault();
        try {
            await mutation.mutateAsync(
                {
                    name:
                        form.name.trim(),
                    inventoryNumber:
                        form.inventoryNumber.trim(),
                    type:
                        form.type.trim(),
                    criticality:
                        Number(
                            form.criticality,
                        ),
                    areaId:
                        Number(
                            form.areaId,
                        ),
                },
            );
            onClose();
        } catch (
        requestError
        ) {
            setError(
                extractError(
                    requestError,
                ),
            );
        }
    }
    return (
        <div
            className="fixed inset-0 z-[5000] flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm"
            onMouseDown={
                onClose
            }
        >
            <div
                className="w-full max-w-[620px] rounded-2xl bg-white shadow-2xl"
                onMouseDown={(
                    event,
                ) =>
                    event.stopPropagation()
                }
            >
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">
                            {i18nT("pages.equipment.equipment.equipment.04d928c")}
                        </h2>
                        <p className="mt-1 text-xs text-gray-500">
                            {i18nT("pages.equipment.equipment.equipment.c868176")}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                    >
                        <RiCloseLine
                            size={20}
                        />
                    </button>
                </div>
                <form
                    onSubmit={submit}
                    className="p-6"
                >
                    {error && (
                        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Field label={i18nT("pages.admin.admin.admin.602680e")}>
                            <input
                                value={
                                    form.name
                                }
                                onChange={(
                                    event,
                                ) =>
                                    change(
                                        "name",
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                required
                                className="input"
                            />
                        </Field>
                        <Field label={i18nT("pages.admin.admin.admin.ad8aabf")}>
                            <input
                                value={
                                    form.inventoryNumber
                                }
                                onChange={(
                                    event,
                                ) =>
                                    change(
                                        "inventoryNumber",
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                required
                                className="input"
                            />
                        </Field>
                        <Field label={i18nT("pages.admin.admin.admin.345805b")}>
                            <input
                                value={
                                    form.type
                                }
                                onChange={(
                                    event,
                                ) =>
                                    change(
                                        "type",
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                required
                                className="input"
                            />
                        </Field>
                        <Field label={i18nT("equipmentModal.criticality")}>
                            <select
                                value={
                                    form.criticality
                                }
                                onChange={(
                                    event,
                                ) =>
                                    change(
                                        "criticality",
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                className="input"
                            >
                                {[1, 2, 3, 4, 5].map(
                                    (
                                        value,
                                    ) => (
                                        <option
                                            key={
                                                value
                                            }
                                            value={
                                                value
                                            }
                                        >
                                            {
                                                value
                                            }{" "}
                                            —{" "}
                                            {getCriticalityLabel(
                                                value,
                                            )}
                                        </option>
                                    ),
                                )}
                            </select>
                        </Field>
                        <div className="md:col-span-2">
                            <Field label={i18nT("ordersTable.area")}>
                                <select
                                    value={
                                        form.areaId
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        change(
                                            "areaId",
                                            event
                                                .target
                                                .value,
                                        )
                                    }
                                    required
                                    className="input"
                                >
                                    <option value="">
                                        {i18nT("orderModal.selectArea")}
                                    </option>
                                    {areas.map(
                                        (
                                            area,
                                        ) => (
                                            <option
                                                key={
                                                    area.id
                                                }
                                                value={
                                                    area.id
                                                }
                                            >
                                                {
                                                    area.name
                                                }
                                            </option>
                                        ),
                                    )}
                                </select>
                            </Field>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-5">
                        <button
                            type="button"
                            onClick={
                                onClose
                            }
                            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700"
                        >
                            {i18nT("employeeModal.cancel")}
                        </button>
                        <button
                            type="submit"
                            disabled={
                                mutation.isPending
                            }
                            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            {mutation.isPending
                                ? "Создание..."
                                : i18nT("pages.admin.admin.admin.b059f7e")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
// MARK: UI
const selectClass = `
    min-w-[180px]
    rounded-lg
    border border-gray-300
    bg-gray-50
    px-3 py-2.5
    text-sm
    outline-none
    focus:border-blue-500
`;
function StatCard({
    label,
    value,
    tone,
}) {
    const tones = {
        blue:
            "text-blue-700",
        green:
            "text-green-700",
        orange:
            "text-orange-700",
        red:
            "text-red-700",
    };
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500">
                {label}
            </p>
            <p className={`mt-1 text-2xl font-bold ${tones[tone] ||
                tones.blue
                }`}>
                {value}
            </p>
        </div>
    );
}
function Field({
    label,
    children,
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-xs font-semibold text-gray-600">
                {label}
            </span>
            {children}
        </label>
    );
}