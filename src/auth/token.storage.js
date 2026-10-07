// MARK: Constants

const ACCESS_TOKEN_KEY = "naryad_access_token";


// MARK: Get token

export function getAccessToken() {
    if (typeof window === "undefined") {
        return null;
    }

    return window.sessionStorage.getItem(
        ACCESS_TOKEN_KEY,
    );
}


// MARK: Save token

export function setAccessToken(token) {
    if (
        typeof window === "undefined" ||
        !token
    ) {
        return;
    }

    window.sessionStorage.setItem(
        ACCESS_TOKEN_KEY,
        token,
    );
}


// MARK: Remove token

export function removeAccessToken() {
    if (typeof window === "undefined") {
        return;
    }

    window.sessionStorage.removeItem(
        ACCESS_TOKEN_KEY,
    );
}