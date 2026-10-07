import {
    Link,
} from "react-router-dom";

import {
    RiArrowLeftLine,
    RiInformationLine,
    RiShieldUserLine,
    RiSparkling2Line,
    RiUserSettingsLine,
} from "react-icons/ri";

import {
    t as i18nT,
    useI18n,
} from "../../../i18n/index.js";


// MARK: Component

export default function Register() {
    useI18n();

    return (
        <div className="flex min-h-screen bg-[#f7f8fa]">
            <div className="m-auto w-full max-w-lg px-5 py-10">

                {/* MARK: Brand */}

                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                        <RiSparkling2Line
                            size={24}
                        />
                    </div>

                    <div className="text-lg font-semibold text-gray-900">
                        {i18nT(
                            "sidebar.brand",
                        )}
                    </div>
                </div>


                {/* MARK: Card */}

                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

                    <div className="border-b border-gray-100 px-6 py-7 sm:px-8">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <RiShieldUserLine
                                size={25}
                            />
                        </div>

                        <h1 className="mt-5 text-2xl font-bold tracking-tight text-gray-950">
                            Получение доступа
                        </h1>

                        <p className="mt-2 text-sm leading-6 text-gray-500">
                            Самостоятельная
                            регистрация в системе
                            отключена.
                        </p>
                    </div>


                    <div className="space-y-5 px-6 py-6 sm:px-8">

                        <div className="flex gap-4 rounded-xl bg-gray-50 p-4">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-gray-600 shadow-sm ring-1 ring-gray-200">
                                <RiUserSettingsLine
                                    size={19}
                                />
                            </div>

                            <div>
                                <div className="text-sm font-semibold text-gray-800">
                                    Аккаунт создаёт
                                    администратор
                                </div>

                                <p className="mt-1 text-sm leading-6 text-gray-500">
                                    Администратор
                                    создаёт пользователя,
                                    назначает роль,
                                    специальность,
                                    бригаду и выдаёт
                                    начальный пароль.
                                </p>
                            </div>
                        </div>


                        <div className="flex gap-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                            <RiInformationLine
                                size={20}
                                className="mt-0.5 shrink-0 text-blue-600"
                            />

                            <p className="text-sm leading-6 text-blue-900">
                                Если вам нужен доступ
                                к НарядAI, обратитесь
                                к администратору вашей
                                организации.
                            </p>
                        </div>


                        <Link
                            to="/login"
                            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
                        >
                            <RiArrowLeftLine
                                size={17}
                            />

                            Вернуться ко входу
                        </Link>

                    </div>
                </div>


                <p className="mt-5 text-center text-xs text-gray-400">
                    НарядAI · защищённый доступ
                </p>
            </div>
        </div>
    );
}