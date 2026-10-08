import { Navigate, Outlet, useLocation } from "react-router-dom";

import { RiLoader4Line } from "react-icons/ri";

import { useAuth } from "../auth/AuthProvider.jsx";
import { getDefaultRoute, hasRole } from "../auth/roles.js";


function RoleLoader() {
    return (
        <div className="flex min-h-[300px] items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-gray-500">
                <RiLoader4Line size={28} className="animate-spin text-blue-600" />
                <span className="text-sm">Проверяем доступ...</span>
            </div>
        </div>
    );
}


export default function RoleRoute({ roles = [], children }) {
    const { user, isBootstrapping, isAuthenticated } = useAuth();
    const location = useLocation();

    if (isBootstrapping) {
        return <RoleLoader />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    if (!hasRole(user?.role, roles)) {
        // getDefaultRoute ведёт на страницу без гарда, цикла не будет
        return <Navigate to={getDefaultRoute(user?.role)} replace />;
    }

    return children ?? <Outlet />;
}
