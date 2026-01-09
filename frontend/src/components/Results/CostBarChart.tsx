import { Card, Skeleton } from "antd";
import ReactECharts from "echarts-for-react";

import type { Currency, FBACalculationResult } from "../../types";

export function CostBarChart(props: {
  result: FBACalculationResult | null;
  currency: Currency;
}) {
  const { result, currency } = props;
  if (!result) {
    return (
      <Card title="成本对比" size="small">
        <Skeleton active />
      </Card>
    );
  }

  const c = result.costBreakdown;
  const get = (m: { usd: number; cny: number }) => (currency === "USD" ? m.usd : m.cny);
  const purchaseAndShipping = get(c.purchaseCost) + get(c.shippingCost);
  const returnRelated = get(c.returnProcessingFee) + get(c.unsellableDisposalFee) + get(c.returnLoss);

  const categories = ["采购+头程", "广告", "销售佣金", "FBA配送费", "仓储费", "退货相关"];
  const values = [
    purchaseAndShipping,
    get(c.advertisingCost),
    get(c.referralFee),
    get(c.fbaFee),
    get(c.storageFee),
    returnRelated
  ];

  const option = {
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: categories, axisLabel: { interval: 0, rotate: 20 } },
    yAxis: { type: "value" },
    series: [{ type: "bar", data: values, itemStyle: { borderRadius: [6, 6, 0, 0] } }]
  };

  return (
    <Card title={`成本对比（${currency}）`} size="small">
      <ReactECharts option={option} style={{ height: 280 }} notMerge />
    </Card>
  );
}

