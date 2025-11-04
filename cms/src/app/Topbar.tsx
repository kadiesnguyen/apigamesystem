import { useAuth } from "@/store/auth";

export default function Topbar() {
  const { logout } = useAuth();
  return (
    <header className="h-12 border-b border-[#1b2640] flex items-center justify-between px-4">
      <div className="text-sm text-muted">GMT+7</div>
      <div className="flex items-center gap-3">
        {/* <span className="text-sm text-muted">hut68vndk_admin</span> */}
        <button
          onClick={logout}
          className="text-xs px-3 py-1 bg-[#1f2a48] rounded"
        >
          Đăng xuất
        </button>
      </div>
    </header>
  );
}
