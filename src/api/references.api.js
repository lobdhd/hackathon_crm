import { api } from "./client.js";

export async function getAreas() {
    const response = await api.get("/api/references/areas");
    return response.data;
}

export async function getEquipment(params = {}) {
    const response = await api.get("/api/references/equipment", {
        params: {
            areaId: params.areaId || undefined,
        },
    });

    return response.data;
}

export async function getFaultCodes() {
    const response = await api.get("/api/references/fault-codes");
    return response.data;
}

export async function getMaterials() {
    const response = await api.get("/api/references/materials");
    return response.data;
}

export async function getBrigades() {
    const response = await api.get("/api/references/brigades");
    return response.data;
}

export async function getNormatives(params = {}) {
    const response = await api.get("/api/references/normatives", {
        params: {
            equipmentId: params.equipmentId || undefined,
        },
    });

    return response.data;
}

export async function getExecutors() {
    const response = await api.get("/api/references/executors");
    return response.data;
}