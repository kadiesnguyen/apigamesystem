import {
  DashboardOutlined,
  MobileOutlined,
  UserOutlined,
  ClockCircleOutlined,
  FundProjectionScreenOutlined,
  // SettingOutlined,
  FolderOpenOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";

export type AppMenuItem = {
  path: string; // key duy nhất, trùng route
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  children?: AppMenuItem[]; // <-- submenu
  comingSoonChildren?: boolean; // <-- có submenu sau này
};
export const MENU: AppMenuItem[] = [
  { path: "/", label: "Trang chủ", icon: <DashboardOutlined /> },
  {
    path: "/games",
    label: "Quản lý trò chơi",
    icon: <MobileOutlined />,
    children: [
      {
        path: "/games/list",
        label: "Danh sách trò chơi",
        icon: <FolderOpenOutlined />,
      }, // <-- đổi từ /games -> /games/list
      // {
      //   path: "/games/config",
      //   label: "Cấu hình",
      //   icon: <SettingOutlined />,
      //   children: [
      //     { path: "/games/config/superace", label: "Super Ace" },
      //     { path: "/games/config/sicbo", label: "Sicbo" },
      //     { path: "/games/config/slots", label: "Slots chung" },
      //   ],
      // },
    ],
  },
  {
    path: "/players",
    label: "Quản lý người chơi",
    icon: <UserOutlined />,
    disabled: false,
  },

  {
    path: "/logs/game",
    label: "Lịch sử",
    icon: <ClockCircleOutlined />,
    disabled: false,
    comingSoonChildren: false,
  },

  {
    path: "/logs/report",
    label: "Quản lý báo cáo",
    icon: <FundProjectionScreenOutlined />,
    disabled: true,
    comingSoonChildren: true,
  },

  {
    path: "/logs/revenue",
    label: "Báo cáo doanh thu",
    icon: <FundProjectionScreenOutlined />,
    disabled: true,
    comingSoonChildren: true,
  },
];
