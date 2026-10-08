// Единый источник правды по ролям: меню, роуты и табы берут права отсюда.

export const ROLES = {
    EXECUTOR: "EXECUTOR",
    MASTER: "MASTER",
    MANAGER: "MANAGER",
    ADMIN: "ADMIN",
};

export const ANALYTICS_ROLES = [ROLES.MASTER, ROLES.MANAGER, ROLES.ADMIN];
export const INTEGRATION_ROLES = [ROLES.MANAGER, ROLES.ADMIN];
export const ADMIN_ROLES = [ROLES.ADMIN];

// Кто меняет наряды (создание, правка, переназначение, закрытие)
export const ORDER_STAFF_ROLES = [ROLES.MASTER, ROLES.ADMIN];

// roles не задан или пуст = доступно всем
export function hasRole(role, roles) {
    if (!roles || roles.length === 0) return true;
    return roles.includes(role);
}

// Для вкладок и табов внутри страниц: { key, label, roles? }
export function filterByRole(items, role) {
    return items.filter((item) => hasRole(role, item.roles));
}

// Куда отправлять, если роль не подходит. Роут без гарда, поэтому цикла нет.
export function getDefaultRoute(role) {
    return ANALYTICS_ROLES.includes(role) ? "/dashboard" : "/orders";
}

export const isOrderStaff = (role) => ORDER_STAFF_ROLES.includes(role);
