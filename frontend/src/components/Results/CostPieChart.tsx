import { Card, Skeleton } from "antd";
import ReactECharts from "echarts-for-react";

import type { Currency, FBACalculationResult } from "../../types";

export function CostPieChart(props: {
  result: FBACalculationResult | null;
  currency: Currency;
}) {
  const { result, currency } = props;
  if (!result) {
    return (
      <Card title="成本构成" size="small">
        <Skeleton active />
      </Card>
    );
  }

  const c = result.costBreakdown;
  const get = (m: { usd: number; cny: number }) => (currency === "USD" ? m.usd : m.cny);

  const purchaseAndShipping = get(c.purchaseCost) + get(c.shippingCost);
  const returnRelated = get(c.returnProcessingFee) + get(c.unsellableDisposalFee) + get(c.returnLoss);

  const data = [
    { name: "采购+头程", value: purchaseAndShipping },
    { name: "广告", value: get(c.advertisingCost) },
    { name: "销售佣金", value: get(c.referralFee) },
    { name: "FBA配送费", value: get(c.fbaFee) },
    { name: "仓储费", value: get(c.storageFee) },
    { name: "退货相关", value: returnRelated }
  ];

  const option = {
    tooltip: { trigger: "item" },
    legend: { bottom: 0 },
    series: [
      {
        type: "pie",
        radius: ["40%", "70%"],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: "#fff", borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: "bold" } },
        labelLine: { show: false },
        data
      }
    ]
  };

  return (
    <Card title={`成本构成（${currency}）`} size="small">
      <ReactECharts option={option} style={{ height: 280 }} notMerge />
    </Card>
  );
}

