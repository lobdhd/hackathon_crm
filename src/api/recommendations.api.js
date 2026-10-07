import { api } from "./client.js";

// MARK: Executors

export async function getExecutorRecommendations(
    params = {},
) {
    const response = await api.get(
        "/api/recommendations/executors",
        {
            params: {
                equipmentId:
                    params.equipmentId || undefined,
                description:
                    params.description || undefined,
                faultCodeId:
                    params.faultCodeId || undefined,
                specialty:
                    params.specialty || undefined,
                brigadeId:
                    params.brigadeId || undefined,
            },
            timeout: 30000,
        },
    );

    return Array.isArray(response.data)
        ? response.data
        : [];
}

// MARK: Work

export async function getWorkRecommendation(
    payload,
) {
    const response = await api.post(
        "/api/recommendations/work",
        {
            description: payload.description,
            equipmentId: Number(payload.equipmentId),
        },
        {
            timeout: 30000,
        },
    );

    return response.data;
}
