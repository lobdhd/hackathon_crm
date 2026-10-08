
import { useEffect, useState } from "react";
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

import loginPhoto from "../../../assets/l.avif";

import {
    t as i18nT,
    useI18n,
} from "../../../i18n/index.js";

import {
    useAuth,
} from "../../../auth/AuthProvider.jsx";

import {
    getDefaultRoute,
} from "../../../auth/roles.js";

import {
    ApiError,
} from "../../../api/client.js";


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


// MARK: Brand

function BrandLogo({ dark = false }) {
    return (
        <div
            className={[
                "flex h-11 w-11 shrink-0 items-center justify-center",
                "overflow-hidden rounded-[14px] p-[3px]",
                dark
                    ? "border border-white/25 bg-white/90 shadow-lg"
                    : "border border-blue-100 bg-white shadow-sm",
            ].join(" ")}
        >
            <img
                src="/icon.png"
                alt="НарядAI"
                draggable={false}
                className="h-full w-full rounded-[10px] object-cover"
            />
        </div>
    );
}


// MARK: Login

export default function Login() {
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

    const isDisabled =
        isSubmitting ||
        retryAfter > 0 ||
        !phone.trim() ||
        !password;

    // MARK: Redirect

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
            setRetryAfter((current) =>
                Math.max(0, current - 1),
            );
        }, 1000);

        return () => window.clearInterval(timer);
    }, [retryAfter]);

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
        <div className="min-h-screen bg-white">
            <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">

                {/* MARK: Photo panel */}

                <section className="relative isolate hidden min-h-screen overflow-hidden bg-slate-950 text-white lg:flex lg:flex-col">

                    {/* Background image */}
                    <img
                        src={loginPhoto}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
                    />

                    {/* Photo overlays */}
                    <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-slate-950/55 via-slate-950/5 to-slate-950/90" />

                    <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/35 via-transparent to-transparent" />

                    {/* Header */}
                    <div className="flex items-center gap-3 p-8 xl:p-12">
                        <BrandLogo dark />

                        <div>
                            <div className="text-base font-bold tracking-tight">
                                {i18nT("sidebar.brand")}
                            </div>
                            <div className="mt-0.5 text-[11px] font-medium tracking-[0.15em] text-white/65">
                                ҚОСТАНАЙ МИНЕРАЛДАРЫ
                            </div>
                        </div>
                    </div>

                    {/* Bottom content */}
                    <div className="mt-auto px-8 pb-10 xl:px-12 xl:pb-12">

                        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-medium text-white/90 backdrop-blur-md">
                            <RiShieldCheckLine size={16} />
                            {i18nT("pages.auth.login.login.04bd1d8")}
                        </div>

                        <h1 className="max-w-[610px] text-[38px] font-semibold leading-[1.12] tracking-tight xl:text-[48px]">
                            {i18nT("pages.auth.login.login.8fe0dac")}
                        </h1>

                        <p className="mt-5 max-w-[480px] text-sm leading-7 text-white/80">
                            {i18nT("pages.auth.login.login.1991a6e")}
                        </p>

                        <div className="mt-10 h-px w-full max-w-[600px] bg-white/20" />

                        <div className="mt-5 flex items-center justify-between gap-4 text-xs text-white/60">
                            <span>
                                {i18nT("sidebar.brand")}
                            </span>

                            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-medium tracking-wide text-white/80 backdrop-blur-md">
                                AI · INDUSTRY
                            </span>
                        </div>
                    </div>
                </section>

                {/* MARK: Form panel */}

                <main className="relative flex min-h-screen items-center justify-center bg-[#fafbfc] px-5 py-12 sm:px-10 lg:px-12 xl:px-20">

                    <div className="w-full max-w-[420px]">

                        {/* Mobile logo */}
                        <div className="mb-12 flex items-center gap-3 lg:hidden">
                            <BrandLogo />

                            <span className="text-lg font-bold tracking-tight text-slate-900">
                                {i18nT("sidebar.brand")}
                            </span>
                        </div>

                        {/* Header */}
                        <div className="mb-9">
                            <div className="mb-4 h-1 w-10 rounded-full bg-blue-600" />

                            <h2 className="text-[30px] font-bold tracking-tight text-slate-950 sm:text-[34px]">
                                {i18nT("pages.auth.login.login.700a3f1")}
                            </h2>

                            <p className="mt-3 text-sm leading-6 text-slate-500">
                                {i18nT("pages.auth.login.login.5657149")}
                            </p>
                        </div>

                        {/* Error */}
                        {errorMessage && (
                            <div
                                role="alert"
                                className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700"
                            >
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
                            className="space-y-6"
                        >

                            {/* Phone */}
                            <div>
                                <label
                                    htmlFor="phone"
                                    className="mb-2.5 block text-sm font-semibold text-slate-700"
                                >
                                    {i18nT("employeeModal.phone")}
                                </label>

                                <div className="relative">
                                    <RiPhoneLine
                                        size={19}
                                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
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
                                        className="h-[54px] w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label
                                    htmlFor="password"
                                    className="mb-2.5 block text-sm font-semibold text-slate-700"
                                >
                                    {i18nT("login.password")}
                                </label>

                                <div className="relative">
                                    <RiLockPasswordLine
                                        size={19}
                                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                    />

                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={(event) => {
                                            setPassword(event.target.value);
                                            setErrorMessage("");
                                        }}
                                        placeholder={i18nT("login.passwordPlaceholder")}
                                        className="h-[54px] w-full rounded-xl border border-slate-200 bg-white pl-12 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword((current) => !current)
                                        }
                                        aria-label={
                                            showPassword
                                                ? "Скрыть пароль"
                                                : "Показать пароль"
                                        }
                                        className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                    >
                                        {showPassword ? (
                                            <RiEyeOffLine size={19} />
                                        ) : (
                                            <RiEyeLine size={19} />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={isDisabled}
                                className="flex h-[54px] w-full items-center justify-center gap-2.5 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(37,99,235,0.18)] transition-all duration-200 hover:bg-blue-700 hover:shadow-[0_8px_24px_rgba(37,99,235,0.24)] disabled:cursor-not-allowed disabled:bg-blue-300 disabled:shadow-none"
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
                                        {i18nT("pages.auth.login.login.dd74643")}
                                        {" "}
                                        {formatRetryTime(retryAfter)}
                                    </>
                                ) : (
                                    <>
                                        {i18nT("login.signIn")}
                                        <RiArrowRightLine size={19} />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Footer */}
                        <div className="mt-10 border-t border-slate-200 pt-6">
                            <p className="text-center text-xs leading-5 text-slate-400">
                                {i18nT("sidebar.brand")}
                            </p>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
