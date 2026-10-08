import { api } from "./client.js";

// MARK: Helpers

function getTotalCount(response) {
    const headerTotal = Number(response.headers?.["x-total-count"]);

    if (Number.isFinite(headerTotal)) {
        return headerTotal;
    }

    return Array.isArray(response.data)
        ? response.data.length
        : 0;
}

function toCsv(value) {
    if (Array.isArray(value)) {
        return value.length ? value.join(",") : undefined;
    }

    return value || undefined;
}

function buildListParams(params = {}) {
    return {
        status: toCsv(params.status),
        priority: toCsv(params.priority),
        type: params.type || undefined,
        overdue: params.overdue ? 1 : undefined,
        areaId: params.areaId || undefined,
        equipmentId: params.equipmentId || undefined,
        assigneeId: params.assigneeId || undefined,
        brigadeId: params.brigadeId || undefined,
        limit: params.limit || undefined,
        offset: params.offset ?? undefined,
        compact: params.compact ? 1 : undefined,
    };
}

function buildBoardParams(params = {}) {
    return {
        areaId: params.areaId || undefined,
        equipmentId: params.equipmentId || undefined,
        assigneeId: params.assigneeId || undefined,
        brigadeId: params.brigadeId || undefined,
        priority: toCsv(params.priority),
        type: params.type || undefined,
        hours: params.hours || undefined,
    };
}

// MARK: List

export async function getWorkOrders(params = {}) {
    const response = await api.get("/api/work-orders", {
        params: buildListParams(params),
    });

    const items = Array.isArray(response.data)
        ? response.data
        : [];

    return {
        items,
        total: getTotalCount(response),
    };
}

// MARK: Board

export async function getWorkOrderBoard(params = {}) {
    const response = await api.get("/api/work-orders/board", {
        params: buildBoardParams(params),
    });

    return response.data ?? {
        since: null,
        counters: {},
        columns: {},
    };
}

// MARK: Detail

export async function getWorkOrder(id) {
    const response = await api.get(`/api/work-orders/${id}`);
    return response.data;
}

// MARK: Report / evaluation

export async function getWorkOrderEvaluation(id) {
    const response = await api.get(`/api/work-orders/${id}/report`);
    return response.data;
}

// MARK: Create

export async function createWorkOrder(payload) {
    const response = await api.post("/api/work-orders", payload);
    return response.data;
}

// MARK: Update

export async function updateWorkOrder(id, payload) {
    const response = await api.patch(`/api/work-orders/${id}`, payload);
    return response.data;
}

// MARK: Reassign

export async function reassignWorkOrder(id, assigneeId, comment) {
    const response = await api.post(`/api/work-orders/${id}/reassign`, {
        assigneeId: Number(assigneeId),
        comment: comment?.trim() || undefined,
    });

    return response.data;
}

// MARK: Comment

export async function addWorkOrderComment(id, payload) {
    const response = await api.post(`/api/work-orders/${id}/comment`, {
        comment: payload.comment,
        clientActionId: payload.clientActionId,
    });

    return response.data;
}

// MARK: Action

export async function performWorkOrderAction(id, payload) {
    const isComplete = payload?.action === "COMPLETE";

    const response = await api.post(
        `/api/work-orders/${id}/action`,
        payload,
        {
            timeout: isComplete ? 250000 : 30000,
        },
    );

    return response.data;
}

// MARK: Upload

export async function uploadWorkOrderFile(file) {
    const formData = new FormData();

    formData.append("file", file);

    if (file?.lastModified) {
        formData.append(
            "takenAt",
            new Date(file.lastModified).toISOString(),
        );
    }

    const response = await api.post(
        "/api/uploads",
        formData,
        {
            timeout: 60000,
        },
    );

    return response.data;
}

// MARK: Asset URL

export function resolveWorkOrderAssetUrl(fileUrl) {
    if (!fileUrl) {
        return "";
    }

    if (/^https?:\/\//i.test(fileUrl)) {
        return fileUrl;
    }

    const base = api.defaults.baseURL || window.location.origin;

    return new URL(fileUrl, base).toString();
}
