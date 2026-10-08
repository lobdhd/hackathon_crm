import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import {
    getAnalyticsAnomalies,
    getAnalyticsDashboard,
    getFailureForecast,
    runAnalyticsAnomalies,
} from "../api/analytics.api.js";


// MARK: Keys

export const analyticsKeys = {
    all: [
        "analytics",
    ],

    dashboard: [
        "analytics",
        "dashboard",
    ],

    forecasts: [
        "analytics",
        "failure-forecast",
    ],

    forecast: (days) => [
        "analytics",
        "failure-forecast",
        Number(days),
    ],

    anomalies: (params = {}) => [
        "analytics",
        "anomalies",
        {
            areaId:
                params.areaId ??
                null,

            type:
                params.type ??
                null,
        },
    ],
};


// MARK: Dashboard

export function useAnalyticsDashboard(
    options = {},
) {
    return useQuery({
        queryKey:
            analyticsKeys.dashboard,

        queryFn:
            getAnalyticsDashboard,

        staleTime:
            60 * 1000,

        ...options,
    });
}


// MARK: Forecast

export function useFailureForecast(
    days = 30,
    options = {},
) {
    return useQuery({
        queryKey:
            analyticsKeys.forecast(
                days,
            ),

        queryFn: () =>
            getFailureForecast({
                days,
            }),

        staleTime:
            5 * 60 * 1000,

        ...options,
    });
}


// MARK: Anomalies

export function useAnalyticsAnomalies(
    params = {},
    options = {},
) {
    return useQuery({
        queryKey:
            analyticsKeys.anomalies(
                params,
            ),

        queryFn: () =>
            getAnalyticsAnomalies(
                params,
            ),

        staleTime:
            2 * 60 * 1000,

        ...options,
    });
}


// MARK: Run anomalies

export function useRunAnalyticsAnomalies() {
    const queryClient =
        useQueryClient();

    return useMutation({
        mutationFn:
            runAnalyticsAnomalies,

        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries(
                    {
                        queryKey:
                            analyticsKeys.dashboard,
                    },
                ),

                queryClient.invalidateQueries(
                    {
                        queryKey:
                            analyticsKeys.forecasts,
                    },
                ),

                queryClient.invalidateQueries(
                    {
                        queryKey: [
                            "analytics",
                            "anomalies",
                        ],
                    },
                ),
            ]);
        },
    });
}