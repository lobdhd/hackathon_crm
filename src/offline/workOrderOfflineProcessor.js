import {
    addWorkOrderComment,
    performWorkOrderAction,
} from "../api/workOrders.api.js";

import {
    bumpWorkOrderOfflineAttempt,
    emitWorkOrderQueueSyncEvent,
    getWorkOrderOfflineQueue,
    isBrowserOnline,
    removeWorkOrderOfflineItem,
} from "./workOrderOfflineQueue.js";


// MARK: Lock

const syncingUsers =
    new Set();


// MARK: Helpers

function getStatus(
    error,
) {
    return Number(
        error?.status ??
        error?.response?.status ??
        0,
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
            [
                "work-orders",
                "detail",
                Number(
                    order.id,
                ),
            ],
            order,
        );
    }

    return order;
}

async function refreshOrderState(
    queryClient,
    orderId,
) {
    const jobs = [
        queryClient.invalidateQueries({
            queryKey: [
                "work-orders",
                "list",
            ],
        }),

        queryClient.invalidateQueries({
            queryKey: [
                "work-orders",
                "board",
            ],
        }),

        queryClient.invalidateQueries({
            queryKey: [
                "work-orders",
                "detail",
                Number(
                    orderId,
                ),
            ],
        }),

        queryClient.invalidateQueries({
            queryKey: [
                "work-orders",
                "evaluation",
                Number(
                    orderId,
                ),
            ],
        }),

        queryClient.invalidateQueries({
            queryKey: [
                "references",
                "executors",
            ],
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

    await Promise.allSettled(
        jobs,
    );
}

async function sendItem(
    item,
) {
    if (
        item.type ===
        "COMMENT"
    ) {
        return addWorkOrderComment(
            item.orderId,
            item.payload,
        );
    }

    return performWorkOrderAction(
        item.orderId,
        item.payload,
    );
}

function buildSuccessMessage(
    item,
    result,
) {
    if (
        result?.replayed ===
        true
    ) {
        return item.type ===
            "COMMENT"
            ? "Комментарий уже был принят сервером и подтверждён при синхронизации"
            : "Действие уже было принято сервером и подтверждено при синхронизации";
    }

    return item.type ===
        "COMMENT"
        ? "Offline-комментарий отправлен"
        : "Offline-действие отправлено";
}


// MARK: Flush

export async function flushWorkOrderOfflineQueue({
    userId,
    queryClient,
}) {
    const normalizedUserId =
        String(
            userId ?? "",
        ).trim();

    if (
        !normalizedUserId ||
        !queryClient ||
        !isBrowserOnline() ||
        syncingUsers.has(
            normalizedUserId,
        )
    ) {
        return {
            sent:
                0,

            remaining:
                getWorkOrderOfflineQueue(
                    normalizedUserId,
                ).length,
        };
    }

    syncingUsers.add(
        normalizedUserId,
    );

    let sent = 0;

    emitWorkOrderQueueSyncEvent({
        userId:
            normalizedUserId,

        syncing:
            true,

        message:
            "Синхронизация offline-действий…",

        kind:
            "syncing",
    });

    try {
        while (
            isBrowserOnline()
        ) {
            const queue =
                getWorkOrderOfflineQueue(
                    normalizedUserId,
                );

            const item =
                queue[0];

            if (!item) {
                break;
            }

            bumpWorkOrderOfflineAttempt(
                normalizedUserId,
                item.clientActionId,
            );

            try {
                const result =
                    await sendItem(
                        item,
                    );

                removeWorkOrderOfflineItem(
                    normalizedUserId,
                    item.clientActionId,
                    {
                        outcome:
                            result?.replayed ===
                            true
                                ? "replayed"
                                : "sent",
                    },
                );

                setOrderFromResult(
                    queryClient,
                    result,
                );

                await refreshOrderState(
                    queryClient,
                    item.orderId,
                );

                sent += 1;

                emitWorkOrderQueueSyncEvent({
                    userId:
                        normalizedUserId,

                    syncing:
                        true,

                    kind:
                        "success",

                    orderId:
                        item.orderId,

                    clientActionId:
                        item.clientActionId,

                    message:
                        buildSuccessMessage(
                            item,
                            result,
                        ),
                });
            } catch (
                error
            ) {
                const status =
                    getStatus(
                        error,
                    );

                if (
                    status === 409
                ) {
                    removeWorkOrderOfflineItem(
                        normalizedUserId,
                        item.clientActionId,
                        {
                            outcome:
                                "conflict",
                        },
                    );

                    await refreshOrderState(
                        queryClient,
                        item.orderId,
                    );

                    emitWorkOrderQueueSyncEvent({
                        userId:
                            normalizedUserId,

                        syncing:
                            true,

                        kind:
                            "warning",

                        orderId:
                            item.orderId,

                        message:
                            "Offline-действие больше нельзя применить: статус наряда изменился. Данные обновлены.",
                    });

                    continue;
                }

                if (
                    [
                        400,
                        403,
                        404,
                        422,
                    ].includes(
                        status,
                    )
                ) {
                    removeWorkOrderOfflineItem(
                        normalizedUserId,
                        item.clientActionId,
                        {
                            outcome:
                                "rejected",
                        },
                    );

                    await refreshOrderState(
                        queryClient,
                        item.orderId,
                    );

                    emitWorkOrderQueueSyncEvent({
                        userId:
                            normalizedUserId,

                        syncing:
                            true,

                        kind:
                            "error",

                        orderId:
                            item.orderId,

                        message:
                            error?.message ||
                            "Offline-действие отклонено сервером и удалено из очереди",
                    });

                    continue;
                }

                /*
                 * 401 оставляем в очереди:
                 * interceptor завершит сессию,
                 * а действие сможет повториться
                 * после следующего входа именно
                 * этого пользователя.
                 *
                 * status=0 / 5xx тоже оставляем
                 * первым элементом FIFO.
                 */
                emitWorkOrderQueueSyncEvent({
                    userId:
                        normalizedUserId,

                    syncing:
                        false,

                    kind:
                        status === 401
                            ? "auth"
                            : "offline",

                    orderId:
                        item.orderId,

                    message:
                        status === 401
                            ? "Синхронизация остановлена: требуется повторный вход"
                            : "Синхронизация остановлена. Действие останется в очереди до восстановления соединения.",
                });

                break;
            }
        }
    } finally {
        syncingUsers.delete(
            normalizedUserId,
        );

        const remaining =
            getWorkOrderOfflineQueue(
                normalizedUserId,
            ).length;

        emitWorkOrderQueueSyncEvent({
            userId:
                normalizedUserId,

            syncing:
                false,

            kind:
                remaining > 0
                    ? "pending"
                    : "idle",

            message:
                remaining > 0
                    ? `Ожидают отправки: ${remaining}`
                    : sent > 0
                      ? "Offline-очередь синхронизирована"
                      : "",

            remaining,
        });

        return {
            sent,
            remaining,
        };
    }
}
