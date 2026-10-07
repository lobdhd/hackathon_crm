import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import {
    RiAlarmWarningLine,
    RiArrowDownSLine,
    RiCheckboxCircleLine,
    RiFileList3Line,
    RiGlobalLine,
    RiLoader4Line,
    RiMenuLine,
    RiNotification3Line,
    RiRefreshLine,
    RiSearchLine,
    RiSparkling2Line,
    RiTeamLine,
    RiTimeLine,
    RiUserLine,
} from "react-icons/ri";

import {
    useI18n,
} from "../../i18n/index.js";

import {
    useAuth,
} from "../../auth/AuthProvider.jsx";

import {
    useMarkAllNotificationsRead,
    useMarkNotificationRead,
    useNotifications,
} from "../../hooks/useNotifications.js";

import {
    useRealtimeSync,
} from "../../hooks/useRealtimeSync.js";

import ScrollArea from "../ScrollArea/ScrollArea.jsx";


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

function getNotificationMeta(
    type,
) {
    const value =
        String(
            type || "",
        );

    if (
        value ===
        "NEW_ORDER"
    ) {
        return {
            icon:
                RiFileList3Line,

            iconClass:
                "bg-blue-50 text-blue-600",
        };
    }

    if (
        value ===
        "DEADLINE_REMINDER"
    ) {
        return {
            icon:
                RiTimeLine,

            iconClass:
                "bg-amber-50 text-amber-600",
        };
    }

    if (
        value.startsWith(
            "OVERDUE",
        ) ||
        value.startsWith(
            "LONG_OVERDUE",
        )
    ) {
        return {
            icon:
                RiAlarmWarningLine,

            iconClass:
                "bg-red-50 text-red-600",
        };
    }

    if (
        value ===
        "NOT_ACCEPTED"
    ) {
        return {
            icon:
                RiUserLine,

            iconClass:
                "bg-orange-50 text-orange-600",
        };
    }

    if (
        value ===
        "BRIGADE_ORDER"
    ) {
        return {
            icon:
                RiTeamLine,

            iconClass:
                "bg-cyan-50 text-cyan-600",
        };
    }

    if (
        value ===
        "WEEKLY_AI_SUMMARY"
    ) {
        return {
            icon:
                RiSparkling2Line,

            iconClass:
                "bg-violet-50 text-violet-600",
        };
    }

    return {
        icon:
            RiNotification3Line,

        iconClass:
            "bg-gray-100 text-gray-600",
    };
}

function formatNotificationTime(
    value,
) {
    if (!value) {
        return "";
    }

    const date =
        new Date(
            value,
        );

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return "";
    }

    const diff =
        Date.now() -
        date.getTime();

    const minutes =
        Math.max(
            0,
            Math.floor(
                diff /
                    60000,
            ),
        );

    if (minutes < 1) {
        return "только что";
    }

    if (minutes < 60) {
        return `${minutes} мин назад`;
    }

    const hours =
        Math.floor(
            minutes / 60,
        );

    if (hours < 24) {
        return `${hours} ч назад`;
    }

    const days =
        Math.floor(
            hours / 24,
        );

    if (days < 7) {
        return `${days} дн. назад`;
    }

    return date.toLocaleString(
        "ru-RU",
        {
            day:
                "2-digit",

            month:
                "2-digit",

            year:
                "numeric",

            hour:
                "2-digit",

            minute:
                "2-digit",
        },
    );
}


// MARK: Navbar

export default function AppNavbar({
    onMenuClick,
}) {
    const navigate =
        useNavigate();

    const {
        language,
        setLanguage,
        t,
    } = useI18n();

    const {
        user,
    } = useAuth();


    // MARK: Realtime

    useRealtimeSync();


    // MARK: Notifications

    const notificationsQuery =
        useNotifications();

    const markReadMutation =
        useMarkNotificationRead();

    const markAllMutation =
        useMarkAllNotificationsRead();

    const notifications =
        Array.isArray(
            notificationsQuery.data,
        )
            ? notificationsQuery.data
            : [];

    const unread =
        useMemo(
            () =>
                notifications.filter(
                    (
                        item,
                    ) =>
                        !item.isRead,
                ),
            [
                notifications,
            ],
        );

    const unreadCount =
        unread.length;


    // MARK: Dropdown

    const [
        notificationsOpen,
        setNotificationsOpen,
    ] = useState(false);

    const notificationsRef =
        useRef(null);


    // MARK: Refresh on open

    useEffect(() => {
        if (
            notificationsOpen
        ) {
            notificationsQuery.refetch();
        }
        // refetch function is stable enough
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        notificationsOpen,
    ]);


    // MARK: Outside click

    useEffect(() => {
        if (
            !notificationsOpen
        ) {
            return undefined;
        }

        function handlePointerDown(
            event,
        ) {
            if (
                notificationsRef.current &&
                !notificationsRef.current.contains(
                    event.target,
                )
            ) {
                setNotificationsOpen(
                    false,
                );
            }
        }

        function handleKeyDown(
            event,
        ) {
            if (
                event.key ===
                "Escape"
            ) {
                setNotificationsOpen(
                    false,
                );
            }
        }

        document.addEventListener(
            "pointerdown",
            handlePointerDown,
        );

        document.addEventListener(
            "keydown",
            handleKeyDown,
        );

        return () => {
            document.removeEventListener(
                "pointerdown",
                handlePointerDown,
            );

            document.removeEventListener(
                "keydown",
                handleKeyDown,
            );
        };
    }, [
        notificationsOpen,
    ]);


    // MARK: Notification click

    async function handleNotificationClick(
        notification,
    ) {
        if (
            !notification.isRead
        ) {
            markReadMutation.mutate(
                notification.id,
            );
        }

        setNotificationsOpen(
            false,
        );

        if (
            notification.workOrderId
        ) {
            navigate(
                `/orders/${notification.workOrderId}`,
            );
        }
    }


    // MARK: Read all

    function handleReadAll() {
        const ids =
            unread.map(
                (item) =>
                    item.id,
            );

        if (
            ids.length ===
            0
        ) {
            return;
        }

        markAllMutation.mutate(
            ids,
        );
    }


    return (
        <header className="fixed left-0 right-0 top-0 z-30 h-16 border-b border-gray-200 bg-white lg:left-64">
            <div className="flex h-full items-center justify-between px-4 md:px-6">

                {/* MARK: Left */}

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={
                            onMenuClick
                        }
                        className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 lg:hidden"
                    >
                        <RiMenuLine
                            size={
                                23
                            }
                        />
                    </button>

                    <div className="relative hidden md:block">
                        <RiSearchLine
                            size={
                                18
                            }
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                            type="text"
                            placeholder={t(
                                "navbar.search",
                            )}
                            className="
                                w-72
                                rounded-lg
                                border
                                border-gray-300
                                bg-gray-50
                                py-2
                                pl-10
                                pr-4
                                text-sm
                                text-gray-900
                                outline-none
                                transition
                                focus:border-blue-500
                                focus:ring-2
                                focus:ring-blue-100
                            "
                        />
                    </div>
                </div>


                {/* MARK: Right */}

                <div className="flex items-center gap-2">

                    {/* Shift */}

                    <div className="hidden items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700 sm:flex">
                        <span className="h-2 w-2 rounded-full bg-green-500" />

                        {t(
                            "navbar.shiftActive",
                        )}
                    </div>


                    {/* Language */}

                    <div className="hidden items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 sm:flex">
                        <div className="flex h-7 w-7 items-center justify-center text-gray-400">
                            <RiGlobalLine
                                size={
                                    17
                                }
                            />
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setLanguage(
                                    "ru",
                                )
                            }
                            className={`
                                rounded-md
                                px-2.5
                                py-1.5
                                text-xs
                                font-semibold
                                transition

                                ${
                                    language ===
                                    "ru"
                                        ? "bg-white text-blue-600 shadow-sm"
                                        : "text-gray-500 hover:bg-white hover:text-gray-900"
                                }
                            `}
                        >
                            RU
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                setLanguage(
                                    "kk",
                                )
                            }
                            className={`
                                rounded-md
                                px-2.5
                                py-1.5
                                text-xs
                                font-semibold
                                transition

                                ${
                                    language ===
                                    "kk"
                                        ? "bg-white text-blue-600 shadow-sm"
                                        : "text-gray-500 hover:bg-white hover:text-gray-900"
                                }
                            `}
                        >
                            ҚАЗ
                        </button>
                    </div>


                    {/* MARK: Notifications */}

                    <div
                        ref={
                            notificationsRef
                        }
                        className="relative"
                    >
                        <button
                            type="button"
                            onClick={() =>
                                setNotificationsOpen(
                                    (
                                        previous,
                                    ) =>
                                        !previous,
                                )
                            }
                            className={`
                                relative
                                rounded-lg
                                p-2.5
                                transition

                                ${
                                    notificationsOpen
                                        ? "bg-blue-50 text-blue-700"
                                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                                }
                            `}
                            aria-label="Уведомления"
                            aria-expanded={
                                notificationsOpen
                            }
                        >
                            <RiNotification3Line
                                size={
                                    21
                                }
                            />

                            {unreadCount >
                                0 && (
                                <>
                                    <span className="absolute right-[7px] top-[7px] h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />

                                    <span className="absolute -right-1.5 -top-1.5 flex min-w-[19px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-[19px] text-white shadow-sm">
                                        {unreadCount >
                                        99
                                            ? "99+"
                                            : unreadCount}
                                    </span>
                                </>
                            )}
                        </button>


                        {/* Dropdown */}

                        {notificationsOpen && (
                            <div className="absolute right-0 top-[calc(100%+10px)] w-[390px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">

                                {/* Header */}

                                <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-bold text-gray-900">
                                                Уведомления
                                            </h3>

                                            {unreadCount >
                                                0 && (
                                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                                    {
                                                        unreadCount
                                                    }{" "}
                                                    новых
                                                </span>
                                            )}
                                        </div>

                                        <p className="mt-1 text-[11px] text-gray-400">
                                            Последние
                                            события
                                            системы
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                notificationsQuery.refetch()
                                            }
                                            disabled={
                                                notificationsQuery.isFetching
                                            }
                                            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
                                            title="Обновить"
                                        >
                                            <RiRefreshLine
                                                size={
                                                    17
                                                }
                                                className={
                                                    notificationsQuery.isFetching
                                                        ? "animate-spin"
                                                        : ""
                                                }
                                            />
                                        </button>

                                        {unreadCount >
                                            0 && (
                                            <button
                                                type="button"
                                                onClick={
                                                    handleReadAll
                                                }
                                                disabled={
                                                    markAllMutation.isPending
                                                }
                                                className="rounded-lg px-2.5 py-2 text-[11px] font-semibold text-blue-600 transition hover:bg-blue-50 disabled:opacity-50"
                                            >
                                                Прочитать
                                                все
                                            </button>
                                        )}
                                    </div>
                                </div>


                                {/* Body */}

                                {notificationsQuery.isLoading ? (
                                    <div className="flex h-[300px] items-center justify-center">
                                        <RiLoader4Line
                                            size={
                                                26
                                            }
                                            className="animate-spin text-blue-600"
                                        />
                                    </div>
                                ) : notificationsQuery.isError ? (
                                    <div className="flex h-[300px] items-center justify-center px-6 text-center">
                                        <div>
                                            <RiAlarmWarningLine
                                                size={
                                                    28
                                                }
                                                className="mx-auto text-red-400"
                                            />

                                            <p className="mt-3 text-sm font-semibold text-gray-800">
                                                Не удалось
                                                загрузить
                                                уведомления
                                            </p>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    notificationsQuery.refetch()
                                                }
                                                className="mt-3 text-xs font-semibold text-blue-600"
                                            >
                                                Повторить
                                            </button>
                                        </div>
                                    </div>
                                ) : notifications.length ===
                                  0 ? (
                                    <div className="flex h-[300px] items-center justify-center px-6 text-center">
                                        <div>
                                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
                                                <RiNotification3Line
                                                    size={
                                                        22
                                                    }
                                                />
                                            </div>

                                            <p className="mt-3 text-sm font-semibold text-gray-800">
                                                Уведомлений
                                                пока нет
                                            </p>

                                            <p className="mt-1 text-xs text-gray-400">
                                                Новые
                                                события
                                                появятся
                                                здесь
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <ScrollArea
                                        axis="y"
                                        className="max-h-[470px]"
                                    >
                                        <div className="divide-y divide-gray-100">
                                            {notifications.map(
                                                (
                                                    notification,
                                                ) => (
                                                    <NotificationItem
                                                        key={
                                                            notification.id
                                                        }
                                                        notification={
                                                            notification
                                                        }
                                                        onClick={() =>
                                                            handleNotificationClick(
                                                                notification,
                                                            )
                                                        }
                                                    />
                                                ),
                                            )}
                                        </div>
                                    </ScrollArea>
                                )}


                                {/* Footer */}

                                {notifications.length >
                                    0 && (
                                    <div className="border-t border-gray-100 bg-gray-50 px-4 py-2.5 text-center">
                                        <span className="text-[10px] font-medium text-gray-400">
                                            Показаны
                                            последние{" "}
                                            {
                                                notifications.length
                                            }{" "}
                                            уведомлений
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>


                    {/* MARK: User */}

                    <div className="ml-1 flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-gray-100">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                            {getInitials(
                                user?.fullName,
                            )}
                        </div>

                        <div className="hidden text-left md:block">
                            <div className="max-w-[180px] truncate text-sm font-semibold text-gray-900">
                                {user?.fullName ||
                                    t(
                                        "navbar.userName",
                                    )}
                            </div>

                            <div className="text-xs text-gray-500">
                                {ROLE_LABELS[
                                    user?.role
                                ] ||
                                    user?.role ||
                                    t(
                                        "navbar.shiftMaster",
                                    )}
                            </div>
                        </div>

                        <RiArrowDownSLine
                            className="hidden text-gray-400 md:block"
                            size={
                                18
                            }
                        />
                    </div>
                </div>
            </div>
        </header>
    );
}


// MARK: Notification item

function NotificationItem({
    notification,
    onClick,
}) {
    const meta =
        getNotificationMeta(
            notification.type,
        );

    const Icon =
        meta.icon;

    return (
        <button
            type="button"
            onClick={
                onClick
            }
            className={`
                relative
                flex
                w-full
                items-start
                gap-3
                px-4
                py-3.5
                text-left
                transition

                ${
                    notification.isRead
                        ? "bg-white hover:bg-gray-50"
                        : "bg-blue-50/40 hover:bg-blue-50/70"
                }
            `}
        >
            {!notification.isRead && (
                <span className="absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-blue-600" />
            )}

            <div
                className={`
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl

                    ${meta.iconClass}
                `}
            >
                <Icon
                    size={
                        17
                    }
                />
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                    <p
                        className={`
                            line-clamp-1
                            text-sm
                            text-gray-900

                            ${
                                notification.isRead
                                    ? "font-medium"
                                    : "font-bold"
                            }
                        `}
                    >
                        {notification.title ||
                            "Уведомление"}
                    </p>

                    <span className="shrink-0 text-[10px] text-gray-400">
                        {formatNotificationTime(
                            notification.createdAt,
                        )}
                    </span>
                </div>

                <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                    {notification.message ||
                        ""}
                </p>

                <div className="mt-2 flex items-center gap-2">
                    <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gray-500">
                        {
                            notification.type
                        }
                    </span>

                    {notification.workOrderId && (
                        <span className="text-[10px] font-semibold text-blue-600">
                            Открыть наряд →
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
}