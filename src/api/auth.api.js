import {
    api,
} from "./client.js";


// MARK: Login

export async function loginRequest({
    phone,
    password,
}) {
    const response =
        await api.post(
            "/api/auth/login",
            {
                phone,
                password,
            },
        );

    return response.data;
}


// MARK: Current user

export async function getMeRequest() {
    const response =
        await api.get(
            "/api/auth/me",
        );

    return response.data;
}


// MARK: Change password

export async function changePasswordRequest({
    currentPassword,
    newPassword,
}) {
    await api.post(
        "/api/auth/change-password",
        {
            currentPassword,
            newPassword,
        },
    );
}