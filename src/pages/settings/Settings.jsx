import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    RiCheckLine,
    RiCloseLine,
    RiEdit2Line,
    RiEyeLine,
    RiEyeOffLine,
    RiGlobalLine,
    RiLockPasswordLine,
    RiSave3Line,
    RiShieldUserLine,
} from "react-icons/ri";

import {
    changePassword,
    updateAdminSelfProfile,
} from "../../api/account.api.js";

import {
    useAuth,
} from "../../auth/AuthProvider.jsx";

import {
    useI18n,
} from "../../i18n/index.js";


// MARK: Config

const ROLE_LABELS = {
    EXECUTOR:
        "Исполнитель",

    MASTER:
        "Мастер",

    MANAGER:
        "Руководитель",

    ADMIN:
        "Администратор",
};


// MARK: Helpers

function getInitials(
    fullName,
) {
    const value =
        String(
            fullName || "",
        ).trim();

    if (!value) {
        return "AI";
    }

    return value
        .split(/\s+/)
        .slice(
            0,
            2,
        )
        .map(
            (part) =>
                part[0],
        )
        .join("")
        .toUpperCase();
}

function getApiError(
    error,
) {
    return {
        status:
            error?.response?.status ??
            error?.status ??
            null,

        message:
            error?.response?.data
                ?.error ||
            error?.message ||
            "Произошла ошибка",

        details:
            error?.response?.data
                ?.details ||
            error?.details ||
            "",
    };
}

function getBrigadeName(
    user,
) {
    return (
        user?.brigade?.name ||
        user?.brigadeName ||
        "—"
    );
}


// MARK: Page

export default function Settings() {
    const {
        user,
        refreshMe,
    } = useAuth();

    const {
        language,
        setLanguage,
    } = useI18n();

    const isAdmin =
        user?.role ===
        "ADMIN";


    // MARK: Profile state

    const [
        editingProfile,
        setEditingProfile,
    ] = useState(false);

    const [
        profileForm,
        setProfileForm,
    ] = useState({
        fullName:
            "",

        phone:
            "",
    });

    const [
        profileSaving,
        setProfileSaving,
    ] = useState(false);

    const [
        profileError,
        setProfileError,
    ] = useState("");

    const [
        profileSuccess,
        setProfileSuccess,
    ] = useState("");


    // MARK: Language state

    const [
        languageSaving,
        setLanguageSaving,
    ] = useState(false);

    const [
        languageError,
        setLanguageError,
    ] = useState("");


    // MARK: Password state

    const [
        currentPassword,
        setCurrentPassword,
    ] = useState("");

    const [
        newPassword,
        setNewPassword,
    ] = useState("");

    const [
        confirmPassword,
        setConfirmPassword,
    ] = useState("");

    const [
        showCurrentPassword,
        setShowCurrentPassword,
    ] = useState(false);

    const [
        showNewPassword,
        setShowNewPassword,
    ] = useState(false);

    const [
        showConfirmPassword,
        setShowConfirmPassword,
    ] = useState(false);

    const [
        passwordSaving,
        setPasswordSaving,
    ] = useState(false);

    const [
        passwordSuccess,
        setPasswordSuccess,
    ] = useState("");

    const [
        passwordError,
        setPasswordError,
    ] = useState("");

    const [
        passwordFieldErrors,
        setPasswordFieldErrors,
    ] = useState({
        currentPassword:
            "",

        newPassword:
            "",

        confirmPassword:
            "",
    });


    // MARK: Sync profile

    useEffect(() => {
        setProfileForm({
            fullName:
                user?.fullName ||
                "",

            phone:
                user?.phone ||
                "",
        });
    }, [
        user?.fullName,
        user?.phone,
    ]);


    // MARK: Derived

    const roleLabel =
        ROLE_LABELS[
            user?.role
        ] ||
        user?.role ||
        "Пользователь";

    const accountRows =
        useMemo(
            () => [
                {
                    label:
                        "Роль",

                    value:
                        roleLabel,
                },

                {
                    label:
                        "Логин 1С",

                    value:
                        user?.login ||
                        "—",
                },

                {
                    label:
                        "Специальность",

                    value:
                        user?.specialty ||
                        "—",
                },

                {
                    label:
                        "Разряд",

                    value:
                        user?.grade ??
                        "—",
                },

                {
                    label:
                        "Бригада",

                    value:
                        getBrigadeName(
                            user,
                        ),
                },
            ],
            [
                user,
                roleLabel,
            ],
        );


    // MARK: Auth refresh

    async function refreshProfile() {
        if (
            typeof refreshMe ===
            "function"
        ) {
            await refreshMe();
            return;
        }

        /*
         * Fallback на случай,
         * если текущий AuthProvider
         * ещё не экспортирует refreshMe.
         */
        window.location.reload();
    }


    // MARK: Profile editing

    function startProfileEdit() {
        if (!isAdmin) {
            return;
        }

        setProfileError(
            "",
        );

        setProfileSuccess(
            "",
        );

        setProfileForm({
            fullName:
                user?.fullName ||
                "",

            phone:
                user?.phone ||
                "",
        });

        setEditingProfile(
            true,
        );
    }

    function cancelProfileEdit() {
        setEditingProfile(
            false,
        );

        setProfileError(
            "",
        );

        setProfileForm({
            fullName:
                user?.fullName ||
                "",

            phone:
                user?.phone ||
                "",
        });
    }

    function changeProfileField(
        field,
        value,
    ) {
        setProfileForm(
            (
                previous,
            ) => ({
                ...previous,
                [field]:
                    value,
            }),
        );

        setProfileError(
            "",
        );

        setProfileSuccess(
            "",
        );
    }

    async function saveProfile(
        event,
    ) {
        event.preventDefault();

        if (!isAdmin) {
            return;
        }

        const fullName =
            profileForm.fullName
                .trim();

        const phone =
            profileForm.phone
                .trim();

        if (
            fullName.length < 3
        ) {
            setProfileError(
                "ФИО должно содержать минимум 3 символа",
            );

            return;
        }

        if (!phone) {
            setProfileError(
                "Укажите телефон",
            );

            return;
        }

        setProfileSaving(
            true,
        );

        setProfileError(
            "",
        );

        setProfileSuccess(
            "",
        );

        try {
            await updateAdminSelfProfile(
                user.id,
                {
                    fullName,
                    phone,
                },
            );

            setEditingProfile(
                false,
            );

            setProfileSuccess(
                "Данные профиля обновлены",
            );

            await refreshProfile();
        } catch (
            error
        ) {
            const apiError =
                getApiError(
                    error,
                );

            if (
                apiError.status ===
                409
            ) {
                setProfileError(
                    apiError.message ||
                    "Пользователь с таким телефоном уже существует",
                );
            } else {
                setProfileError(
                    apiError.details ||
                    apiError.message,
                );
            }
        } finally {
            setProfileSaving(
                false,
            );
        }
    }


    // MARK: Language

    async function handleLanguage(
        nextLanguage,
    ) {
        if (
            nextLanguage !== "ru" &&
            nextLanguage !== "kk"
        ) {
            return;
        }

        if (
            nextLanguage ===
            language &&
            (
                !isAdmin ||
                user?.language ===
                    nextLanguage
            )
        ) {
            return;
        }

        setLanguageError(
            "",
        );

        /*
         * Для всех ролей UI переключаем
         * через существующий i18n.
         */
        setLanguage(
            nextLanguage,
        );

        /*
         * Backend разрешает PATCH
         * пользователя только ADMIN.
         *
         * Поэтому ADMIN дополнительно
         * сохраняет language в backend.
         * Остальные роли не вызывают
         * /api/admin/* вообще.
         */
        if (!isAdmin) {
            return;
        }

        setLanguageSaving(
            true,
        );

        try {
            await updateAdminSelfProfile(
                user.id,
                {
                    language:
                        nextLanguage,
                },
            );

            await refreshProfile();
        } catch (
            error
        ) {
            const apiError =
                getApiError(
                    error,
                );

            setLanguageError(
                apiError.details ||
                apiError.message,
            );
        } finally {
            setLanguageSaving(
                false,
            );
        }
    }


    // MARK: Password

    function clearPasswordMessages() {
        setPasswordSuccess(
            "",
        );

        setPasswordError(
            "",
        );

        setPasswordFieldErrors({
            currentPassword:
                "",

            newPassword:
                "",

            confirmPassword:
                "",
        });
    }

    async function handlePasswordSubmit(
        event,
    ) {
        event.preventDefault();

        clearPasswordMessages();

        const errors = {
            currentPassword:
                "",

            newPassword:
                "",

            confirmPassword:
                "",
        };

        if (!currentPassword) {
            errors.currentPassword =
                "Введите текущий пароль";
        }

        if (!newPassword) {
            errors.newPassword =
                "Введите новый пароль";
        } else if (
            newPassword.length < 6
        ) {
            errors.newPassword =
                "Пароль должен быть не короче 6 символов";
        } else if (
            newPassword.length > 128
        ) {
            errors.newPassword =
                "Пароль должен быть не длиннее 128 символов";
        }

        if (!confirmPassword) {
            errors.confirmPassword =
                "Повторите новый пароль";
        } else if (
            newPassword !==
            confirmPassword
        ) {
            errors.confirmPassword =
                "Пароли не совпадают";
        }

        if (
            Object.values(
                errors,
            ).some(Boolean)
        ) {
            setPasswordFieldErrors(
                errors,
            );

            return;
        }

        setPasswordSaving(
            true,
        );

        try {
            await changePassword({
                currentPassword,
                newPassword,
            });

            setCurrentPassword(
                "",
            );

            setNewPassword(
                "",
            );

            setConfirmPassword(
                "",
            );

            setPasswordSuccess(
                "Пароль изменён",
            );
        } catch (
            error
        ) {
            const apiError =
                getApiError(
                    error,
                );

            const combined =
                `${apiError.message} ${apiError.details}`;

            if (
                apiError.status ===
                    400 &&
                /текущ.*парол|current.*password/i.test(
                    combined,
                )
            ) {
                setPasswordFieldErrors(
                    (
                        previous,
                    ) => ({
                        ...previous,

                        currentPassword:
                            apiError.message ||
                            "Текущий пароль указан неверно",
                    }),
                );

                return;
            }

            if (
                apiError.status ===
                    400 &&
                /парол|password/i.test(
                    combined,
                )
            ) {
                setPasswordFieldErrors(
                    (
                        previous,
                    ) => ({
                        ...previous,

                        newPassword:
                            apiError.details ||
                            apiError.message,
                    }),
                );

                return;
            }

            setPasswordError(
                apiError.details ||
                apiError.message,
            );
        } finally {
            setPasswordSaving(
                false,
            );
        }
    }


    // MARK: Render

    return (
        <div className="mx-auto max-w-[1180px]">
            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                    Настройки
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                    Профиль,
                    язык интерфейса
                    и безопасность
                    аккаунта
                </p>
            </div>

            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">

                {/* MARK: Profile */}

                <aside className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-100 p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-4">
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-lg font-bold text-blue-700">
                                    {getInitials(
                                        user?.fullName,
                                    )}
                                </div>

                                <div className="min-w-0">
                                    <p className="truncate text-base font-bold text-gray-900">
                                        {user?.fullName ||
                                            "Пользователь"}
                                    </p>

                                    <p className="mt-1 text-sm text-gray-500">
                                        {
                                            roleLabel
                                        }
                                    </p>
                                </div>
                            </div>

                            {isAdmin &&
                                !editingProfile && (
                                <button
                                    type="button"
                                    onClick={
                                        startProfileEdit
                                    }
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-blue-600"
                                    title="Редактировать профиль"
                                >
                                    <RiEdit2Line />
                                </button>
                            )}
                        </div>
                    </div>


                    {/* ADMIN edit */}

                    {isAdmin &&
                    editingProfile ? (
                        <form
                            onSubmit={
                                saveProfile
                            }
                            className="space-y-4 p-5"
                        >
                            {profileError && (
                                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">
                                    {
                                        profileError
                                    }
                                </div>
                            )}

                            <ProfileField
                                label="ФИО"
                                value={
                                    profileForm.fullName
                                }
                                onChange={(
                                    value,
                                ) =>
                                    changeProfileField(
                                        "fullName",
                                        value,
                                    )
                                }
                            />

                            <ProfileField
                                label="Телефон"
                                value={
                                    profileForm.phone
                                }
                                onChange={(
                                    value,
                                ) =>
                                    changeProfileField(
                                        "phone",
                                        value,
                                    )
                                }
                            />

                            <ReadonlyRow
                                label="Роль"
                                value={
                                    roleLabel
                                }
                            />

                            <ReadonlyRow
                                label="Логин 1С"
                                value={
                                    user?.login ||
                                    "—"
                                }
                            />

                            <p className="text-[11px] leading-5 text-gray-400">
                                Роль и логин 1С
                                здесь намеренно
                                не изменяются.
                                Роли пользователей
                                управляйте в разделе
                                «Администрирование».
                            </p>

                            <div className="flex gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={
                                        cancelProfileEdit
                                    }
                                    disabled={
                                        profileSaving
                                    }
                                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                                >
                                    <RiCloseLine />

                                    Отмена
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        profileSaving
                                    }
                                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                                >
                                    <RiSave3Line />

                                    {profileSaving
                                        ? "Сохраняем..."
                                        : "Сохранить"}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <>
                            {profileSuccess && (
                                <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-xs font-semibold text-green-700">
                                    <RiCheckLine />

                                    {
                                        profileSuccess
                                    }
                                </div>
                            )}

                            <div className="divide-y divide-gray-100">
                                <ReadonlyRow
                                    label="ФИО"
                                    value={
                                        user?.fullName ||
                                        "—"
                                    }
                                />

                                <ReadonlyRow
                                    label="Телефон"
                                    value={
                                        user?.phone ||
                                        "—"
                                    }
                                />

                                {accountRows.map(
                                    (
                                        item,
                                    ) => (
                                        <ReadonlyRow
                                            key={
                                                item.label
                                            }
                                            label={
                                                item.label
                                            }
                                            value={
                                                item.value
                                            }
                                        />
                                    ),
                                )}
                            </div>

                            <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                                <div className="flex items-start gap-2">
                                    <RiShieldUserLine className="mt-0.5 shrink-0 text-gray-400" />

                                    <p className="text-xs leading-5 text-gray-500">
                                        {isAdmin
                                            ? "Вы можете изменить свои ФИО и телефон. Роль и логин 1С оставлены только для чтения."
                                            : "Изменение ФИО, телефона, роли и рабочих данных выполняет администратор."}
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </aside>


                {/* MARK: Right */}

                <main className="space-y-6">

                    {/* Language */}

                    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <RiGlobalLine
                                    size={
                                        18
                                    }
                                />
                            </div>

                            <div>
                                <h2 className="text-[15px] font-bold text-gray-900">
                                    Язык интерфейса
                                </h2>

                                <p className="mt-0.5 text-xs text-gray-500">
                                    Выберите язык
                                    web-панели
                                </p>
                            </div>
                        </div>

                        <div className="p-5">
                            {languageError && (
                                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">
                                    {
                                        languageError
                                    }
                                </div>
                            )}

                            <div className="grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
                                <LanguageCard
                                    active={
                                        language ===
                                        "ru"
                                    }
                                    title="Русский"
                                    code="RU"
                                    disabled={
                                        languageSaving
                                    }
                                    onClick={() =>
                                        handleLanguage(
                                            "ru",
                                        )
                                    }
                                />

                                <LanguageCard
                                    active={
                                        language ===
                                        "kk"
                                    }
                                    title="Қазақша"
                                    code="ҚАЗ"
                                    disabled={
                                        languageSaving
                                    }
                                    onClick={() =>
                                        handleLanguage(
                                            "kk",
                                        )
                                    }
                                />
                            </div>

                            <p className="mt-4 text-xs leading-5 text-gray-400">
                                {isAdmin
                                    ? "Для администратора выбранный язык сохраняется и в профиле backend."
                                    : "Для вашей роли backend не предоставляет self-update профиля, поэтому язык сохраняется локально в браузере."}
                            </p>
                        </div>
                    </section>


                    {/* Password */}

                    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                                <RiLockPasswordLine
                                    size={
                                        18
                                    }
                                />
                            </div>

                            <div>
                                <h2 className="text-[15px] font-bold text-gray-900">
                                    Смена пароля
                                </h2>

                                <p className="mt-0.5 text-xs text-gray-500">
                                    Доступно всем
                                    авторизованным ролям
                                </p>
                            </div>
                        </div>

                        <form
                            onSubmit={
                                handlePasswordSubmit
                            }
                            className="p-5"
                        >
                            {passwordSuccess && (
                                <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                                    <RiCheckLine />

                                    {
                                        passwordSuccess
                                    }
                                </div>
                            )}

                            {passwordError && (
                                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    {
                                        passwordError
                                    }
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-4">
                                <PasswordField
                                    label="Текущий пароль"
                                    value={
                                        currentPassword
                                    }
                                    onChange={
                                        setCurrentPassword
                                    }
                                    visible={
                                        showCurrentPassword
                                    }
                                    onToggle={() =>
                                        setShowCurrentPassword(
                                            (
                                                previous,
                                            ) =>
                                                !previous,
                                        )
                                    }
                                    error={
                                        passwordFieldErrors.currentPassword
                                    }
                                    autoComplete="current-password"
                                />

                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                    <PasswordField
                                        label="Новый пароль"
                                        value={
                                            newPassword
                                        }
                                        onChange={
                                            setNewPassword
                                        }
                                        visible={
                                            showNewPassword
                                        }
                                        onToggle={() =>
                                            setShowNewPassword(
                                                (
                                                    previous,
                                                ) =>
                                                    !previous,
                                            )
                                        }
                                        error={
                                            passwordFieldErrors.newPassword
                                        }
                                        autoComplete="new-password"
                                    />

                                    <PasswordField
                                        label="Повторите новый пароль"
                                        value={
                                            confirmPassword
                                        }
                                        onChange={
                                            setConfirmPassword
                                        }
                                        visible={
                                            showConfirmPassword
                                        }
                                        onToggle={() =>
                                            setShowConfirmPassword(
                                                (
                                                    previous,
                                                ) =>
                                                    !previous,
                                            )
                                        }
                                        error={
                                            passwordFieldErrors.confirmPassword
                                        }
                                        autoComplete="new-password"
                                    />
                                </div>
                            </div>

                            <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3">
                                <p className="text-xs leading-5 text-gray-500">
                                    Пароль должен
                                    содержать от
                                    6 до 128
                                    символов. После
                                    успешной смены
                                    повторный вход
                                    не требуется.
                                </p>
                            </div>

                            <div className="mt-5 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={
                                        passwordSaving
                                    }
                                    className="inline-flex min-w-[170px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {passwordSaving
                                        ? "Сохраняем..."
                                        : "Изменить пароль"}
                                </button>
                            </div>
                        </form>
                    </section>
                </main>
            </div>
        </div>
    );
}


// MARK: Readonly row

function ReadonlyRow({
    label,
    value,
}) {
    return (
        <div className="flex items-start justify-between gap-5 px-5 py-3.5">
            <span className="text-xs font-medium text-gray-400">
                {label}
            </span>

            <span className="max-w-[210px] break-words text-right text-sm font-semibold text-gray-700">
                {value}
            </span>
        </div>
    );
}


// MARK: Profile field

function ProfileField({
    label,
    value,
    onChange,
}) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-gray-600">
                {label}
            </span>

            <input
                value={
                    value
                }
                onChange={(
                    event,
                ) =>
                    onChange(
                        event
                            .target
                            .value,
                    )
                }
                className="h-11 w-full rounded-xl border border-gray-300 bg-gray-50 px-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
        </label>
    );
}


// MARK: Language card

function LanguageCard({
    active,
    title,
    code,
    disabled,
    onClick,
}) {
    return (
        <button
            type="button"
            disabled={
                disabled
            }
            onClick={
                onClick
            }
            className={`
                flex
                items-center
                justify-between
                rounded-xl
                border
                p-4
                text-left
                transition
                disabled:cursor-wait
                disabled:opacity-60

                ${
                    active
                        ? "border-blue-300 bg-blue-50 ring-2 ring-blue-100"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                }
            `}
        >
            <div>
                <p className="text-sm font-bold text-gray-900">
                    {title}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                    {code}
                </p>
            </div>

            <div
                className={`
                    flex
                    h-7
                    w-7
                    items-center
                    justify-center
                    rounded-full

                    ${
                        active
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-300"
                    }
                `}
            >
                <RiCheckLine />
            </div>
        </button>
    );
}


// MARK: Password field

function PasswordField({
    label,
    value,
    onChange,
    visible,
    onToggle,
    error,
    autoComplete,
}) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-gray-600">
                {label}
            </span>

            <div className="relative">
                <input
                    type={
                        visible
                            ? "text"
                            : "password"
                    }
                    value={
                        value
                    }
                    onChange={(
                        event,
                    ) =>
                        onChange(
                            event
                                .target
                                .value,
                        )
                    }
                    autoComplete={
                        autoComplete
                    }
                    maxLength={
                        128
                    }
                    className={`
                        h-11
                        w-full
                        rounded-xl
                        border
                        bg-gray-50
                        px-3
                        pr-11
                        text-sm
                        text-gray-900
                        outline-none
                        transition

                        ${
                            error
                                ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                                : "border-gray-300 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                        }
                    `}
                />

                <button
                    type="button"
                    onClick={
                        onToggle
                    }
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                    aria-label={
                        visible
                            ? "Скрыть пароль"
                            : "Показать пароль"
                    }
                >
                    {visible ? (
                        <RiEyeOffLine />
                    ) : (
                        <RiEyeLine />
                    )}
                </button>
            </div>

            {error && (
                <span className="mt-1.5 block text-xs font-medium text-red-600">
                    {error}
                </span>
            )}
        </label>
    );
}
