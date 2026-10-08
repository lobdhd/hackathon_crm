import {
    useEffect,
    useMemo,
} from "react";

import {
    useNavigate,
    useParams,
} from "react-router-dom";

import {
    RiAlarmWarningLine,
    RiArrowLeftLine,
    RiLoader4Line,
    RiQrCodeLine,
    RiRefreshLine,
} from "react-icons/ri";

import EquipmentDetails from "./EquipmentDetails/EquipmentDetails.jsx";

import {
    extractEquipmentQrToken,
} from "../../api/equipment.api.js";

import {
    useEquipmentByQr,
} from "../../hooks/useEquipment.js";


// MARK: Helpers

function getErrorMessage(
    error,
) {
    if (
        error?.response?.status ===
        404
    ) {
        return "Оборудование с таким QR-кодом не найдено";
    }

    return (
        error?.response?.data
            ?.error ||
        error?.message ||
        "Не удалось определить оборудование по QR-коду"
    );
}


// MARK: Route resolver

export default function EquipmentEntry() {
    const {
        id = "",
    } = useParams();

    const navigate =
        useNavigate();

    const routeValue =
        String(
            id ?? "",
        ).trim();


    // MARK: Detect numeric ID

    const isNumericId =
        /^\d+$/.test(
            routeValue,
        );


    // MARK: QR token

    const qrToken =
        useMemo(
            () => {
                if (
                    isNumericId
                ) {
                    return "";
                }

                return extractEquipmentQrToken(
                    routeValue,
                );
            },
            [
                isNumericId,
                routeValue,
            ],
        );


    // MARK: Resolve QR

    const qrQuery =
        useEquipmentByQr(
            qrToken,
            {
                enabled:
                    !isNumericId &&
                    Boolean(
                        qrToken,
                    ),
            },
        );


    // MARK: QR -> numeric equipment route

    useEffect(() => {
        if (
            isNumericId
        ) {
            return;
        }

        const equipmentId =
            Number(
                qrQuery.data?.id,
            );

        if (
            !Number.isFinite(
                equipmentId,
            ) ||
            equipmentId <= 0
        ) {
            return;
        }

        navigate(
            `/equipment/${equipmentId}`,
            {
                replace:
                    true,
            },
        );
    }, [
        isNumericId,
        qrQuery.data?.id,
        navigate,
    ]);


    // MARK: Normal equipment ID

    if (
        isNumericId
    ) {
        return (
            <EquipmentDetails />
        );
    }


    // MARK: Invalid QR token

    if (!qrToken) {
        return (
            <div className="flex min-h-[520px] items-center justify-center px-5">
                <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                        <RiAlarmWarningLine
                            size={26}
                        />
                    </div>

                    <h1 className="mt-4 text-xl font-bold text-gray-900">
                        Некорректный QR-код
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-gray-500">
                        В ссылке отсутствует токен оборудования.
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/equipment",
                            )
                        }
                        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                        <RiArrowLeftLine />

                        К оборудованию
                    </button>
                </div>
            </div>
        );
    }


    // MARK: Loading

    if (
        qrQuery.isLoading ||
        qrQuery.isFetching
    ) {
        return (
            <div className="flex min-h-[520px] items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                        <RiQrCodeLine
                            size={26}
                        />
                    </div>

                    <RiLoader4Line
                        size={28}
                        className="mx-auto mt-5 animate-spin text-blue-600"
                    />

                    <p className="mt-3 text-sm font-semibold text-gray-700">
                        Определяем оборудование...
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                        Проверяем QR-код в системе
                    </p>
                </div>
            </div>
        );
    }


    // MARK: Error

    if (
        qrQuery.isError
    ) {
        return (
            <div className="flex min-h-[520px] items-center justify-center px-5">
                <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                        <RiAlarmWarningLine
                            size={26}
                        />
                    </div>

                    <h1 className="mt-4 text-xl font-bold text-gray-900">
                        QR-код не распознан
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-gray-500">
                        {getErrorMessage(
                            qrQuery.error,
                        )}
                    </p>

                    <div className="mt-5 rounded-xl bg-gray-50 p-3 text-left">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                            QR token
                        </p>

                        <p className="mt-1 break-all font-mono text-xs text-gray-600">
                            {qrToken}
                        </p>
                    </div>

                    <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
                        <button
                            type="button"
                            onClick={() =>
                                qrQuery.refetch()
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                            <RiRefreshLine />

                            Повторить
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                navigate(
                                    "/equipment",
                                )
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                        >
                            <RiArrowLeftLine />

                            К оборудованию
                        </button>
                    </div>
                </div>
            </div>
        );
    }


    // MARK: Redirecting after successful QR resolve

    return (
        <div className="flex min-h-[520px] items-center justify-center">
            <RiLoader4Line
                size={28}
                className="animate-spin text-blue-600"
            />
        </div>
    );
}
