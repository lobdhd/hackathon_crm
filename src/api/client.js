import axios from "axios";

import {
    getAccessToken,
    removeAccessToken,
} from "../auth/token.storage.js";


// MARK: Config

const fallbackApiUrl =
    "https://hackaton.fenixkst.kz";

export const API_URL = (
    import.meta.env.VITE_API_URL ||
    fallbackApiUrl
).replace(/\/+$/, "");


// MARK: Unauthorized event

export const AUTH_UNAUTHORIZED_EVENT =
    "naryad:auth:unauthorized";


// MARK: API Error

export class ApiError extends Error {
    constructor({
        status = 0,
        message = "Произошла ошибка",
        details = null,
        retryAfter = null,
        data = null,
    }) {
        super(message);

        this.name = "ApiError";
        this.status = status;
        this.details = details;
        this.retryAfter = retryAfter;
        this.data = data;
    }
}


// MARK: Axios instance

export const api = axios.create({
    baseURL: API_URL,

    timeout: 30_000,

    headers: {
        Accept: "application/json",
    },
});


// MARK: Request interceptor

api.interceptors.request.use(
    (config) => {
        const token =
            getAccessToken();

        if (token) {
            config.headers.Authorization =
                `Bearer ${token}`;
        }

        return config;
    },

    (error) => {
        return Promise.reject(error);
    },
);


// MARK: Response interceptor

api.interceptors.response.use(
    (response) => response,

    (error) => {
        const response =
            error?.response;

        const status =
            response?.status ?? 0;

        const data =
            response?.data ?? null;

        const message =
            data?.error ||
            error?.message ||
            "Не удалось выполнить запрос";

        const details =
            data?.details ?? null;

        const retryAfterHeader =
            response?.headers?.[
            "retry-after"
            ];

        const parsedRetryAfter =
            Number(retryAfterHeader);

        const retryAfter =
            Number.isFinite(
                parsedRetryAfter,
            ) &&
                parsedRetryAfter > 0
                ? parsedRetryAfter
                : null;


        // MARK: Session expired

        const requestUrl =
            error?.config?.url || "";

        const isLoginRequest =
            requestUrl.includes(
                "/api/auth/login",
            );

        if (
            status === 401 &&
            !isLoginRequest
        ) {
            removeAccessToken();

            if (
                typeof window !==
                "undefined"
            ) {
                window.dispatchEvent(
                    new CustomEvent(
                        AUTH_UNAUTHORIZED_EVENT,
                    ),
                );
            }
        }


        return Promise.reject(
            new ApiError({
                status,
                message,
                details,
                retryAfter,
                data,
            }),
        );
    },
);