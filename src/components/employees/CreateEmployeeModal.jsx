import {
    useEffect,
    useState,
} from "react";

import {
    RiBriefcaseLine,
    RiCloseLine,
    RiEyeLine,
    RiEyeOffLine,
    RiLoader4Line,
    RiLockPasswordLine,
    RiPhoneLine,
    RiTeamLine,
    RiUserAddLine,
    RiUserLine,
} from "react-icons/ri";

import {
    ApiError,
} from "../../api/client.js";

import {
    t as i18nT,
    useI18n,
} from "../../i18n/index.js";

const GRADES = [
    1,
    2,
    3,
    4,
    5,
    6,
];

const initialForm = {
    fullName: "",
    phone: "",
    password: "",
    repeatPassword: "",
    specialty: "",
    grade: "",
    brigadeId: "",
    language: "ru",
};

export default function CreateEmployeeModal({
    open,
    onClose,
    onCreate,
    brigades = [],
}) {
    useI18n();

    const [
        form,
        setForm,
    ] = useState(initialForm);

    const [
        errors,
        setErrors,
    ] = useState({});

    const [
        apiError,
        setApiError,
    ] = useState("");

    const [
        isSubmitting,
        setIsSubmitting,
    ] = useState(false);

    const [
        showPassword,
        setShowPassword,
    ] = useState(false);

    useEffect(() => {
        if (!open) {
            setForm(initialForm);
            setErrors({});
            setApiError("");
            setIsSubmitting(false);
            setShowPassword(false);
        }
    }, [open]);

    if (!open) {
        return null;
    }

    function updateField(
        field,
        value,
    ) {
        setForm(
            (current) => ({
                ...current,
                [field]: value,
            }),
        );

        setErrors(
            (current) => ({
                ...current,
                [field]: "",
            }),
        );

        setApiError("");
    }

    function validate() {
        const next = {};

        if (
            form.fullName
                .trim()
                .length < 3
        ) {
            next.fullName =
                "Введите ФИО не короче 3 символов";
        }

        if (!form.phone.trim()) {
            next.phone =
                "Введите номер телефона";
        }

        if (
            form.password.length <
            6
        ) {
            next.password =
                "Пароль должен содержать минимум 6 символов";
        }

        if (
            form.password.length >
            128
        ) {
            next.password =
                "Пароль слишком длинный";
        }

        if (
            form.repeatPassword !==
            form.password
        ) {
            next.repeatPassword =
                "Пароли не совпадают";
        }

        if (
            !form.specialty.trim()
        ) {
            next.specialty =
                "Укажите специальность";
        }

        setErrors(next);

        return (
            Object.keys(next)
                .length === 0
        );
    }

    async function handleSubmit(
        event,
    ) {
        event.preventDefault();

        if (!validate()) {
            return;
        }

        setIsSubmitting(true);
        setApiError("");

        try {
            await onCreate({
                phone:
                    form.phone.trim(),

                password:
                    form.password,

                fullName:
                    form.fullName.trim(),

                role: "EXECUTOR",

                specialty:
                    form.specialty.trim(),

                grade:
                    form.grade
                        ? Number(
                              form.grade,
                          )
                        : undefined,

                brigadeId:
                    form.brigadeId
                        ? Number(
                              form.brigadeId,
                          )
                        : undefined,

                language:
                    form.language,
            });

            setForm(initialForm);
            setErrors({});
            onClose();
        } catch (error) {
            if (
                error instanceof
                ApiError
            ) {
                setApiError(
                    error.message,
                );

                applyBackendDetails(
                    error.details,
                    setErrors,
                );
            } else {
                setApiError(
                    "Не удалось создать сотрудника",
                );
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <>
            <div
                className="fixed inset-0 z-[70] bg-gray-900/45 backdrop-blur-[1px]"
                onClick={
                    isSubmitting
                        ? undefined
                        : onClose
                }
            />

            <div className="fixed inset-0 z-[80] overflow-y-auto p-4">
                <div className="flex min-h-full items-center justify-center">
                    <div
                        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
                        onClick={(
                            event,
                        ) =>
                            event.stopPropagation()
                        }
                    >
                        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">
                                    Добавить
                                    исполнителя
                                </h2>

                                <p className="mt-1 text-sm text-gray-500">
                                    Будет создана
                                    новая учётная
                                    запись с ролью
                                    исполнителя
                                </p>
                            </div>

                            <button
                                type="button"
                                disabled={
                                    isSubmitting
                                }
                                onClick={
                                    onClose
                                }
                                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <RiCloseLine
                                    size={
                                        21
                                    }
                                />
                            </button>
                        </div>

                        <form
                            onSubmit={
                                handleSubmit
                            }
                        >
                            <div className="space-y-6 p-6">
                                {apiError && (
                                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                        {
                                            apiError
                                        }
                                    </div>
                                )}

                                <FormSection
                                    icon={
                                        RiUserLine
                                    }
                                    title="Основные данные"
                                >
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="md:col-span-2">
                                            <FieldLabel>
                                                ФИО
                                            </FieldLabel>

                                            <input
                                                value={
                                                    form.fullName
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateField(
                                                        "fullName",
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                placeholder="Ахметов Ерлан Серикович"
                                                className={inputClass(
                                                    errors.fullName,
                                                )}
                                            />

                                            {errors.fullName && (
                                                <ErrorText>
                                                    {
                                                        errors.fullName
                                                    }
                                                </ErrorText>
                                            )}
                                        </div>

                                        <div>
                                            <FieldLabel>
                                                {i18nT(
                                                    "employeeModal.phone",
                                                )}
                                            </FieldLabel>

                                            <div className="relative">
                                                <RiPhoneLine
                                                    size={
                                                        17
                                                    }
                                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                                />

                                                <input
                                                    type="tel"
                                                    inputMode="tel"
                                                    value={
                                                        form.phone
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        updateField(
                                                            "phone",
                                                            event
                                                                .target
                                                                .value,
                                                        )
                                                    }
                                                    placeholder="+7 700 000 00 00"
                                                    className={iconInputClass(
                                                        errors.phone,
                                                    )}
                                                />
                                            </div>

                                            {errors.phone && (
                                                <ErrorText>
                                                    {
                                                        errors.phone
                                                    }
                                                </ErrorText>
                                            )}
                                        </div>

                                        <div>
                                            <FieldLabel>
                                                Язык
                                            </FieldLabel>

                                            <select
                                                value={
                                                    form.language
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateField(
                                                        "language",
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                className={inputClass()}
                                            >
                                                <option value="ru">
                                                    Русский
                                                </option>

                                                <option value="kk">
                                                    Қазақша
                                                </option>
                                            </select>
                                        </div>
                                    </div>
                                </FormSection>

                                <div className="border-t border-gray-100" />

                                <FormSection
                                    icon={
                                        RiLockPasswordLine
                                    }
                                    title="Доступ"
                                >
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div>
                                            <FieldLabel>
                                                Пароль
                                            </FieldLabel>

                                            <div className="relative">
                                                <RiLockPasswordLine
                                                    size={
                                                        17
                                                    }
                                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                                />

                                                <input
                                                    type={
                                                        showPassword
                                                            ? "text"
                                                            : "password"
                                                    }
                                                    value={
                                                        form.password
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        updateField(
                                                            "password",
                                                            event
                                                                .target
                                                                .value,
                                                        )
                                                    }
                                                    autoComplete="new-password"
                                                    className={passwordInputClass(
                                                        errors.password,
                                                    )}
                                                />

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setShowPassword(
                                                            (
                                                                current,
                                                            ) =>
                                                                !current,
                                                        )
                                                    }
                                                    className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                                                >
                                                    {showPassword ? (
                                                        <RiEyeOffLine
                                                            size={
                                                                18
                                                            }
                                                        />
                                                    ) : (
                                                        <RiEyeLine
                                                            size={
                                                                18
                                                            }
                                                        />
                                                    )}
                                                </button>
                                            </div>

                                            {errors.password && (
                                                <ErrorText>
                                                    {
                                                        errors.password
                                                    }
                                                </ErrorText>
                                            )}
                                        </div>

                                        <div>
                                            <FieldLabel>
                                                Повторите
                                                пароль
                                            </FieldLabel>

                                            <div className="relative">
                                                <RiLockPasswordLine
                                                    size={
                                                        17
                                                    }
                                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                                />

                                                <input
                                                    type={
                                                        showPassword
                                                            ? "text"
                                                            : "password"
                                                    }
                                                    value={
                                                        form.repeatPassword
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        updateField(
                                                            "repeatPassword",
                                                            event
                                                                .target
                                                                .value,
                                                        )
                                                    }
                                                    autoComplete="new-password"
                                                    className={iconInputClass(
                                                        errors.repeatPassword,
                                                    )}
                                                />
                                            </div>

                                            {errors.repeatPassword && (
                                                <ErrorText>
                                                    {
                                                        errors.repeatPassword
                                                    }
                                                </ErrorText>
                                            )}
                                        </div>
                                    </div>
                                </FormSection>

                                <div className="border-t border-gray-100" />

                                <FormSection
                                    icon={
                                        RiBriefcaseLine
                                    }
                                    title="Рабочие данные"
                                >
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                        <div>
                                            <FieldLabel>
                                                Специальность
                                            </FieldLabel>

                                            <input
                                                value={
                                                    form.specialty
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateField(
                                                        "specialty",
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                placeholder="Слесарь"
                                                className={inputClass(
                                                    errors.specialty,
                                                )}
                                            />

                                            {errors.specialty && (
                                                <ErrorText>
                                                    {
                                                        errors.specialty
                                                    }
                                                </ErrorText>
                                            )}
                                        </div>

                                        <div>
                                            <FieldLabel>
                                                Разряд
                                            </FieldLabel>

                                            <select
                                                value={
                                                    form.grade
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateField(
                                                        "grade",
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                className={inputClass()}
                                            >
                                                <option value="">
                                                    Не
                                                    указан
                                                </option>

                                                {GRADES.map(
                                                    (
                                                        grade,
                                                    ) => (
                                                        <option
                                                            key={
                                                                grade
                                                            }
                                                            value={
                                                                grade
                                                            }
                                                        >
                                                            {
                                                                grade
                                                            }{" "}
                                                            разряд
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        </div>

                                        <div>
                                            <FieldLabel>
                                                Бригада
                                            </FieldLabel>

                                            <div className="relative">
                                                <RiTeamLine
                                                    size={
                                                        17
                                                    }
                                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                                />

                                                <select
                                                    value={
                                                        form.brigadeId
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        updateField(
                                                            "brigadeId",
                                                            event
                                                                .target
                                                                .value,
                                                        )
                                                    }
                                                    className={iconInputClass()}
                                                >
                                                    <option value="">
                                                        Не
                                                        указана
                                                    </option>

                                                    {brigades.map(
                                                        (
                                                            brigade,
                                                        ) => (
                                                            <option
                                                                key={
                                                                    brigade.id
                                                                }
                                                                value={
                                                                    brigade.id
                                                                }
                                                            >
                                                                {
                                                                    brigade.name
                                                                }
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </FormSection>

                                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                                    <div className="flex items-start gap-3">
                                        <RiUserAddLine
                                            size={
                                                19
                                            }
                                            className="mt-0.5 shrink-0 text-blue-600"
                                        />

                                        <div>
                                            <p className="text-sm font-semibold text-blue-900">
                                                Роль:
                                                Исполнитель
                                            </p>

                                            <p className="mt-1 text-xs leading-5 text-blue-700">
                                                Пользователь
                                                сможет
                                                авторизоваться
                                                по номеру
                                                телефона и
                                                выданному
                                                паролю.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/70 px-6 py-4">
                                <button
                                    type="button"
                                    disabled={
                                        isSubmitting
                                    }
                                    onClick={
                                        onClose
                                    }
                                    className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Отмена
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        isSubmitting
                                    }
                                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                                >
                                    {isSubmitting ? (
                                        <RiLoader4Line
                                            size={
                                                17
                                            }
                                            className="animate-spin"
                                        />
                                    ) : (
                                        <RiUserAddLine
                                            size={
                                                17
                                            }
                                        />
                                    )}

                                    {isSubmitting
                                        ? "Создание..."
                                        : "Добавить"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}

function FormSection({
    icon: Icon,
    title,
    children,
}) {
    return (
        <div>
            <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Icon
                        size={16}
                    />
                </div>

                <p className="text-sm font-semibold text-gray-900">
                    {title}
                </p>
            </div>

            <div className="mt-4">
                {children}
            </div>
        </div>
    );
}

function FieldLabel({
    children,
}) {
    return (
        <label className="mb-2 block text-xs font-medium text-gray-600">
            {children}
        </label>
    );
}

function ErrorText({
    children,
}) {
    return (
        <p className="mt-1.5 text-xs font-medium text-red-600">
            {children}
        </p>
    );
}

function inputClass(error) {
    return `
        w-full rounded-lg border
        ${error ? "border-red-300" : "border-gray-300"}
        bg-gray-50 px-3 py-2.5
        text-sm text-gray-900
        outline-none transition
        focus:border-blue-500
        focus:bg-white
        focus:ring-2
        focus:ring-blue-100
    `;
}

function iconInputClass(error) {
    return `
        w-full rounded-lg border
        ${error ? "border-red-300" : "border-gray-300"}
        bg-gray-50 py-2.5 pl-10 pr-3
        text-sm text-gray-900
        outline-none transition
        focus:border-blue-500
        focus:bg-white
        focus:ring-2
        focus:ring-blue-100
    `;
}

function passwordInputClass(error) {
    return `
        w-full rounded-lg border
        ${error ? "border-red-300" : "border-gray-300"}
        bg-gray-50 py-2.5 pl-10 pr-11
        text-sm text-gray-900
        outline-none transition
        focus:border-blue-500
        focus:bg-white
        focus:ring-2
        focus:ring-blue-100
    `;
}

function applyBackendDetails(
    details,
    setErrors,
) {
    if (!details) {
        return;
    }

    try {
        const parsed =
            typeof details === "string"
                ? JSON.parse(
                      details,
                  )
                : details;

        const entries =
            Array.isArray(parsed)
                ? parsed
                : [];

        if (
            entries.length === 0
        ) {
            return;
        }

        const next = {};

        for (
            const item of
            entries
        ) {
            const field =
                Array.isArray(
                    item?.path,
                )
                    ? item.path[
                          item.path
                              .length -
                              1
                      ]
                    : item?.path;

            if (
                field &&
                item?.message
            ) {
                next[field] =
                    item.message;
            }
        }

        setErrors(
            (current) => ({
                ...current,
                ...next,
            }),
        );
    } catch {
        return;
    }
}