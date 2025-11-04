// components/PercentInput.tsx
import { InputNumber, Slider, Space, Tooltip } from "antd";

export default function PercentInput({
  value,
  onChange,
  step = 0.1,
  min = 0,
  max = 100,
  hint,
}: {
  value?: number;
  onChange?: (v?: number) => void;
  step?: number;
  min?: number;
  max?: number;
  hint?: string;
}) {
  return (
    <Space align="center" style={{ width: 360 }}>
      <InputNumber
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(v) => onChange?.(v ?? undefined)}
        formatter={(v) => (v == null ? "" : `${v}%`)}
        parser={(s) => Number(String(s).replace("%", ""))}
        style={{ width: 120 }}
      />
      <div style={{ width: 200 }}>
        <Slider
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(v) => onChange?.(v as number)}
        />
      </div>
      {hint && <Tooltip style={{ whiteSpace: "pre-wrap" }} title={hint}>ⓘ</Tooltip>}
    </Space>
  );
}
