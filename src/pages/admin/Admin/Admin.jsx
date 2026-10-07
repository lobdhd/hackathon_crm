import {
    useMemo,
    useState,
} from "react";

import {
    RiAddLine,
    RiAdminLine,
    RiCloseLine,
    RiDeleteBinLine,
    RiEditLine,
    RiErrorWarningLine,
    RiFileList3Line,
    RiLockPasswordLine,
    RiMapPin2Line,
    RiRefreshLine,
    RiSearchLine,
    RiStackLine,
    RiTeamLine,
    RiTimeLine,
    RiToolsLine,
    RiUser3Line,
} from "react-icons/ri";

import {
    useAdminUsers,
    useCreateAdminUser,
    useCreateArea,
    useCreateBrigade,
    useCreateEquipment,
    useCreateFaultCode,
    useCreateMaterial,
    useCreateNormative,
    useDeleteArea,
    useDeleteBrigade,
    useDeleteEquipment,
    useDeleteFaultCode,
    useDeleteMaterial,
    useDeleteNormative,
    useUpdateAdminUser,
    useUpdateAdminUserShift,
    useUpdateArea,
    useUpdateEquipment,
} from "../../../hooks/useAdmin.js";

import {
    useAreas,
    useBrigades,
    useEquipmentReference,
    useFaultCodes,
    useMaterials,
    useNormatives,
} from "../../../hooks/useReferences.js";

import "./Admin.css";

const TABS = [
    {
        id: "users",
        label: "Пользователи",
        icon: RiUser3Line,
    },
    {
        id: "shifts",
        label: "Смены",
        icon: RiTimeLine,
    },
    {
        id: "areas",
        label: "Участки",
        icon: RiMapPin2Line,
    },
    {
        id: "equipment",
        label: "Оборудование",
        icon: RiToolsLine,
    },
    {
        id: "faultCodes",
        label: "Шифры",
        icon: RiErrorWarningLine,
    },
    {
        id: "materials",
        label: "Материалы",
        icon: RiStackLine,
    },
    {
        id: "brigades",
        label: "Бригады",
        icon: RiTeamLine,
    },
    {
        id: "normatives",
        label: "Нормативы",
        icon: RiFileList3Line,
    },
];

const ROLE_LABELS = {
    ADMIN: "Администратор",
    MASTER: "Мастер",
    MANAGER: "Руководитель",
    EXECUTOR: "Исполнитель",
};

const STATUS_LABELS = {
    AVAILABLE: "Свободен",
    BUSY: "В работе",
    QUEUED: "Есть очередь",
    OFF_SHIFT: "Не на смене",
};

const STATUS_CLASS = {
    AVAILABLE: "available",
    BUSY: "busy",
    QUEUED: "queued",
    OFF_SHIFT: "off",
};

function asArray(value) {
    return Array.isArray(value)
        ? value
        : [];
}

function extractError(error) {
    const data =
        error?.response?.data;

    if (!data) {
        return (
            error?.message ||
            "Не удалось выполнить операцию"
        );
    }

    if (data.details) {
        try {
            const details =
                typeof data.details === "string"
                    ? JSON.parse(
                        data.details,
                    )
                    : data.details;

            if (Array.isArray(details)) {
                const messages =
                    details
                        .map(
                            (item) =>
                                item?.message,
                        )
                        .filter(Boolean);

                if (messages.length) {
                    return messages.join(
                        ". ",
                    );
                }
            }
        } catch {
            return (
                data.error ||
                String(data.details)
            );
        }
    }

    return (
        data.error ||
        "Не удалось выполнить операцию"
    );
}

function Modal({
    title,
    subtitle,
    onClose,
    children,
    width = "680px",
}) {
    return (
        <div
            className="admin-modal-overlay"
            onMouseDown={onClose}
        >
            <div
                className="admin-modal"
                style={{
                    maxWidth: width,
                }}
                onMouseDown={(event) =>
                    event.stopPropagation()
                }
            >
                <div className="admin-modal__header">
                    <div>
                        <h2>{title}</h2>

                        {subtitle && (
                            <p>
                                {
                                    subtitle
                                }
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        className="admin-icon-button"
                        onClick={onClose}
                    >
                        <RiCloseLine />
                    </button>
                </div>

                {children}
            </div>
        </div>
    );
}

function EmptyState({
    icon: Icon,
    title,
    text,
}) {
    return (
        <div className="admin-empty">
            <div className="admin-empty__icon">
                <Icon />
            </div>

            <strong>{title}</strong>

            <span>{text}</span>
        </div>
    );
}

function ErrorState({
    onRetry,
}) {
    return (
        <div className="admin-error-state">
            <RiErrorWarningLine />

            <div>
                <strong>
                    Не удалось загрузить
                    данные
                </strong>

                <span>
                    Проверьте соединение
                    с сервером
                </span>
            </div>

            <button
                type="button"
                onClick={onRetry}
            >
                <RiRefreshLine />
                Повторить
            </button>
        </div>
    );
}

function LoadingTable() {
    return (
        <div className="admin-loading">
            <div />
            <div />
            <div />
            <div />
            <div />
        </div>
    );
}

function SearchBox({
    value,
    onChange,
    placeholder,
}) {
    return (
        <div className="admin-search">
            <RiSearchLine />

            <input
                value={value}
                onChange={(event) =>
                    onChange(
                        event.target
                            .value,
                    )
                }
                placeholder={
                    placeholder
                }
            />

            {value && (
                <button
                    type="button"
                    onClick={() =>
                        onChange("")
                    }
                >
                    <RiCloseLine />
                </button>
            )}
        </div>
    );
}

function UserModal({
    user,
    brigades,
    mutation,
    onClose,
}) {
    const isEdit =
        Boolean(user);

    const [form, setForm] =
        useState({
            fullName:
                user?.fullName || "",
            phone:
                user?.phone || "",
            login:
                user?.login || "",
            password: "",
            role:
                user?.role ||
                "EXECUTOR",
            specialty:
                user?.specialty ||
                "",
            grade:
                user?.grade ?? "",
            brigadeId:
                user?.brigadeId ??
                "",
            language:
                user?.language ||
                "ru",
        });

    const [error, setError] =
        useState("");

    function change(
        field,
        value,
    ) {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }));

        setError("");
    }

    async function submit(event) {
        event.preventDefault();

        setError("");

        const payload = {
            fullName:
                form.fullName.trim(),
            phone:
                form.phone.trim(),
            role: form.role,
            language:
                form.language,
        };

        if (!isEdit) {
            payload.password =
                form.password;

            if (
                form.login.trim()
            ) {
                payload.login =
                    form.login.trim();
            }
        }

        if (
            isEdit &&
            form.password.trim()
        ) {
            payload.password =
                form.password;
        }

        if (
            form.role ===
            "EXECUTOR"
        ) {
            if (
                form.specialty.trim()
            ) {
                payload.specialty =
                    form.specialty.trim();
            }

            if (
                form.grade !== ""
            ) {
                payload.grade =
                    Number(
                        form.grade,
                    );
            }

            if (isEdit) {
                payload.brigadeId =
                    form.brigadeId
                        ? Number(
                            form.brigadeId,
                        )
                        : null;
            } else if (
                form.brigadeId
            ) {
                payload.brigadeId =
                    Number(
                        form.brigadeId,
                    );
            }
        }

        try {
            if (isEdit) {
                await mutation.mutateAsync(
                    {
                        id: user.id,
                        payload,
                    },
                );
            } else {
                await mutation.mutateAsync(
                    payload,
                );
            }

            onClose();
        } catch (requestError) {
            setError(
                extractError(
                    requestError,
                ),
            );
        }
    }

    return (
        <Modal
            title={
                isEdit
                    ? "Редактирование пользователя"
                    : "Новый пользователь"
            }
            subtitle={
                isEdit
                    ? "Изменение данных и доступа"
                    : "Создание учётной записи"
            }
            onClose={onClose}
        >
            <form
                className="admin-form"
                onSubmit={submit}
            >
                {error && (
                    <div className="admin-form-error">
                        <RiErrorWarningLine />
                        {error}
                    </div>
                )}

                <div className="admin-form-grid">
                    <label className="admin-field admin-field--full">
                        <span>
                            ФИО
                        </span>

                        <input
                            value={
                                form.fullName
                            }
                            onChange={(
                                event,
                            ) =>
                                change(
                                    "fullName",
                                    event
                                        .target
                                        .value,
                                )
                            }
                            placeholder="Иванов Иван Иванович"
                            required
                        />
                    </label>

                    <label className="admin-field">
                        <span>
                            Телефон
                        </span>

                        <input
                            value={
                                form.phone
                            }
                            onChange={(
                                event,
                            ) =>
                                change(
                                    "phone",
                                    event
                                        .target
                                        .value,
                                )
                            }
                            placeholder="+7 700 000 00 00"
                            required
                        />
                    </label>

                    {!isEdit && (
                        <label className="admin-field">
                            <span>
                                Login
                            </span>

                            <input
                                value={
                                    form.login
                                }
                                onChange={(
                                    event,
                                ) =>
                                    change(
                                        "login",
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                placeholder="Необязательно"
                            />
                        </label>
                    )}

                    <label className="admin-field">
                        <span>
                            Роль
                        </span>

                        <select
                            value={
                                form.role
                            }
                            onChange={(
                                event,
                            ) =>
                                change(
                                    "role",
                                    event
                                        .target
                                        .value,
                                )
                            }
                        >
                            <option value="EXECUTOR">
                                Исполнитель
                            </option>

                            <option value="MASTER">
                                Мастер
                            </option>

                            <option value="MANAGER">
                                Руководитель
                            </option>

                            <option value="ADMIN">
                                Администратор
                            </option>
                        </select>
                    </label>

                    <label className="admin-field">
                        <span>
                            Язык
                        </span>

                        <select
                            value={
                                form.language
                            }
                            onChange={(
                                event,
                            ) =>
                                change(
                                    "language",
                                    event
                                        .target
                                        .value,
                                )
                            }
                        >
                            <option value="ru">
                                Русский
                            </option>

                            <option value="kk">
                                Қазақша
                            </option>
                        </select>
                    </label>

                    <label className="admin-field admin-field--full">
                        <span>
                            {isEdit
                                ? "Новый пароль"
                                : "Пароль"}
                        </span>

                        <div className="admin-input-icon">
                            <RiLockPasswordLine />

                            <input
                                type="password"
                                value={
                                    form.password
                                }
                                onChange={(
                                    event,
                                ) =>
                                    change(
                                        "password",
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                placeholder={
                                    isEdit
                                        ? "Оставьте пустым, если менять не нужно"
                                        : "Минимум 6 символов"
                                }
                                required={
                                    !isEdit
                                }
                                minLength={
                                    isEdit
                                        ? undefined
                                        : 6
                                }
                            />
                        </div>
                    </label>

                    {form.role ===
                        "EXECUTOR" && (
                            <>
                                <label className="admin-field">
                                    <span>
                                        Специальность
                                    </span>

                                    <input
                                        value={
                                            form.specialty
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            change(
                                                "specialty",
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        placeholder="Слесарь"
                                    />
                                </label>

                                <label className="admin-field">
                                    <span>
                                        Разряд
                                    </span>

                                    <input
                                        type="number"
                                        value={
                                            form.grade
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            change(
                                                "grade",
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        placeholder="5"
                                    />
                                </label>

                                <label className="admin-field admin-field--full">
                                    <span>
                                        Бригада
                                    </span>

                                    <select
                                        value={
                                            form.brigadeId
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            change(
                                                "brigadeId",
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                    >
                                        <option value="">
                                            Без
                                            бригады
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
                                </label>
                            </>
                        )}
                </div>

                <div className="admin-modal__footer">
                    <button
                        type="button"
                        className="admin-button admin-button--secondary"
                        onClick={
                            onClose
                        }
                    >
                        Отмена
                    </button>

                    <button
                        type="submit"
                        className="admin-button admin-button--primary"
                        disabled={
                            mutation.isPending
                        }
                    >
                        {mutation.isPending
                            ? "Сохранение..."
                            : isEdit
                                ? "Сохранить"
                                : "Создать"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function AreaModal({
    area,
    mutation,
    onClose,
}) {
    const [name, setName] =
        useState(
            area?.name || "",
        );

    const [error, setError] =
        useState("");

    async function submit(event) {
        event.preventDefault();

        try {
            if (area) {
                await mutation.mutateAsync(
                    {
                        id: area.id,
                        payload: {
                            name: name.trim(),
                        },
                    },
                );
            } else {
                await mutation.mutateAsync(
                    {
                        name: name.trim(),
                    },
                );
            }

            onClose();
        } catch (requestError) {
            setError(
                extractError(
                    requestError,
                ),
            );
        }
    }

    return (
        <Modal
            title={
                area
                    ? "Редактирование участка"
                    : "Новый участок"
            }
            onClose={onClose}
            width="520px"
        >
            <form
                className="admin-form"
                onSubmit={submit}
            >
                {error && (
                    <div className="admin-form-error">
                        <RiErrorWarningLine />
                        {error}
                    </div>
                )}

                <label className="admin-field">
                    <span>
                        Название участка
                    </span>

                    <input
                        value={name}
                        onChange={(
                            event,
                        ) =>
                            setName(
                                event
                                    .target
                                    .value,
                            )
                        }
                        minLength={2}
                        required
                        autoFocus
                    />
                </label>

                <div className="admin-modal__footer">
                    <button
                        type="button"
                        className="admin-button admin-button--secondary"
                        onClick={
                            onClose
                        }
                    >
                        Отмена
                    </button>

                    <button
                        type="submit"
                        className="admin-button admin-button--primary"
                        disabled={
                            mutation.isPending
                        }
                    >
                        Сохранить
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function EquipmentModal({
    equipment,
    areas,
    mutation,
    onClose,
}) {
    const [form, setForm] =
        useState({
            name:
                equipment?.name ||
                "",
            inventoryNumber:
                equipment?.inventoryNumber ||
                "",
            type:
                equipment?.type ||
                "",
            criticality:
                equipment?.criticality ??
                3,
            areaId:
                equipment?.areaId ??
                "",
        });

    const [error, setError] =
        useState("");

    function change(
        field,
        value,
    ) {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }));

        setError("");
    }

    async function submit(event) {
        event.preventDefault();

        const payload = {
            name:
                form.name.trim(),
            inventoryNumber:
                form.inventoryNumber.trim(),
            type:
                form.type.trim(),
            criticality:
                Number(
                    form.criticality,
                ),
            areaId:
                Number(form.areaId),
        };

        try {
            if (equipment) {
                await mutation.mutateAsync(
                    {
                        id:
                            equipment.id,
                        payload,
                    },
                );
            } else {
                await mutation.mutateAsync(
                    payload,
                );
            }

            onClose();
        } catch (requestError) {
            setError(
                extractError(
                    requestError,
                ),
            );
        }
    }

    return (
        <Modal
            title={
                equipment
                    ? "Редактирование оборудования"
                    : "Новое оборудование"
            }
            onClose={onClose}
        >
            <form
                className="admin-form"
                onSubmit={submit}
            >
                {error && (
                    <div className="admin-form-error">
                        <RiErrorWarningLine />
                        {error}
                    </div>
                )}

                <div className="admin-form-grid">
                    <label className="admin-field admin-field--full">
                        <span>
                            Название
                        </span>

                        <input
                            value={
                                form.name
                            }
                            onChange={(
                                event,
                            ) =>
                                change(
                                    "name",
                                    event
                                        .target
                                        .value,
                                )
                            }
                            required
                        />
                    </label>

                    <label className="admin-field">
                        <span>
                            Инвентарный
                            номер
                        </span>

                        <input
                            value={
                                form.inventoryNumber
                            }
                            onChange={(
                                event,
                            ) =>
                                change(
                                    "inventoryNumber",
                                    event
                                        .target
                                        .value,
                                )
                            }
                            required
                        />
                    </label>

                    <label className="admin-field">
                        <span>
                            Тип
                        </span>

                        <input
                            value={
                                form.type
                            }
                            onChange={(
                                event,
                            ) =>
                                change(
                                    "type",
                                    event
                                        .target
                                        .value,
                                )
                            }
                            required
                        />
                    </label>

                    <label className="admin-field">
                        <span>
                            Критичность
                        </span>

                        <select
                            value={
                                form.criticality
                            }
                            onChange={(
                                event,
                            ) =>
                                change(
                                    "criticality",
                                    event
                                        .target
                                        .value,
                                )
                            }
                        >
                            {[1, 2, 3, 4, 5].map(
                                (
                                    value,
                                ) => (
                                    <option
                                        key={
                                            value
                                        }
                                        value={
                                            value
                                        }
                                    >
                                        {
                                            value
                                        }
                                    </option>
                                ),
                            )}
                        </select>
                    </label>

                    <label className="admin-field">
                        <span>
                            Участок
                        </span>

                        <select
                            value={
                                form.areaId
                            }
                            onChange={(
                                event,
                            ) =>
                                change(
                                    "areaId",
                                    event
                                        .target
                                        .value,
                                )
                            }
                            required
                        >
                            <option value="">
                                Выберите
                                участок
                            </option>

                            {areas.map(
                                (
                                    area,
                                ) => (
                                    <option
                                        key={
                                            area.id
                                        }
                                        value={
                                            area.id
                                        }
                                    >
                                        {
                                            area.name
                                        }
                                    </option>
                                ),
                            )}
                        </select>
                    </label>
                </div>

                <div className="admin-modal__footer">
                    <button
                        type="button"
                        className="admin-button admin-button--secondary"
                        onClick={
                            onClose
                        }
                    >
                        Отмена
                    </button>

                    <button
                        type="submit"
                        className="admin-button admin-button--primary"
                        disabled={
                            mutation.isPending
                        }
                    >
                        Сохранить
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function SimpleModal({
    type,
    mutation,
    onClose,
}) {
    const config = {
        faultCode: {
            title:
                "Новый шифр неисправности",
            fields: [
                {
                    key: "code",
                    label: "Код",
                },
                {
                    key: "name",
                    label:
                        "Название",
                },
                {
                    key: "category",
                    label:
                        "Категория",
                },
            ],
        },

        material: {
            title:
                "Новый материал",
            fields: [
                {
                    key: "name",
                    label:
                        "Название",
                },
                {
                    key: "unit",
                    label:
                        "Единица измерения",
                },
            ],
        },

        brigade: {
            title:
                "Новая бригада",
            fields: [
                {
                    key: "name",
                    label:
                        "Название",
                },
            ],
        },
    }[type];

    const [form, setForm] =
        useState({});

    const [error, setError] =
        useState("");

    async function submit(event) {
        event.preventDefault();

        const payload =
            Object.fromEntries(
                Object.entries(
                    form,
                ).map(
                    ([
                        key,
                        value,
                    ]) => [
                            key,
                            value.trim(),
                        ],
                ),
            );

        try {
            await mutation.mutateAsync(
                payload,
            );

            onClose();
        } catch (requestError) {
            setError(
                extractError(
                    requestError,
                ),
            );
        }
    }

    return (
        <Modal
            title={config.title}
            onClose={onClose}
            width="520px"
        >
            <form
                className="admin-form"
                onSubmit={submit}
            >
                {error && (
                    <div className="admin-form-error">
                        <RiErrorWarningLine />
                        {error}
                    </div>
                )}

                {config.fields.map(
                    (field) => (
                        <label
                            className="admin-field"
                            key={
                                field.key
                            }
                        >
                            <span>
                                {
                                    field.label
                                }
                            </span>

                            <input
                                value={
                                    form[
                                    field
                                        .key
                                    ] ||
                                    ""
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setForm(
                                        (
                                            previous,
                                        ) => ({
                                            ...previous,
                                            [field.key]:
                                                event
                                                    .target
                                                    .value,
                                        }),
                                    )
                                }
                                required
                            />
                        </label>
                    ),
                )}

                <div className="admin-modal__footer">
                    <button
                        type="button"
                        className="admin-button admin-button--secondary"
                        onClick={
                            onClose
                        }
                    >
                        Отмена
                    </button>

                    <button
                        type="submit"
                        className="admin-button admin-button--primary"
                        disabled={
                            mutation.isPending
                        }
                    >
                        Создать
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function NormativeModal({
    equipment,
    faultCodes,
    materials,
    mutation,
    onClose,
}) {
    const [form, setForm] =
        useState({
            name: "",
            equipmentType: "",
            equipmentId: "",
            faultCodeId: "",
            hours: "",
        });

    const [materialRows, setMaterialRows] =
        useState([]);

    const [error, setError] =
        useState("");

    function change(
        field,
        value,
    ) {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }));

        setError("");
    }

    function addMaterial() {
        setMaterialRows(
            (previous) => [
                ...previous,
                {
                    id:
                        crypto.randomUUID(),
                    materialId:
                        "",
                    quantity: "",
                },
            ],
        );
    }

    function updateMaterial(
        id,
        field,
        value,
    ) {
        setMaterialRows(
            (previous) =>
                previous.map(
                    (row) =>
                        row.id === id
                            ? {
                                ...row,
                                [field]:
                                    value,
                            }
                            : row,
                ),
        );
    }

    function removeMaterial(id) {
        setMaterialRows(
            (previous) =>
                previous.filter(
                    (row) =>
                        row.id !== id,
                ),
        );
    }

    async function submit(event) {
        event.preventDefault();

        const payload = {
            name:
                form.name.trim(),
            hours:
                Number(form.hours),
            materials:
                materialRows
                    .filter(
                        (row) =>
                            row.materialId &&
                            row.quantity,
                    )
                    .map((row) => ({
                        materialId:
                            Number(
                                row.materialId,
                            ),
                        quantity:
                            Number(
                                row.quantity,
                            ),
                    })),
        };

        if (
            form.equipmentType.trim()
        ) {
            payload.equipmentType =
                form.equipmentType.trim();
        }

        if (form.equipmentId) {
            payload.equipmentId =
                Number(
                    form.equipmentId,
                );
        }

        if (form.faultCodeId) {
            payload.faultCodeId =
                Number(
                    form.faultCodeId,
                );
        }

        try {
            await mutation.mutateAsync(
                payload,
            );

            onClose();
        } catch (requestError) {
            setError(
                extractError(
                    requestError,
                ),
            );
        }
    }

    return (
        <Modal
            title="Новый норматив"
            subtitle="Норматив выполнения и расход материалов"
            onClose={onClose}
            width="760px"
        >
            <form
                className="admin-form"
                onSubmit={submit}
            >
                {error && (
                    <div className="admin-form-error">
                        <RiErrorWarningLine />
                        {error}
                    </div>
                )}

                <div className="admin-form-grid">
                    <label className="admin-field admin-field--full">
                        <span>
                            Название
                        </span>

                        <input
                            value={
                                form.name
                            }
                            onChange={(
                                event,
                            ) =>
                                change(
                                    "name",
                                    event
                                        .target
                                        .value,
                                )
                            }
                            required
                        />
                    </label>

                    <label className="admin-field">
                        <span>
                            Норматив,
                            часов
                        </span>

                        <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={
                                form.hours
                            }
                            onChange={(
                                event,
                            ) =>
                                change(
                                    "hours",
                                    event
                                        .target
                                        .value,
                                )
                            }
                            required
                        />
                    </label>

                    <label className="admin-field">
                        <span>
                            Тип
                            оборудования
                        </span>

                        <input
                            value={
                                form.equipmentType
                            }
                            onChange={(
                                event,
                            ) =>
                                change(
                                    "equipmentType",
                                    event
                                        .target
                                        .value,
                                )
                            }
                            placeholder="Необязательно"
                        />
                    </label>

                    <label className="admin-field">
                        <span>
                            Оборудование
                        </span>

                        <select
                            value={
                                form.equipmentId
                            }
                            onChange={(
                                event,
                            ) =>
                                change(
                                    "equipmentId",
                                    event
                                        .target
                                        .value,
                                )
                            }
                        >
                            <option value="">
                                Любое
                            </option>

                            {equipment.map(
                                (
                                    item,
                                ) => (
                                    <option
                                        key={
                                            item.id
                                        }
                                        value={
                                            item.id
                                        }
                                    >
                                        {
                                            item.name
                                        }
                                    </option>
                                ),
                            )}
                        </select>
                    </label>

                    <label className="admin-field">
                        <span>
                            Шифр
                            неисправности
                        </span>

                        <select
                            value={
                                form.faultCodeId
                            }
                            onChange={(
                                event,
                            ) =>
                                change(
                                    "faultCodeId",
                                    event
                                        .target
                                        .value,
                                )
                            }
                        >
                            <option value="">
                                Не указан
                            </option>

                            {faultCodes.map(
                                (
                                    item,
                                ) => (
                                    <option
                                        key={
                                            item.id
                                        }
                                        value={
                                            item.id
                                        }
                                    >
                                        {
                                            item.code
                                        }{" "}
                                        —{" "}
                                        {
                                            item.name
                                        }
                                    </option>
                                ),
                            )}
                        </select>
                    </label>
                </div>

                <div className="admin-material-editor">
                    <div className="admin-material-editor__header">
                        <div>
                            <strong>
                                Материалы
                            </strong>

                            <span>
                                Нормативный
                                расход
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={
                                addMaterial
                            }
                        >
                            <RiAddLine />
                            Добавить
                        </button>
                    </div>

                    {materialRows.length ===
                        0 ? (
                        <div className="admin-material-empty">
                            Материалы
                            не указаны
                        </div>
                    ) : (
                        <div className="admin-material-rows">
                            {materialRows.map(
                                (
                                    row,
                                ) => (
                                    <div
                                        className="admin-material-row"
                                        key={
                                            row.id
                                        }
                                    >
                                        <select
                                            value={
                                                row.materialId
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                updateMaterial(
                                                    row.id,
                                                    "materialId",
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                        >
                                            <option value="">
                                                Материал
                                            </option>

                                            {materials.map(
                                                (
                                                    material,
                                                ) => (
                                                    <option
                                                        key={
                                                            material.id
                                                        }
                                                        value={
                                                            material.id
                                                        }
                                                    >
                                                        {
                                                            material.name
                                                        }{" "}
                                                        (
                                                        {
                                                            material.unit
                                                        }
                                                        )
                                                    </option>
                                                ),
                                            )}
                                        </select>

                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={
                                                row.quantity
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                updateMaterial(
                                                    row.id,
                                                    "quantity",
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                            placeholder="Количество"
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeMaterial(
                                                    row.id,
                                                )
                                            }
                                        >
                                            <RiDeleteBinLine />
                                        </button>
                                    </div>
                                ),
                            )}
                        </div>
                    )}
                </div>

                <div className="admin-modal__footer">
                    <button
                        type="button"
                        className="admin-button admin-button--secondary"
                        onClick={
                            onClose
                        }
                    >
                        Отмена
                    </button>

                    <button
                        type="submit"
                        className="admin-button admin-button--primary"
                        disabled={
                            mutation.isPending
                        }
                    >
                        Создать
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function DeleteModal({
    state,
    onClose,
}) {
    const [error, setError] =
        useState("");

    const [loading, setLoading] =
        useState(false);

    async function remove() {
        setLoading(true);
        setError("");

        try {
            await state.onDelete();

            onClose();
        } catch (requestError) {
            setError(
                extractError(
                    requestError,
                ),
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal
            title="Удаление"
            subtitle={
                state.title
            }
            onClose={onClose}
            width="500px"
        >
            <div className="admin-delete-content">
                <div className="admin-delete-icon">
                    <RiDeleteBinLine />
                </div>

                <p>
                    Удалить запись
                    без возможности
                    восстановления?
                </p>

                {error && (
                    <div className="admin-form-error">
                        <RiErrorWarningLine />
                        {error}
                    </div>
                )}
            </div>

            <div className="admin-modal__footer">
                <button
                    type="button"
                    className="admin-button admin-button--secondary"
                    onClick={onClose}
                >
                    Отмена
                </button>

                <button
                    type="button"
                    className="admin-button admin-button--danger"
                    onClick={remove}
                    disabled={loading}
                >
                    {loading
                        ? "Удаление..."
                        : "Удалить"}
                </button>
            </div>
        </Modal>
    );
}

export default function Admin() {
    const [activeTab, setActiveTab] =
        useState("users");

    const [search, setSearch] =
        useState("");

    const [modal, setModal] =
        useState(null);

    const [deleteState, setDeleteState] =
        useState(null);

    const usersQuery =
        useAdminUsers();

    const areasQuery =
        useAreas();

    const equipmentQuery =
        useEquipmentReference();

    const faultCodesQuery =
        useFaultCodes();

    const materialsQuery =
        useMaterials();

    const brigadesQuery =
        useBrigades();

    const normativesQuery =
        useNormatives();

    const createUserMutation =
        useCreateAdminUser();

    const updateUserMutation =
        useUpdateAdminUser();

    const shiftMutation =
        useUpdateAdminUserShift();

    const createAreaMutation =
        useCreateArea();

    const updateAreaMutation =
        useUpdateArea();

    const deleteAreaMutation =
        useDeleteArea();

    const createEquipmentMutation =
        useCreateEquipment();

    const updateEquipmentMutation =
        useUpdateEquipment();

    const deleteEquipmentMutation =
        useDeleteEquipment();

    const createFaultCodeMutation =
        useCreateFaultCode();

    const deleteFaultCodeMutation =
        useDeleteFaultCode();

    const createMaterialMutation =
        useCreateMaterial();

    const deleteMaterialMutation =
        useDeleteMaterial();

    const createBrigadeMutation =
        useCreateBrigade();

    const deleteBrigadeMutation =
        useDeleteBrigade();

    const createNormativeMutation =
        useCreateNormative();

    const deleteNormativeMutation =
        useDeleteNormative();

    const users =
        asArray(
            usersQuery.data,
        );

    const areas =
        asArray(
            areasQuery.data,
        );

    const equipment =
        asArray(
            equipmentQuery.data,
        );

    const faultCodes =
        asArray(
            faultCodesQuery.data,
        );

    const materials =
        asArray(
            materialsQuery.data,
        );

    const brigades =
        asArray(
            brigadesQuery.data,
        );

    const normatives =
        asArray(
            normativesQuery.data,
        );

    const filteredUsers =
        useMemo(() => {
            const value =
                search
                    .trim()
                    .toLowerCase();

            if (!value) {
                return users;
            }

            return users.filter(
                (user) =>
                    [
                        user.fullName,
                        user.phone,
                        user.login,
                        user.role,
                        user.specialty,
                        user.brigade
                            ?.name,
                    ].some((item) =>
                        String(
                            item || "",
                        )
                            .toLowerCase()
                            .includes(
                                value,
                            ),
                    ),
            );
        }, [
            search,
            users,
        ]);

    const filteredAreas =
        useMemo(() => {
            const value =
                search
                    .trim()
                    .toLowerCase();

            return !value
                ? areas
                : areas.filter(
                    (item) =>
                        item.name
                            ?.toLowerCase()
                            .includes(
                                value,
                            ),
                );
        }, [
            areas,
            search,
        ]);

    const filteredEquipment =
        useMemo(() => {
            const value =
                search
                    .trim()
                    .toLowerCase();

            return !value
                ? equipment
                : equipment.filter(
                    (item) =>
                        [
                            item.name,
                            item.inventoryNumber,
                            item.type,
                        ].some(
                            (
                                field,
                            ) =>
                                String(
                                    field ||
                                    "",
                                )
                                    .toLowerCase()
                                    .includes(
                                        value,
                                    ),
                        ),
                );
        }, [
            equipment,
            search,
        ]);

    const executors =
        users.filter(
            (user) =>
                user.role ===
                "EXECUTOR",
        );

    function refreshActive() {
        const map = {
            users:
                usersQuery.refetch,
            shifts:
                usersQuery.refetch,
            areas:
                areasQuery.refetch,
            equipment:
                equipmentQuery.refetch,
            faultCodes:
                faultCodesQuery.refetch,
            materials:
                materialsQuery.refetch,
            brigades:
                brigadesQuery.refetch,
            normatives:
                normativesQuery.refetch,
        };

        map[activeTab]?.();
    }

    function isLoading() {
        const map = {
            users:
                usersQuery.isLoading,
            shifts:
                usersQuery.isLoading,
            areas:
                areasQuery.isLoading,
            equipment:
                equipmentQuery.isLoading,
            faultCodes:
                faultCodesQuery.isLoading,
            materials:
                materialsQuery.isLoading,
            brigades:
                brigadesQuery.isLoading,
            normatives:
                normativesQuery.isLoading,
        };

        return map[
            activeTab
        ];
    }

    function isError() {
        const map = {
            users:
                usersQuery.isError,
            shifts:
                usersQuery.isError,
            areas:
                areasQuery.isError,
            equipment:
                equipmentQuery.isError,
            faultCodes:
                faultCodesQuery.isError,
            materials:
                materialsQuery.isError,
            brigades:
                brigadesQuery.isError,
            normatives:
                normativesQuery.isError,
        };

        return map[
            activeTab
        ];
    }

    async function toggleShift(
        user,
    ) {
        const next =
            !user.isOnShift;

        await shiftMutation.mutateAsync(
            {
                id: user.id,
                payload: {
                    isOnShift:
                        next,
                    employeeStatus:
                        next
                            ? "AVAILABLE"
                            : "OFF_SHIFT",
                },
            },
        );
    }

    function openDelete({
        title,
        onDelete,
    }) {
        setDeleteState({
            title,
            onDelete,
        });
    }

    function renderUsers() {
        if (
            filteredUsers.length ===
            0
        ) {
            return (
                <EmptyState
                    icon={
                        RiUser3Line
                    }
                    title="Пользователей нет"
                    text="Создайте первую учётную запись"
                />
            );
        }

        return (
            <div className="admin-table-wrapper">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>
                                Пользователь
                            </th>
                            <th>
                                Роль
                            </th>
                            <th>
                                Телефон
                            </th>
                            <th>
                                Бригада
                            </th>
                            <th>
                                Статус
                            </th>
                            <th />
                        </tr>
                    </thead>

                    <tbody>
                        {filteredUsers.map(
                            (user) => (
                                <tr
                                    key={
                                        user.id
                                    }
                                >
                                    <td>
                                        <div className="admin-user-cell">
                                            <div className="admin-avatar">
                                                {user.fullName
                                                    ?.split(
                                                        " ",
                                                    )
                                                    .slice(
                                                        0,
                                                        2,
                                                    )
                                                    .map(
                                                        (
                                                            word,
                                                        ) =>
                                                            word?.[
                                                            0
                                                            ],
                                                    )
                                                    .join(
                                                        "",
                                                    )}
                                            </div>

                                            <div>
                                                <strong>
                                                    {
                                                        user.fullName
                                                    }
                                                </strong>

                                                <span>
                                                    {user.specialty ||
                                                        user.login ||
                                                        "—"}
                                                </span>
                                            </div>
                                        </div>
                                    </td>

                                    <td>
                                        <span className={`admin-role admin-role--${String(
                                            user.role,
                                        ).toLowerCase()}`}>
                                            {ROLE_LABELS[
                                                user
                                                    .role
                                            ] ||
                                                user.role}
                                        </span>
                                    </td>

                                    <td>
                                        {user.phone ||
                                            "—"}
                                    </td>

                                    <td>
                                        {user
                                            .brigade
                                            ?.name ||
                                            "—"}
                                    </td>

                                    <td>
                                        {user.role ===
                                            "EXECUTOR" ? (
                                            <span className={`admin-status admin-status--${STATUS_CLASS[
                                                user
                                                    .employeeStatus
                                            ] || "off"}`}>
                                                {STATUS_LABELS[
                                                    user
                                                        .employeeStatus
                                                ] ||
                                                    user.employeeStatus ||
                                                    "—"}
                                            </span>
                                        ) : (
                                            "—"
                                        )}
                                    </td>

                                    <td>
                                        <div className="admin-row-actions">
                                            <button
                                                type="button"
                                                title="Редактировать"
                                                onClick={() =>
                                                    setModal(
                                                        {
                                                            type: "user",
                                                            user,
                                                        },
                                                    )
                                                }
                                            >
                                                <RiEditLine />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ),
                        )}
                    </tbody>
                </table>
            </div>
        );
    }

    function renderShifts() {
        if (
            executors.length ===
            0
        ) {
            return (
                <EmptyState
                    icon={
                        RiTimeLine
                    }
                    title="Исполнителей нет"
                    text="Создайте исполнителя в разделе пользователей"
                />
            );
        }

        return (
            <div className="admin-shifts-grid">
                {executors.map(
                    (user) => {
                        const pending =
                            shiftMutation.isPending &&
                            shiftMutation
                                .variables
                                ?.id ===
                            user.id;

                        return (
                            <div
                                className="admin-shift-card"
                                key={
                                    user.id
                                }
                            >
                                <div className="admin-shift-card__top">
                                    <div className="admin-user-cell">
                                        <div className="admin-avatar">
                                            {user.fullName
                                                ?.split(
                                                    " ",
                                                )
                                                .slice(
                                                    0,
                                                    2,
                                                )
                                                .map(
                                                    (
                                                        word,
                                                    ) =>
                                                        word?.[
                                                        0
                                                        ],
                                                )
                                                .join(
                                                    "",
                                                )}
                                        </div>

                                        <div>
                                            <strong>
                                                {
                                                    user.fullName
                                                }
                                            </strong>

                                            <span>
                                                {user.specialty ||
                                                    "Исполнитель"}
                                            </span>
                                        </div>
                                    </div>

                                    <span className={`admin-status admin-status--${STATUS_CLASS[
                                        user
                                            .employeeStatus
                                    ] || "off"}`}>
                                        {STATUS_LABELS[
                                            user
                                                .employeeStatus
                                        ] ||
                                            user.employeeStatus}
                                    </span>
                                </div>

                                <div className="admin-shift-card__bottom">
                                    <div>
                                        <strong>
                                            {user.isOnShift
                                                ? "На смене"
                                                : "Не на смене"}
                                        </strong>

                                        <span>
                                            {
                                                user
                                                    .brigade
                                                    ?.name
                                            }
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        className={`admin-switch ${user.isOnShift
                                                ? "active"
                                                : ""
                                            }`}
                                        disabled={
                                            pending
                                        }
                                        onClick={() =>
                                            toggleShift(
                                                user,
                                            )
                                        }
                                    >
                                        <span />
                                    </button>
                                </div>
                            </div>
                        );
                    },
                )}
            </div>
        );
    }

    function renderAreas() {
        return (
            <div className="admin-table-wrapper">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>
                                ID
                            </th>
                            <th>
                                Название
                            </th>
                            <th />
                        </tr>
                    </thead>

                    <tbody>
                        {filteredAreas.map(
                            (area) => (
                                <tr
                                    key={
                                        area.id
                                    }
                                >
                                    <td className="admin-muted">
                                        #
                                        {
                                            area.id
                                        }
                                    </td>

                                    <td>
                                        <strong>
                                            {
                                                area.name
                                            }
                                        </strong>
                                    </td>

                                    <td>
                                        <div className="admin-row-actions">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setModal(
                                                        {
                                                            type: "area",
                                                            area,
                                                        },
                                                    )
                                                }
                                            >
                                                <RiEditLine />
                                            </button>

                                            <button
                                                type="button"
                                                className="danger"
                                                onClick={() =>
                                                    openDelete(
                                                        {
                                                            title: area.name,
                                                            onDelete:
                                                                () =>
                                                                    deleteAreaMutation.mutateAsync(
                                                                        area.id,
                                                                    ),
                                                        },
                                                    )
                                                }
                                            >
                                                <RiDeleteBinLine />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ),
                        )}
                    </tbody>
                </table>
            </div>
        );
    }

    function renderEquipment() {
        return (
            <div className="admin-table-wrapper">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>
                                Оборудование
                            </th>
                            <th>
                                Инв. номер
                            </th>
                            <th>
                                Тип
                            </th>
                            <th>
                                Критичность
                            </th>
                            <th>
                                Участок
                            </th>
                            <th />
                        </tr>
                    </thead>

                    <tbody>
                        {filteredEquipment.map(
                            (item) => {
                                const area =
                                    areas.find(
                                        (
                                            current,
                                        ) =>
                                            current.id ===
                                            item.areaId,
                                    );

                                return (
                                    <tr
                                        key={
                                            item.id
                                        }
                                    >
                                        <td>
                                            <strong>
                                                {
                                                    item.name
                                                }
                                            </strong>
                                        </td>

                                        <td>
                                            {
                                                item.inventoryNumber
                                            }
                                        </td>

                                        <td>
                                            {
                                                item.type
                                            }
                                        </td>

                                        <td>
                                            <span className="admin-criticality">
                                                {
                                                    item.criticality
                                                }
                                                /5
                                            </span>
                                        </td>

                                        <td>
                                            {area?.name ||
                                                "—"}
                                        </td>

                                        <td>
                                            <div className="admin-row-actions">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setModal(
                                                            {
                                                                type: "equipment",
                                                                equipment:
                                                                    item,
                                                            },
                                                        )
                                                    }
                                                >
                                                    <RiEditLine />
                                                </button>

                                                <button
                                                    type="button"
                                                    className="danger"
                                                    onClick={() =>
                                                        openDelete(
                                                            {
                                                                title: item.name,
                                                                onDelete:
                                                                    () =>
                                                                        deleteEquipmentMutation.mutateAsync(
                                                                            item.id,
                                                                        ),
                                                            },
                                                        )
                                                    }
                                                >
                                                    <RiDeleteBinLine />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            },
                        )}
                    </tbody>
                </table>
            </div>
        );
    }

    function renderSimpleTable(
        data,
        columns,
        type,
        deleteMutation,
    ) {
        if (!data.length) {
            return (
                <EmptyState
                    icon={
                        RiFileList3Line
                    }
                    title="Записей нет"
                    text="Добавьте первую запись"
                />
            );
        }

        return (
            <div className="admin-table-wrapper">
                <table className="admin-table">
                    <thead>
                        <tr>
                            {columns.map(
                                (
                                    column,
                                ) => (
                                    <th
                                        key={
                                            column.key
                                        }
                                    >
                                        {
                                            column.label
                                        }
                                    </th>
                                ),
                            )}

                            <th />
                        </tr>
                    </thead>

                    <tbody>
                        {data.map(
                            (item) => (
                                <tr
                                    key={
                                        item.id
                                    }
                                >
                                    {columns.map(
                                        (
                                            column,
                                        ) => (
                                            <td
                                                key={
                                                    column.key
                                                }
                                            >
                                                {column.render
                                                    ? column.render(
                                                        item,
                                                    )
                                                    : item[
                                                    column
                                                        .key
                                                    ] ||
                                                    "—"}
                                            </td>
                                        ),
                                    )}

                                    <td>
                                        <div className="admin-row-actions">
                                            <button
                                                type="button"
                                                className="danger"
                                                onClick={() =>
                                                    openDelete(
                                                        {
                                                            title:
                                                                item.name ||
                                                                item.code ||
                                                                `#${item.id}`,
                                                            onDelete:
                                                                () =>
                                                                    deleteMutation.mutateAsync(
                                                                        item.id,
                                                                    ),
                                                        },
                                                    )
                                                }
                                            >
                                                <RiDeleteBinLine />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ),
                        )}
                    </tbody>
                </table>
            </div>
        );
    }

    function renderContent() {
        if (isLoading()) {
            return (
                <LoadingTable />
            );
        }

        if (isError()) {
            return (
                <ErrorState
                    onRetry={
                        refreshActive
                    }
                />
            );
        }

        switch (activeTab) {
            case "users":
                return renderUsers();

            case "shifts":
                return renderShifts();

            case "areas":
                return renderAreas();

            case "equipment":
                return renderEquipment();

            case "faultCodes":
                return renderSimpleTable(
                    faultCodes,
                    [
                        {
                            key: "code",
                            label:
                                "Код",
                        },
                        {
                            key: "name",
                            label:
                                "Название",
                        },
                        {
                            key: "category",
                            label:
                                "Категория",
                        },
                    ],
                    "faultCode",
                    deleteFaultCodeMutation,
                );

            case "materials":
                return renderSimpleTable(
                    materials,
                    [
                        {
                            key: "name",
                            label:
                                "Материал",
                        },
                        {
                            key: "unit",
                            label:
                                "Единица",
                        },
                    ],
                    "material",
                    deleteMaterialMutation,
                );

            case "brigades":
                return renderSimpleTable(
                    brigades,
                    [
                        {
                            key: "name",
                            label:
                                "Бригада",
                        },
                        {
                            key: "members",
                            label:
                                "Участников",
                            render:
                                (
                                    item,
                                ) =>
                                    item
                                        .members
                                        ?.length ||
                                    0,
                        },
                    ],
                    "brigade",
                    deleteBrigadeMutation,
                );

            case "normatives":
                return renderSimpleTable(
                    normatives,
                    [
                        {
                            key: "name",
                            label:
                                "Норматив",
                        },
                        {
                            key: "hours",
                            label:
                                "Часы",
                        },
                        {
                            key: "equipmentType",
                            label:
                                "Тип оборудования",
                        },
                        {
                            key: "faultCode",
                            label:
                                "Шифр",
                            render:
                                (
                                    item,
                                ) =>
                                    item
                                        .faultCode
                                        ?.code ||
                                    "—",
                        },
                    ],
                    "normative",
                    deleteNormativeMutation,
                );

            default:
                return null;
        }
    }

    function openCreate() {
        const typeMap = {
            users: "user",
            areas: "area",
            equipment:
                "equipment",
            faultCodes:
                "faultCode",
            materials:
                "material",
            brigades:
                "brigade",
            normatives:
                "normative",
        };

        const type =
            typeMap[activeTab];

        if (type) {
            setModal({
                type,
            });
        }
    }

    const canCreate =
        ![
            "shifts",
        ].includes(activeTab);

    const activeTabData =
        TABS.find(
            (tab) =>
                tab.id ===
                activeTab,
        );

    return (
        <div className="admin-page">
            <div className="admin-page__header">
                <div>
                    <div className="admin-page__eyebrow">
                        <RiAdminLine />
                        Системное
                        управление
                    </div>

                    <h1>
                        Администрирование
                    </h1>

                    <p>
                        Пользователи,
                        смены и
                        справочники
                        НарядAI
                    </p>
                </div>

                <button
                    type="button"
                    className="admin-button admin-button--secondary"
                    onClick={
                        refreshActive
                    }
                >
                    <RiRefreshLine />
                    Обновить
                </button>
            </div>

            <div className="admin-summary">
                <div className="admin-summary-card">
                    <span>
                        Пользователи
                    </span>

                    <strong>
                        {users.length}
                    </strong>

                    <small>
                        Всего аккаунтов
                    </small>
                </div>

                <div className="admin-summary-card">
                    <span>
                        Исполнители
                    </span>

                    <strong>
                        {
                            executors.length
                        }
                    </strong>

                    <small>
                        Зарегистрировано
                    </small>
                </div>

                <div className="admin-summary-card">
                    <span>
                        На смене
                    </span>

                    <strong>
                        {
                            executors.filter(
                                (
                                    user,
                                ) =>
                                    user.isOnShift,
                            ).length
                        }
                    </strong>

                    <small>
                        Сейчас активно
                    </small>
                </div>

                <div className="admin-summary-card">
                    <span>
                        Оборудование
                    </span>

                    <strong>
                        {
                            equipment.length
                        }
                    </strong>

                    <small>
                        Единиц в системе
                    </small>
                </div>
            </div>

            <div className="admin-workspace">
                <aside className="admin-tabs">
                    {TABS.map(
                        (tab) => {
                            const Icon =
                                tab.icon;

                            return (
                                <button
                                    type="button"
                                    key={
                                        tab.id
                                    }
                                    className={
                                        activeTab ===
                                            tab.id
                                            ? "active"
                                            : ""
                                    }
                                    onClick={() => {
                                        setActiveTab(
                                            tab.id,
                                        );

                                        setSearch(
                                            "",
                                        );
                                    }}
                                >
                                    <Icon />

                                    <span>
                                        {
                                            tab.label
                                        }
                                    </span>
                                </button>
                            );
                        },
                    )}
                </aside>

                <section className="admin-content">
                    <div className="admin-content__header">
                        <div>
                            <h2>
                                {
                                    activeTabData?.label
                                }
                            </h2>

                            <p>
                                Управление
                                данными
                                раздела
                            </p>
                        </div>

                        <div className="admin-content__actions">
                            {![
                                "shifts",
                            ].includes(
                                activeTab,
                            ) && (
                                    <SearchBox
                                        value={
                                            search
                                        }
                                        onChange={
                                            setSearch
                                        }
                                        placeholder="Поиск..."
                                    />
                                )}

                            {canCreate && (
                                <button
                                    type="button"
                                    className="admin-button admin-button--primary"
                                    onClick={
                                        openCreate
                                    }
                                >
                                    <RiAddLine />
                                    Добавить
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="admin-content__body">
                        {renderContent()}
                    </div>
                </section>
            </div>

            {modal?.type ===
                "user" && (
                    <UserModal
                        user={
                            modal.user
                        }
                        brigades={
                            brigades
                        }
                        mutation={
                            modal.user
                                ? updateUserMutation
                                : createUserMutation
                        }
                        onClose={() =>
                            setModal(null)
                        }
                    />
                )}

            {modal?.type ===
                "area" && (
                    <AreaModal
                        area={
                            modal.area
                        }
                        mutation={
                            modal.area
                                ? updateAreaMutation
                                : createAreaMutation
                        }
                        onClose={() =>
                            setModal(null)
                        }
                    />
                )}

            {modal?.type ===
                "equipment" && (
                    <EquipmentModal
                        equipment={
                            modal.equipment
                        }
                        areas={areas}
                        mutation={
                            modal.equipment
                                ? updateEquipmentMutation
                                : createEquipmentMutation
                        }
                        onClose={() =>
                            setModal(null)
                        }
                    />
                )}

            {modal?.type ===
                "faultCode" && (
                    <SimpleModal
                        type="faultCode"
                        mutation={
                            createFaultCodeMutation
                        }
                        onClose={() =>
                            setModal(null)
                        }
                    />
                )}

            {modal?.type ===
                "material" && (
                    <SimpleModal
                        type="material"
                        mutation={
                            createMaterialMutation
                        }
                        onClose={() =>
                            setModal(null)
                        }
                    />
                )}

            {modal?.type ===
                "brigade" && (
                    <SimpleModal
                        type="brigade"
                        mutation={
                            createBrigadeMutation
                        }
                        onClose={() =>
                            setModal(null)
                        }
                    />
                )}

            {modal?.type ===
                "normative" && (
                    <NormativeModal
                        equipment={
                            equipment
                        }
                        faultCodes={
                            faultCodes
                        }
                        materials={
                            materials
                        }
                        mutation={
                            createNormativeMutation
                        }
                        onClose={() =>
                            setModal(null)
                        }
                    />
                )}

            {deleteState && (
                <DeleteModal
                    state={
                        deleteState
                    }
                    onClose={() =>
                        setDeleteState(
                            null,
                        )
                    }
                />
            )}
        </div>
    );
}