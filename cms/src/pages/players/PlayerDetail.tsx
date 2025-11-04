// src/pages/players/PlayerDetail.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import {
  fetchPlayer,
  setPlayerActive,
  ensureGameWallet,
  deposit,
  withdraw,
  fetchLedger as fetchLedgerSvc,
  resetFreeSpin,
  setFreeSpin,
  type PlayerResp,
  type LedgerResp,
} from "@/services/players";

import {
  Modal,
  Card,
  Input,
  InputNumber,
  Button,
  Tag,
  Space,
  Table,
  message,
  Typography,
} from "antd";

const { Title, Text } = Typography;

function applyNewBalance(accountId: number, newBalance: number) {
  setData((prev) =>
    prev
      ? {
          ...prev,
          wallets: prev.wallets.map((w) =>
            w.account_id === accountId ? { ...w, balance: newBalance } : w
          ),
        }
      : prev
  );
}

function BalanceCell({
  amount,
  currency,
  delta,
  k, // thay cho key nội bộ để reset animation
}: {
  amount: number;
  currency: string;
  delta?: number;
  k?: number;
}) {
  const showDelta = typeof delta === "number" && !Number.isNaN(delta);
  const isPos = (delta ?? 0) >= 0;

  return (
    <div style={{ position: "relative", minWidth: 120, textAlign: "right" }}>
      <div>{`${fmt.format(amount)} ${currency}`}</div>

      {showDelta && (
        <div
          key={k} // remount để chạy lại animation
          className={`bal-delta ${isPos ? "pos" : "neg"}`}
          style={{
            position: "absolute",
            right: -28,
            fontSize: 24,
            top: -28,
            fontWeight: 600,
          }}
        >
          {`${isPos ? "+" : "-"}${fmt.format(Math.abs(delta!))}`}
        </div>
      )}

      <style>{`
        @keyframes floatUp {
          0%   { opacity: 0; transform: translateY(8px); }
          20%  { opacity: 1; transform: translateY(0); }
          80%  { opacity: 1; transform: translateY(-2px); }
          100% { opacity: 0; transform: translateY(-6px); }
        }
        .bal-delta {
          animation: floatUp 0.5s ease forwards; /* 0.5s đúng yêu cầu */
        }
        .bal-delta.pos { color: #059669; } /* xanh */
        .bal-delta.neg { color: #dc2626; } /* đỏ */
      `}</style>
    </div>
  );
}

// ---------- utils ----------
const fmt = new Intl.NumberFormat("vi-VN");
const cn = (...a: (string | false | undefined)[]) =>
  a.filter(Boolean).join(" ");

export default function PlayerDetail({
  playerId: initialPid,
}: {
  playerId?: number;
}) {
  // route: /players/:id
  const { id: routeIdParam } = useParams<{ id?: string }>();
  const location = useLocation();

  // local state
  const [playerId, setPlayerId] = useState<number | "">(initialPid ?? "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [data, setData] = useState<PlayerResp | null>(null);

  // Modals
  const [ensureOpen, setEnsureOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState<{
    open: boolean;
    accountId?: number;
    gameId?: number;
  }>({ open: false });
  const [withdrawOpen, setWithdrawOpen] = useState<{
    open: boolean;
    accountId?: number;
    gameId?: number;
  }>({ open: false });
  const [ledgerOpen, setLedgerOpen] = useState<{
    open: boolean;
    accountId?: number;
    gameId?: number;
  }>({ open: false });
  const [resetSpinOpen, setResetSpinOpen] = useState<{
    open: boolean;
    accountId?: number;
    gameId?: number;
  }>({ open: false });
  const [setSpinOpen, setSetSpinOpen] = useState<{
    open: boolean;
    accountId?: number;
    gameId?: number;
  }>({ open: false });

  // Ensure wallet form
  const [ensureForm, setEnsureForm] = useState({
    gameId: 1001,
    gameUsername: "",
    currency: "VND",
  });

  // Transact forms
  const [depForm, setDepForm] = useState({
    amount: "",
    reason: "CMS deposit",
    refId: "",
  });
  const [wdForm, setWdForm] = useState({
    amount: "",
    reason: "CMS withdraw",
    refId: "",
  });
  const [setSpinForm, setSetSpinForm] = useState({
    freeSpins: "",
  });

  // Ledger
  const [ledger, setLedger] = useState<LedgerResp>({
    data: [],
    total: 0,
    page: 1,
    pageSize: 20,
  });
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Tổng số dư
  const total = useMemo(() => {
    const b =
      data?.wallets?.reduce((s, w) => s + Number(w.balance || 0), 0) || 0;
    const l =
      data?.wallets?.reduce((s, w) => s + Number(w.locked_balance || 0), 0) ||
      0;
    return { balance: b, locked: l };
  }, [data]);

  // ====== CORE FIX: tải theo id truyền vào, không phụ thuộc state ======
  async function loadById(pid: number) {
    if (!Number.isFinite(pid)) {
      setErr("Nhập playerId hợp lệ");
      return;
    }
    setErr("");
    setLoading(true);
    try {
      const resp = await fetchPlayer(pid);
      setData(resp);
      setEnsureForm((f) => ({ ...f, gameUsername: resp.player.username }));
      console.log("Player data loaded:", resp);
    } catch (e: any) {
      const msg = e?.message || "Lỗi tải dữ liệu";
      setErr(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }

  // Lấy id từ route param -> query ?id= -> prop
  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    const qId = qs.get("id");
    const pid =
      (routeIdParam ? Number(routeIdParam) : NaN) ||
      (qId ? Number(qId) : NaN) ||
      (initialPid ?? NaN);

    if (Number.isFinite(pid)) {
      setPlayerId(pid);
      loadById(pid); // gọi trực tiếp với id
    }
  }, [routeIdParam, location.search, initialPid]);

  // Nút tải thủ công
  const handleManualLoad = () => {
    const pid = Number(playerId);
    loadById(pid);
  };

  // Actions
  async function toggleActive(next: boolean) {
    if (!data) return;
    try {
      await setPlayerActive(data.player.id, next);
      setData({ ...data, player: { ...data.player, active: next } });
      message.success("Cập nhật trạng thái thành công");
    } catch (e: any) {
      Modal.error({
        title: "Lỗi cập nhật",
        content: e?.message || "Không thể cập nhật trạng thái",
      });
    }
  }

  async function ensureWallet() {
    if (!data) return;
    try {
      await ensureGameWallet(data.player.id, {
        gameId: Number(ensureForm.gameId),
        gameUsername: ensureForm.gameUsername,
        currency: ensureForm.currency,
      });
      setEnsureOpen(false);
      await loadById(data.player.id);
      message.success("Đảm bảo ví thành công");
    } catch (e: any) {
      Modal.error({
        title: "Lỗi tạo/đảm bảo ví",
        content: e?.message || "Không thể tạo/đảm bảo ví",
      });
    }
  }

  function makeRef(prefix: string) {
    return `${prefix}:${data?.player.id || "p"}:${Date.now()}`;
  }

  const [txFx, setTxFx] = useState<
    Record<number, { delta: number; ts: number }>
  >({});

  function flashDelta(accountId: number, delta: number) {
    setTxFx((prev) => ({ ...prev, [accountId]: { delta, ts: Date.now() } }));
    // tự clear sau 600ms (0.5s hiệu ứng + margin nhỏ)
    setTimeout(() => {
      setTxFx((prev) => {
        const next = { ...prev };
        delete next[accountId];
        return next;
      });
    }, 600);
  }

  async function doDeposit() {
    if (!depositOpen.accountId || !data) return;
    try {
      const aid = depositOpen.accountId;
      const amt = Number(depForm.amount);
      const refId = depForm.refId || makeRef("cms-dep");

      await deposit(aid, {
        amount: amt,
        reason: depForm.reason,
        refId,
      });

      // animation + hiệu ứng
      flashDelta(aid, amt);

      // tự cộng vào balance tại ví đúng accountId
      setData((prev) =>
        prev
          ? {
              ...prev,
              wallets: prev.wallets.map((w) =>
                w.account_id === aid
                  ? { ...w, balance: Number(w.balance) + amt }
                  : w
              ),
            }
          : prev
      );

      setDepositOpen({ open: false });
      message.success("Nạp tiền thành công");
    } catch (e: any) {
      Modal.error({
        title: "Lỗi nạp tiền",
        content: e?.message || "Không thể nạp tiền",
      });
    }
  }

  async function doWithdraw() {
    if (!withdrawOpen.accountId || !data) return;
    try {
      const aid = withdrawOpen.accountId;
      const amt = Number(wdForm.amount);
      const refId = wdForm.refId || makeRef("cms-wd");

      await withdraw(aid, {
        amount: amt,
        reason: wdForm.reason,
        refId,
      });

      // animation - hiệu ứng
      flashDelta(aid, -amt);

      // tự trừ balance tại ví đúng accountId
      setData((prev) =>
        prev
          ? {
              ...prev,
              wallets: prev.wallets.map((w) =>
                w.account_id === aid
                  ? { ...w, balance: Number(w.balance) - amt }
                  : w
              ),
            }
          : prev
      );

      setWithdrawOpen({ open: false });
      message.success("Rút tiền thành công");
    } catch (e: any) {
      Modal.error({
        title: "Lỗi rút tiền",
        content: e?.message || "Không thể rút tiền",
      });
    }
  }

  async function openLedger(accountId: number, gameId: number) {
    setLedgerOpen({ open: true, accountId, gameId });
    await loadLedger(1, 20, accountId);
  }

  async function loadLedger(page = 1, pageSize = 20, aid?: number) {
    const accountId = aid ?? ledgerOpen.accountId!;
    setLedgerLoading(true);
    try {
      const r = await fetchLedgerSvc(accountId, { page, pageSize });
      setLedger(r);
    } catch (e: any) {
      Modal.error({
        title: "Lỗi tải sổ cái",
        content: e?.message || "Không thể tải sổ cái",
      });
    } finally {
      setLedgerLoading(false);
    }
  }

  async function doResetSpin() {
    if (!resetSpinOpen.gameId || !data) return;
    try {
      await resetFreeSpin(data.player.id, resetSpinOpen.gameId);
      setResetSpinOpen({ open: false });
      await loadById(data.player.id); // Reload player data
      message.success("Reset freespin thành công");
    } catch (e: any) {
      Modal.error({
        title: "Lỗi reset freespin",
        content: e?.message || "Không thể reset freespin",
      });
    }
  }

  async function doSetSpin() {
    if (!setSpinOpen.gameId || !data) return;
    try {
      const freeSpins = Number(setSpinForm.freeSpins);
      if (!Number.isFinite(freeSpins) || freeSpins < 0) {
        message.error("Số freespin phải là số nguyên dương");
        return;
      }
      
      await setFreeSpin(data.player.id, setSpinOpen.gameId, freeSpins);
      setSetSpinOpen({ open: false });
      setSetSpinForm({ freeSpins: "" });
      await loadById(data.player.id); // Reload player data
      message.success(`Set freespin thành công: ${freeSpins}`);
    } catch (e: any) {
      Modal.error({
        title: "Lỗi set freespin",
        content: e?.message || "Không thể set freespin",
      });
    }
  }

  return (
    <div style={{ padding: 24, width: "100%" }}>
      <Space align="end" style={{ marginBottom: 16 }}>
        <div>
          <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>
            Player ID
          </div>
          <Input
            value={playerId}
            onChange={(e) => setPlayerId(Number(e.target.value) || "")}
            placeholder="Nhập ID"
            style={{ width: 240 }}
          />
        </div>
        <Button type="primary" onClick={handleManualLoad} loading={loading}>
          Tải
        </Button>
        {err && <Text type="danger">{err}</Text>}
      </Space>

      {!data ? (
        <Text type="secondary">
          Nhập Player ID hoặc truy cập đường dẫn dạng <code>/players/51</code>{" "}
          để tự tải.
        </Text>
      ) : (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {/* Header */}
          <Space style={{ width: "100%" }} size={16}>
            <Card style={{ flex: 1 }}>
              <div style={{ color: "#94a3b8", fontSize: 12 }}>Người chơi</div>
              <Title level={4} style={{ marginTop: 8, marginBottom: 4 }}>
                {data.player.username}
              </Title>
              <Text type="secondary">
                ID #{data.player.id} · Partner {data.player.partner_id}
              </Text>
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <Tag color={data.player.active ? "green" : "red"}>
                  {data.player.active ? "Đang hoạt động" : "Đã khóa"}
                </Tag>
                <Button onClick={() => toggleActive(!data.player.active)}>
                  {data.player.active ? "Khóa" : "Mở khóa"}
                </Button>
              </div>
            </Card>

            <Card style={{ flex: 1 }}>
              <div style={{ color: "#94a3b8", fontSize: 12 }}>Tổng số dư</div>
              <div style={{ marginTop: 8 }}>
                <Title level={3} style={{ margin: 0 }}>
                  {fmt.format(total.balance)} <Text type="secondary">VND</Text>
                </Title>
              </div>
              <div style={{ marginTop: 4 }}>
                <Text type="secondary">Locked: {fmt.format(total.locked)}</Text>
              </div>
            </Card>

            <Card
              style={{
                flex: 1,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ color: "#94a3b8", fontSize: 12 }}>
                  Ví trò chơi
                </div>
                <Title level={4} style={{ marginTop: 8 }}>
                  {data.wallets.length}
                </Title>
              </div>
              <Button
                type="primary"
                onClick={() => {
                  setEnsureForm((f) => ({
                    ...f,
                    gameUsername: data.player.username,
                  }));
                  setEnsureOpen(true);
                }}
              >
                Tạo/Đảm bảo ví
              </Button>
            </Card>
          </Space>

          {/* Wallets table */}
          <Card title="Ví theo game">
            <Table
              rowKey="account_id"
              dataSource={data.wallets}
              pagination={false}
              columns={[
                { title: "Account ID", dataIndex: "account_id" },
                { title: "Game", dataIndex: "game_id" },
                {
                  title: "Username",
                  dataIndex: "username",
                  render: (v) => v || "—",
                },
                {
                  title: "Balance",
                  dataIndex: "balance",
                  align: "right" as const,
                  render: (v: any, row: any) => (
                    <BalanceCell
                      amount={Number(v)}
                      currency={row.currency}
                      delta={txFx[row.account_id]?.delta}
                      k={txFx[row.account_id]?.ts} // key để reset animation mỗi lần
                    />
                  ),
                },
                {
                  title: "Locked",
                  dataIndex: "locked_balance",
                  align: "right" as const,
                  render: (v: any) => fmt.format(Number(v)),
                },
                {
                  title: "Free Spins",
                  dataIndex: "free_spins",
                  align: "center" as const,
                  render: (v: any) => (
                    <Tag color={Number(v) > 0 ? "blue" : "default"}>
                      {Number(v) || 0}
                    </Tag>
                  ),
                },
                {
                  title: "Trạng thái",
                  dataIndex: "active",
                  align: "center" as const,
                  render: (v: boolean) => (
                    <Tag color={v ? "green" : "red"}>
                      {v ? "Active" : "Inactive"}
                    </Tag>
                  ),
                },
                {
                  title: "Thao tác",
                  key: "actions",
                  align: "right" as const,
                  render: (_: any, w: any) => (
                    <Space wrap>
                      <Button
                        type="primary"
                        onClick={() => {
                          setDepositOpen({
                            open: true,
                            accountId: w.account_id,
                            gameId: w.game_id,
                          });
                          setDepForm({
                            amount: "",
                            reason: "CMS deposit",
                            refId: "",
                          });
                        }}
                      >
                        Nạp
                      </Button>
                      <Button
                        danger
                        onClick={() => {
                          setWithdrawOpen({
                            open: true,
                            accountId: w.account_id,
                            gameId: w.game_id,
                          });
                          setWdForm({
                            amount: "",
                            reason: "CMS withdraw",
                            refId: "",
                          });
                        }}
                      >
                        Rút
                      </Button>
                      <Button
                        onClick={() => {
                          setResetSpinOpen({
                            open: true,
                            accountId: w.account_id,
                            gameId: w.game_id,
                          });
                        }}
                      >
                        Reset Spin
                      </Button>
                      <Button
                        onClick={() => {
                          setSetSpinOpen({
                            open: true,
                            accountId: w.account_id,
                            gameId: w.game_id,
                          });
                          setSetSpinForm({ freeSpins: "" });
                        }}
                      >
                        Set Spin
                      </Button>
                      {/* <Button
                        onClick={() => openLedger(w.account_id, w.game_id)}
                      >
                        Sổ cái
                      </Button> */}
                    </Space>
                  ),
                },
              ]}
            />
          </Card>
        </Space>
      )}

      {/* Ensure wallet modal */}
      <Modal
        open={ensureOpen}
        onCancel={() => setEnsureOpen(false)}
        title="Tạo/Đảm bảo ví game"
        okText="Xác nhận"
        onOk={ensureWallet}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Game ID</div>
            <InputNumber
              value={ensureForm.gameId}
              onChange={(v) =>
                setEnsureForm((f) => ({ ...f, gameId: Number(v) || 0 }))
              }
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Game Username</div>
            <Input
              value={ensureForm.gameUsername}
              onChange={(e) =>
                setEnsureForm((f) => ({ ...f, gameUsername: e.target.value }))
              }
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Currency</div>
            <Input
              value={ensureForm.currency}
              onChange={(e) =>
                setEnsureForm((f) => ({ ...f, currency: e.target.value }))
              }
            />
          </div>
        </Space>
      </Modal>

      {/* Deposit modal */}
      <Modal
        open={depositOpen.open}
        onCancel={() => setDepositOpen({ open: false })}
        title={`Nạp ví (Game ${depositOpen.gameId || ""})`}
        okText="Nạp"
        onOk={doDeposit}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Space style={{ width: "100%" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>Số tiền</div>
              <InputNumber
                value={depForm.amount}
                onChange={(v) =>
                  setDepForm((f) => ({ ...f, amount: String(v ?? "") }))
                }
                style={{ width: "100%" }}
                min={0}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                Ref ID (tuỳ chọn)
              </div>
              <Input
                value={depForm.refId}
                onChange={(e) =>
                  setDepForm((f) => ({ ...f, refId: e.target.value }))
                }
              />
            </div>
          </Space>
          <div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Lý do</div>
            <Input
              value={depForm.reason}
              onChange={(e) =>
                setDepForm((f) => ({ ...f, reason: e.target.value }))
              }
            />
          </div>
        </Space>
      </Modal>

      {/* Withdraw modal */}
      <Modal
        open={withdrawOpen.open}
        onCancel={() => setWithdrawOpen({ open: false })}
        title={`Rút ví (Game ${withdrawOpen.gameId || ""})`}
        okText="Rút"
        okButtonProps={{ danger: true }}
        onOk={doWithdraw}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Space style={{ width: "100%" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>Số tiền</div>
              <InputNumber
                value={wdForm.amount}
                onChange={(v) =>
                  setWdForm((f) => ({ ...f, amount: String(v ?? "") }))
                }
                style={{ width: "100%" }}
                min={0}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                Ref ID (tuỳ chọn)
              </div>
              <Input
                value={wdForm.refId}
                onChange={(e) =>
                  setWdForm((f) => ({ ...f, refId: e.target.value }))
                }
              />
            </div>
          </Space>
          <div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Lý do</div>
            <Input
              value={wdForm.reason}
              onChange={(e) =>
                setWdForm((f) => ({ ...f, reason: e.target.value }))
              }
            />
          </div>
        </Space>
      </Modal>

      {/* Ledger modal */}
      <Modal
        open={ledgerOpen.open}
        onCancel={() => setLedgerOpen({ open: false })}
        title={`Sổ cái - Account ${ledgerOpen.accountId || ""} (Game ${
          ledgerOpen.gameId || ""
        })`}
        footer={null}
        width={900}
      >
        <div
          style={{
            marginBottom: 12,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Text type="secondary">Tổng: {ledger.total}</Text>
          <Space>
            <Button
              onClick={() =>
                loadLedger(Math.max(1, ledger.page - 1), ledger.pageSize)
              }
              disabled={ledger.page <= 1 || ledgerLoading}
            >
              Trang trước
            </Button>
            <Text>{ledger.page}</Text>
            <Button
              onClick={() => loadLedger(ledger.page + 1, ledger.pageSize)}
              disabled={
                ledger.page * ledger.pageSize >= ledger.total || ledgerLoading
              }
            >
              Trang sau
            </Button>
          </Space>
        </div>
        <Table
          rowKey="id"
          loading={ledgerLoading}
          dataSource={ledger.data}
          pagination={false}
          size="small"
          columns={[
            {
              title: "Thời gian",
              dataIndex: "created_at",
              render: (v: string) => new Date(v).toLocaleString("vi-VN"),
            },
            { title: "Loại", dataIndex: "ref_type" },
            { title: "Ref", dataIndex: "ref_id", render: (v) => v || "—" },
            {
              title: "Số tiền",
              dataIndex: "amount",
              align: "right" as const,
              render: (v: any) => (
                <span
                  className={cn(
                    Number(v) >= 0 ? "text-emerald-600" : "text-rose-600"
                  )}
                >
                  {fmt.format(Number(v))}
                </span>
              ),
            },
            {
              title: "Số dư sau",
              dataIndex: "balance_after",
              align: "right" as const,
              render: (v: any) => fmt.format(Number(v)),
            },
          ]}
        />
      </Modal>

      {/* Reset Spin modal */}
      <Modal
        open={resetSpinOpen.open}
        onCancel={() => setResetSpinOpen({ open: false })}
        title={`Reset Freespin (Game ${resetSpinOpen.gameId || ""})`}
        okText="Reset"
        okButtonProps={{ danger: true }}
        onOk={doResetSpin}
      >
        <div style={{ padding: "16px 0" }}>
          <Text>
            Bạn có chắc chắn muốn reset freespin về 0 cho game {resetSpinOpen.gameId}?
          </Text>
        </div>
      </Modal>

      {/* Set Spin modal */}
      <Modal
        open={setSpinOpen.open}
        onCancel={() => setSetSpinOpen({ open: false })}
        title={`Set Freespin (Game ${setSpinOpen.gameId || ""})`}
        okText="Set"
        onOk={doSetSpin}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
              Số freespin
            </div>
            <InputNumber
              value={setSpinForm.freeSpins}
              onChange={(v) =>
                setSetSpinForm((f) => ({ ...f, freeSpins: String(v ?? "") }))
              }
              style={{ width: "100%" }}
              min={0}
              placeholder="Nhập số freespin"
            />
          </div>
        </Space>
      </Modal>
    </div>
  );
}
