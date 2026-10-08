// MARK: Config

const STORAGE_PREFIX =
    "naryadai:work-order-offline:v1:";

const MAX_ITEMS = 500;

export const WORK_ORDER_QUEUE_CHANGED_EVENT =
    "naryad:work-order-queue:changed";

export const WORK_ORDER_QUEUE_SYNC_EVENT =
    "naryad:work-order-queue:sync";


// MARK: Helpers

function normalizeUserId(
    userId,
) {
    const value =
        String(
            userId ?? "",
        ).trim();

    return value;
}

function getStorageKey(
    userId,
) {
    const normalized =
        normalizeUserId(
            userId,
        );

    if (!normalized) {
        throw new Error(
            "Не удалось определить пользователя для offline-очереди",
        );
    }

    return `${STORAGE_PREFIX}${normalized}`;
}

function isBrowser() {
    return (
        typeof window !==
            "undefined" &&
        typeof window.localStorage !==
            "undefined"
    );
}

function emit(
    eventName,
    detail,
) {
    if (
        typeof window ===
        "undefined"
    ) {
        return;
    }

    window.dispatchEvent(
        new CustomEvent(
            eventName,
            {
                detail,
            },
        ),
    );
}

function normalizeQueue(
    value,
) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter(
            (item) =>
                item &&
                item.clientActionId &&
                Number.isFinite(
                    Number(
                        item.orderId,
                    ),
                ) &&
                [
                    "ACTION",
                    "COMMENT",
                ].includes(
                    item.type,
                ),
        )
        .slice(
            0,
            MAX_ITEMS,
        );
}

function writeQueue(
    userId,
    queue,
    meta = {},
) {
    if (!isBrowser()) {
        return;
    }

    const normalizedUserId =
        normalizeUserId(
            userId,
        );

    if (!normalizedUserId) {
        return;
    }

    const normalizedQueue =
        normalizeQueue(
            queue,
        );

    const key =
        getStorageKey(
            normalizedUserId,
        );

    if (
        normalizedQueue.length ===
        0
    ) {
        window.localStorage.removeItem(
            key,
        );
    } else {
        window.localStorage.setItem(
            key,
            JSON.stringify(
                normalizedQueue,
            ),
        );
    }

    emit(
        WORK_ORDER_QUEUE_CHANGED_EVENT,
        {
            userId:
                normalizedUserId,

            count:
                normalizedQueue.length,

            ...meta,
        },
    );
}


// MARK: Read

export function getWorkOrderOfflineQueue(
    userId,
) {
    if (!isBrowser()) {
        return [];
    }

    const normalizedUserId =
        normalizeUserId(
            userId,
        );

    if (!normalizedUserId) {
        return [];
    }

    try {
        const raw =
            window.localStorage.getItem(
                getStorageKey(
                    normalizedUserId,
                ),
            );

        if (!raw) {
            return [];
        }

        const parsed =
            JSON.parse(
                raw,
            );

        const queue =
            normalizeQueue(
                parsed,
            );

        if (
            queue.length !==
            parsed?.length
        ) {
            writeQueue(
                normalizedUserId,
                queue,
                {
                    reason:
                        "prune",
                },
            );
        }

        return queue;
    } catch {
        return [];
    }
}

export function getWorkOrderOfflineQueueCount(
    userId,
) {
    return getWorkOrderOfflineQueue(
        userId,
    ).length;
}


// MARK: Enqueue

export function enqueueWorkOrderOfflineItem({
    userId,
    type,
    orderId,
    payload,
}) {
    const normalizedUserId =
        normalizeUserId(
            userId,
        );

    if (!normalizedUserId) {
        throw new Error(
            "Нельзя сохранить offline-действие без пользователя",
        );
    }

    if (
        ![
            "ACTION",
            "COMMENT",
        ].includes(
            type,
        )
    ) {
        throw new Error(
            "Недопустимый тип offline-действия",
        );
    }

    const numericOrderId =
        Number(
            orderId,
        );

    if (
        !Number.isFinite(
            numericOrderId,
        ) ||
        numericOrderId <= 0
    ) {
        throw new Error(
            "Некорректный ID наряда",
        );
    }

    const clientActionId =
        String(
            payload?.clientActionId ||
                "",
        ).trim();

    if (!clientActionId) {
        throw new Error(
            "clientActionId обязателен для offline-очереди",
        );
    }

    const current =
        getWorkOrderOfflineQueue(
            normalizedUserId,
        );

    const existing =
        current.find(
            (item) =>
                item.clientActionId ===
                clientActionId,
        );

    if (existing) {
        return existing;
    }

    if (
        current.length >=
        MAX_ITEMS
    ) {
        throw new Error(
            "Offline-очередь переполнена. Подключитесь к сети перед добавлением новых действий.",
        );
    }

    const item = {
        id:
            clientActionId,

        clientActionId,

        userId:
            normalizedUserId,

        type,

        orderId:
            numericOrderId,

        payload: {
            ...payload,
            clientActionId,
        },

        createdAt:
            new Date().toISOString(),

        attempts:
            0,
    };

    const next = [
        ...current,
        item,
    ];

    writeQueue(
        normalizedUserId,
        next,
        {
            reason:
                "enqueue",

            item,
        },
    );

    return item;
}


// MARK: Remove / update

export function removeWorkOrderOfflineItem(
    userId,
    clientActionId,
    meta = {},
) {
    const current =
        getWorkOrderOfflineQueue(
            userId,
        );

    const next =
        current.filter(
            (item) =>
                item.clientActionId !==
                clientActionId,
        );

    writeQueue(
        userId,
        next,
        {
            reason:
                "remove",

            clientActionId,

            ...meta,
        },
    );

    return next;
}

export function bumpWorkOrderOfflineAttempt(
    userId,
    clientActionId,
) {
    const current =
        getWorkOrderOfflineQueue(
            userId,
        );

    const next =
        current.map(
            (item) =>
                item.clientActionId ===
                clientActionId
                    ? {
                        ...item,

                        attempts:
                            Number(
                                item.attempts ||
                                0,
                            ) + 1,

                        lastAttemptAt:
                            new Date().toISOString(),
                    }
                    : item,
        );

    writeQueue(
        userId,
        next,
        {
            reason:
                "attempt",

            clientActionId,
        },
    );
}


// MARK: Network helpers

export function isOfflineQueueNetworkError(
    error,
) {
    if (
        typeof navigator !==
            "undefined" &&
        navigator.onLine ===
            false
    ) {
        return true;
    }

    const status =
        Number(
            error?.status ??
            error?.response?.status ??
            0,
        );

    return status === 0;
}

export function isBrowserOnline() {
    if (
        typeof navigator ===
        "undefined"
    ) {
        return true;
    }

    return (
        navigator.onLine !==
        false
    );
}


// MARK: Sync events

export function emitWorkOrderQueueSyncEvent(
    detail,
) {
    emit(
        WORK_ORDER_QUEUE_SYNC_EVENT,
        detail,
    );
}
