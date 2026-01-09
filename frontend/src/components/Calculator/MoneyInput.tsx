import { SwapOutlined } from "@ant-design/icons";
import { Button, InputNumber, Space, Typography } from "antd";

import type { MoneyInput as MoneyInputType } from "../../types";

function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function clampExchangeRate(rate: number): number {
  if (!Number.isFinite(rate) || rate <= 0) return 7.25;
  return rate;
}

export function MoneyInput(props: {
  label: string;
  value: MoneyInputType;
  exchangeRate: number;
  onChange: (value: MoneyInputType) => void;
}) {
  const { label, value, exchangeRate, onChange } = props;
  const rate = clampExchangeRate(exchangeRate);

  const setFromUSD = (usd: number) => {
    const u = round2(usd);
    onChange({ usd: u, cny: round2(u * rate), primaryCurrency: "USD" });
  };

  const setFromCNY = (cny: number) => {
    const c = round2(cny);
    onChange({ usd: round2(c / rate), cny: c, primaryCurrency: "CNY" });
  };

  return (
    <div className="w-full">
      <Typography.Text className="block mb-2">{label}</Typography.Text>
      <Space className="w-full" align="start">
        <div className="flex items-center gap-2">
          <Typography.Text className="w-4">$</Typography.Text>
          <InputNumber
            value={value.usd}
            min={0}
            precision={2}
            step={0.01}
            onChange={(v) => setFromUSD(Number(v ?? 0))}
          />
        </div>
        <div className="flex items-center gap-2">
          <Typography.Text className="w-4">¥</Typography.Text>
          <InputNumber
            value={value.cny}
            min={0}
            precision={2}
            step={0.01}
            onChange={(v) => setFromCNY(Number(v ?? 0))}
          />
        </div>
        <Button
          aria-label="切换主要币种"
          icon={<SwapOutlined />}
          onClick={() =>
            value.primaryCurrency === "USD" ? setFromCNY(value.cny) : setFromUSD(value.usd)
          }
        />
      </Space>
    </div>
  );
}

