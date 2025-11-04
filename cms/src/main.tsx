import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import ThemeProvider from "@/theme/ThemeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ConfigProvider, App as AntdApp, theme } from "antd";
import viVN from "antd/locale/vi_VN";
import "antd/dist/reset.css";

import { router } from "@/app/router";
import "@/index.css";
import "antd/dist/reset.css";
import dayjs from "dayjs";
import "dayjs/locale/vi";
dayjs.locale("vi");

import { loadAccessToken } from "@/lib/http";
loadAccessToken();

const qc = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={viVN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#1677ff",
          borderRadius: 8,
        },
      }}
    >
      <AntdApp>
        <ThemeProvider>
          <QueryClientProvider client={qc}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </ThemeProvider>
      </AntdApp>
    </ConfigProvider>
  </React.StrictMode>
);
