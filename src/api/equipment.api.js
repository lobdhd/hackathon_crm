import {
    api,
} from "./client.js";


// MARK: QR lookup

export async function getEquipmentByQr(
    token,
) {
    const response =
        await api.get(
            `/api/equipment/qr/${encodeURIComponent(
                token,
            )}`,
        );

    return response.data;
}


// MARK: History

export async function getEquipmentHistory(
    id,
) {
    const response =
        await api.get(
            `/api/equipment/${id}/history`,
        );

    return response.data;
}


// MARK: QR image

export async function downloadEquipmentQr(
    id,
) {
    const response =
        await api.get(
            `/api/equipment/${id}/qr.png`,
            {
                responseType:
                    "blob",
            },
        );

    return response.data;
}