import { api } from "./client.js";

export async function getAdminUsers() {
    const response = await api.get(
        "/api/admin/users",
    );

    return response.data;
}

export async function createAdminUser(payload) {
    const response = await api.post(
        "/api/admin/users",
        payload,
    );

    return response.data;
}

export async function updateAdminUser(id, payload) {
    const response = await api.patch(
        `/api/admin/users/${id}`,
        payload,
    );

    return response.data;
}

export async function updateAdminUserShift(id, payload) {
    const response = await api.patch(
        `/api/admin/users/${id}/shift`,
        payload,
    );

    return response.data;
}

export async function createArea(payload) {
    const response = await api.post(
        "/api/admin/areas",
        payload,
    );

    return response.data;
}

export async function updateArea(id, payload) {
    const response = await api.patch(
        `/api/admin/areas/${id}`,
        payload,
    );

    return response.data;
}

export async function deleteArea(id) {
    await api.delete(
        `/api/admin/areas/${id}`,
    );
}

export async function createEquipment(payload) {
    const response = await api.post(
        "/api/admin/equipment",
        payload,
    );

    return response.data;
}

export async function updateEquipment(id, payload) {
    const response = await api.patch(
        `/api/admin/equipment/${id}`,
        payload,
    );

    return response.data;
}

export async function deleteEquipment(id) {
    await api.delete(
        `/api/admin/equipment/${id}`,
    );
}

export async function createFaultCode(payload) {
    const response = await api.post(
        "/api/admin/fault-codes",
        payload,
    );

    return response.data;
}

export async function deleteFaultCode(id) {
    await api.delete(
        `/api/admin/fault-codes/${id}`,
    );
}

export async function createMaterial(payload) {
    const response = await api.post(
        "/api/admin/materials",
        payload,
    );

    return response.data;
}

export async function deleteMaterial(id) {
    await api.delete(
        `/api/admin/materials/${id}`,
    );
}

export async function createBrigade(payload) {
    const response = await api.post(
        "/api/admin/brigades",
        payload,
    );

    return response.data;
}

export async function deleteBrigade(id) {
    await api.delete(
        `/api/admin/brigades/${id}`,
    );
}

export async function createNormative(payload) {
    const response = await api.post(
        "/api/admin/normatives",
        payload,
    );

    return response.data;
}

export async function deleteNormative(id) {
    await api.delete(
        `/api/admin/normatives/${id}`,
    );
}