import { Card, Descriptions, Skeleton, Typography } from "antd";

import type { FBACalculationResult } from "../../types";
import { formatMoneyAmount, formatPercent } from "../../utils/formatters";

export function Summary(props: { result: FBACalculationResult | null }) {
  const { result } = props;

  if (!result) {
    return (
      <Card title="📊 计算结果" size="small">
        <Skeleton active />
      </Card>
    );
  }

  const s = result.summary;
  const breakEven =
    s.breakEvenDays === null ? "∞" : `${formatMoneyAmount(s.breakEvenDays)} 天`;

  return (
    <Card title="📊 计算结果" size="small">
      <Descriptions column={1} size="small">
        <Descriptions.Item label="净利润">
          <Typography.Text>
            ${formatMoneyAmount(s.netProfit.usd)} / ¥{formatMoneyAmount(s.netProfit.cny)}
          </Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="净利率">{formatPercent(s.netProfitMargin)}</Descriptions.Item>
        <Descriptions.Item label="ROI">{formatPercent(s.roi)}</Descriptions.Item>
        <Descriptions.Item label="回本天数">{breakEven}</Descriptions.Item>
      </Descriptions>
    </Card>
  );
}

