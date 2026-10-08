import {
    api,
} from "./client.js";


// MARK: History

export async function getAssistantHistory() {
    const response =
        await api.get(
            "/api/assistant/history",
        );

    return Array.isArray(
        response.data,
    )
        ? response.data
        : [];
}


// MARK: Chat

export async function sendAssistantMessage(
    message,
) {
    const text =
        String(
            message ?? "",
        ).trim();

    if (
        text.length < 2 ||
        text.length > 1000
    ) {
        throw new Error(
            "Сообщение должно содержать от 2 до 1000 символов",
        );
    }

    const response =
        await api.post(
            "/api/assistant/chat",
            {
                message:
                    text,
            },
            {
                timeout:
                    30000,
            },
        );

    return response.data;
}