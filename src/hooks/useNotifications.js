import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import {
    getNotifications,
    markNotificationRead,
    markNotificationsRead,
} from "../api/notifications.api.js";


// MARK: Keys

export const notificationKeys = {
    all: [
        "notifications",
    ],

    list: [
        "notifications",
        "list",
    ],
};


// MARK: List

export function useNotifications(
    options = {},
) {
    return useQuery({
        queryKey:
            notificationKeys.list,

        queryFn:
            getNotifications,

        staleTime:
            30 * 1000,

        refetchOnWindowFocus:
            true,

        ...options,
    });
}


// MARK: Read one

export function useMarkNotificationRead() {
    const queryClient =
        useQueryClient();

    return useMutation({
        mutationFn:
            markNotificationRead,

        onMutate: async (
            id,
        ) => {
            await queryClient.cancelQueries(
                {
                    queryKey:
                        notificationKeys.list,
                },
            );

            const previous =
                queryClient.getQueryData(
                    notificationKeys.list,
                );

            queryClient.setQueryData(
                notificationKeys.list,
                (
                    current = [],
                ) =>
                    current.map(
                        (
                            notification,
                        ) =>
                            Number(
                                notification.id,
                            ) ===
                                Number(id)
                                ? {
                                    ...notification,

                                    isRead:
                                        true,
                                }
                                : notification,
                    ),
            );

            return {
                previous,
            };
        },

        onError: (
            _error,
            _id,
            context,
        ) => {
            if (
                context?.previous
            ) {
                queryClient.setQueryData(
                    notificationKeys.list,
                    context.previous,
                );
            }
        },

        onSettled: () => {
            queryClient.invalidateQueries(
                {
                    queryKey:
                        notificationKeys.list,
                },
            );
        },
    });
}


// MARK: Read all

export function useMarkAllNotificationsRead() {
    const queryClient =
        useQueryClient();

    return useMutation({
        mutationFn:
            markNotificationsRead,

        onMutate: async (
            ids,
        ) => {
            await queryClient.cancelQueries(
                {
                    queryKey:
                        notificationKeys.list,
                },
            );

            const previous =
                queryClient.getQueryData(
                    notificationKeys.list,
                );

            const idSet =
                new Set(
                    ids.map(
                        Number,
                    ),
                );

            queryClient.setQueryData(
                notificationKeys.list,
                (
                    current = [],
                ) =>
                    current.map(
                        (
                            notification,
                        ) =>
                            idSet.has(
                                Number(
                                    notification.id,
                                ),
                            )
                                ? {
                                    ...notification,

                                    isRead:
                                        true,
                                }
                                : notification,
                    ),
            );

            return {
                previous,
            };
        },

        onError: (
            _error,
            _ids,
            context,
        ) => {
            if (
                context?.previous
            ) {
                queryClient.setQueryData(
                    notificationKeys.list,
                    context.previous,
                );
            }
        },

        onSettled: () => {
            queryClient.invalidateQueries(
                {
                    queryKey:
                        notificationKeys.list,
                },
            );
        },
    });
}