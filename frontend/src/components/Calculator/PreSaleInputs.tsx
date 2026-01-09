import { Card, InputNumber, Space } from "antd";

import { useAppStore } from "../../store";
import { MoneyInput } from "./MoneyInput";

export function PreSaleInputs() {
  const input = useAppStore((s) => s.input);
  const setMoney = useAppStore((s) => s.setMoney);
  const setNumber = useAppStore((s) => s.setNumber);

  return (
    <Card title="📦 售前参数" size="small">
      <Space direction="vertical" className="w-full" size="middle">
        <MoneyInput
          label="采购单价"
          value={input.prePurchase.unitCost}
          exchangeRate={input.settings.exchangeRate}
          onChange={(v) => setMoney("prePurchase.unitCost", v)}
        />
        <div>
          <div className="mb-2">采购数量</div>
          <InputNumber
            value={input.prePurchase.quantity}
            min={0}
            step={1}
            onChange={(v) => setNumber("prePurchase.quantity", Number(v ?? 0))}
          />
        </div>
        <MoneyInput
          label="单件头程运费（中国→美国）"
          value={input.prePurchase.shippingPerUnit}
          exchangeRate={input.settings.exchangeRate}
          onChange={(v) => setMoney("prePurchase.shippingPerUnit", v)}
        />
      </Space>
    </Card>
  );
}

