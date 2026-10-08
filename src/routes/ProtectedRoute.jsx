import { Navigate, Outlet, useLocation } from "react-router-dom";

import { RiLoader4Line } from "react-icons/ri";

import { useAuth } from "../auth/AuthProvider.jsx";


function AuthLoader() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center gap-3 text-gray-500">
                <RiLoader4Line size={30} className="animate-spin text-blue-600" />
                <span className="text-sm">Проверяем сессию...</span>
            </div>
        </div>
    );
}


export default function ProtectedRoute({ children }) {
    const { isAuthenticated, isBootstrapping } = useAuth();
    const location = useLocation();

    if (isBootstrapping) {
        return <AuthLoader />;
    }

    if (!isAuthenticated) {
        // В Login после успешного входа: navigate(location.state?.from?.pathname ?? getDefaultRoute(role))
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return children ?? <Outlet />;
}
