// pages/games/GameLayout.tsx
import { useEffect, useMemo, useState } from "react";
import { Tabs, Card, Space, Button, Tag } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { fetchGame, type Game } from "@/services/games";

import GameConfig from "./GameConfig"; // fallback
import SuperAceConfig from "./superace/SuperAceConfig"; // trang riêng

export default function GameLayout() {
  const { gameId } = useParams();
  const nav = useNavigate();
  const [game, setGame] = useState<Game | null>(null);

  useEffect(() => {
    if (!gameId) return;
    fetchGame(Number(gameId))
      .then(setGame)
      .catch(() => setGame(null));
  }, [gameId]);

  // chọn component config theo mã game
  const ConfigView = useMemo(() => {
    if (!game) return null;
    switch (game.code) {
      case "superace":
        return <SuperAceConfig gameId={game.id} />;
      default:
        return <GameConfig gameId={game.id} />;
    }
  }, [game]);

  return (
    <div className="p-4 space-y-3">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-semibold">{game?.name ?? "…"}</div>
            <div className="text-sm text-[#8aa]">
              ID: {game?.id} • Code: {game?.code} • Loại: {game?.category} •
              RTP: {game?.rtp}%{"  "}
              {game?.status === "active" ? (
                <Tag color="green" className="ml-2">
                  active
                </Tag>
              ) : game?.status === "inactive" ? (
                <Tag color="red" className="ml-2">
                  inactive
                </Tag>
              ) : (
                <Tag className="ml-2">draft</Tag>
              )}
            </div>
          </div>
          <Space>
            <Button onClick={() => nav("/games")}>Quay lại</Button>
          </Space>
        </div>
      </Card>

      <Tabs
        items={[
          {
            key: "overview",
            label: "Tổng quan",
            children: <div>KPIs, doanh thu, lượt chơi… (todo)</div>,
          },
          { key: "config", label: "Cấu hình", children: ConfigView },
          {
            key: "partners",
            label: "Partner",
            children: <div>Bật/tắt game theo partner, override</div>,
          },
          {
            key: "funds",
            label: "Quỹ",
            children: <div>Số dư, ledger, nạp/rút</div>,
          },
          {
            key: "logs",
            label: "Logs",
            children: <div>Hoạt động gần đây</div>,
          },
        ]}
      />
    </div>
  );
}
