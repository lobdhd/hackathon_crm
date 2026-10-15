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

import "./Login.css";


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

function BrandLogo({ small = false }) {
    return (
        <span className={`lg-logo${small ? " lg-logo--small" : ""}`}>
            <img
                src="/icon.png"
                alt="НарядAI"
                draggable={false}
            />
        </span>
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
    const [capsLock, setCapsLock] = useState(false);

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

    function trackCapsLock(event) {
        setCapsLock(Boolean(event.getModifierState?.("CapsLock")));
    }

    // MARK: Render

    return (
        <div className="lg">

            {/* MARK: Visual — фото в скруглённой рамке */}

            <section className="lg-visual">
                <img
                    src={loginPhoto}
                    alt=""
                    aria-hidden="true"
                    className="lg-visual__photo"
                />
                <div className="lg-visual__shade" aria-hidden="true" />

                <header className="lg-visual__top">
                    <div className="lg-visual__brand">
                        <BrandLogo small />
                        <strong>{i18nT("sidebar.brand")}</strong>
                    </div>

                    <span className="lg-tag">
                        <RiShieldCheckLine size={15} />
                        {i18nT("pages.auth.login.login.04bd1d8")}
                    </span>
                </header>

                <div className="lg-visual__bottom">
                    <h1>{i18nT("pages.auth.login.login.8fe0dac")}</h1>

                    <p>{i18nT("pages.auth.login.login.1991a6e")}</p>
                </div>
            </section>

            {/* MARK: Form */}

            <main className="lg-side">
                <div className="lg-form-wrap">

                    <div className="lg-mark">
                        <BrandLogo />
                    </div>

                    <h2 className="lg-title">
                        {i18nT("pages.auth.login.login.700a3f1")}
                    </h2>

                    <p className="lg-subtitle">
                        {i18nT("pages.auth.login.login.5657149")}
                    </p>

                    {/* Error */}
                    {errorMessage && (
                        <div
                            role="alert"
                            aria-live="assertive"
                            className="lg-alert"
                        >
                            <RiInformationLine size={19} />

                            <span>{errorMessage}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="lg-form">

                        {/* Phone */}
                        <div className="lg-field">
                            <label htmlFor="phone" className="lg-label">
                                {i18nT("employeeModal.phone")}
                            </label>

                            <div className="lg-control">
                                <RiPhoneLine size={19} className="lg-control__icon" />

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
                                    className="lg-input"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="lg-field">
                            <label htmlFor="password" className="lg-label">
                                {i18nT("login.password")}
                            </label>

                            <div className="lg-control">
                                <RiLockPasswordLine size={19} className="lg-control__icon" />

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
                                    onKeyDown={trackCapsLock}
                                    onKeyUp={trackCapsLock}
                                    onBlur={() => setCapsLock(false)}
                                    placeholder={i18nT("login.passwordPlaceholder")}
                                    className="lg-input lg-input--password"
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
                                    className="lg-control__toggle"
                                >
                                    {showPassword ? (
                                        <RiEyeOffLine size={19} />
                                    ) : (
                                        <RiEyeLine size={19} />
                                    )}
                                </button>
                            </div>

                            {capsLock && (
                                <div className="lg-caps" role="status">
                                    <RiInformationLine size={15} />
                                    Включён Caps Lock
                                </div>
                            )}
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isDisabled}
                            className="lg-submit"
                        >
                            {isSubmitting ? (
                                <>
                                    <RiLoader4Line size={19} className="lg-spin" />
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
                </div>

                <footer className="lg-copy">
                    <RiShieldCheckLine size={14} />
                    {i18nT("sidebar.brand")}
                </footer>
            </main>
        </div>
    );
}
