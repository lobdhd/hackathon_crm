import {
    useQuery,
} from "@tanstack/react-query";

import {
    extractEquipmentQrToken,
    getEquipmentByQr,
    getEquipmentHistory,
} from "../api/equipment.api.js";


// MARK: Keys

export const equipmentKeys = {
    all: [
        "equipment",
    ],

    history: (id) => [
        "equipment",
        "history",
        Number(id),
    ],

    qr: (token) => [
        "equipment",
        "qr",
        token,
    ],
};


// MARK: History

export function useEquipmentHistory(
    id,
    options = {},
) {
    const numericId =
        Number(id);

    return useQuery({
        queryKey:
            equipmentKeys.history(
                numericId,
            ),

        queryFn: () =>
            getEquipmentHistory(
                numericId,
            ),

        enabled:
            Number.isFinite(
                numericId,
            ) &&
            numericId > 0,

        ...options,
    });
}


// MARK: QR

export function useEquipmentByQr(
    rawToken,
    options = {},
) {
    const token =
        extractEquipmentQrToken(
            rawToken,
        );

    return useQuery({
        queryKey:
            equipmentKeys.qr(
                token,
            ),

        queryFn: () =>
            getEquipmentByQr(
                token,
            ),

        enabled:
            Boolean(
                token,
            ),

        retry: (
            failureCount,
            error,
        ) => {
            const status =
                error?.response
                    ?.status;

            if (
                status === 400 ||
                status === 404
            ) {
                return false;
            }

            return (
                failureCount < 2
            );
        },

        ...options,
    });
}
