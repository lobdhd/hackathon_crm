import { useQuery } from "@tanstack/react-query";

import {
    getAreas,
    getBrigades,
    getEquipment,
    getExecutors,
    getFaultCodes,
    getMaterials,
    getNormatives,
} from "../api/references.api.js";

export const referenceKeys = {
    all: ["references"],
    areas: ["references", "areas"],
    equipment: (areaId) => [
        "references",
        "equipment",
        areaId ?? null,
    ],
    executors: ["references", "executors"],
    faultCodes: ["references", "fault-codes"],
    materials: ["references", "materials"],
    brigades: ["references", "brigades"],
    normatives: (equipmentId) => [
        "references",
        "normatives",
        equipmentId ?? null,
    ],
};

export function useAreas() {
    return useQuery({
        queryKey: referenceKeys.areas,
        queryFn: getAreas,
        staleTime: 10 * 60 * 1000,
    });
}

export function useEquipmentReference(areaId = null) {
    return useQuery({
        queryKey: referenceKeys.equipment(areaId),
        queryFn: () =>
            getEquipment({
                areaId,
            }),
        staleTime: 5 * 60 * 1000,
    });
}

export function useExecutors() {
    return useQuery({
        queryKey: referenceKeys.executors,
        queryFn: getExecutors,
        staleTime: 60 * 1000,
    });
}

export function useFaultCodes() {
    return useQuery({
        queryKey: referenceKeys.faultCodes,
        queryFn: getFaultCodes,
        staleTime: 10 * 60 * 1000,
    });
}

export function useMaterials() {
    return useQuery({
        queryKey: referenceKeys.materials,
        queryFn: getMaterials,
        staleTime: 10 * 60 * 1000,
    });
}

export function useBrigades() {
    return useQuery({
        queryKey: referenceKeys.brigades,
        queryFn: getBrigades,
        staleTime: 10 * 60 * 1000,
    });
}

export function useNormatives(equipmentId = null) {
    return useQuery({
        queryKey: referenceKeys.normatives(
            equipmentId,
        ),
        queryFn: () =>
            getNormatives({
                equipmentId,
            }),
        staleTime: 10 * 60 * 1000,
    });
}