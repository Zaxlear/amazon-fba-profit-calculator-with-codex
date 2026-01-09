export type Currency = "USD" | "CNY";

export interface MoneyInput {
  usd: number;
  cny: number;
  primaryCurrency: Currency;
}

export interface Money {
  usd: number;
  cny: number;
}

export interface FBACalculatorInput {
  prePurchase: {
    unitCost: MoneyInput;
    quantity: number;
    shippingPerUnit: MoneyInput;
  };
  duringSale: {
    sellingPrice: MoneyInput;
    dailySales: number;
    salesDays: number;
    advertisingMode: "budget" | "percentage";
    dailyAdBudget?: MoneyInput;
    adPercentage?: number;
    referralFeeRate: number;
    fbaFeePerUnit: MoneyInput;
    monthlyStorageFee: MoneyInput;
  };
  afterSale: {
    returnRate: number;
    resellableRate: number;
  };
  settings: {
    exchangeRate: number;
  };
}

export interface FBACalculationResult {
  summary: {
    totalRevenue: Money;
    totalCost: Money;
    grossProfit: Money;
    grossProfitMargin: number;
    netProfit: Money;
    netProfitMargin: number;
    profitPerUnit: Money;
    roi: number;
    breakEvenDays: number | null;
  };
  costBreakdown: {
    purchaseCost: Money;
    shippingCost: Money;
    advertisingCost: Money;
    referralFee: Money;
    fbaFee: Money;
    storageFee: Money;
    returnProcessingFee: Money;
    unsellableDisposalFee: Money;
    returnLoss: Money;
  };
  intermediateValues: {
    totalSalesQuantity: number;
    storageCoefficient: number;
    actualStorageFeePerUnit: Money;
    returnQuantity: number;
    resellableQuantity: number;
    unsellableQuantity: number;
    returnProcessingFeePerUnit: Money;
  };
}

export interface SavedProjectSummary {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  branchPath: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedProject extends SavedProjectSummary {
  input: FBACalculatorInput;
  result: FBACalculationResult;
}

export interface ProjectNode {
  project: SavedProjectSummary;
  children: ProjectNode[];
}

export interface Settings {
  exchangeRate: number;
}

export interface ProjectCreateRequest {
  name: string;
  description: string;
  input: FBACalculatorInput;
}

export interface ProjectUpdateRequest {
  name: string;
  description: string;
  input: FBACalculatorInput;
}

export interface BranchCreateRequest {
  name: string;
  description: string;
}

