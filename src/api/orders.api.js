import { mockOrders } from "../mocks/orders.mock";
import { mockOrderDetails } from "../mocks/orderDetails.mock";

// MARK: CONFIG

const STORAGE_KEY = "naryadai_orders_v1";

const CURRENT_MASTER = "Иванов Алексей";

// MARK: SEED

function createSeedOrders() {
    return mockOrders.map((order) => {
        const details = mockOrderDetails[order.id] ?? {};

        return {
            ...order,

            issuedBy: details.issuedBy ?? CURRENT_MASTER,

            failureCode: details.failureCode ?? null,
            workDone: details.workDone ?? "",

            materials: details.materials ?? [],
            photos: details.photos ?? [],
            aiReview: details.aiReview ?? null,

            history: details.history ?? [
                {
                    id: 1,
                    title: "Наряд создан и выдан",
                    actor: CURRENT_MASTER,
                    at: order.createdAt,
                },
            ],
        };
    });
}

// MARK: STORAGE

function saveOrders(orders) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

export function getOrders() {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
        try {
            const parsed = JSON.parse(saved);

            if (Array.isArray(parsed)) {
                return parsed;
            }
        } catch {
            console.warn("Не удалось прочитать сохранённые наряды");
        }
    }

    const initialOrders = createSeedOrders();

    saveOrders(initialOrders);

    return initialOrders;
}

// MARK: READ

export function getOrderById(id) {
    return (
        getOrders().find(
            (order) => String(order.id) === String(id),
        ) ?? null
    );
}

// MARK: CREATE

export function createOrder(data) {
    const orders = getOrders();

    const nextId =
        Math.max(0, ...orders.map((order) => Number(order.id) || 0)) + 1;

    const now = new Date().toISOString();

    const newOrder = {
        id: nextId,
        number: String(nextId),

        title: data.title,
        description: data.description ?? data.title,

        workType: data.workType,
        priority: data.priority,
        status: "ISSUED",

        areaId: Number(data.areaId),
        equipmentId: Number(data.equipmentId),
        employeeId: Number(data.employeeId),

        issuedBy: CURRENT_MASTER,

        createdAt: now,
        deadline: new Date(data.deadline).toISOString(),

        overdueMinutes: 0,

        hasPhoto: false,

        lastComment: data.comment ?? "",

        failureCode: null,
        workDone: "",

        materials: [],
        photos: [],
        aiReview: null,

        history: [
            {
                id: Date.now(),
                title: "Наряд создан и выдан",
                description: "Наряд назначен исполнителю",
                actor: CURRENT_MASTER,
                at: now,
            },
        ],
    };

    saveOrders([newOrder, ...orders]);

    return newOrder;
}

// MARK: UPDATE

export function updateOrder(id, changes, event = null) {
    const orders = getOrders();

    let updatedOrder = null;

    const nextOrders = orders.map((order) => {
        if (String(order.id) !== String(id)) {
            return order;
        }

        const history = [...(order.history ?? [])];

        if (event) {
            history.push({
                id: Date.now() + Math.random(),
                title: event.title,
                description: event.description ?? "",
                actor: event.actor ?? CURRENT_MASTER,
                at: new Date().toISOString(),
            });
        }

        updatedOrder = {
            ...order,
            ...changes,
            history,
        };

        return updatedOrder;
    });

    if (!updatedOrder) return null;

    saveOrders(nextOrders);

    return updatedOrder;
}