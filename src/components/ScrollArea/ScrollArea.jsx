import { useMemo } from "react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import "overlayscrollbars/overlayscrollbars.css";
import "./ScrollArea.css";

// Универсальная область прокрутки. Сохраняет API предыдущего ScrollArea.
export default function ScrollArea({
    children,
    className = "",
    style,
    axis = "y",
    hideDelay = 900,
}) {
    const options = useMemo(() => {
        const horizontal = axis === "x" || axis === "both" || axis === "xy";
        const vertical = axis !== "x";
        return {
            overflow: {
                x: horizontal ? "scroll" : "hidden",
                y: vertical ? "scroll" : "hidden",
            },
            scrollbars: {
                theme: "os-theme-crm",
                visibility: "auto",
                autoHide: "scroll",
                autoHideDelay: Math.max(0, Number(hideDelay) || 0),
                autoHideSuspend: false,
                dragScroll: true,
                clickScroll: false,
            },
        };
    }, [axis, hideDelay]);

    return (
        <OverlayScrollbarsComponent
            defer
            className={["app-scroll", className].filter(Boolean).join(" ")}
            style={style}
            options={options}
        >
            {children}
        </OverlayScrollbarsComponent>
    );
}
