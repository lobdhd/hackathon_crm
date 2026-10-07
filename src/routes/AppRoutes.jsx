import {
    Navigate,
    Route,
    Routes,
} from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout.jsx";

import ProtectedRoute from "./ProtectedRoute.jsx";
import RoleRoute from "./RoleRoute.jsx";

import Login from "../pages/auth/Login/Login.jsx";
import Register from "../pages/auth/Register/Register.jsx";

import Dashboard from "../pages/dashboard/Dashboard.jsx";

import Orders from "../pages/orders/Orders/Orders.jsx";
import OrderDetails from "../pages/orders/OrderDetails/OrderDetails.jsx";

import Assistant from "../pages/assistant/Assistant/Assistant.jsx";

import Employees from "../pages/employees/Employees/Employees.jsx";
import EmployeeDetails from "../pages/employees/EmployeeDetails/EmployeeDetails.jsx";

import Equipment from "../pages/equipment/Equipment/Equipment.jsx";
import EquipmentDetails from "../pages/equipment/EquipmentDetails/EquipmentDetails.jsx";

import Rating from "../pages/rating/Rating.jsx";
import Analytics from "../pages/analytics/Analytics.jsx";
import Reports from "../pages/reports/Reports.jsx";

import Admin from "../pages/admin/Admin/Admin.jsx";


// MARK: Roles

const ANALYTICS_ROLES = [
    "MASTER",
    "MANAGER",
    "ADMIN",
];

const ADMIN_ROLES = [
    "ADMIN",
];


// MARK: Routes

export default function AppRoutes() {
    return (
        <Routes>

            {/* MARK: Public */}

            <Route
                path="/login"
                element={
                    <Login />
                }
            />

            <Route
                path="/register"
                element={
                    <Register />
                }
            />


            {/* MARK: Protected application */}

            <Route
                element={
                    <ProtectedRoute />
                }
            >
                <Route
                    element={
                        <DashboardLayout />
                    }
                >

                    {/* MARK: Dashboard */}

                    <Route
                        path="/dashboard"
                        element={
                            <Dashboard />
                        }
                    />


                    {/* MARK: Orders */}

                    <Route
                        path="/orders"
                        element={
                            <Orders />
                        }
                    />

                    <Route
                        path="/orders/:id"
                        element={
                            <OrderDetails />
                        }
                    />


                    {/* MARK: AI Assistant */}

                    <Route
                        path="/assistant"
                        element={
                            <Assistant />
                        }
                    />


                    {/* MARK: Employees */}

                    <Route
                        path="/employees"
                        element={
                            <Employees />
                        }
                    />

                    <Route
                        path="/employees/:id"
                        element={
                            <EmployeeDetails />
                        }
                    />


                    {/* MARK: Equipment */}

                    <Route
                        path="/equipment"
                        element={
                            <Equipment />
                        }
                    />

                    <Route
                        path="/equipment/:id"
                        element={
                            <EquipmentDetails />
                        }
                    />


                    {/* MARK: Analytics access */}

                    <Route
                        element={
                            <RoleRoute
                                roles={
                                    ANALYTICS_ROLES
                                }
                            />
                        }
                    >
                        <Route
                            path="/rating"
                            element={
                                <Rating />
                            }
                        />

                        <Route
                            path="/analytics"
                            element={
                                <Analytics />
                            }
                        />

                        <Route
                            path="/reports"
                            element={
                                <Reports />
                            }
                        />
                    </Route>


                    {/* MARK: Admin access */}

                    <Route
                        element={
                            <RoleRoute
                                roles={
                                    ADMIN_ROLES
                                }
                            />
                        }
                    >
                        <Route
                            path="/admin"
                            element={
                                <Admin />
                            }
                        />
                    </Route>

                </Route>
            </Route>


            {/* MARK: Redirects */}

            <Route
                path="/"
                element={
                    <Navigate
                        to="/dashboard"
                        replace
                    />
                }
            />

            <Route
                path="*"
                element={
                    <Navigate
                        to="/dashboard"
                        replace
                    />
                }
            />

        </Routes>
    );
}