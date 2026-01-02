import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout from "./AppLayout";
import ProtectedRoute from "./ProtectedRoute";
import Login from "@/pages/login/Login";
import Dashboard from "@/pages/dashboard/Dashboard";
import GamesList from "@/pages/games/GamesList";
import GameCreate from "@/pages/games/GameCreate";
import GameLayout from "@/pages/games/GameLayout";
import Players from "@/pages/players/Players";
import GameLogs from "@/pages/logs/GameLogs";
import PlayerDetail from "@/pages/players/PlayerDetail";

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Dashboard /> },

          { path: "dashboard", element: <Dashboard /> },

          { path: "/games/list", element: <GamesList /> },
          { path: "/games/new", element: <GameCreate /> },

          { path: "/games", element: <Navigate to="/games/list" replace /> },

          { path: "/games/:gameId", element: <GameLayout /> },

          { path: "/players", element: <Players /> },
          
          { path: "/players/:id", element: <PlayerDetail /> },

          { path: "/logs/game", element: <GameLogs /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
