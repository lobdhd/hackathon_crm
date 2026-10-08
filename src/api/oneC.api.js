import {
    api,
} from "./client.js";


// MARK: Helpers

function normalizeStatus(
    status,
) {
    if (
        Array.isArray(
            status,
        )
    ) {
        return status
            .filter(Boolean)
            .join(",");
    }

    return (
        status ||
        undefined
    );
}

function normalizeLimit(
    value,
    fallback = 100,
) {
    const number =
        Number(value);

    if (
        !Number.isFinite(
            number,
        )
    ) {
        return fallback;
    }

    return Math.min(
        500,
        Math.max(
            1,
            Math.trunc(
                number,
            ),
        ),
    );
}


// MARK: Jobs

export async function getOneCJobs(
    params = {},
) {
    const response =
        await api.get(
            "/api/integrations/1c/jobs",
            {
                params: {
                    status:
                        normalizeStatus(
                            params.status,
                        ),

                    limit:
                        normalizeLimit(
                            params.limit,
                            100,
                        ),
                },
            },
        );

    return Array.isArray(
        response.data,
    )
        ? response.data
        : [];
}


// MARK: Retry job

export async function retryOneCJob(
    id,
) {
    const response =
        await api.post(
            `/api/integrations/1c/jobs/${id}/retry`,
        );

    return response.data;
}


// MARK: Run queue

export async function runOneCQueue() {
    const response =
        await api.post(
            "/api/integrations/1c/run",
            undefined,
            {
                timeout:
                    120000,
            },
        );

    return response.data;
}


// MARK: Mappings

export async function getOneCMappings(
    params = {},
) {
    const entity =
        String(
            params.entity ??
            "",
        ).trim();

    const response =
        await api.get(
            "/api/integrations/1c/mappings",
            {
                params: {
                    entity:
                        entity ||
                        undefined,
                },
            },
        );

    return Array.isArray(
        response.data,
    )
        ? response.data
        : [];
}


// MARK: Push orders

export async function pushOneCOrders(
    input = {},
) {
    const body = {};

    if (
        Array.isArray(
            input.ids,
        ) &&
        input.ids.length
    ) {
        body.ids =
            [
                ...new Set(
                    input.ids
                        .map(
                            Number,
                        )
                        .filter(
                            (
                                id,
                            ) =>
                                Number.isInteger(
                                    id,
                                ) &&
                                id > 0,
                        ),
                ),
            ].slice(
                0,
                500,
            );
    }

    if (
        input.since
    ) {
        body.since =
            input.since;
    }

    const response =
        await api.post(
            "/api/integrations/1c/push/orders",
            body,
            {
                timeout:
                    120000,
            },
        );

    return response.data;
}


// MARK: Reconciliation orders

export async function getIntegrationOrders(
    params = {},
) {
    const since =
        String(
            params.since ??
            "",
        ).trim();

    const response =
        await api.get(
            "/api/integrations/orders",
            {
                params: {
                    since:
                        since ||
                        undefined,
                },

                timeout:
                    60000,
            },
        );

    return Array.isArray(
        response.data,
    )
        ? response.data
        : [];
}