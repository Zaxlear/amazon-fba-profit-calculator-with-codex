import { Card, InputNumber, Space } from "antd";

import { useAppStore } from "../../store";

export function AfterSaleInputs() {
  const input = useAppStore((s) => s.input);
  const setNumber = useAppStore((s) => s.setNumber);

  return (
    <Card title="📮 售后参数" size="small">
      <Space direction="vertical" className="w-full" size="middle">
        <div>
          <div className="mb-2">退货率（%）</div>
          <InputNumber
            value={input.afterSale.returnRate}
            min={0}
            max={100}
            step={0.1}
            onChange={(v) => setNumber("afterSale.returnRate", Number(v ?? 0))}
          />
        </div>
        <div>
          <div className="mb-2">退货可售率（%）</div>
          <InputNumber
            value={input.afterSale.resellableRate}
            min={0}
            max={100}
            step={0.1}
            onChange={(v) => setNumber("afterSale.resellableRate", Number(v ?? 0))}
          />
        </div>
      </Space>
    </Card>
  );
}

