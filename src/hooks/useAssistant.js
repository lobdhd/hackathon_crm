import {
    useMutation,
    useQuery,
} from "@tanstack/react-query";

import {
    getAssistantHistory,
    sendAssistantMessage,
} from "../api/assistant.api.js";


// MARK: Keys

export const assistantKeys = {
    all: [
        "assistant",
    ],

    history: [
        "assistant",
        "history",
    ],
};


// MARK: History

export function useAssistantHistory(
    options = {},
) {
    return useQuery({
        queryKey:
            assistantKeys.history,

        queryFn:
            getAssistantHistory,

        staleTime:
            30 * 1000,

        ...options,
    });
}


// MARK: Chat

export function useAssistantChat() {
    return useMutation({
        mutationFn:
            sendAssistantMessage,
    });
}