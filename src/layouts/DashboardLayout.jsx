import { useState } from "react";
import { Outlet } from "react-router-dom";

import AppSidebar from "../components/layout/AppSidebar";
import AppNavbar from "../components/layout/AppNavbar";

export default function DashboardLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50">
            <AppSidebar
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            <AppNavbar onMenuClick={() => setSidebarOpen(true)} />

            <main className="pt-16 lg:ml-64">
                <div className="p-4 md:p-6 lg:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}