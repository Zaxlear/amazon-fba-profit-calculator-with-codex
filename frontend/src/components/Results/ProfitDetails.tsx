import { Card, Descriptions, Table } from "antd";

import type { Currency, FBACalculationResult, Money } from "../../types";
import { formatMoneyAmount } from "../../utils/formatters";

type Row = { key: string; name: string; usd: number; cny: number };

function toRow(name: string, money: Money): Row {
  return { key: name, name, usd: money.usd, cny: money.cny };
}

export function ProfitDetails(props: {
  result: FBACalculationResult | null;
  currency: Currency;
}) {
  const { result, currency } = props;
  if (!result) return null;

  const c = result.costBreakdown;
  const rows: Row[] = [
    toRow("采购成本", c.purchaseCost),
    toRow("头程运费", c.shippingCost),
    toRow("广告费用", c.advertisingCost),
    toRow("销售佣金（已扣退还）", c.referralFee),
    toRow("FBA配送费", c.fbaFee),
    toRow("仓储费", c.storageFee),
    toRow("退货处理费", c.returnProcessingFee),
    toRow("不可售弃置费", c.unsellableDisposalFee),
    toRow("退货损失（不可售商品成本）", c.returnLoss)
  ];

  const columns = [
    { title: "成本项", dataIndex: "name", key: "name" },
    {
      title: currency,
      key: "value",
      render: (_: unknown, row: Row) =>
        currency === "USD"
          ? `$${formatMoneyAmount(row.usd)}`
          : `¥${formatMoneyAmount(row.cny)}`
    }
  ];

  const iv = result.intermediateValues;

  return (
    <Card title="明细" size="small">
      <Descriptions size="small" column={1}>
        <Descriptions.Item label="总销售数量">
          {formatMoneyAmount(iv.totalSalesQuantity)}
        </Descriptions.Item>
        <Descriptions.Item label="仓储费系数">{iv.storageCoefficient}</Descriptions.Item>
        <Descriptions.Item label="退货数量">{formatMoneyAmount(iv.returnQuantity)}</Descriptions.Item>
        <Descriptions.Item label="不可售数量">{formatMoneyAmount(iv.unsellableQuantity)}</Descriptions.Item>
      </Descriptions>
      <Table<Row>
        size="small"
        style={{ marginTop: 12 }}
        pagination={false}
        columns={columns}
        dataSource={rows}
      />
    </Card>
  );
}

