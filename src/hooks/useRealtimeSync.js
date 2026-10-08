import {
    useEffect,
    useRef,
} from "react";

import {
    useQueryClient,
} from "@tanstack/react-query";

import {
    io,
} from "socket.io-client";

import {
    api,
} from "../api/client.js";

import {
    getAccessToken,
} from "../auth/token.storage.js";

import {
    useAuth,
} from "../auth/AuthProvider.jsx";

import {
    notificationKeys,
} from "./useNotifications.js";

import {
    flushWorkOrderOfflineQueue,
} from "../offline/workOrderOfflineProcessor.js";


// MARK: Helpers

function getSocketBaseUrl() {
    const base =
        api.defaults.baseURL ||
        window.location.origin;

    try {
        return new URL(
            base,
            window.location.origin,
        ).origin;
    } catch {
        return window.location.origin;
    }
}

function prependNotification(
    current,
    notification,
) {
    const list =
        Array.isArray(
            current,
        )
            ? current
            : [];

    const exists =
        list.some(
            (item) =>
                Number(
                    item.id,
                ) ===
                Number(
                    notification.id,
                ),
        );

    if (exists) {
        return list.map(
            (item) =>
                Number(
                    item.id,
                ) ===
                    Number(
                        notification.id,
                    )
                    ? {
                        ...item,
                        ...notification,
                    }
                    : item,
        );
    }

    return [
        notification,
        ...list,
    ].slice(
        0,
        100,
    );
}


// MARK: Hook

export function useRealtimeSync() {
    const queryClient =
        useQueryClient();

    const {
        user,
        isAuthenticated,
        logout,
    } = useAuth();

    const logoutRef =
        useRef(
            logout,
        );

    const unauthorizedRef =
        useRef(false);


    // MARK: Keep logout current

    useEffect(() => {
        logoutRef.current =
            logout;
    }, [
        logout,
    ]);


    // MARK: Offline queue

    useEffect(() => {
        if (
            !isAuthenticated ||
            !user?.id
        ) {
            return undefined;
        }

        const flush = () => {
            if (
                typeof navigator !==
                    "undefined" &&
                navigator.onLine ===
                    false
            ) {
                return;
            }

            flushWorkOrderOfflineQueue({
                userId:
                    user.id,

                queryClient,
            }).catch(
                () => {
                    /*
                     * Processor сам оставляет
                     * временно неотправленное
                     * действие в очереди.
                     */
                },
            );
        };

        /*
         * Если пользователь вошёл уже
         * с восстановленным интернетом,
         * не ждём следующего online event.
         */
        flush();

        window.addEventListener(
            "online",
            flush,
        );

        return () => {
            window.removeEventListener(
                "online",
                flush,
            );
        };
    }, [
        isAuthenticated,
        user?.id,
        queryClient,
    ]);


    // MARK: Socket

    useEffect(() => {
        if (
            !isAuthenticated ||
            !user?.id
        ) {
            return undefined;
        }

        const token =
            getAccessToken();

        if (!token) {
            return undefined;
        }

        unauthorizedRef.current =
            false;

        let connectedOnce =
            false;

        const socket =
            io(
                getSocketBaseUrl(),
                {
                    auth: {
                        token,
                    },

                    transports: [
                        "websocket",
                    ],

                    reconnection:
                        true,

                    reconnectionAttempts:
                        Infinity,

                    reconnectionDelay:
                        1000,

                    reconnectionDelayMax:
                        5000,
                },
            );


        // MARK: Connected

        socket.on(
            "connect",
            () => {
                /*
                 * Socket connect — хороший
                 * дополнительный сигнал того,
                 * что backend снова доступен.
                 * Lock внутри processor не даст
                 * запустить два flush одновременно.
                 */
                flushWorkOrderOfflineQueue({
                    userId:
                        user.id,

                    queryClient,
                }).catch(
                    () => {},
                );

                /*
                 * На первом подключении
                 * обычные queries и так
                 * загружаются сами.
                 *
                 * После reconnect документация
                 * требует перезапросить списки,
                 * потому что пропущенные события
                 * сервер повторно не досылает.
                 */
                if (
                    connectedOnce
                ) {
                    queryClient.invalidateQueries(
                        {
                            queryKey:
                                notificationKeys.all,
                        },
                    );

                    queryClient.invalidateQueries(
                        {
                            queryKey: [
                                "work-orders",
                            ],
                        },
                    );

                    queryClient.invalidateQueries(
                        {
                            queryKey: [
                                "references",
                                "executors",
                            ],
                        },
                    );
                }

                connectedOnce =
                    true;
            },
        );


        // MARK: New notification

        socket.on(
            "notification:new",
            (
                notification,
            ) => {
                if (
                    !notification
                ) {
                    return;
                }

                queryClient.setQueryData(
                    notificationKeys.list,
                    (
                        current,
                    ) =>
                        prependNotification(
                            current,
                            notification,
                        ),
                );
            },
        );


        // MARK: Work order changed

        socket.on(
            "work-order:changed",
            (
                order,
            ) => {
                if (
                    !order?.id
                ) {
                    return;
                }

                /*
                 * Мгновенно обновляем detail.
                 */
                queryClient.setQueryData(
                    [
                        "work-orders",
                        "detail",
                        Number(
                            order.id,
                        ),
                    ],
                    (
                        previous,
                    ) => ({
                        ...(previous &&
                            typeof previous ===
                            "object"
                            ? previous
                            : {}),

                        ...order,
                    }),
                );

                /*
                 * Перезапрашиваем:
                 * - таблицу;
                 * - kanban board;
                 * - счётчики;
                 * - employee workload.
                 */
                queryClient.invalidateQueries(
                    {
                        queryKey: [
                            "work-orders",
                        ],
                    },
                );

                queryClient.invalidateQueries(
                    {
                        queryKey: [
                            "references",
                            "executors",
                        ],
                    },
                );

                queryClient.invalidateQueries(
                    {
                        queryKey: [
                            "analytics",
                        ],
                    },
                );
            },
        );


        // MARK: Unauthorized

        socket.on(
            "connect_error",
            async (
                error,
            ) => {
                const message =
                    String(
                        error?.message ||
                        "",
                    )
                        .trim()
                        .toLowerCase();

                if (
                    message !==
                        "unauthorized" ||
                    unauthorizedRef.current
                ) {
                    return;
                }

                unauthorizedRef.current =
                    true;

                try {
                    await logoutRef.current?.();
                } catch {
                    // HTTP layer / route protection
                    // обработают выход дальше.
                }
            },
        );


        // MARK: Cleanup

        return () => {
            socket.removeAllListeners();

            socket.disconnect();
        };
    }, [
        isAuthenticated,
        user?.id,
        queryClient,
    ]);
}
