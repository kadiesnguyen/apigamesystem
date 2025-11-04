import Sidebar from "./Sidebar";
import AccountDropdown from "@/components/AccountDropdown";
// import Topbar from "./Topbar";
import { Outlet } from "react-router-dom";

export default function AppLayout() {
  return (
    <div className="h-full flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <div className="flex justify-end">
          <AccountDropdown />
        </div>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
