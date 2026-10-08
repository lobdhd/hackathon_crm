import {
    api,
} from "./client.js";


// MARK: QR token

export function extractEquipmentQrToken(
    rawValue,
) {
    const raw =
        String(
            rawValue ?? "",
        ).trim();

    if (!raw) {
        return "";
    }

    try {
        const url =
            new URL(
                raw,
                window.location.origin,
            );

        const parts =
            url.pathname
                .split("/")
                .filter(Boolean);

        return decodeURIComponent(
            parts.at(-1) ?? "",
        ).trim();
    } catch {
        const cleaned =
            raw
                .split(/[?#]/)[0]
                .replace(/\/+$/, "");

        const parts =
            cleaned
                .split("/")
                .filter(Boolean);

        return decodeURIComponent(
            parts.at(-1) ??
                cleaned,
        ).trim();
    }
}


// MARK: QR lookup

export async function getEquipmentByQr(
    rawToken,
) {
    const token =
        extractEquipmentQrToken(
            rawToken,
        );

    if (!token) {
        throw new Error(
            "QR-токен не указан",
        );
    }

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
    const numericId =
        Number(id);

    if (
        !Number.isFinite(
            numericId,
        ) ||
        numericId <= 0
    ) {
        throw new Error(
            "Некорректный ID оборудования",
        );
    }

    const response =
        await api.get(
            `/api/equipment/${numericId}/history`,
        );

    return response.data;
}


// MARK: QR image

export async function downloadEquipmentQr(
    id,
) {
    const numericId =
        Number(id);

    if (
        !Number.isFinite(
            numericId,
        ) ||
        numericId <= 0
    ) {
        throw new Error(
            "Некорректный ID оборудования",
        );
    }

    const response =
        await api.get(
            `/api/equipment/${numericId}/qr.png`,
            {
                responseType:
                    "blob",
            },
        );

    return response.data;
}
