import {
    api,
} from "./client.js";


// MARK: Params

function buildReportParams(
    params = {},
) {
    return {
        period:
            params.period ||
            undefined,

        from:
            params.from ||
            undefined,

        to:
            params.to ||
            undefined,

        areaId:
            params.areaId ||
            undefined,

        equipmentId:
            params.equipmentId ||
            undefined,

        executorId:
            params.executorId ||
            undefined,

        brigadeId:
            params.brigadeId ||
            undefined,
    };
}


// MARK: Shift

export async function getShiftReport(
    params = {},
) {
    const response =
        await api.get(
            "/api/reports/shift",
            {
                params:
                    buildReportParams(
                        params,
                    ),
            },
        );

    return response.data;
}


// MARK: Ratings

export async function getRatings(
    params = {},
) {
    const response =
        await api.get(
            "/api/reports/ratings",
            {
                params:
                    buildReportParams(
                        params,
                    ),
            },
        );

    return Array.isArray(
        response.data,
    )
        ? response.data
        : [];
}

export async function getMyRating(
    params = {},
) {
    const response =
        await api.get(
            "/api/reports/my-rating",
            {
                params:
                    buildReportParams(
                        params,
                    ),
            },
        );

    return response.data;
}

export async function getBrigadeRatings(
    params = {},
) {
    const response =
        await api.get(
            "/api/reports/brigade-ratings",
            {
                params:
                    buildReportParams(
                        params,
                    ),
            },
        );

    return Array.isArray(
        response.data,
    )
        ? response.data
        : [];
}


// MARK: Materials

export async function getMaterialsReport(
    params = {},
) {
    const response =
        await api.get(
            "/api/reports/materials",
            {
                params: {
                    ...buildReportParams(
                        params,
                    ),

                    groupBy:
                        params.groupBy ||
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


// MARK: Downtime

export async function getDowntimeReport(
    params = {},
) {
    const response =
        await api.get(
            "/api/reports/downtime",
            {
                params:
                    buildReportParams(
                        params,
                    ),
            },
        );

    return response.data;
}


// MARK: Work order report

export async function getWorkOrderReport(
    id,
) {
    const response =
        await api.get(
            `/api/reports/work-order/${id}`,
        );

    return response.data;
}


// MARK: PDF

export async function downloadWorkOrderReportPdf(
    id,
) {
    const response =
        await api.get(
            `/api/reports/work-order/${id}.pdf`,
            {
                responseType:
                    "blob",
            },
        );

    return response.data;
}


// MARK: Export

export async function exportReport(
    format,
    params = {},
) {
    const extension =
        format === "pdf"
            ? "pdf"
            : "xlsx";

    const response =
        await api.get(
            `/api/reports/export.${extension}`,
            {
                params: {
                    ...buildReportParams(
                        params,
                    ),

                    report:
                        params.report ||
                        "orders",

                    groupBy:
                        params.groupBy ||
                        undefined,
                },

                responseType:
                    "blob",

                timeout:
                    60000,
            },
        );

    return response.data;
}