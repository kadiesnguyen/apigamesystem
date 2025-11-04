// src/components/AccountDropdown.tsx
import { Avatar, Dropdown, Typography, Space, Divider, Tag } from "antd";
import type { MenuProps } from "antd";
import {
  UserOutlined,
  LogoutOutlined,
  GlobalOutlined,
} from "@ant-design/icons";
import RoleTag from "@/components/RoleTag";
import { useAuth } from "@/store/auth";
import { useMe } from "@/hooks/useMe";
import { useUI } from "@/store/ui";
import { useMemo } from "react";

const { Text } = Typography;

const TZ_LIST = ["GMT+7", "GMT+8", "GMT+9", "UTC", "GMT+0"];
const LANG_LIST = [
  { k: "vi", label: "Tiếng Việt" },
  { k: "en", label: "English" },
  { k: "zh", label: "中文" },
] as const;

export default function AccountDropdown() {
  const { logout } = useAuth();
  const { data: me } = useMe();
  const { language, timezone, setLanguage, setTimezone } = useUI();

  const labelTop = useMemo(() => {
    if (!me) return "Đang tải...";
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "6px 4px",
        }}
      >
        <Avatar size={28} icon={<UserOutlined />} />
        <div style={{ lineHeight: 1.2 }}>
          <div>
            <Text strong>{me.username}</Text>
            <RoleTag role={me.role} />
          </div>
          {!!me.partner_id && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Partner: #{me.partner_id}{" "}
              {me.partner_name ? `– ${me.partner_name}` : ""}
            </Text>
          )}
        </div>
      </div>
    );
  }, [me]);

  const tzChildren: MenuProps["items"] = TZ_LIST.map((tz) => ({
    key: `tz-${tz}`,
    label: (
      <Space>
        <Tag color={tz === timezone ? "processing" : ""}>{tz}</Tag>
      </Space>
    ),
    onClick: () => setTimezone(tz),
  }));

  const langChildren: MenuProps["items"] = LANG_LIST.map((it) => ({
    key: `lang-${it.k}`,
    label: (
      <Space>
        <span style={{ width: 18, textAlign: "center" }}>
          {it.k === "vi" ? "🇻🇳" : it.k === "en" ? "🇬🇧" : "🇨🇳"}
        </span>
        <span>{it.label}</span>
      </Space>
    ),
    onClick: () => setLanguage(it.k as any),
  }));

  const items: MenuProps["items"] = [
    { type: "group", label: labelTop, key: "profile-top" },
    { type: "divider" as const },
    {
      key: "timezone",
      label: (
        <Space>
          <GlobalOutlined /> Múi giờ
        </Space>
      ),
      children: tzChildren,
    },
    {
      key: "language",
      label: <Space>🌐 Ngôn ngữ</Space>,
      children: langChildren,
    },
    { type: "divider" as const },
    {
      key: "home",
      label: "Trang chủ",
      onClick: () => (window.location.href = "/"),
    },
    {
      key: "profile",
      label: "Hồ sơ",
      onClick: () => (window.location.href = "/profile"),
    },
    { type: "divider" as const },
    {
      key: "logout",
      danger: true,
      icon: <LogoutOutlined />,
      label: "Đăng xuất",
      onClick: () => logout(),
    },
  ];

  return (
    <Dropdown
      menu={{ items }}
      trigger={["click"]}
      placement="bottomRight"
      arrow
    >
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          cursor: "pointer",
        }}
      >
        <Text style={{ color: "#ddd" }}>
          {me?.username ?? "..."}{" "}
          <Tag style={{ marginLeft: 6 }}>{timezone}</Tag>
        </Text>
        <Avatar size={28} icon={<UserOutlined />} />
      </div>
    </Dropdown>
  );
}
