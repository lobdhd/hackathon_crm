import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import "overlayscrollbars/overlayscrollbars.css";
import "./AppScrollArea.css";

export default function AppScrollArea({
    children,
    height = "100%",
    className = "",
}) {
    return (
        <OverlayScrollbarsComponent
            defer
            className={className}
            style={{ height }}
            options={{
                scrollbars: {
                    theme: "os-theme-crm",
                    visibility: "auto",
                    autoHide: "scroll",
                    autoHideDelay: 900,
                    autoHideSuspend: true,
                    dragScroll: true,
                },
            }}
        >
            {children}
        </OverlayScrollbarsComponent>
    );
}