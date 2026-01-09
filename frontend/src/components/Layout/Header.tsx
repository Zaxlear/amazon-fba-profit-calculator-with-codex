import { InputNumber, Layout, Space, Typography } from "antd";

import { useCurrency } from "../../hooks/useCurrency";

export function HeaderBar() {
  const { exchangeRate, setExchangeRate } = useCurrency();

  return (
    <Layout.Header className="flex items-center justify-between">
      <Typography.Title level={4} style={{ color: "white", margin: 0 }}>
        Amazon FBA 利润预估器
      </Typography.Title>
      <Space align="center">
        <Typography.Text style={{ color: "white" }}>汇率：</Typography.Text>
        <Space align="baseline">
          <Typography.Text style={{ color: "white" }}>1 USD =</Typography.Text>
          <InputNumber
            value={exchangeRate}
            min={0.0001}
            step={0.01}
            precision={4}
            onChange={(v) => setExchangeRate(Number(v ?? 0))}
          />
          <Typography.Text style={{ color: "white" }}>CNY</Typography.Text>
        </Space>
      </Space>
    </Layout.Header>
  );
}

