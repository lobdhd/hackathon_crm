import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import App from "./App.jsx";

import {
  AuthProvider,
} from "./auth/AuthProvider.jsx";

import "./index.css";


// MARK: Query client

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,

      retry: (
        failureCount,
        error,
      ) => {
        const status =
          error?.status;

        /*
         * Клиентские ошибки повторять
         * автоматически бессмысленно.
         */
        if (
          status >= 400 &&
          status < 500
        ) {
          return false;
        }

        /*
         * Network / 5xx:
         * максимум одна повторная попытка.
         */
        return failureCount < 1;
      },
    },

    mutations: {
      retry: false,
    },
  },
});


// MARK: Render

createRoot(
  document.getElementById("root"),
).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider
        client={queryClient}
      >
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);