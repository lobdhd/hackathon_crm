import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import "./SmartTable.css";


// MARK: Modes

const MODES = {
    basic: {
        sortable: false,
        selectable: false,
    },

    sort: {
        sortable: true,
        selectable: false,
    },

    checkbox: {
        sortable: false,
        selectable: true,
    },

    "sort-checkbox": {
        sortable: true,
        selectable: true,
    },
};


// MARK: Helpers

function getByPath(
    obj,
    path,
) {
    if (!path) {
        return undefined;
    }

    return String(path)
        .split(".")
        .reduce(
            (acc, key) =>
                acc == null
                    ? undefined
                    : acc[key],
            obj,
        );
}

function normalizeSortValue(
    value,
) {
    if (value == null) {
        return null;
    }

    if (
        value instanceof Date
    ) {
        return value.getTime();
    }

    if (
        typeof value ===
        "number"
    ) {
        return value;
    }

    if (
        typeof value ===
        "boolean"
    ) {
        return value
            ? 1
            : 0;
    }

    const raw =
        String(value).trim();

    const maybeNumber =
        Number(
            raw
                .replace(
                    /\s/g,
                    "",
                )
                .replace(
                    ",",
                    ".",
                ),
        );

    if (
        raw !== "" &&
        Number.isFinite(
            maybeNumber,
        )
    ) {
        return maybeNumber;
    }

    return raw.toLocaleLowerCase();
}

function compareValues(
    a,
    b,
) {
    if (
        a == null &&
        b == null
    ) {
        return 0;
    }

    if (a == null) {
        return 1;
    }

    if (b == null) {
        return -1;
    }

    if (
        typeof a ===
            "number" &&
        typeof b ===
            "number"
    ) {
        return a - b;
    }

    return String(a).localeCompare(
        String(b),
        "ru",
        {
            numeric: true,
            sensitivity:
                "base",
        },
    );
}


// MARK: Checkbox

function TableCheckbox({
    checked,
    indeterminate = false,
    disabled = false,
    onChange,
    ariaLabel,
}) {
    const ref =
        useRef(null);

    useEffect(() => {
        if (ref.current) {
            ref.current.indeterminate =
                indeterminate;
        }
    }, [
        indeterminate,
    ]);

    return (
        <input
            ref={ref}
            type="checkbox"
            className="smart-table__checkbox"
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            aria-label={
                ariaLabel
            }
        />
    );
}


// MARK: Component

export default function SmartTable({
    data = [],
    columns = [],
    dataKey = "id",

    // basic | sort | checkbox | sort-checkbox
    mode = "sort",

    sortable,
    selectable,

    removableSort = true,
    defaultSortField = null,
    defaultSortOrder = "asc",
    onSort,

    selectedKeys,
    defaultSelectedKeys = [],
    onSelectionChange,

    selectOnRowClick = false,
    isRowSelectable,

    emptyText = "Нет данных",
    emptyDescription = "",

    className = "",

    compact = false,
    striped = false,
    stickyHeader = false,

    minWidth = 720,

    // Например:
    // "520px"
    // "calc(100dvh - 430px)"
    // "clamp(380px, calc(100dvh - 430px), 660px)"
    scrollHeight = null,

    accentColor = "#111827",
    surfaceColor = "#ffffff",
    headerColor = "#f8fafc",
    borderColor = "#e5e7eb",
    textColor = "#111827",
    mutedColor = "#6b7280",

    rowClassName,
    onRowClick,
}) {
    const modeConfig =
        MODES[mode] ??
        MODES.sort;

    const canSort =
        sortable ??
        modeConfig.sortable;

    const canSelect =
        selectable ??
        modeConfig.selectable;


    // MARK: Sort

    const [
        sortState,
        setSortState,
    ] = useState(() => ({
        field:
            defaultSortField,

        order:
            defaultSortField
                ? defaultSortOrder
                : null,
    }));


    // MARK: Scroll state

    const [
        isScrolling,
        setIsScrolling,
    ] = useState(false);

    const scrollTimerRef =
        useRef(null);

    function handleScroll() {
        if (!isScrolling) {
            setIsScrolling(
                true,
            );
        }

        if (
            scrollTimerRef.current
        ) {
            clearTimeout(
                scrollTimerRef.current,
            );
        }

        scrollTimerRef.current =
            setTimeout(() => {
                setIsScrolling(
                    false,
                );
            }, 700);
    }

    useEffect(() => {
        return () => {
            if (
                scrollTimerRef.current
            ) {
                clearTimeout(
                    scrollTimerRef.current,
                );
            }
        };
    }, []);


    // MARK: Selection

    const [
        innerSelectedKeys,
        setInnerSelectedKeys,
    ] = useState(
        defaultSelectedKeys,
    );

    const controlledSelection =
        selectedKeys !==
        undefined;

    const activeSelectedKeys =
        controlledSelection
            ? selectedKeys
            : innerSelectedKeys;

    const selectedSet =
        useMemo(
            () =>
                new Set(
                    (
                        activeSelectedKeys ??
                        []
                    ).map(
                        String,
                    ),
                ),
            [
                activeSelectedKeys,
            ],
        );

    const keyOf = (
        row,
    ) =>
        String(
            getByPath(
                row,
                dataKey,
            ),
        );

    const selectableRows =
        useMemo(
            () =>
                data.filter(
                    (row) =>
                        isRowSelectable
                            ? isRowSelectable(
                                row,
                            )
                            : true,
                ),
            [
                data,
                isRowSelectable,
            ],
        );

    const allSelected =
        canSelect &&
        selectableRows.length >
            0 &&
        selectableRows.every(
            (row) =>
                selectedSet.has(
                    keyOf(row),
                ),
        );

    const someSelected =
        canSelect &&
        !allSelected &&
        selectableRows.some(
            (row) =>
                selectedSet.has(
                    keyOf(row),
                ),
        );


    // MARK: Sorted data

    const sortedData =
        useMemo(() => {
            if (
                !canSort ||
                !sortState.field ||
                !sortState.order
            ) {
                return data;
            }

            const column =
                columns.find(
                    (col) =>
                        (
                            col.sortField ??
                            col.field
                        ) ===
                        sortState.field,
                );

            if (!column) {
                return data;
            }

            const direction =
                sortState.order ===
                "desc"
                    ? -1
                    : 1;

            return data
                .map(
                    (
                        item,
                        index,
                    ) => ({
                        item,
                        index,
                    }),
                )
                .sort(
                    (a, b) => {
                        const getSortValue =
                            column.sortValue
                                ? (
                                    row,
                                ) =>
                                    column.sortValue(
                                        row,
                                    )
                                : (
                                    row,
                                ) =>
                                    getByPath(
                                        row,
                                        column.sortField ??
                                            column.field,
                                    );

                        const valueA =
                            normalizeSortValue(
                                getSortValue(
                                    a.item,
                                ),
                            );

                        const valueB =
                            normalizeSortValue(
                                getSortValue(
                                    b.item,
                                ),
                            );

                        const result =
                            compareValues(
                                valueA,
                                valueB,
                            );

                        return result ===
                            0
                            ? a.index -
                                b.index
                            : result *
                                direction;
                    },
                )
                .map(
                    (entry) =>
                        entry.item,
                );
        }, [
            canSort,
            columns,
            data,
            sortState,
        ]);


    // MARK: Selection handlers

    function emitSelection(
        nextKeys,
    ) {
        const uniqueKeys = [
            ...new Set(
                nextKeys.map(
                    String,
                ),
            ),
        ];

        if (
            !controlledSelection
        ) {
            setInnerSelectedKeys(
                uniqueKeys,
            );
        }

        const nextSet =
            new Set(
                uniqueKeys,
            );

        const selectedRows =
            data.filter(
                (row) =>
                    nextSet.has(
                        keyOf(row),
                    ),
            );

        onSelectionChange?.(
            selectedRows,
            uniqueKeys,
        );
    }

    function toggleRow(
        row,
    ) {
        if (!canSelect) {
            return;
        }

        if (
            isRowSelectable &&
            !isRowSelectable(
                row,
            )
        ) {
            return;
        }

        const key =
            keyOf(row);

        const next =
            new Set(
                selectedSet,
            );

        if (
            next.has(key)
        ) {
            next.delete(
                key,
            );
        } else {
            next.add(
                key,
            );
        }

        emitSelection(
            [...next],
        );
    }

    function toggleAll() {
        if (!canSelect) {
            return;
        }

        const next =
            new Set(
                selectedSet,
            );

        if (allSelected) {
            selectableRows.forEach(
                (row) =>
                    next.delete(
                        keyOf(
                            row,
                        ),
                    ),
            );
        } else {
            selectableRows.forEach(
                (row) =>
                    next.add(
                        keyOf(
                            row,
                        ),
                    ),
            );
        }

        emitSelection(
            [...next],
        );
    }


    // MARK: Sort handler

    function changeSort(
        column,
    ) {
        if (
            !canSort ||
            column.sortable ===
                false
        ) {
            return;
        }

        const field =
            column.sortField ??
            column.field;

        if (!field) {
            return;
        }

        let nextOrder =
            "asc";

        if (
            sortState.field ===
            field
        ) {
            if (
                sortState.order ===
                "asc"
            ) {
                nextOrder =
                    "desc";
            } else if (
                sortState.order ===
                "desc"
            ) {
                nextOrder =
                    removableSort
                        ? null
                        : "asc";
            }
        }

        const nextState = {
            field:
                nextOrder
                    ? field
                    : null,

            order:
                nextOrder,
        };

        setSortState(
            nextState,
        );

        onSort?.(
            nextState,
        );
    }

    function getAriaSort(
        column,
    ) {
        const field =
            column.sortField ??
            column.field;

        if (
            !canSort ||
            column.sortable ===
                false ||
            sortState.field !==
                field
        ) {
            return "none";
        }

        return sortState.order ===
            "asc"
            ? "ascending"
            : "descending";
    }


    // MARK: Cell

    function renderCell(
        column,
        row,
        rowIndex,
    ) {
        if (
            column.render
        ) {
            return column.render(
                row,
                rowIndex,
            );
        }

        const value =
            getByPath(
                row,
                column.field,
            );

        return value ?? "—";
    }


    // MARK: Render

    return (
        <div
            className={[
                "smart-table",

                compact
                    ? "smart-table--compact"
                    : "",

                striped
                    ? "smart-table--striped"
                    : "",

                stickyHeader
                    ? "smart-table--sticky"
                    : "",

                className,
            ]
                .filter(
                    Boolean,
                )
                .join(" ")}
            style={{
                "--st-accent":
                    accentColor,

                "--st-surface":
                    surfaceColor,

                "--st-header":
                    headerColor,

                "--st-border":
                    borderColor,

                "--st-text":
                    textColor,

                "--st-muted":
                    mutedColor,
            }}
        >
            <div
                className={[
                    "smart-table__scroll",

                    isScrolling
                        ? "smart-table__scroll--scrolling"
                        : "",
                ]
                    .filter(
                        Boolean,
                    )
                    .join(" ")}
                style={
                    scrollHeight
                        ? {
                            height:
                                scrollHeight,

                            maxHeight:
                                scrollHeight,
                        }
                        : undefined
                }
                onScroll={
                    handleScroll
                }
            >
                <table
                    className="smart-table__table"
                    style={{
                        minWidth,
                    }}
                >
                    <thead className="smart-table__head">
                        <tr>
                            {canSelect && (
                                <th
                                    className="smart-table__head-cell smart-table__select-cell"
                                    scope="col"
                                >
                                    <TableCheckbox
                                        checked={
                                            allSelected
                                        }
                                        indeterminate={
                                            someSelected
                                        }
                                        onChange={
                                            toggleAll
                                        }
                                        ariaLabel={
                                            allSelected
                                                ? "Снять выделение со всех строк"
                                                : "Выбрать все строки"
                                        }
                                    />
                                </th>
                            )}

                            {columns.map(
                                (
                                    column,
                                ) => {
                                    const sortableColumn =
                                        canSort &&
                                        column.sortable !==
                                            false &&
                                        Boolean(
                                            column.sortField ??
                                                column.field,
                                        );

                                    const field =
                                        column.sortField ??
                                        column.field;

                                    const active =
                                        sortState.field ===
                                            field &&
                                        sortState.order;

                                    return (
                                        <th
                                            key={
                                                column.key ??
                                                column.field ??
                                                column.header
                                            }
                                            className={[
                                                "smart-table__head-cell",

                                                sortableColumn
                                                    ? "smart-table__head-cell--sortable"
                                                    : "",

                                                column.align
                                                    ? `smart-table__cell--${column.align}`
                                                    : "",
                                            ]
                                                .filter(
                                                    Boolean,
                                                )
                                                .join(
                                                    " ",
                                                )}
                                            style={{
                                                width:
                                                    column.width,

                                                minWidth:
                                                    column.minWidth,
                                            }}
                                            aria-sort={
                                                sortableColumn
                                                    ? getAriaSort(
                                                        column,
                                                    )
                                                    : undefined
                                            }
                                            scope="col"
                                        >
                                            {sortableColumn ? (
                                                <button
                                                    type="button"
                                                    className="smart-table__sort"
                                                    onClick={() =>
                                                        changeSort(
                                                            column,
                                                        )
                                                    }
                                                >
                                                    <span className="smart-table__head-title">
                                                        {
                                                            column.header
                                                        }
                                                    </span>

                                                    <span
                                                        className={[
                                                            "smart-table__sort-icon",

                                                            active
                                                                ? "smart-table__sort-icon--active"
                                                                : "",
                                                        ]
                                                            .filter(
                                                                Boolean,
                                                            )
                                                            .join(
                                                                " ",
                                                            )}
                                                        aria-hidden="true"
                                                    >
                                                        {active ===
                                                        "asc"
                                                            ? "▲"
                                                            : active ===
                                                                "desc"
                                                              ? "▼"
                                                              : "↕"}
                                                    </span>
                                                </button>
                                            ) : (
                                                <span className="smart-table__head-title">
                                                    {
                                                        column.header
                                                    }
                                                </span>
                                            )}
                                        </th>
                                    );
                                },
                            )}
                        </tr>
                    </thead>

                    <tbody className="smart-table__body">
                        {sortedData.length >
                        0 ? (
                            sortedData.map(
                                (
                                    row,
                                    rowIndex,
                                ) => {
                                    const rowKey =
                                        keyOf(
                                            row,
                                        );

                                    const selected =
                                        canSelect &&
                                        selectedSet.has(
                                            rowKey,
                                        );

                                    const rowSelectable =
                                        isRowSelectable
                                            ? isRowSelectable(
                                                row,
                                            )
                                            : true;

                                    return (
                                        <tr
                                            key={
                                                rowKey
                                            }
                                            className={[
                                                "smart-table__row",

                                                selected
                                                    ? "smart-table__row--selected"
                                                    : "",

                                                !rowSelectable
                                                    ? "smart-table__row--disabled"
                                                    : "",

                                                rowClassName
                                                    ? rowClassName(
                                                        row,
                                                        rowIndex,
                                                    )
                                                    : "",
                                            ]
                                                .filter(
                                                    Boolean,
                                                )
                                                .join(
                                                    " ",
                                                )}
                                            data-selected={
                                                selected
                                                    ? ""
                                                    : undefined
                                            }
                                            onClick={(
                                                event,
                                            ) => {
                                                onRowClick?.(
                                                    row,
                                                    rowIndex,
                                                    event,
                                                );

                                                if (
                                                    canSelect &&
                                                    selectOnRowClick &&
                                                    rowSelectable &&
                                                    !event.target.closest(
                                                        "button, a, input, select, textarea",
                                                    )
                                                ) {
                                                    toggleRow(
                                                        row,
                                                    );
                                                }
                                            }}
                                        >
                                            {canSelect && (
                                                <td className="smart-table__cell smart-table__select-cell">
                                                    <TableCheckbox
                                                        checked={
                                                            selected
                                                        }
                                                        disabled={
                                                            !rowSelectable
                                                        }
                                                        onChange={() =>
                                                            toggleRow(
                                                                row,
                                                            )
                                                        }
                                                        ariaLabel={
                                                            selected
                                                                ? "Снять выделение строки"
                                                                : "Выбрать строку"
                                                        }
                                                    />
                                                </td>
                                            )}

                                            {columns.map(
                                                (
                                                    column,
                                                ) => (
                                                    <td
                                                        key={
                                                            column.key ??
                                                            column.field ??
                                                            column.header
                                                        }
                                                        className={[
                                                            "smart-table__cell",

                                                            column.align
                                                                ? `smart-table__cell--${column.align}`
                                                                : "",

                                                            column.className ??
                                                                "",
                                                        ]
                                                            .filter(
                                                                Boolean,
                                                            )
                                                            .join(
                                                                " ",
                                                            )}
                                                    >
                                                        {renderCell(
                                                            column,
                                                            row,
                                                            rowIndex,
                                                        )}
                                                    </td>
                                                ),
                                            )}
                                        </tr>
                                    );
                                },
                            )
                        ) : (
                            <tr>
                                <td
                                    className="smart-table__empty-cell"
                                    colSpan={
                                        columns.length +
                                        (canSelect
                                            ? 1
                                            : 0)
                                    }
                                >
                                    <div className="smart-table__empty">
                                        <div
                                            className="smart-table__empty-icon"
                                            aria-hidden="true"
                                        >
                                            ≡
                                        </div>

                                        <div className="smart-table__empty-title">
                                            {
                                                emptyText
                                            }
                                        </div>

                                        {emptyDescription ? (
                                            <div className="smart-table__empty-description">
                                                {
                                                    emptyDescription
                                                }
                                            </div>
                                        ) : null}
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}