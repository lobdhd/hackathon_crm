import {
    api,
} from "./client.js";


// MARK: Dashboard

export async function getAnalyticsDashboard() {
    const response =
        await api.get(
            "/api/analytics/dashboard",
        );

    return response.data;
}


// MARK: Failure forecast

export async function getFailureForecast(
    params = {},
) {
    const response =
        await api.get(
            "/api/analytics/failure-forecast",
            {
                params: {
                    days:
                        params.days ??
                        30,
                },
            },
        );

    return Array.isArray(
        response.data,
    )
        ? response.data
        : [];
}


// MARK: Anomalies

export async function getAnalyticsAnomalies(
    params = {},
) {
    const response =
        await api.get(
            "/api/analytics/anomalies",
            {
                params: {
                    areaId:
                        params.areaId ||
                        undefined,

                    type:
                        params.type ||
                        undefined,
                },
            },
        );

    return Array.isArray(
        response.data,
    )
        ? response.data
        : [];
}


// MARK: Recalculate anomalies

export async function runAnalyticsAnomalies(
    payload = {},
) {
    const response =
        await api.post(
            "/api/analytics/anomalies/run",
            {
                ...(payload.from
                    ? {
                        from:
                            payload.from,
                    }
                    : {}),

                ...(payload.to
                    ? {
                        to:
                            payload.to,
                    }
                    : {}),

                ...(payload.areaId
                    ? {
                        areaId:
                            Number(
                                payload.areaId,
                            ),
                    }
                    : {}),
            },
            {
                timeout:
                    60000,
            },
        );

    return response.data;
}