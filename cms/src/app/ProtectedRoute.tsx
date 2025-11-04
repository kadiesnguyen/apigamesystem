// src/app/ProtectedRoute.ts
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/store/auth";

export default function ProtectedRoute() {
  const { isAuthed } = useAuth();
  if (!isAuthed) return <Navigate to="/login" replace />;
  return <Outlet />;
}
