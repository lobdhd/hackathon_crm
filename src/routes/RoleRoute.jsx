import {
    Navigate,
    Outlet,
} from "react-router-dom";

import {
    RiLoader4Line,
} from "react-icons/ri";

import {
    useAuth,
} from "../auth/AuthProvider.jsx";


// MARK: Loader

function RoleLoader() {
    return (
        <div className="flex min-h-[300px] items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-gray-500">
                <RiLoader4Line
                    size={28}
                    className="animate-spin text-blue-600"
                />

                <span className="text-sm">
                    Проверяем доступ...
                </span>
            </div>
        </div>
    );
}


// MARK: Role route

export default function RoleRoute({
    roles = [],
    children,
}) {
    const {
        user,
        isBootstrapping,
        isAuthenticated,
    } = useAuth();

    if (isBootstrapping) {
        return <RoleLoader />;
    }

    if (!isAuthenticated) {
        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }

    if (
        roles.length > 0 &&
        !roles.includes(user?.role)
    ) {
        return (
            <Navigate
                to="/dashboard"
                replace
            />
        );
    }

    return (
        children ??
        <Outlet />
    );
}