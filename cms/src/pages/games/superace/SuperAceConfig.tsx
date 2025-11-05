// pages/games/superace/SuperAceConfig.tsx
import { useEffect, useState, useMemo } from "react";
import {
  Card,
  Space,
  Button,
  Alert,
  Collapse,
  Form,
  Typography,
  message,
} from "antd";
import PercentInput from "@/components/PercentInput";
import PayoutTableEditor, { PayoutTable } from "@/components/PayoutTableEditor";
import {
  fetchGameConfig,
  updateGameConfig,
  invalidateEffective,
} from "@/services/games";

const { Panel } = Collapse;
const { Paragraph, Text } = Typography;

const ROW_LABELS = [
  "J", // 0
  "Q", // 1
  "K", // 2
  "A", // 3
  "♠", // 4
  "♣", // 5
  "♦", // 6
  "♥", // 7
];
const COL_LABELS = [
  "3 trúng",
  "4 trúng",
  "5 trúng",
  "6 trúng",
  "7 trúng",
  "8 trúng",
];

export default function SuperAceConfig({
  gameId,
  partnerId,
}: {
  gameId: number;
  partnerId?: number;
}) {
  const [loading, setLoading] = useState(false);
  const [noWinRate, setNoWinRate] = useState<number>(20); // %
  const [goldenChance, setGoldenChance] = useState<number>(3); // %
  const [redWildChance, setRedWildChance] = useState<number>(3); // %
  const [scatterChance, setScatterChance] = useState<number>(2); // %
  const [payout, setPayout] = useState<PayoutTable>(
    Array.from({ length: 8 }, () => [0, 0, 0, 0, 0, 0])
  );
  const [rawJson, setRawJson] = useState<string>("{}");
  const [rtpReadonly, setRtpReadonly] = useState<number | undefined>(undefined); // chỉ hiển thị

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await fetchGameConfig(gameId);
        // map JSON -> form
        setNoWinRate((data.config?.noWinRate ?? 0.2) * 100);
        setGoldenChance((data.config?.goldenChance ?? 0.03) * 100);
        setRedWildChance((data.config?.redWildChance ?? 0.03) * 100);
        setScatterChance((data.config?.scatterChance ?? 0.02) * 100);
        setPayout(
          data.config?.payoutTable ??
            Array.from({ length: 8 }, () => [0, 0, 0, 0, 0, 0])
        );
        setRawJson(JSON.stringify(data.config ?? {}, null, 2));
        setRtpReadonly(data.rtp); // chỉ để hiển thị
      } catch (e: any) {
        message.error(e?.message || "Không tải được cấu hình");
      } finally {
        setLoading(false);
      }
    })();
  }, [gameId]);

  const checks = useMemo(() => {
    const errs: string[] = [];
    const to01 = (v: number) => v / 100;
    const probs = [
      ["noWinRate", noWinRate],
      ["goldenChance", goldenChance],
      ["redWildChance", redWildChance],
      ["scatterChance", scatterChance],
    ];
    probs.forEach(([k, v]) => {
      if (v < 0 || v > 100) errs.push(`${k} phải trong [0, 100]%`);
    });
    // kiểm tra payout: không âm, tăng dần theo số trúng
    payout.forEach((row, i) => {
      row.forEach((val, c) => {
        if (val < 0)
          errs.push(`Payout hàng ${ROW_LABELS[i]} cột ${COL_LABELS[c]} âm`);
        if (c > 0 && row[c] < row[c - 1])
          errs.push(
            `Payout ${ROW_LABELS[i]} phải tăng/không giảm dần theo số trúng`
          );
      });
    });
    return {
      ok: errs.length === 0,
      errs,
      summary: `noWin=${to01(noWinRate)}, golden=${to01(
        goldenChance
      )}, redWild=${to01(redWildChance)}, scatter=${to01(scatterChance)}`,
    };
  }, [noWinRate, goldenChance, redWildChance, scatterChance, payout]);

  async function save(publish: boolean) {
    try {
      setLoading(true);
      const body = {
        noWinRate: noWinRate / 100,
        goldenChance: goldenChance / 100,
        redWildChance: redWildChance / 100,
        scatterChance: scatterChance / 100,
        payoutTable: payout,
      };
      await updateGameConfig(gameId, { config: body }); // RTP bị khóa: không gửi rtp
      if (publish && partnerId != null)
        await invalidateEffective(partnerId, gameId);
      message.success("Đã lưu cấu hình");
    } catch (e: any) {
      message.error(e?.message || "Lỗi lưu cấu hình");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Space direction="vertical" className="w-full" size={12}>
      <Card size="small" title="Tỉ lệ & Xác suất">
        <Space direction="vertical" style={{ width: "100%" }} size={10}>
          <div>
            <Text strong>No Win Rate</Text>
            <PercentInput
              value={noWinRate}
              onChange={setNoWinRate}
              step={0.1}
              hint="Xác suất quay ra không có line thắng (0–100%)"
            />
          </div>
          <div>
            <Text strong>Golden Chance</Text>
            <PercentInput
              value={goldenChance}
              onChange={setGoldenChance}
              hint="Tỉ lệ sinh biểu tượng vàng"
            />
          </div>
          <div>
            <Text strong>Red Wild Chance</Text>
            <PercentInput
              value={redWildChance}
              onChange={setRedWildChance}
              hint="Tỉ lệ xuất hiện Wild đỏ"
            />
          </div>
          <div>
            <Text strong>Scatter Chance</Text>
            <PercentInput
              value={scatterChance}
              onChange={setScatterChance}
              hint="Tỉ lệ ra Scatter"
            />
          </div>
          <div style={{ opacity: 0.7 }}>
            RTP (read-only): <Text code>{rtpReadonly ?? "…"}%</Text>
          </div>
          <div style={{ opacity: 0.7 }}>
            Lưu ý: Các tỉ lệ (Golden Chance, Red Wild Chance, Scatter Chance) là
            xác suất xuất hiện trên <b>một ô biểu tượng</b> trong lưới quay
            (0–100%). Nghĩa là với lưới có 20 ô, giá trị 3% tương đương xác suất
            trung bình khoảng <b>60% để xuất hiện ít nhất một biểu tượng đó</b>{" "}
            trong một lượt quay.
          </div>
        </Space>
      </Card>

      <Card size="small" title="Bảng thưởng">
        <Paragraph type="secondary" style={{ marginTop: -4 }}>
          Giá trị là hệ số nhân (ví dụ 0.5 = 0.5× tiền cược). Mỗi hàng là 1 biểu
          tượng, mỗi cột là số biểu tượng trúng.
        </Paragraph>
        <PayoutTableEditor
          value={payout}
          onChange={setPayout}
          rowLabels={ROW_LABELS}
          colLabels={COL_LABELS}
        />
      </Card>

      <Card size="small" title="Kiểm tra cấu hình">
        {checks.ok ? (
          <Alert type="success" message="Hợp lệ" description={checks.summary} />
        ) : (
          <Alert
            type="error"
            message="Cần sửa"
            description={
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {checks.errs.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            }
          />
        )}
      </Card>

      <Collapse>
        <Panel header="JSON nâng cao" key="json">
          <pre style={{ margin: 0, maxHeight: 320, overflow: "auto" }}>
            {rawJson}
          </pre>
        </Panel>
      </Collapse>

      <Space>
        <Button type="primary" loading={loading} onClick={() => save(true)}>
          Lưu & Publish (invalidate)
        </Button>
      </Space>
    </Space>
  );
}
