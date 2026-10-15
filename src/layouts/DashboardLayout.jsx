import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { OverlayScrollbars } from "overlayscrollbars";
import "overlayscrollbars/overlayscrollbars.css";
import "./DashboardLayout.css";
import AppSidebar from "../components/layout/AppSidebar";
import AppNavbar from "../components/layout/AppNavbar";

export default function DashboardLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    useEffect(() => {
        // Apply the scrollbar to the actual document, not a nested viewport.
        // This keeps window scrolling, fixed navbar/sidebar and scroll restoration intact.
        const instance = OverlayScrollbars(document.body, {
            scrollbars: {
                theme: "os-theme-dashboard",
                visibility: "auto",
                autoHide: "scroll",
                autoHideDelay: 900,
                autoHideSuspend: false,
                dragScroll: true,
            },
        });
        return () => instance?.destroy();
    }, []);
    return (
        <div className="min-h-screen bg-gray-50">
            <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <AppNavbar onMenuClick={() => setSidebarOpen(true)} />
            <main className="pt-16 lg:ml-64">
                <div className="p-0">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
