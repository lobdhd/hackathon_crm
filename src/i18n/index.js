import {
    useSyncExternalStore,
} from "react";

import ru from "../locales/ru.json";
import kk from "../locales/kk.json";

const STORAGE_KEY = "app_language";

const dictionaries = {
    ru,
    kk,
};

// MARK: State

function getInitialLanguage() {
    if (typeof window === "undefined") {
        return "ru";
    }

    const saved =
        window.localStorage.getItem(
            STORAGE_KEY
        );

    return saved === "kk"
        ? "kk"
        : "ru";
}

let currentLanguage =
    getInitialLanguage();

const listeners = new Set();

// MARK: Store

function subscribe(listener) {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

function getSnapshot() {
    return currentLanguage;
}

// MARK: Translation

export function getLanguage() {
    return currentLanguage;
}

export function t(
    key,
    params = {}
) {
    const dictionary =
        dictionaries[currentLanguage] ??
        dictionaries.ru;

    let value =
        dictionary[key] ??
        dictionaries.ru[key] ??
        key;

    if (
        typeof value !== "string"
    ) {
        return value;
    }

    for (
        const [name, replacement]
        of Object.entries(params)
    ) {
        value = value.replaceAll(
            `{{${name}}}`,
            String(replacement)
        );
    }

    return value;
}

// MARK: Change language

export function setLanguage(
    language
) {
    const nextLanguage =
        language === "kk"
            ? "kk"
            : "ru";

    if (
        nextLanguage ===
        currentLanguage
    ) {
        return;
    }

    currentLanguage =
        nextLanguage;

    if (
        typeof window !==
        "undefined"
    ) {
        window.localStorage.setItem(
            STORAGE_KEY,
            nextLanguage
        );
    }

    if (
        typeof document !==
        "undefined"
    ) {
        document.documentElement.lang =
            nextLanguage;
    }

    listeners.forEach(
        (listener) => listener()
    );
}

// MARK: React

export function useI18n() {
    const language =
        useSyncExternalStore(
            subscribe,
            getSnapshot,
            getSnapshot
        );

    /*
     * language здесь используется не просто
     * для возврата значения.
     *
     * Именно подписка заставляет React
     * перерисовать компонент после
     * setLanguage().
     */

    return {
        language,
        setLanguage,
        t,
    };
}