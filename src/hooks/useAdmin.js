import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import {
    createAdminUser,
    createArea,
    createBrigade,
    createEquipment,
    createFaultCode,
    createMaterial,
    createNormative,
    deleteArea,
    deleteBrigade,
    deleteEquipment,
    deleteFaultCode,
    deleteMaterial,
    deleteNormative,
    getAdminUsers,
    updateAdminUser,
    updateAdminUserShift,
    updateArea,
    updateEquipment,
} from "../api/admin.api.js";

import {
    referenceKeys,
} from "./useReferences.js";

export const adminKeys = {
    users: ["admin", "users"],
};

export function useAdminUsers() {
    return useQuery({
        queryKey: adminKeys.users,
        queryFn: getAdminUsers,
    });
}

export function useCreateAdminUser() {
    const queryClient =
        useQueryClient();

    return useMutation({
        mutationFn: createAdminUser,
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: adminKeys.users,
                }),
                queryClient.invalidateQueries({
                    queryKey:
                        referenceKeys.executors,
                }),
            ]);
        },
    });
}

export function useUpdateAdminUser() {
    const queryClient =
        useQueryClient();

    return useMutation({
        mutationFn: ({
            id,
            payload,
        }) =>
            updateAdminUser(
                id,
                payload,
            ),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: adminKeys.users,
                }),
                queryClient.invalidateQueries({
                    queryKey:
                        referenceKeys.executors,
                }),
            ]);
        },
    });
}

export function useUpdateAdminUserShift() {
    const queryClient =
        useQueryClient();

    return useMutation({
        mutationFn: ({
            id,
            payload,
        }) =>
            updateAdminUserShift(
                id,
                payload,
            ),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: adminKeys.users,
                }),
                queryClient.invalidateQueries({
                    queryKey:
                        referenceKeys.executors,
                }),
            ]);
        },
    });
}

export function useCreateArea() {
    const queryClient =
        useQueryClient();

    return useMutation({
        mutationFn: createArea,
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey:
                    referenceKeys.areas,
            }),
    });
}

export function useUpdateArea() {
    const queryClient =
        useQueryClient();

    return useMutation({
        mutationFn: ({
            id,
            payload,
        }) =>
            updateArea(
                id,
                payload,
            ),
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey:
                    referenceKeys.areas,
            }),
    });
}

export function useDeleteArea() {
    const queryClient =
        useQueryClient();

    return useMutation({
        mutationFn: deleteArea,
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey:
                    referenceKeys.areas,
            }),
    });
}

export function useCreateEquipment() {
    const queryClient =
        useQueryClient();

    return useMutation({
        mutationFn: createEquipment,
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: [
                    "references",
                    "equipment",
                ],
            }),
    });
}

export function useUpdateEquipment() {
    const queryClient =
        useQueryClient();

    return useMutation({
        mutationFn: ({
            id,
            payload,
        }) =>
            updateEquipment(
                id,
                payload,
            ),
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: [
                    "references",
                    "equipment",
                ],
            }),
    });
}

export function useDeleteEquipment() {
    const queryClient =
        useQueryClient();

    return useMutation({
        mutationFn: deleteEquipment,
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: [
                    "references",
                    "equipment",
                ],
            }),
    });
}

export function useCreateFaultCode() {
    const queryClient =
        useQueryClient();

    return useMutation({
        mutationFn: createFaultCode,
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey:
                    referenceKeys.faultCodes,
            }),
    });
}

export function useDeleteFaultCode() {
    const queryClient =
        useQueryClient();

    return useMutation({
        mutationFn: deleteFaultCode,
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey:
                    referenceKeys.faultCodes,
            }),
    });
}

export function useCreateMaterial() {
    const queryClient =
        useQueryClient();

    return useMutation({
        mutationFn: createMaterial,
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey:
                    referenceKeys.materials,
            }),
    });
}

export function useDeleteMaterial() {
    const queryClient =
        useQueryClient();

    return useMutation({
        mutationFn: deleteMaterial,
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey:
                    referenceKeys.materials,
            }),
    });
}

export function useCreateBrigade() {
    const queryClient =
        useQueryClient();

    return useMutation({
        mutationFn: createBrigade,
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey:
                    referenceKeys.brigades,
            }),
    });
}

export function useDeleteBrigade() {
    const queryClient =
        useQueryClient();

    return useMutation({
        mutationFn: deleteBrigade,
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey:
                    referenceKeys.brigades,
            }),
    });
}

export function useCreateNormative() {
    const queryClient =
        useQueryClient();

    return useMutation({
        mutationFn: createNormative,
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: [
                    "references",
                    "normatives",
                ],
            }),
    });
}

export function useDeleteNormative() {
    const queryClient =
        useQueryClient();

    return useMutation({
        mutationFn: deleteNormative,
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: [
                    "references",
                    "normatives",
                ],
            }),
    });
}