import {
    useMutation,
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
