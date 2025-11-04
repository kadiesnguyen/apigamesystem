// components/PayoutTableEditor.tsx
import { Table, InputNumber, Typography } from "antd";

const { Text } = Typography;

export type PayoutTable = number[][]; // 8 rows x 6 cols

export default function PayoutTableEditor({
  value,
  onChange,
  rowLabels = [],
  colLabels = [],
}: {
  value: PayoutTable;
  onChange: (v: PayoutTable) => void;
  rowLabels?: string[];
  colLabels?: string[];
}) {
  const rows = value.map((r, i) => ({ key: i, idx: i, data: r }));
  console.log("PayoutTableEditor rows:", rows);
  const columns = [
    {
      title: "Biểu tượng",
      dataIndex: "idx",
      width: 140,
      render: (idx: number) => (
        <Text code>{rowLabels[idx] ?? `Symbol ${idx}`}</Text>
      ),
    },
    ...value[0].map((_, c) => ({
      title: colLabels[c] ?? `x${c + 1}`,
      dataIndex: `c${c}`,
      width: 110,
      render: (_: any, record: any) => (
        <InputNumber
          min={0}
          step={0.05}
          value={record.data[c]}
          onChange={(v) => {
            const next = value.map((r) => r.slice());
            next[record.idx][c] = Number(v ?? 0);
            onChange(next);
          }}
        />
      ),
    })),
  ];
  const dataSrc = rows.map((r) => ({
    ...r,
    ...Object.fromEntries(r.data.map((v, c) => [`c${c}`, v])),
  }));
  return (
    <Table
      size="small"
      pagination={false}
      dataSource={dataSrc}
      columns={columns as any}
      scroll={{ x: 820 }}
      bordered
    />
  );
}
