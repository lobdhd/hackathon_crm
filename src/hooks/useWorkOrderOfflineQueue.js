import {
    useEffect,
    useState,
} from "react";

import {
    getWorkOrderOfflineQueueCount,
    WORK_ORDER_QUEUE_CHANGED_EVENT,
    WORK_ORDER_QUEUE_SYNC_EVENT,
} from "../offline/workOrderOfflineQueue.js";


// MARK: Snapshot

function getSnapshot(
    userId,
) {
    return {
        online:
            typeof navigator ===
                "undefined"
                ? true
                : navigator.onLine !==
                  false,

        count:
            getWorkOrderOfflineQueueCount(
                userId,
            ),

        syncing:
            false,

        lastMessage:
            "",

        lastKind:
            "idle",
    };
}


// MARK: Hook

export function useWorkOrderOfflineQueueStatus(
    userId,
) {
    const [
        state,
        setState,
    ] = useState(() =>
        getSnapshot(
            userId,
        ),
    );

    useEffect(() => {
        setState(
            getSnapshot(
                userId,
            ),
        );

        if (
            !userId ||
            typeof window ===
                "undefined"
        ) {
            return undefined;
        }

        const normalizedUserId =
            String(
                userId,
            );

        function refreshNetwork() {
            setState(
                (previous) => ({
                    ...previous,

                    online:
                        navigator.onLine !==
                        false,

                    count:
                        getWorkOrderOfflineQueueCount(
                            normalizedUserId,
                        ),
                }),
            );
        }

        function handleQueueChange(
            event,
        ) {
            const detail =
                event?.detail ??
                {};

            if (
                String(
                    detail.userId ??
                    "",
                ) !==
                normalizedUserId
            ) {
                return;
            }

            setState(
                (previous) => ({
                    ...previous,

                    count:
                        getWorkOrderOfflineQueueCount(
                            normalizedUserId,
                        ),
                }),
            );
        }

        function handleSync(
            event,
        ) {
            const detail =
                event?.detail ??
                {};

            if (
                String(
                    detail.userId ??
                    "",
                ) !==
                normalizedUserId
            ) {
                return;
            }

            setState(
                (previous) => ({
                    ...previous,

                    syncing:
                        Boolean(
                            detail.syncing,
                        ),

                    count:
                        getWorkOrderOfflineQueueCount(
                            normalizedUserId,
                        ),

                    lastMessage:
                        detail.message ??
                        previous.lastMessage,

                    lastKind:
                        detail.kind ??
                        previous.lastKind,
                }),
            );
        }

        function handleStorage(
            event,
        ) {
            if (
                event.key &&
                !event.key.includes(
                    `:${normalizedUserId}`,
                )
            ) {
                return;
            }

            refreshNetwork();
        }

        window.addEventListener(
            "online",
            refreshNetwork,
        );

        window.addEventListener(
            "offline",
            refreshNetwork,
        );

        window.addEventListener(
            "storage",
            handleStorage,
        );

        window.addEventListener(
            WORK_ORDER_QUEUE_CHANGED_EVENT,
            handleQueueChange,
        );

        window.addEventListener(
            WORK_ORDER_QUEUE_SYNC_EVENT,
            handleSync,
        );

        return () => {
            window.removeEventListener(
                "online",
                refreshNetwork,
            );

            window.removeEventListener(
                "offline",
                refreshNetwork,
            );

            window.removeEventListener(
                "storage",
                handleStorage,
            );

            window.removeEventListener(
                WORK_ORDER_QUEUE_CHANGED_EVENT,
                handleQueueChange,
            );

            window.removeEventListener(
                WORK_ORDER_QUEUE_SYNC_EVENT,
                handleSync,
            );
        };
    }, [
        userId,
    ]);

    return state;
}
