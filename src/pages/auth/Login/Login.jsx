
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
    RiArrowRightLine,
    RiEyeLine,
    RiEyeOffLine,
    RiInformationLine,
    RiLoader4Line,
    RiLockPasswordLine,
    RiPhoneLine,
    RiShieldCheckLine,
} from "react-icons/ri";

import { t as i18nT, useI18n } from "../../../i18n/index.js";

import { useAuth } from "../../../auth/AuthProvider.jsx";
import { getDefaultRoute } from "../../../auth/roles.js";
import { ApiError } from "../../../api/client.js";

// MARK: Helpers

function formatRetryTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const restSeconds = seconds % 60;

    return `${minutes}:${String(restSeconds).padStart(2, "0")}`;
}

function resolveTarget(location, role) {
    const from = location.state?.from?.pathname;

    if (from && from !== "/login") {
        return from;
    }

    return getDefaultRoute(role);
}

// MARK: Brand Logo

function BrandLogo({ dark = false }) {
    return (
        <div
            className={[
                "relative flex h-11 w-11 shrink-0 items-center justify-center",
                "overflow-hidden rounded-[15px] p-[3px]",
                "transition-transform duration-300 hover:scale-105",
                dark
                    ? "border border-white/20 bg-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.20)]"
                    : "border border-blue-100 bg-white shadow-[0_6px_20px_rgba(37,99,235,0.12)]",
            ].join(" ")}
        >
            <img
                src="/icon.png"
                alt="НарядAI"
                className="block h-full w-full rounded-[11px] object-cover object-center"
                draggable={false}
            />
        </div>
    );
}

// MARK: Component

export default function Login() {
    const __i18nLocaleToken = i18nT("sidebar.home");

    useI18n();

    const navigate = useNavigate();
    const location = useLocation();

    const {
        login,
        role,
        isAuthenticated,
        isBootstrapping,
    } = useAuth();

    // MARK: State

    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [retryAfter, setRetryAfter] = useState(0);

    // MARK: Redirect authorized user

    useEffect(() => {
        if (!isBootstrapping && isAuthenticated) {
            navigate(resolveTarget(location, role), {
                replace: true,
            });
        }
    }, [
        isAuthenticated,
        isBootstrapping,
        role,
        location,
        navigate,
    ]);

    // MARK: Retry countdown

    useEffect(() => {
        if (retryAfter <= 0) {
            return undefined;
        }

        const timer = window.setInterval(() => {
            setRetryAfter((current) => Math.max(0, current - 1));
        }, 1000);

        return () => window.clearInterval(timer);
    }, [retryAfter]);

    // MARK: Form state

    const isDisabled = useMemo(
        () =>
            isSubmitting ||
            retryAfter > 0 ||
            !phone.trim() ||
            !password,
        [
            isSubmitting,
            retryAfter,
            phone,
            password,
            __i18nLocaleToken,
        ],
    );

    // MARK: Submit

    async function handleSubmit(event) {
        event.preventDefault();

        if (isDisabled) {
            return;
        }

        setErrorMessage("");
        setIsSubmitting(true);

        try {
            const result = await login({
                phone: phone.trim(),
                password,
            });

            navigate(
                resolveTarget(location, result?.user?.role),
                { replace: true },
            );
        } catch (error) {
            if (error instanceof ApiError) {
                if (error.status === 429) {
                    setRetryAfter(error.retryAfter ?? 60);
                }

                setErrorMessage(error.message);
            } else {
                setErrorMessage("Не удалось войти в систему");
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    // MARK: Render

    return (
        <div className="min-h-screen bg-[#f7f8fa]">
            <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">

                {/* MARK: Left side */}

                <section className="relative hidden overflow-hidden bg-[#111827] p-10 text-white lg:flex lg:flex-col">

                    <div className="pointer-events-none absolute -left-28 top-[-120px] h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />

                    <div className="pointer-events-none absolute bottom-[-160px] right-[-80px] h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />

                    {/* Brand */}

                    <div className="relative z-10 flex items-center gap-3">
                        <BrandLogo dark />

                        <span className="text-lg font-semibold tracking-tight">
                            {i18nT("sidebar.brand")}
                        </span>
                    </div>

                    {/* Main content */}

                    <div className="relative z-10 my-auto max-w-xl">

                        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300">
                            <RiShieldCheckLine
                                size={16}
                                className="text-blue-400"
                            />

                            {i18nT("pages.auth.login.login.04bd1d8")}
                        </div>

                        <h1 className="max-w-lg text-4xl font-semibold leading-tight tracking-tight">
                            {i18nT("pages.auth.login.login.8fe0dac")}
                        </h1>

                        <p className="mt-5 max-w-lg text-sm leading-7 text-gray-400">
                            {i18nT("pages.auth.login.login.1991a6e")}
                        </p>

                        {/* Features */}

                        <div className="mt-10 grid max-w-lg grid-cols-2 gap-3">
                            {[
                                ["Контроль", "Наряды и сроки"],
                                ["Аналитика", "Простои и эффективность"],
                                ["AI", "Проверка выполнения"],
                                ["Realtime", "Актуальные статусы"],
                            ].map(([title, description]) => (
                                <div
                                    key={title}
                                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                                >
                                    <div className="text-xs text-gray-500">
                                        {title}
                                    </div>

                                    <div className="mt-1 text-sm font-medium text-gray-200">
                                        {description}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}

                    <div className="relative z-10 text-xs text-gray-600">
                        {i18nT("sidebar.brand")}
                    </div>
                </section>

                {/* MARK: Login side */}

                <main className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
                    <div className="w-full max-w-[430px]">

                        {/* Mobile brand */}

                        <div className="mb-9 flex items-center gap-3 lg:hidden">
                            <BrandLogo />

                            <span className="font-semibold tracking-tight text-gray-900">
                                {i18nT("sidebar.brand")}
                            </span>
                        </div>

                        {/* Heading */}

                        <div className="mb-8">
                            <h2 className="text-[28px] font-bold tracking-tight text-gray-950">
                                {i18nT("pages.auth.login.login.700a3f1")}
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-gray-500">
                                {i18nT("pages.auth.login.login.5657149")}
                            </p>
                        </div>

                        {/* Error */}

                        {errorMessage && (
                            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                <RiInformationLine
                                    size={19}
                                    className="mt-0.5 shrink-0"
                                />

                                <span>{errorMessage}</span>
                            </div>
                        )}

                        {/* MARK: Form */}

                        <form
                            onSubmit={handleSubmit}
                            className="space-y-5"
                        >

                            {/* Phone */}

                            <div>
                                <label
                                    htmlFor="phone"
                                    className="mb-2 block text-sm font-medium text-gray-700"
                                >
                                    {i18nT("employeeModal.phone")}
                                </label>

                                <div className="relative">
                                    <RiPhoneLine
                                        size={19}
                                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                                    />

                                    <input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        inputMode="tel"
                                        autoComplete="tel"
                                        value={phone}
                                        onChange={(event) => {
                                            setPhone(event.target.value);
                                            setErrorMessage("");
                                        }}
                                        placeholder="+7 700 000 00 00"
                                        className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                    />
                                </div>
                            </div>

                            {/* Password */}

                            <div>
                                <label
                                    htmlFor="password"
                                    className="mb-2 block text-sm font-medium text-gray-700"
                                >
                                    {i18nT("login.password")}
                                </label>

                                <div className="relative">
                                    <RiLockPasswordLine
                                        size={19}
                                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                                    />

                                    <input
                                        id="password"
                                        name="password"
                                        type={
                                            showPassword
                                                ? "text"
                                                : "password"
                                        }
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={(event) => {
                                            setPassword(event.target.value);
                                            setErrorMessage("");
                                        }}
                                        placeholder={i18nT("login.passwordPlaceholder")}
                                        className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-12 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword((current) => !current)
                                        }
                                        className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                                        aria-label={
                                            showPassword
                                                ? "Скрыть пароль"
                                                : "Показать пароль"
                                        }
                                    >
                                        {showPassword ? (
                                            <RiEyeOffLine size={19} />
                                        ) : (
                                            <RiEyeLine size={19} />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* MARK: Submit button */}

                            <button
                                type="submit"
                                disabled={isDisabled}
                                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                            >
                                {isSubmitting ? (
                                    <>
                                        <RiLoader4Line
                                            size={19}
                                            className="animate-spin"
                                        />
                                        {i18nT("pages.auth.login.login.d1231f6")}
                                    </>
                                ) : retryAfter > 0 ? (
                                    <>
                                        {i18nT("pages.auth.login.login.dd74643")}{" "}
                                        {formatRetryTime(retryAfter)}
                                    </>
                                ) : (
                                    <>
                                        {i18nT("login.signIn")}
                                        <RiArrowRightLine size={18} />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* MARK: Access information */}

                        <div className="mt-6 rounded-xl border border-gray-200 bg-white px-4 py-3.5">
                            <div className="flex items-start gap-3">
                                <RiInformationLine
                                    size={19}
                                    className="mt-0.5 shrink-0 text-gray-400"
                                />

                                <div>
                                    <div className="text-sm font-medium text-gray-800">
                                        {i18nT("pages.auth.login.login.d4d259d")}
                                    </div>

                                    <p className="mt-1 text-xs leading-5 text-gray-500">
                                        {i18nT("pages.auth.login.login.f5ad1a4")}
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
}
