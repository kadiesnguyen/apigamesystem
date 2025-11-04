// src/components/RoleTag.tsx
import { Tag } from "antd";
import type { Role } from "@/services/auth";

export default function RoleTag({ role }: { role: Role }) {
  const map: Record<Role, { color: string; text: string }> = {
    superadmin: { color: "magenta", text: "Super Admin" },
    partner: { color: "blue", text: "Partner" },
    admin: { color: "gold", text: "Admin" },
  };
  const v = map[role];
  return (
    <Tag color={v.color} style={{ marginLeft: 8 }}>
      {v.text}
    </Tag>
  );
}
