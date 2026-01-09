import { Alert, Button, Layout, Segmented, Space } from "antd";
import { useEffect, useMemo, useState } from "react";

import { AfterSaleInputs } from "./components/Calculator/AfterSaleInputs";
import { DuringSaleInputs } from "./components/Calculator/DuringSaleInputs";
import { PreSaleInputs } from "./components/Calculator/PreSaleInputs";
import { HeaderBar } from "./components/Layout/Header";
import { Sidebar } from "./components/Layout/Sidebar";
import { CostBarChart } from "./components/Results/CostBarChart";
import { CostPieChart } from "./components/Results/CostPieChart";
import { ProfitDetails } from "./components/Results/ProfitDetails";
import { Summary } from "./components/Results/Summary";
import type { Currency } from "./types";
import { useAppStore } from "./store";

export function App() {
  const init = useAppStore((s) => s.init);
  const input = useAppStore((s) => s.input);
  const recalculate = useAppStore((s) => s.recalculate);
  const result = useAppStore((s) => s.result);
  const error = useAppStore((s) => s.error);
  const isCalculating = useAppStore((s) => s.isCalculating);

  const [chartCurrency, setChartCurrency] = useState<Currency>("USD");

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    const t = window.setTimeout(() => void recalculate(), 300);
    return () => window.clearTimeout(t);
  }, [input, recalculate]);

  const content = useMemo(() => {
    return (
      <div className="p-4">
        {error ? (
          <Alert
            type="error"
            message="请求失败"
            description={error}
            style={{ marginBottom: 12 }}
            showIcon
          />
        ) : null}

        <Space style={{ marginBottom: 12 }}>
          <Button type="primary" loading={isCalculating} onClick={() => void recalculate()}>
            重新计算
          </Button>
          <Segmented
            value={chartCurrency}
            options={["USD", "CNY"]}
            onChange={(v) => setChartCurrency(v as Currency)}
          />
        </Space>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="flex flex-col gap-4">
            <PreSaleInputs />
            <DuringSaleInputs />
            <AfterSaleInputs />
          </div>
          <div className="flex flex-col gap-4">
            <Summary result={result} />
            <CostPieChart result={result} currency={chartCurrency} />
            <CostBarChart result={result} currency={chartCurrency} />
            <ProfitDetails result={result} currency={chartCurrency} />
          </div>
        </div>
      </div>
    );
  }, [chartCurrency, error, isCalculating, recalculate, result]);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <HeaderBar />
      <Layout>
        <Sidebar />
        <Layout.Content>{content}</Layout.Content>
      </Layout>
    </Layout>
  );
}
