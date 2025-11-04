import { ConfigProvider, theme as antdTheme, App as AntApp } from "antd";
import { PropsWithChildren } from "react";

export default function ThemeProvider({ children }: PropsWithChildren) {
  return (
    <ConfigProvider
      theme={{
        algorithm: [antdTheme.darkAlgorithm, antdTheme.compactAlgorithm],
        token: {
          // palette của bạn
          colorBgBase: "#0e1526",
          colorBgContainer: "#121a2b",
          colorBorder: "#1b2640",
          colorText: "#e9eef7",
          colorTextSecondary: "#a9b3c7",
          colorPrimary: "#6ea8fe",
          borderRadius: 10,
        },
        components: {
          Layout: {
            bodyBg: "#0e1526",
            headerBg: "#0e1526",
            siderBg: "#0e1526",
            footerBg: "#0e1526",
          },
          Menu: {
            darkItemBg: "#0e1526",
            darkItemSelectedBg: "#15203a",
            darkItemHoverBg: "#151c31",
            darkItemColor: "#a9b3c7",
            darkItemSelectedColor: "#ffffff",
            itemBorderRadius: 10,
          },
          Table: {
            headerBg: "#151c31",
            headerColor: "#e9eef7",
            rowHoverBg: "#15203a",
            borderColor: "#1b2640",
          },
          Tabs: {
            itemSelectedColor: "#e9eef7",
            itemHoverColor: "#e9eef7",
            inkBarColor: "#6ea8fe",
          },
          Input: { activeBorderColor: "#6ea8fe" },
          Select: { optionSelectedBg: "#15203a" },
          Tag: { defaultBg: "rgba(255,255,255,0.12)" },
          Button: { defaultBorderColor: "#1b2640" },
        },
      }}
    >
      <AntApp>{children}</AntApp>
    </ConfigProvider>
  );
}
