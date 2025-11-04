import { useEffect, useState } from "react";
import Card from "@/components/Card";
import Table from "@/components/Table";
import { api } from "@/lib/api";

export default function Games() {
  const [games, setGames] = useState<any[]>([]);
  const [sel, setSel] = useState<any | null>(null);
  useEffect(() => {
    api.get("/games").then((r) => setGames(r.data));
  }, []);
  return (
    <div className="p-4">
      <Card title="Danh sách trò chơi">
        <Table
          columns={["Mã", "Tên", "Base RTP", ""]}
          rows={games.map((g) => [
            g.code,
            g.name,
            (g.base_rtp / 100).toFixed(2) + "%",
            <button
              className="bg-[#1f2a48] px-2 py-1 rounded text-xs"
              onClick={() => setSel(g)}
            >
              Chỉnh tỉ lệ
            </button>,
          ])}
        />
      </Card>
      {sel && <EditRtpModal game={sel} onClose={() => setSel(null)} />}
    </div>
  );
}

function EditRtpModal({ game, onClose }: { game: any; onClose: () => void }) {
  const [scope, setScope] = useState<"global" | "partner">("global");
  const [partnerId, setPartnerId] = useState<number | undefined>();
  const [rtp, setRtp] = useState<number>(game.base_rtp);

  useEffect(() => {
    api
      .get(`/games/${game.id}/settings`, {
        params: { scope: scope, scopeId: partnerId },
      })
      .then((r) => setRtp(r.data?.rtp ?? game.base_rtp));
  }, [scope, partnerId]);

  async function save() {
    const { data } = await api.put(`/games/${game.id}/settings`, {
      scopeType: scope,
      scopeId: partnerId ?? null,
      rtp,
    });
    if (data?.error)
      alert(`${data.error} (range ${game.min_rtp}-${game.max_rtp})`);
    else onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center">
      <div className="bg-card border border-[#1b2640] rounded-xl w-[420px] p-4">
        <div className="text-lg mb-2">{game.name} — Chỉnh RTP</div>
        <div className="flex gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={scope === "global"}
              onChange={() => setScope("global")}
            />{" "}
            Global
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={scope === "partner"}
              onChange={() => setScope("partner")}
            />{" "}
            Theo đối tác
          </label>
        </div>

        {scope === "partner" && (
          <input
            type="number"
            placeholder="partnerId"
            className="mt-2 w-full bg-[#0e1526] border border-[#1b2640] px-3 py-2 rounded"
            value={partnerId ?? ""}
            onChange={(e) =>
              setPartnerId(e.target.value ? Number(e.target.value) : undefined)
            }
          />
        )}

        <div className="mt-3">
          <div className="text-xs text-muted mb-1">
            RTP (% * 100). VD 9650 = 96.5%
          </div>
          <input
            type="number"
            value={rtp}
            onChange={(e) => setRtp(parseInt(e.target.value || "0"))}
            className="w-full bg-[#0e1526] border border-[#1b2640] px-3 py-2 rounded"
          />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 rounded bg-[#1a223a]">
            Hủy
          </button>
          <button onClick={save} className="px-3 py-1 rounded bg-[#2e72ff]">
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
