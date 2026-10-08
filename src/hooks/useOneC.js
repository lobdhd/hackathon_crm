import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import {
    getIntegrationOrders,
    getOneCJobs,
    getOneCMappings,
    pushOneCOrders,
    retryOneCJob,
    runOneCQueue,
} from "../api/oneC.api.js";


// MARK: Keys

export const oneCKeys = {
    all: [
        "integrations",
        "1c",
    ],

    jobsRoot: [
        "integrations",
        "1c",
        "jobs",
    ],

    jobs: (
        params,
    ) => [
            "integrations",
            "1c",
            "jobs",
            params,
        ],

    mappingsRoot: [
        "integrations",
        "1c",
        "mappings",
    ],

    mappings: (
        params,
    ) => [
            "integrations",
            "1c",
            "mappings",
            params,
        ],

    reconciliationRoot: [
        "integrations",
        "1c",
        "reconciliation",
    ],

    reconciliation: (
        params,
    ) => [
            "integrations",
            "1c",
            "reconciliation",
            params,
        ],
};


// MARK: Jobs

export function useOneCJobs(
    params = {},
    options = {},
) {
    return useQuery({
        queryKey:
            oneCKeys.jobs(
                params,
            ),

        queryFn:
            () =>
                getOneCJobs(
                    params,
                ),

        staleTime:
            5000,

        ...options,
    });
}


// MARK: Mappings

export function useOneCMappings(
    params = {},
    options = {},
) {
    return useQuery({
        queryKey:
            oneCKeys.mappings(
                params,
            ),

        queryFn:
            () =>
                getOneCMappings(
                    params,
                ),

        staleTime:
            30000,

        ...options,
    });
}


// MARK: Reconciliation

export function useIntegrationOrders(
    params = {},
    options = {},
) {
    return useQuery({
        queryKey:
            oneCKeys.reconciliation(
                params,
            ),

        queryFn:
            () =>
                getIntegrationOrders(
                    params,
                ),

        ...options,
    });
}


// MARK: Run

export function useRunOneCQueue() {
    const queryClient =
        useQueryClient();

    return useMutation({
        mutationFn:
            runOneCQueue,

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey:
                    oneCKeys.jobsRoot,
            });
        },
    });
}


// MARK: Retry

export function useRetryOneCJob() {
    const queryClient =
        useQueryClient();

    return useMutation({
        mutationFn:
            retryOneCJob,

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey:
                    oneCKeys.jobsRoot,
            });
        },
    });
}


// MARK: Push orders

export function usePushOneCOrders() {
    const queryClient =
        useQueryClient();

    return useMutation({
        mutationFn:
            pushOneCOrders,

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey:
                    oneCKeys.jobsRoot,
            });

            queryClient.invalidateQueries({
                queryKey:
                    oneCKeys.reconciliationRoot,
            });
        },
    });
}