import {
    api,
} from "./client.js";


// MARK: Change password

export async function changePassword({
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

    return true;
}


// MARK: Admin self profile

export async function updateAdminSelfProfile(
    userId,
    input = {},
) {
    const numericId =
        Number(
            userId,
        );

    if (
        !Number.isFinite(
            numericId,
        ) ||
        numericId <= 0
    ) {
        throw new Error(
            "Некорректный ID пользователя",
        );
    }

    /*
     * В Settings намеренно разрешаем
     * менять только безопасные поля
     * собственного профиля.
     *
     * role / password / login здесь
     * не отправляем.
     *
     * password меняется через
     * /api/auth/change-password.
     *
     * role и данные других пользователей
     * меняются в /admin.
     */
    const payload = {};

    if (
        Object.prototype.hasOwnProperty.call(
            input,
            "fullName",
        )
    ) {
        payload.fullName =
            String(
                input.fullName ?? "",
            ).trim();
    }

    if (
        Object.prototype.hasOwnProperty.call(
            input,
            "phone",
        )
    ) {
        payload.phone =
            String(
                input.phone ?? "",
            ).trim();
    }

    if (
        input.language === "ru" ||
        input.language === "kk"
    ) {
        payload.language =
            input.language;
    }

    const response =
        await api.patch(
            `/api/admin/users/${numericId}`,
            payload,
        );

    return response.data;
}
