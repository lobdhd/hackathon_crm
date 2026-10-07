import {
    api,
} from "./client.js";


// MARK: List

export async function getNotifications() {
    const response =
        await api.get(
            "/api/notifications",
        );

    return Array.isArray(
        response.data,
    )
        ? response.data
        : [];
}


// MARK: Read

export async function markNotificationRead(
    id,
) {
    const response =
        await api.patch(
            `/api/notifications/${id}/read`,
        );

    return response.data;
}


// MARK: Read many

export async function markNotificationsRead(
    ids = [],
) {
    const uniqueIds = [
        ...new Set(
            ids
                .map(Number)
                .filter(
                    Number.isFinite,
                ),
        ),
    ];

    if (
        uniqueIds.length ===
        0
    ) {
        return [];
    }

    await Promise.all(
        uniqueIds.map(
            (id) =>
                markNotificationRead(
                    id,
                ),
        ),
    );

    return uniqueIds;
}