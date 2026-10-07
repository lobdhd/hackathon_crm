import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import {
    addWorkOrderComment,
    createWorkOrder,
    getWorkOrder,
    getWorkOrderBoard,
    getWorkOrderEvaluation,
    getWorkOrders,
    performWorkOrderAction,
    reassignWorkOrder,
    updateWorkOrder,
} from "../api/workOrders.api.js";

import {
    referenceKeys,
} from "./useReferences.js";

// MARK: Keys

export const workOrderKeys = {
    all: ["work-orders"],

    lists: ["work-orders", "list"],

    list: (params) => [
        "work-orders",
        "list",
        params,
    ],

    boards: ["work-orders", "board"],

    board: (params) => [
        "work-orders",
        "board",
        params,
    ],

    detail: (id) => [
        "work-orders",
        "detail",
        Number(id),
    ],

    evaluation: (id) => [
        "work-orders",
        "evaluation",
        Number(id),
    ],
};

// MARK: Helpers

async function invalidateOrders(
    queryClient,
    id = null,
) {
    const jobs = [
        queryClient.invalidateQueries({
            queryKey: workOrderKeys.lists,
        }),

        queryClient.invalidateQueries({
            queryKey: workOrderKeys.boards,
        }),

        queryClient.invalidateQueries({
            queryKey: referenceKeys.executors,
        }),

        queryClient.invalidateQueries({
            queryKey: ["analytics"],
        }),

        queryClient.invalidateQueries({
            queryKey: ["reports"],
        }),
    ];

    if (id !== null) {
        jobs.push(
            queryClient.invalidateQueries({
                queryKey: workOrderKeys.detail(id),
            }),
        );

        jobs.push(
            queryClient.invalidateQueries({
                queryKey: workOrderKeys.evaluation(id),
            }),
        );
    }

    await Promise.all(jobs);
}

function setOrderFromResult(
    queryClient,
    result,
) {
    const order = result?.order ?? result;

    if (order?.id) {
        queryClient.setQueryData(
            workOrderKeys.detail(order.id),
            order,
        );
    }

    return order;
}

// MARK: Queries

export function useWorkOrders(
    params = {},
    options = {},
) {
    return useQuery({
        queryKey: workOrderKeys.list(params),
        queryFn: () => getWorkOrders(params),
        ...options,
    });
}

export function useWorkOrderBoard(
    params = {},
    options = {},
) {
    return useQuery({
        queryKey: workOrderKeys.board(params),
        queryFn: () => getWorkOrderBoard(params),
        staleTime: 15 * 1000,
        ...options,
    });
}

export function useWorkOrder(
    id,
    options = {},
) {
    const numericId = Number(id);

    return useQuery({
        queryKey: workOrderKeys.detail(numericId),
        queryFn: () => getWorkOrder(numericId),
        enabled:
            Number.isFinite(numericId) &&
            numericId > 0,
        ...options,
    });
}

export function useWorkOrderEvaluation(
    id,
    options = {},
) {
    const numericId = Number(id);

    return useQuery({
        queryKey: workOrderKeys.evaluation(numericId),
        queryFn: () => getWorkOrderEvaluation(numericId),
        enabled:
            Number.isFinite(numericId) &&
            numericId > 0,
        staleTime: 30 * 1000,
        ...options,
    });
}

// MARK: Create

export function useCreateWorkOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createWorkOrder,

        onSuccess: async (order) => {
            setOrderFromResult(
                queryClient,
                order,
            );

            await invalidateOrders(
                queryClient,
            );
        },
    });
}

// MARK: Update

export function useUpdateWorkOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, payload }) =>
            updateWorkOrder(id, payload),

        onSuccess: async (order) => {
            const updated = setOrderFromResult(
                queryClient,
                order,
            );

            if (updated?.id) {
                await invalidateOrders(
                    queryClient,
                    updated.id,
                );
            }
        },
    });
}

// MARK: Reassign

export function useReassignWorkOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, assigneeId }) =>
            reassignWorkOrder(
                id,
                assigneeId,
            ),

        onSuccess: async (order) => {
            const updated = setOrderFromResult(
                queryClient,
                order,
            );

            if (updated?.id) {
                await invalidateOrders(
                    queryClient,
                    updated.id,
                );
            }
        },
    });
}

// MARK: Comment

export function useAddWorkOrderComment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, comment, clientActionId }) =>
            addWorkOrderComment(id, {
                comment,
                clientActionId,
            }),

        onSuccess: async (result) => {
            const updated = setOrderFromResult(
                queryClient,
                result,
            );

            if (updated?.id) {
                await invalidateOrders(
                    queryClient,
                    updated.id,
                );
            }
        },
    });
}

// MARK: Action

export function useWorkOrderAction() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, payload }) =>
            performWorkOrderAction(
                id,
                payload,
            ),

        onSuccess: async (result) => {
            const updated = setOrderFromResult(
                queryClient,
                result,
            );

            if (updated?.id) {
                await invalidateOrders(
                    queryClient,
                    updated.id,
                );
            }
        },
    });
}
