import {
    keepPreviousData,
    useMutation,
    useQuery,
} from "@tanstack/react-query";

import {
    getExecutorRecommendations,
    getWorkRecommendation,
} from "../api/recommendations.api.js";

// Recommendations are explicit user actions in the UI.
// Mutations are used intentionally so typing does not create a request per keystroke.

export function useRecommendExecutors() {
    return useMutation({
        mutationFn:
            getExecutorRecommendations,
    });
}

export function useRecommendWork() {
    return useMutation({
        mutationFn:
            getWorkRecommendation,
    });
}

// Auto-suggestions for the quick order form: callers pass already debounced inputs.

export function useExecutorSuggestions(params) {
    return useQuery({
        queryKey: ["recommendations", "executors", params],
        queryFn: () => getExecutorRecommendations(params),
        enabled: Boolean(params.equipmentId),
        placeholderData: keepPreviousData,
        staleTime: 15 * 1000,
    });
}

// fast: RAG vote without the LLM (under a second); the full answer comes from the LLM and takes longer.
export function useWorkSuggestion({ equipmentId, description, fast = false }) {
    return useQuery({
        queryKey: ["recommendations", "work", { equipmentId, description, fast }],
        queryFn: () => getWorkRecommendation({ equipmentId, description, fast }),
        enabled: Boolean(equipmentId) && description.trim().length >= 3,
        staleTime: 5 * 60 * 1000,
        retry: 0,
    });
}
