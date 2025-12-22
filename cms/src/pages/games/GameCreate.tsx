import { useState } from "react";
import { Button, Card, Form, Input, InputNumber, Select, Space, Switch, Divider, message } from "antd";
import { useNavigate } from "react-router-dom";
import type { CreateGamePayload, Game } from "@/services/games";
import { createGame } from "@/services/games";

const categories: Game["category"][] = ["slot", "table", "lottery"];
const volatilities: Game["volatility"][] = ["low", "medium", "high"];
const statuses: Game["status"][] = ["active", "inactive", "draft"];

type PartnerDraft = {
  partnerId: number;
  enabled?: boolean;
  rtp_override?: number;
  sort_order?: number;
  configJson?: string;
};

type GameFormValues = Omit<CreateGamePayload, "config" | "partners"> & { config?: string };

export default function GameCreate() {
  const [form] = Form.useForm<GameFormValues>();
  const [partners, setPartners] = useState<PartnerDraft[]>([]);
  const nav = useNavigate();

  async function submit(values: GameFormValues) {
    let configObj: Record<string, any> | undefined;
    if (typeof values.config === "string" && values.config.trim().length > 0) {
      try {
        configObj = JSON.parse(values.config);
      } catch (err) {
        console.error(err);
        message.error("Config JSON không hợp lệ");
        return;
      }
    }

    const partnerPayload: NonNullable<CreateGamePayload["partners"]> | undefined = partners.length
      ? []
      : undefined;

    if (partnerPayload) {
      for (const draft of partners) {
        if (!draft.partnerId || draft.partnerId <= 0) {
          message.error("Partner ID phải > 0");
          return;
        }
        let cfg: Record<string, any> | undefined;
        if (draft.configJson && draft.configJson.trim().length > 0) {
          try {
            cfg = JSON.parse(draft.configJson);
          } catch (err) {
            console.error(err);
            message.error(`Config override của partner ${draft.partnerId} không hợp lệ`);
            return;
          }
        }
        partnerPayload.push({
          partnerId: draft.partnerId,
          enabled: draft.enabled ?? true,
          rtp_override: draft.rtp_override,
          sort_order: draft.sort_order,
          config: cfg,
        });
      }
    }

    try {
      const payload: CreateGamePayload = {
        id: values.id,
        code: values.code,
        name: values.name,
        category: values.category,
        rtp: values.rtp,
        volatility: values.volatility,
        status: values.status,
        iconUrl: values.iconUrl,
        descShort: values.descShort,
        config: configObj,
        partners: partnerPayload,
      };
      await createGame(payload);
      message.success("Đã tạo game mới");
      nav("/games/list");
    } catch (err: any) {
      console.error(err);
      message.error(err?.message ?? "Không thể tạo game");
    }
  }

  function addPartner() {
    setPartners((list) => [
      ...list,
      { partnerId: 0, enabled: true, sort_order: 0, configJson: "" }
    ]);
  }

  function updatePartner(idx: number, patch: Partial<PartnerDraft>) {
    setPartners((list) =>
      list.map((p, i) => (i === idx ? { ...p, ...patch } : p))
    );
  }

  function removePartner(idx: number) {
    setPartners((list) => list.filter((_, i) => i !== idx));
  }

  return (
    <div className="p-4 space-y-3">
      <Card title="Tạo trò chơi mới">
        <Form
          layout="vertical"
          form={form}
          initialValues={{
            category: "slot",
            volatility: "medium",
            status: "draft",
            rtp: 96.5,
          }}
          onFinish={submit}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              label="ID game"
              name="id"
              rules={[
                { required: true, message: "Nhập ID game (integer)" },
              ]}
            >
              <InputNumber min={1} className="w-full" />
            </Form.Item>
            <Form.Item
              label="Mã game"
              name="code"
              rules={[{ required: true, message: "Nhập mã game" }]}
            >
              <Input placeholder="mahjongway" />
            </Form.Item>
            <Form.Item
              label="Tên hiển thị"
              name="name"
              rules={[{ required: true, message: "Nhập tên game" }]}
            >
              <Input placeholder="Mahjong Way" />
            </Form.Item>
            <Form.Item label="Loại" name="category">
              <Select options={categories.map((c) => ({ value: c, label: c }))} />
            </Form.Item>
            <Form.Item
              label="RTP (%)"
              name="rtp"
              tooltip="Ví dụ 96.5"
              rules={[{ required: true, message: "Nhập RTP" }]}
            >
              <InputNumber min={80} max={100} step={0.1} className="w-full" />
            </Form.Item>
            <Form.Item label="Volatility" name="volatility">
              <Select options={volatilities.map((v) => ({ value: v, label: v }))} />
            </Form.Item>
            <Form.Item label="Trạng thái" name="status">
              <Select options={statuses.map((s) => ({ value: s, label: s }))} />
            </Form.Item>
            <Form.Item label="Icon URL" name="iconUrl">
              <Input placeholder="https://..." />
            </Form.Item>
            <Form.Item
              label="Mô tả ngắn"
              name="descShort"
              className="md:col-span-2"
            >
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item
              label="Config JSON"
              name="config"
              className="md:col-span-2"
            >
              <Input.TextArea
                rows={4}
                placeholder='{"payoutTable":[...], "other":true}'
              />
            </Form.Item>
          </div>

          <Divider orientation="left">Partner</Divider>

          <Space direction="vertical" style={{ width: "100%" }}>
            {partners.map((partner, idx) => (
              <Card
                key={idx}
                size="small"
                title={`Partner #${idx + 1}`}
                extra={
                  <Button danger type="link" onClick={() => removePartner(idx)}>
                    Xóa
                  </Button>
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-muted mb-1">Partner ID</div>
                    <InputNumber
                      min={1}
                      className="w-full"
                      value={partner.partnerId}
                      onChange={(v) =>
                        updatePartner(idx, { partnerId: Number(v ?? 0) })
                      }
                    />
                  </div>
                  <div>
                    <div className="text-xs text-muted mb-1">Bật game</div>
                    <Switch
                      checked={partner.enabled ?? true}
                      onChange={(checked) =>
                        updatePartner(idx, { enabled: checked })
                      }
                    />
                  </div>
                  <div>
                    <div className="text-xs text-muted mb-1">RTP override</div>
                    <InputNumber
                      className="w-full"
                      min={80}
                      max={100}
                      step={0.1}
                      value={partner.rtp_override ?? undefined}
                      onChange={(v) =>
                        updatePartner(idx, {
                          rtp_override: v === null ? undefined : Number(v),
                        })
                      }
                    />
                  </div>
                  <div>
                    <div className="text-xs text-muted mb-1">Sort order</div>
                    <InputNumber
                      className="w-full"
                      value={partner.sort_order ?? 0}
                      onChange={(v) =>
                        updatePartner(idx, {
                          sort_order: Number(v ?? 0),
                        })
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-xs text-muted mb-1">Config override</div>
                    <Input.TextArea
                      rows={3}
                      placeholder='{"bet":{"min":0.2,"max":200}}'
                      value={partner.configJson ?? ""}
                      onChange={(e) =>
                        updatePartner(idx, { configJson: e.target.value })
                      }
                    />
                  </div>
                </div>
              </Card>
            ))}
          </Space>

          <div className="mt-3">
            <Button type="dashed" onClick={addPartner}>
              Thêm partner
            </Button>
          </div>

          <Divider />

          <div className="flex justify-end gap-2">
            <Button onClick={() => nav("/games/list")}>Hủy</Button>
            <Button type="primary" htmlType="submit">
              Tạo game
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}

