import { useCallback, useState } from "react";

import { performWorkOrderAction } from "../api/workOrders.api.js";


function errorText(error) {
    return (
        error?.response?.data?.error ||
        error?.message ||
        "Не удалось выполнить действие"
    );
}

/**
 * run(orderId, { action, comment? }) -> ответ сервера или null при ошибке.
 * onDone вызывается после успеха и после 409 (статус уже изменился): обновите доску.
 */
export function useWorkOrderAction({ onDone } = {}) {
    const [pendingId, setPendingId] = useState(null);
    const [error, setError] = useState("");

    const run = useCallback(
        async (orderId, body) => {
            setPendingId(orderId);
            setError("");

            try {
                const result = await performWorkOrderAction(orderId, {
                    ...body,
                    clientActionId: crypto.randomUUID(),
                });

                await onDone?.(result);

                return result;
            } catch (requestError) {
                setError(errorText(requestError));

                if (requestError?.response?.status === 409) {
                    await onDone?.();
                }

                return null;
            } finally {
                setPendingId(null);
            }
        },
        [onDone],
    );

    const clearError = useCallback(() => setError(""), []);

    return { run, pendingId, error, clearError };
}
