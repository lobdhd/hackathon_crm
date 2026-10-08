import { Navigate, Route, Routes } from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout.jsx";

import ProtectedRoute from "./ProtectedRoute.jsx";
import RoleRoute from "./RoleRoute.jsx";

import Login from "../pages/auth/Login/Login.jsx";

import Dashboard from "../pages/dashboard/Dashboard.jsx";
import Orders from "../pages/orders/Orders/Orders.jsx";
import OrderDetails from "../pages/orders/OrderDetails/OrderDetails.jsx";
import Assistant from "../pages/assistant/Assistant/Assistant.jsx";
import Employees from "../pages/employees/Employees/Employees.jsx";
import EmployeeDetails from "../pages/employees/EmployeeDetails/EmployeeDetails.jsx";
import Equipment from "../pages/equipment/Equipment/Equipment.jsx";
import EquipmentEntry from "../pages/equipment/EquipmentEntry.jsx";
import Rating from "../pages/rating/Rating.jsx";
import Analytics from "../pages/analytics/Analytics.jsx";
import Reports from "../pages/reports/Reports.jsx";
import OneC from "../pages/integrations/OneC/OneC.jsx";
import Settings from "../pages/settings/Settings.jsx";
import Admin from "../pages/admin/Admin/Admin.jsx";

import { useAuth } from "../auth/AuthProvider.jsx";
import {
    ADMIN_ROLES,
    ANALYTICS_ROLES,
    INTEGRATION_ROLES,
    getDefaultRoute,
} from "../auth/roles.js";


// Корень и неизвестные пути: сразу на домашнюю страницу роли, без лишнего хопа
function RoleHome() {
    const { role } = useAuth();

    return <Navigate to={getDefaultRoute(role)} replace />;
}


export default function AppRoutes() {
    return (
        <Routes>
            {/* Public. /register убран: пользователей создаёт только админ (POST /api/admin/users) */}
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>

                    {/* Все роли */}
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/orders/:id" element={<OrderDetails />} />
                    <Route path="/equipment" element={<Equipment />} />
                    <Route path="/equipment/scan" element={<Navigate to="/equipment" replace />} />
                    <Route path="/equipment/:id" element={<EquipmentEntry />} />
                    <Route path="/rating" element={<Rating />} />
                    <Route path="/settings" element={<Settings />} />

                    {/* MASTER, MANAGER, ADMIN */}
                    <Route element={<RoleRoute roles={ANALYTICS_ROLES} />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/assistant" element={<Assistant />} />
                        <Route path="/employees" element={<Employees />} />
                        <Route path="/employees/:id" element={<EmployeeDetails />} />
                        <Route path="/analytics" element={<Analytics />} />
                        <Route path="/reports" element={<Reports />} />
                    </Route>

                    {/* MANAGER, ADMIN */}
                    <Route element={<RoleRoute roles={INTEGRATION_ROLES} />}>
                        <Route path="/integrations/1c" element={<OneC />} />
                    </Route>

                    {/* ADMIN */}
                    <Route element={<RoleRoute roles={ADMIN_ROLES} />}>
                        <Route path="/admin" element={<Admin />} />
                    </Route>

                </Route>
            </Route>

            <Route path="/" element={<RoleHome />} />
            <Route path="*" element={<RoleHome />} />
        </Routes>
    );
}
