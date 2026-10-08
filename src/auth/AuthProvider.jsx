import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    getMeRequest,
    loginRequest,
} from "../api/auth.api.js";

import {
    AUTH_UNAUTHORIZED_EVENT,
} from "../api/client.js";

import {
    getAccessToken,
    removeAccessToken,
    setAccessToken,
} from "./token.storage.js";


// MARK: Context

const AuthContext =
    createContext(null);


// MARK: Provider

export function AuthProvider({
    children,
}) {
    const [
        user,
        setUser,
    ] = useState(null);

    const [
        isBootstrapping,
        setIsBootstrapping,
    ] = useState(true);


    // MARK: Clear auth

    const clearAuth =
        useCallback(() => {
            removeAccessToken();

            setUser(null);
        }, []);


    // MARK: Logout

    const logout =
        useCallback(() => {
            clearAuth();
        }, [
            clearAuth,
        ]);


    // MARK: Refresh current user

    const refreshMe =
        useCallback(
            async () => {
                const currentUser =
                    await getMeRequest();

                setUser(
                    currentUser,
                );

                return currentUser;
            },
            [],
        );


    // MARK: Login

    const login =
        useCallback(
            async ({
                phone,
                password,
            }) => {
                const result =
                    await loginRequest({
                        phone,
                        password,
                    });

                if (
                    !result?.token
                ) {
                    throw new Error(
                        "Backend не вернул токен",
                    );
                }

                setAccessToken(
                    result.token,
                );


                let currentUser =
                    result.user;

                try {
                    currentUser =
                        await getMeRequest();
                } catch (error) {
                    /*
                     * Если токен реально
                     * невалидный, interceptor
                     * уже удалит его.
                     */

                    if (
                        error?.status ===
                        401
                    ) {
                        throw error;
                    }

                    /*
                     * Если /me временно
                     * упал, login response
                     * всё равно содержит user.
                     */
                }


                setUser(
                    currentUser,
                );

                return {
                    token:
                        result.token,

                    user:
                        currentUser,
                };
            },
            [],
        );


    // MARK: Restore session

    useEffect(() => {
        let mounted = true;

        async function bootstrap() {
            const token =
                getAccessToken();

            if (!token) {
                if (mounted) {
                    setIsBootstrapping(
                        false,
                    );
                }

                return;
            }

            try {
                const currentUser =
                    await getMeRequest();

                if (mounted) {
                    setUser(
                        currentUser,
                    );
                }
            } catch {
                removeAccessToken();

                if (mounted) {
                    setUser(null);
                }
            } finally {
                if (mounted) {
                    setIsBootstrapping(
                        false,
                    );
                }
            }
        }

        bootstrap();

        return () => {
            mounted = false;
        };
    }, []);


    // MARK: Global unauthorized listener

    useEffect(() => {
        function handleUnauthorized() {
            clearAuth();
        }

        window.addEventListener(
            AUTH_UNAUTHORIZED_EVENT,
            handleUnauthorized,
        );

        return () => {
            window.removeEventListener(
                AUTH_UNAUTHORIZED_EVENT,
                handleUnauthorized,
            );
        };
    }, [
        clearAuth,
    ]);


    // MARK: Context value

    const value =
        useMemo(
            () => ({
                user,

                role:
                    user?.role ??
                    null,

                isAuthenticated:
                    Boolean(user),

                isBootstrapping,

                login,
                logout,
                refreshMe,
            }),
            [
                user,
                isBootstrapping,
                login,
                logout,
                refreshMe,
            ],
        );


    return (
        <AuthContext.Provider
            value={value}
        >
            {children}
        </AuthContext.Provider>
    );
}


// MARK: Hook

export function useAuth() {
    const context =
        useContext(
            AuthContext,
        );

    if (!context) {
        throw new Error(
            "useAuth должен использоваться внутри AuthProvider",
        );
    }

    return context;
}