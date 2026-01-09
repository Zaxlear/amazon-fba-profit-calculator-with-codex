import { Card, InputNumber, Radio, Space } from "antd";

import { useAppStore } from "../../store";
import { MoneyInput } from "./MoneyInput";

export function DuringSaleInputs() {
  const input = useAppStore((s) => s.input);
  const setMoney = useAppStore((s) => s.setMoney);
  const setNumber = useAppStore((s) => s.setNumber);
  const setAdvertisingMode = useAppStore((s) => s.setAdvertisingMode);

  return (
    <Card title="🛒 售中参数" size="small">
      <Space direction="vertical" className="w-full" size="middle">
        <MoneyInput
          label="产品售价"
          value={input.duringSale.sellingPrice}
          exchangeRate={input.settings.exchangeRate}
          onChange={(v) => setMoney("duringSale.sellingPrice", v)}
        />
        <div>
          <div className="mb-2">日均销量</div>
          <InputNumber
            value={input.duringSale.dailySales}
            min={0}
            step={1}
            onChange={(v) => setNumber("duringSale.dailySales", Number(v ?? 0))}
          />
        </div>
        <div>
          <div className="mb-2">销售天数（用于仓储费系数）</div>
          <InputNumber
            value={input.duringSale.salesDays}
            min={0}
            step={1}
            onChange={(v) => setNumber("duringSale.salesDays", Number(v ?? 0))}
          />
        </div>

        <div>
          <div className="mb-2">广告输入方式</div>
          <Radio.Group
            value={input.duringSale.advertisingMode}
            onChange={(e) => setAdvertisingMode(e.target.value)}
          >
            <Radio value="budget">单日广告预算</Radio>
            <Radio value="percentage">广告占比</Radio>
          </Radio.Group>
        </div>

        {input.duringSale.advertisingMode === "budget" ? (
          <MoneyInput
            label="单日广告预算"
            value={input.duringSale.dailyAdBudget ?? { usd: 0, cny: 0, primaryCurrency: "USD" }}
            exchangeRate={input.settings.exchangeRate}
            onChange={(v) => setMoney("duringSale.dailyAdBudget", v)}
          />
        ) : (
          <div>
            <div className="mb-2">广告占比（占销售额 %）</div>
            <InputNumber
              value={input.duringSale.adPercentage ?? 0}
              min={0}
              max={100}
              step={0.1}
              onChange={(v) => setNumber("duringSale.adPercentage", Number(v ?? 0))}
            />
          </div>
        )}

        <div>
          <div className="mb-2">销售佣金费率（%）</div>
          <InputNumber
            value={input.duringSale.referralFeeRate}
            min={0}
            max={100}
            step={0.1}
            onChange={(v) => setNumber("duringSale.referralFeeRate", Number(v ?? 0))}
          />
        </div>

        <MoneyInput
          label="单件 FBA 配送费"
          value={input.duringSale.fbaFeePerUnit}
          exchangeRate={input.settings.exchangeRate}
          onChange={(v) => setMoney("duringSale.fbaFeePerUnit", v)}
        />
        <MoneyInput
          label="单件月均仓储费"
          value={input.duringSale.monthlyStorageFee}
          exchangeRate={input.settings.exchangeRate}
          onChange={(v) => setMoney("duringSale.monthlyStorageFee", v)}
        />
      </Space>
    </Card>
  );
}

