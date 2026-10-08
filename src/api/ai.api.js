import { api } from "./client.js";

export async function transcribeAudio(
    audio,
    filename = "voice.webm",
) {
    const formData = new FormData();

    formData.append(
        "audio",
        audio,
        filename,
    );

    const response = await api.post(
        "/api/ai/transcribe",
        formData,
        {
            timeout: 60000,
        },
    );

    return response.data;
}
