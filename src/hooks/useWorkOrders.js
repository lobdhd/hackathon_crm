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

import {
    useAuth,
} from "../auth/AuthProvider.jsx";

import {
    enqueueWorkOrderOfflineItem,
    isOfflineQueueNetworkError,
} from "../offline/workOrderOfflineQueue.js";


// MARK: Keys

export const workOrderKeys = {
    all: [
        "work-orders",
    ],

    lists: [
        "work-orders",
        "list",
    ],

    list: (params) => [
        "work-orders",
        "list",
        params,
    ],

    boards: [
        "work-orders",
        "board",
    ],

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
            queryKey:
                workOrderKeys.lists,
        }),

        queryClient.invalidateQueries({
            queryKey:
                workOrderKeys.boards,
        }),

        queryClient.invalidateQueries({
            queryKey:
                referenceKeys.executors,
        }),

        queryClient.invalidateQueries({
            queryKey: [
                "analytics",
            ],
        }),

        queryClient.invalidateQueries({
            queryKey: [
                "reports",
            ],
        }),
    ];

    if (
        id !== null
    ) {
        jobs.push(
            queryClient.invalidateQueries({
                queryKey:
                    workOrderKeys.detail(
                        id,
                    ),
            }),
        );

        jobs.push(
            queryClient.invalidateQueries({
                queryKey:
                    workOrderKeys.evaluation(
                        id,
                    ),
            }),
        );
    }

    await Promise.all(
        jobs,
    );
}

function setOrderFromResult(
    queryClient,
    result,
) {
    const order =
        result?.order ??
        result;

    if (
        order?.id
    ) {
        queryClient.setQueryData(
            workOrderKeys.detail(
                order.id,
            ),
            order,
        );
    }

    return order;
}


function createClientActionId(
    value,
) {
    const existing =
        String(
            value ?? "",
        ).trim();

    if (existing) {
        return existing;
    }

    return crypto.randomUUID();
}

function queuedResult({
    item,
    orderId,
}) {
    return {
        queuedOffline:
            true,

        orderId:
            Number(
                orderId,
            ),

        clientActionId:
            item.clientActionId,

        queueItem:
            item,
    };
}


// MARK: Queries

export function useWorkOrders(
    params = {},
    options = {},
) {
    return useQuery({
        queryKey:
            workOrderKeys.list(
                params,
            ),

        queryFn: () =>
            getWorkOrders(
                params,
            ),

        ...options,
    });
}

export function useWorkOrderBoard(
    params = {},
    options = {},
) {
    return useQuery({
        queryKey:
            workOrderKeys.board(
                params,
            ),

        queryFn: () =>
            getWorkOrderBoard(
                params,
            ),

        staleTime:
            15 * 1000,

        ...options,
    });
}

export function useWorkOrder(
    id,
    options = {},
) {
    const numericId =
        Number(id);

    return useQuery({
        queryKey:
            workOrderKeys.detail(
                numericId,
            ),

        queryFn: () =>
            getWorkOrder(
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

export function useWorkOrderEvaluation(
    id,
    options = {},
) {
    const numericId =
        Number(id);

    return useQuery({
        queryKey:
            workOrderKeys.evaluation(
                numericId,
            ),

        queryFn: () =>
            getWorkOrderEvaluation(
                numericId,
            ),

        enabled:
            Number.isFinite(
                numericId,
            ) &&
            numericId > 0,

        staleTime:
            30 * 1000,

        ...options,
    });
}


// MARK: Create

export function useCreateWorkOrder() {
    const queryClient =
        useQueryClient();

    return useMutation({
        mutationFn:
            createWorkOrder,

        /*
         * POST /api/work-orders НЕ идемпотентен:
         * повторная отправка создаёт второй наряд.
         *
         * Поэтому создание нельзя автоматически
         * повторять после сетевой ошибки.
         */
        retry: 0,

        /*
         * Не даём React Query ставить создание
         * в paused/offline mutation и отправлять
         * его позже автоматически.
         */
        networkMode:
            "always",

        onSuccess: async (
            order,
        ) => {
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
    const queryClient =
        useQueryClient();

    return useMutation({
        mutationFn: ({
            id,
            payload,
        }) =>
            updateWorkOrder(
                id,
                payload,
            ),

        onSuccess: async (
            order,
        ) => {
            const updated =
                setOrderFromResult(
                    queryClient,
                    order,
                );

            if (
                updated?.id
            ) {
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
    const queryClient =
        useQueryClient();

    return useMutation({
        mutationFn: ({
            id,
            assigneeId,
            comment,
        }) =>
            reassignWorkOrder(
                id,
                assigneeId,
                comment,
            ),

        onSuccess: async (
            order,
        ) => {
            const updated =
                setOrderFromResult(
                    queryClient,
                    order,
                );

            if (
                updated?.id
            ) {
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
    const queryClient =
        useQueryClient();

    const {
        user,
    } = useAuth();

    return useMutation({
        /*
         * Комментарий идемпотентен
         * через clientActionId, поэтому
         * только его сетевую ошибку
         * разрешено сохранять локально.
         */
        mutationFn: async ({
            id,
            comment,
            clientActionId,
        }) => {
            const payload = {
                comment,

                clientActionId:
                    createClientActionId(
                        clientActionId,
                    ),
            };

            try {
                return await addWorkOrderComment(
                    id,
                    payload,
                );
            } catch (
                error
            ) {
                if (
                    !isOfflineQueueNetworkError(
                        error,
                    ) ||
                    !user?.id
                ) {
                    throw error;
                }

                const item =
                    enqueueWorkOrderOfflineItem({
                        userId:
                            user.id,

                        type:
                            "COMMENT",

                        orderId:
                            id,

                        payload,
                    });

                return queuedResult({
                    item,
                    orderId:
                        id,
                });
            }
        },

        retry:
            0,

        networkMode:
            "always",

        onSuccess: async (
            result,
        ) => {
            if (
                result?.queuedOffline
            ) {
                return;
            }

            const updated =
                setOrderFromResult(
                    queryClient,
                    result,
                );

            if (
                updated?.id
            ) {
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
    const queryClient =
        useQueryClient();

    const {
        user,
    } = useAuth();

    return useMutation({
        /*
         * Все status actions содержат
         * clientActionId и могут быть
         * безопасно replay-нуты backend-ом.
         *
         * В queue попадает ТОЛЬКО сам action.
         * Создание наряда и /api/uploads
         * сюда никогда не попадают.
         */
        mutationFn: async ({
            id,
            payload = {},
        }) => {
            const safePayload = {
                ...payload,

                clientActionId:
                    createClientActionId(
                        payload.clientActionId,
                    ),
            };

            try {
                return await performWorkOrderAction(
                    id,
                    safePayload,
                );
            } catch (
                error
            ) {
                if (
                    !isOfflineQueueNetworkError(
                        error,
                    ) ||
                    !user?.id
                ) {
                    throw error;
                }

                const item =
                    enqueueWorkOrderOfflineItem({
                        userId:
                            user.id,

                        type:
                            "ACTION",

                        orderId:
                            id,

                        payload:
                            safePayload,
                    });

                return queuedResult({
                    item,
                    orderId:
                        id,
                });
            }
        },

        retry:
            0,

        networkMode:
            "always",

        onSuccess: async (
            result,
        ) => {
            if (
                result?.queuedOffline
            ) {
                return;
            }

            const updated =
                setOrderFromResult(
                    queryClient,
                    result,
                );

            if (
                updated?.id
            ) {
                await invalidateOrders(
                    queryClient,
                    updated.id,
                );
            }
        },
    });
}

