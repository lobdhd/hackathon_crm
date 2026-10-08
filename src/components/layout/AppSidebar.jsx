import { NavLink } from "react-router-dom";

import {
    RiAdminLine,
    RiBarChartBoxLine,
    RiCloseLine,
    RiDashboardLine,
    RiDatabase2Line,
    RiFileChartLine,
    RiFileList3Line,
    RiSettings3Line,
    RiSparkling2Line,
    RiTeamLine,
    RiToolsLine,
    RiTrophyLine,
} from "react-icons/ri";

import { useI18n } from "../../i18n/index.js";
import { useAuth } from "../../auth/AuthProvider.jsx";
import {
    ADMIN_ROLES,
    ANALYTICS_ROLES,
    INTEGRATION_ROLES,
    hasRole,
} from "../../auth/roles.js";


// MARK: Menu (roles не указан = видно всем)

const menu = [
    { titleKey: "sidebar.home", path: "/dashboard", icon: RiDashboardLine, roles: ANALYTICS_ROLES },
    { titleKey: "sidebar.orders", path: "/orders", icon: RiFileList3Line },
    { titleKey: "sidebar.assistant", fallbackTitle: "НарядAI", path: "/assistant", icon: RiSparkling2Line, roles: ANALYTICS_ROLES },
    { titleKey: "sidebar.employees", path: "/employees", icon: RiTeamLine, roles: ANALYTICS_ROLES },
    { titleKey: "sidebar.equipment", path: "/equipment", icon: RiToolsLine },
    { titleKey: "sidebar.rating", path: "/rating", icon: RiTrophyLine },
    { titleKey: "sidebar.analytics", path: "/analytics", icon: RiBarChartBoxLine, roles: ANALYTICS_ROLES },
    { titleKey: "sidebar.reports", path: "/reports", icon: RiFileChartLine, roles: ANALYTICS_ROLES },
    { titleKey: "sidebar.oneC", fallbackTitle: "Интеграция 1С", path: "/integrations/1c", icon: RiDatabase2Line, roles: INTEGRATION_ROLES },
    { titleKey: "sidebar.admin", fallbackTitle: "Администрирование", path: "/admin", icon: RiAdminLine, roles: ADMIN_ROLES },
];

const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        isActive
            ? "bg-blue-50 text-blue-700"
            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
    }`;


// MARK: Sidebar

export default function AppSidebar({ open, onClose }) {
    const { t } = useI18n();
    const { user } = useAuth();

    const role = user?.role ?? null;
    const visibleMenu = menu.filter((item) => hasRole(role, item.roles));

    function getTitle(item) {
        const translated = t(item.titleKey);

        if (item.fallbackTitle && (!translated || translated === item.titleKey)) {
            return item.fallbackTitle;
        }

        return translated;
    }

    return (
        <>
            {open && (
                <div
                    className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
                    onClick={onClose}
                />
            )}

            <aside
                className={`fixed left-0 top-0 z-50 h-screen w-64 border-r border-gray-200 bg-white transition-transform duration-200 lg:translate-x-0 ${
                    open ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <div className="flex h-16 items-center justify-between border-b border-gray-200 px-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
                            <RiSparkling2Line size={20} />
                        </div>

                        <div>
                            <div className="text-base font-bold text-gray-900">
                                {t("sidebar.brand")}
                            </div>
                            <div className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                                {t("sidebar.company")}
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
                    >
                        <RiCloseLine size={22} />
                    </button>
                </div>

                <div className="flex h-[calc(100vh-64px)] flex-col">
                    <nav className="flex-1 overflow-y-auto px-3 py-5">
                        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                            {t("sidebar.management")}
                        </p>

                        <div className="space-y-1">
                            {visibleMenu.map((item) => {
                                const Icon = item.icon;

                                return (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        onClick={onClose}
                                        className={linkClass}
                                    >
                                        <Icon size={20} />
                                        <span>{getTitle(item)}</span>
                                    </NavLink>
                                );
                            })}
                        </div>
                    </nav>

                    <div className="border-t border-gray-200 p-3">
                        <NavLink to="/settings" onClick={onClose} className={linkClass}>
                            <RiSettings3Line size={20} />
                            {t("sidebar.settings")}
                        </NavLink>
                    </div>
                </div>
            </aside>
        </>
    );
}
