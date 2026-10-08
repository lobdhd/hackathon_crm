import { ROLES, isOrderStaff } from "../../../auth/roles.js";

// Колонки, в которые можно бросить карточку (overdue только для просмотра)
export const DROP_COLUMNS = ["accepted", "queued", "inProgress", "completed"];

/**
 * Что произойдёт, если бросить карточку в колонку.
 * Возвращает { action, needsComment?, openCard? } или null, если переход запрещён.
 *
 * Решает статус карточки, а не колонка: в "inProgress" лежат IN_PROGRESS, PAUSED и REWORK,
 * в "completed" лежат COMPLETED, AI_REVIEW и закрытые.
 */
export function resolveMove(order, targetColumn, user) {
    if (!order || !user) return null;

    const staff = isOrderStaff(user.role);
    const owner = user.role === ROLES.EXECUTOR && order.assigneeId === user.id;

    // MANAGER и чужие наряды: только просмотр
    if (!staff && !owner) return null;

    const status = order.status;
    let move = null;

    switch (targetColumn) {
        case "accepted":
            if (status === "ISSUED" || status === "QUEUED") {
                move = { action: "ACCEPT" };
            }
            break;

        case "queued":
            if (status === "ISSUED") {
                move = { action: "QUEUE" };
            }
            break;

        case "inProgress":
            if (status === "ACCEPTED" || status === "QUEUED" || status === "REWORK") {
                move = { action: "START" };
            } else if (status === "PAUSED") {
                move = { action: "RESUME" };
            } else if (status === "AI_REVIEW") {
                // вернуть на доработку: только мастер/админ, причина обязательна
                move = { action: "SEND_TO_REWORK", needsComment: true, staffOnly: true };
            }
            break;

        case "completed":
            // COMPLETE требует форму (работы, шифр, фото), поэтому открываем карточку
            if (status === "IN_PROGRESS") {
                move = { action: "COMPLETE", openCard: true };
            }
            break;

        default:
            break;
    }

    if (move?.staffOnly && !staff) return null;

    return move;
}

export function canDrag(order, user) {
    return DROP_COLUMNS.some((column) => resolveMove(order, column, user));
}


// MARK: Исправленный availableActions (для OrderDetails)
// В исходной доке MANAGER проходил к ACCEPT/START/PAUSE/COMPLETE. Здесь он только смотрит.

const ALLOWED = {
    ACCEPT: ["ISSUED", "QUEUED"],
    QUEUE: ["ISSUED"],
    REJECT: ["ISSUED"],
    START: ["ACCEPTED", "QUEUED", "REWORK"],
    PAUSE: ["IN_PROGRESS"],
    RESUME: ["PAUSED"],
    COMPLETE: ["IN_PROGRESS"],
    SEND_TO_REWORK: ["AI_REVIEW"],
    CLOSE: ["AI_REVIEW"],
    CANCEL: ["ISSUED", "ACCEPTED", "QUEUED", "IN_PROGRESS", "PAUSED", "REWORK"],
};

const STAFF_ONLY = ["SEND_TO_REWORK", "CLOSE", "CANCEL"];

export function availableActions(order, user) {
    if (!order || !user) return [];

    const staff = isOrderStaff(user.role);
    const owner = user.role === ROLES.EXECUTOR && order.assigneeId === user.id;

    return Object.keys(ALLOWED).filter((action) => {
        if (!ALLOWED[action].includes(order.status)) return false;
        if (STAFF_ONLY.includes(action)) return staff;
        return staff || owner;
    });
}
