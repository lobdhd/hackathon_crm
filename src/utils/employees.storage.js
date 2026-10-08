import { mockEmployees } from "../mocks/orders.mock";

const STORAGE_KEY = "hackathon_employees";

export function getCustomEmployees() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw);

        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function getAllEmployees() {
    return [
        ...mockEmployees,
        ...getCustomEmployees(),
    ];
}

export function getEmployeeById(id) {
    return getAllEmployees().find(
        (employee) =>
            employee.id === Number(id),
    );
}

export function createEmployee(input) {
    const customEmployees =
        getCustomEmployees();

    const allEmployees =
        getAllEmployees();

    const maxId =
        allEmployees.length > 0
            ? Math.max(
                ...allEmployees.map(
                    (employee) =>
                        Number(employee.id),
                ),
            )
            : 0;

    const employee = {
        id: maxId + 1,

        fullName:
            input.fullName.trim(),

        phone:
            input.phone?.trim() || "",

        specialty:
            input.specialty.trim(),

        grade:
            Number(input.grade),

        brigade:
            input.brigade?.trim() || "",

        areaIds:
            input.areaIds.map(Number),

        status:
            input.status || "FREE",

        queueCount: 0,

        currentOrderNumber: null,

        rating: null,

        createdAt:
            new Date().toISOString(),
    };

    const next = [
        ...customEmployees,
        employee,
    ];

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(next),
    );

    return employee;
}