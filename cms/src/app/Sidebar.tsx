import { useMemo, useState, useEffect } from "react";
import { Layout, Menu, ConfigProvider } from "antd";
import type { MenuProps } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { MENU, AppMenuItem } from "./menu";

const { Sider } = Layout;

function toAntdItems(tree: AppMenuItem[]): MenuProps["items"] {
  return tree.map((m) => ({
    key: m.path,
    icon: m.icon,
    label: m.label,
    disabled: m.disabled,
    children:
      (m.children && toAntdItems(m.children)) ||
      (m.comingSoonChildren
        ? [
            {
              key: `${m.path}__soon`,
              label: "Đang cập nhật…",
              disabled: true,
            },
          ]
        : undefined),
  }));
}

// lấy các key cha từ pathname: /games/config/sicbo -> ["/games", "/games/config"]
function getOpenKeys(pathname: string) {
  if (pathname === "/") return [];
  const segs = pathname.split("/").filter(Boolean);
  return segs.slice(0, -1).map((_, i) => "/" + segs.slice(0, i + 1).join("/"));
}
function getSelectedKey(pathname: string) {
  return pathname === "/" ? "/" : pathname;
}

export default function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const items = useMemo(() => toAntdItems(MENU), []);

  const [openKeys, setOpenKeys] = useState<string[]>(getOpenKeys(pathname));
  const selectedKeys = [getSelectedKey(pathname)];

  // tự mở group tương ứng khi đổi route (ví dụ điều hướng từ code)
  useEffect(() => setOpenKeys(getOpenKeys(pathname)), [pathname]);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorBgContainer: "#0e1526",
          colorText: "#a9b3c7",
          colorPrimary: "#6ea8fe",
          colorBorder: "#1b2640",
          borderRadius: 10,
        },
        components: {
          Menu: {
            darkItemBg: "#0e1526",
            darkItemSelectedBg: "#15203a",
            darkItemColor: "#a9b3c7",
            darkItemSelectedColor: "#ffffff",
            itemHoverBg: "#151c31",
          },
        },
      }}
    >
      <Sider
        theme="dark"
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={260}
        style={{
          borderRight: "1px solid #1b2640",
          height: "100vh",
          position: "sticky",
          fontSize: 24,
          top: 0,
        }}
      >
        <div
          className="flex items-center gap-2 px-4 h-14 text-white font-semibold tracking-wide"
          style={{ borderBottom: "1px solid #1b2640" }}
        >
          {collapsed ? "CMS" : "CMS Game Slot"}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          items={items}
          selectedKeys={selectedKeys}
          openKeys={openKeys}
          onOpenChange={(keys) => setOpenKeys(keys as string[])}
          onClick={({ key, keyPath, domEvent }) => {
            // chặn click vào placeholder
            if (String(key).endsWith("__soon"))
              return domEvent.preventDefault();
            if (typeof key === "string") navigate(key);
          }}
          style={{ padding: 8, fontSize: 16 }}
        />

        {/* <div className="px-4 py-3 text-xs text-[#7f8aa3] mt-auto">ver. 20250815</div> */}
      </Sider>
    </ConfigProvider>
  );
}
