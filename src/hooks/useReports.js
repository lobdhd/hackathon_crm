import {
    useQuery,
} from "@tanstack/react-query";

import {
    getBrigadeRatings,
    getDowntimeReport,
    getMaterialsReport,
    getMyRating,
    getRatings,
    getShiftReport,
    getWorkOrderReport,
} from "../api/reports.api.js";


// MARK: Keys

export const reportKeys = {
    all: [
        "reports",
    ],

    shift: (params) => [
        "reports",
        "shift",
        params,
    ],

    ratings: (params) => [
        "reports",
        "ratings",
        params,
    ],

    myRating: (params) => [
        "reports",
        "my-rating",
        params,
    ],

    brigadeRatings: (params) => [
        "reports",
        "brigade-ratings",
        params,
    ],

    materials: (params) => [
        "reports",
        "materials",
        params,
    ],

    downtime: (params) => [
        "reports",
        "downtime",
        params,
    ],

    workOrder: (id) => [
        "reports",
        "work-order",
        Number(id),
    ],
};


// MARK: Shift

export function useShiftReport(
    params = {},
    options = {},
) {
    return useQuery({
        queryKey:
            reportKeys.shift(
                params,
            ),

        queryFn: () =>
            getShiftReport(
                params,
            ),

        staleTime:
            60 * 1000,

        ...options,
    });
}


// MARK: Ratings

export function useRatings(
    params = {},
    options = {},
) {
    return useQuery({
        queryKey:
            reportKeys.ratings(
                params,
            ),

        queryFn: () =>
            getRatings(
                params,
            ),

        staleTime:
            2 * 60 * 1000,

        ...options,
    });
}

export function useMyRating(
    params = {},
    options = {},
) {
    return useQuery({
        queryKey:
            reportKeys.myRating(
                params,
            ),

        queryFn: () =>
            getMyRating(
                params,
            ),

        staleTime:
            2 * 60 * 1000,

        ...options,
    });
}

export function useBrigadeRatings(
    params = {},
    options = {},
) {
    return useQuery({
        queryKey:
            reportKeys.brigadeRatings(
                params,
            ),

        queryFn: () =>
            getBrigadeRatings(
                params,
            ),

        staleTime:
            2 * 60 * 1000,

        ...options,
    });
}


// MARK: Materials

export function useMaterialsReport(
    params = {},
    options = {},
) {
    return useQuery({
        queryKey:
            reportKeys.materials(
                params,
            ),

        queryFn: () =>
            getMaterialsReport(
                params,
            ),

        staleTime:
            2 * 60 * 1000,

        ...options,
    });
}


// MARK: Downtime

export function useDowntimeReport(
    params = {},
    options = {},
) {
    return useQuery({
        queryKey:
            reportKeys.downtime(
                params,
            ),

        queryFn: () =>
            getDowntimeReport(
                params,
            ),

        staleTime:
            60 * 1000,

        ...options,
    });
}


// MARK: Work order

export function useWorkOrderReport(
    id,
    options = {},
) {
    const numericId =
        Number(id);

    return useQuery({
        queryKey:
            reportKeys.workOrder(
                numericId,
            ),

        queryFn: () =>
            getWorkOrderReport(
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