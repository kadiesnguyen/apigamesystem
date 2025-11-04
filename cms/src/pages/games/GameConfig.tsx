import { useEffect, useState } from "react";
import {
  Form,
  InputNumber,
  Select,
  Button,
  Card,
  Space,
  message,
  Switch,
  Segmented,
  Input,
} from "antd";
import {
  fetchGameConfig,
  updateGameConfig,
  fetchEffectiveConfig,
  updatePartnerOverride,
  invalidateEffective,
} from "@/services/games";

type Scope = "base" | "partner";

function compact<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: any = {};
  Object.keys(obj).forEach((k) => {
    const v = (obj as any)[k];
    if (v !== undefined) out[k] = v;
  });
  return out;
}

export default function GameConfig({ gameId }: { gameId: number }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [scope, setScope] = useState<Scope>("base");
  const [partnerId, setPartnerId] = useState<number | undefined>(undefined);
  const [json, setJson] = useState<string>("{}");
  const [rtp, setRtp] = useState<number | undefined>(undefined);
  const [enabled, setEnabled] = useState<boolean | undefined>(undefined);

  // load base or effective
  useEffect(() => {
    let stop = false;
    async function load() {
      setLoading(true);
      try {
        if (scope === "base") {
          const data = await fetchGameConfig(gameId);
          if (stop) return;
          form.setFieldsValue({
            rtp: data.rtp,
            volatility: undefined,
            status: undefined,
          });
          setRtp(data.rtp);
          setJson(JSON.stringify(data.config ?? {}, null, 2));
          setEnabled(undefined);
        } else if (scope === "partner" && partnerId != null) {
          const eff = await fetchEffectiveConfig(partnerId, gameId);
          if (stop) return;
          // Chỉ hiển thị; chỉnh override ở payload khi lưu
          setJson(JSON.stringify(eff.config ?? {}, null, 2));
          setRtp(eff.rtp);
        }
      } catch (e: any) {
        message.error(e.message || "Không tải được cấu hình");
      } finally {
        if (!stop) setLoading(false);
      }
    }
    load();
    return () => {
      stop = true;
    };
  }, [scope, partnerId, gameId]);

  async function onSave(publish = false) {
    try {
      setLoading(true);
      const bodyText = json.trim() || "{}";

      let parsed: any;
      try {
        parsed = JSON.parse(bodyText);
      } catch {
        message.error("JSON cấu hình không hợp lệ");
        return;
      }

      if (scope === "base") {
        const vals = await form.validateFields();
        // Ép kiểu số và loại undefined
        const payload = compact({
          rtp: typeof vals.rtp === "number" ? vals.rtp : Number(vals.rtp),
          volatility: vals.volatility, // 'low' | 'medium' | 'high' | undefined
          status: vals.status, // 'active' | 'inactive' | 'draft' | undefined
          config: parsed, // object
        });

        await updateGameConfig(gameId, payload);

        if (publish && partnerId != null) {
          await invalidateEffective(partnerId, gameId);
        }
        message.success("Đã lưu cấu hình game");
      } else if (scope === "partner" && partnerId != null) {
        // Với partner/override: chỉ gửi trường có giá trị
        const payload = compact({
          enabled, // boolean | undefined
          rtp_override:
            typeof rtp === "number"
              ? rtp
              : rtp != null
              ? Number(rtp)
              : undefined,
          config: parsed, // phần override
        });

        await updatePartnerOverride(partnerId, gameId, payload);

        if (publish) await invalidateEffective(partnerId, gameId);
        message.success("Đã lưu cấu hình override");
      }
    } catch (e: any) {
      const msg =
        e?.message || e?.response?.data?.message || "Lưu cấu hình thất bại";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Space direction="vertical" className="w-full" size={12}>
      <Card size="small">
        <Space wrap>
          <Segmented
            options={[
              { label: "Cấu hình", value: "base" },
              //   { label: "Theo partner", value: "partner" },
            ]}
            value={scope}
            onChange={(v) => setScope(v as Scope)}
          />
          {scope === "partner" && (
            <>
              <Input
                placeholder="Partner ID"
                type="number"
                style={{ width: 160 }}
                value={partnerId as any}
                onChange={(e) =>
                  setPartnerId(
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
              />
              <span>Enabled:</span>
              <Switch checked={enabled} onChange={setEnabled} />
              <span>RTP:</span>
              <InputNumber
                min={80}
                max={100}
                step={0.1}
                value={rtp}
                onChange={(v) => setRtp(v ?? undefined)}
              />
            </>
          )}
        </Space>
      </Card>

      {scope === "base" && (
        <Card size="small" title="Thông số chính">
          <Form form={form} layout="inline">
            <Form.Item
              name="rtp"
              label="RTP (%)"
              rules={[{ type: "number", min: 80, max: 100 }]}
            >
              <InputNumber min={80} max={100} step={0.1} />
            </Form.Item>
            <Form.Item name="volatility" label="Biến động">
              <Select
                allowClear
                options={[
                  { value: "low", label: "low" },
                  { value: "medium", label: "medium" },
                  { value: "high", label: "high" },
                ]}
                style={{ width: 160 }}
              />
            </Form.Item>
            <Form.Item name="status" label="Trạng thái">
              <Select
                allowClear
                options={[
                  { value: "active", label: "active" },
                  { value: "inactive", label: "inactive" },
                  { value: "draft", label: "draft" },
                ]}
                style={{ width: 160 }}
              />
            </Form.Item>
          </Form>
        </Card>
      )}

      <Card
        size="small"
        title={
          scope === "base"
            ? "JSON cấu hình (gốc)"
            : "JSON cấu hình (override/hiệu lực)"
        }
      >
        <Input.TextArea
          value={json}
          onChange={(e) => setJson(e.target.value)}
          autoSize={{ minRows: 14 }}
          spellCheck={false}
          style={{
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
          }}
        />
      </Card>

      <Space>
        {/* <Button loading={loading} onClick={() => onSave(false)}>
          Lưu
        </Button> */}
        <Button type="primary" loading={loading} onClick={() => onSave(true)}>
          Lưu & Publish (invalidate)
        </Button>
      </Space>
    </Space>
  );
}
