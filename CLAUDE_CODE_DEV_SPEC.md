# Amazon FBA 利润预估器 - 开发规范文档

## 项目概述

开发一个 Web 应用程序，用于精确计算亚马逊 FBA（Fulfillment by Amazon）商品的利润预估。该应用需要考虑售前、售中、售后三个环节的所有成本因素，并提供直观的数据可视化和项目管理功能。

---

## 技术栈要求

### 前端
- **框架**: React 18+ 或 Vue 3（推荐 React）
- **UI 组件库**: Ant Design 或 Material-UI
- **图表库**: ECharts 或 Recharts
- **状态管理**: Zustand 或 Redux Toolkit
- **样式**: TailwindCSS 或 CSS Modules

### 后端
- **语言**: Python 3.11+ 或 Node.js 18+
- **框架**: FastAPI（Python）或 Express/Fastify（Node.js）
- **数据库**: SQLite（轻量级，便于 Docker 部署）

### 部署
- **容器化**: Docker + Docker Compose
- **架构兼容**: 支持 linux/amd64 和 linux/arm64

---

## 开发环境与依赖管理（必须使用 venv）

后端采用 Python 时，所有依赖必须安装在项目内的 venv 中，**禁止**直接对系统 Python 执行 `pip install ...`。

推荐将虚拟环境放在 `backend/.venv/`，并统一使用 `python -m pip` 确保 pip 来自当前 venv。

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # macOS/Linux
# Windows PowerShell: .\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python main.py
```

---

## 数据模型设计

### 1. 输入参数结构

```typescript
interface FBACalculatorInput {
  // ===== 售前参数 =====
  prePurchase: {
    unitCost: MoneyInput;           // 采购单价
    quantity: number;               // 采购数量
    shippingPerUnit: MoneyInput;    // 单件头程运费（中国→美国）
  };
  
  // ===== 售中参数 =====
  duringSale: {
    sellingPrice: MoneyInput;       // 产品售价
    dailySales: number;             // 日均销量
    salesDays: number;              // 销售天数（用于计算仓储费系数）
    
    // 广告（二选一输入方式）
    advertisingMode: 'budget' | 'percentage';
    dailyAdBudget?: MoneyInput;     // 单日广告预算
    adPercentage?: number;          // 广告占比（占销售额百分比）
    
    referralFeeRate: number;        // 销售佣金费率（默认15%，可自定义）
    fbaFeePerUnit: MoneyInput;      // 单件FBA配送费
    monthlyStorageFee: MoneyInput;  // 单件月均仓储费
  };
  
  // ===== 售后参数 =====
  afterSale: {
    returnRate: number;             // 退货率（百分比，如5表示5%）
    resellableRate: number;         // 退货可售率（百分比）
    // 注：退货处理费 = min(销售佣金 * 20%, 5 USD)
    // 注：不可售库存弃置费 = FBA配送费
  };
  
  // ===== 全局设置 =====
  settings: {
    exchangeRate: number;           // 汇率（1 USD = ? CNY）
  };
}

// 金额输入结构（支持双币种）
interface MoneyInput {
  usd: number;
  cny: number;
  primaryCurrency: 'USD' | 'CNY';  // 用户主要输入的币种
}
```

### 2. 计算结果结构

```typescript
interface FBACalculationResult {
  // ===== 汇总数据 =====
  summary: {
    totalRevenue: Money;            // 总销售收入
    totalCost: Money;               // 总成本
    grossProfit: Money;             // 毛利润
    grossProfitMargin: number;      // 毛利率（%）
    netProfit: Money;               // 净利润（考虑退货后）
    netProfitMargin: number;        // 净利率（%）
    profitPerUnit: Money;           // 单件利润
    roi: number;                    // 投资回报率（%）
    breakEvenDays: number;          // 回本天数
  };
  
  // ===== 成本明细 =====
  costBreakdown: {
    // 售前成本
    purchaseCost: Money;            // 采购成本 = 采购单价 × 采购数量
    shippingCost: Money;            // 头程运费 = 单件头程运费 × 采购数量
    
    // 售中成本
    advertisingCost: Money;         // 广告费用
    referralFee: Money;             // 销售佣金
    fbaFee: Money;                  // FBA配送费
    storageFee: Money;              // 仓储费（已考虑仓储费系数）
    
    // 售后成本
    returnProcessingFee: Money;     // 退货处理费
    unsellableDisposalFee: Money;   // 不可售库存弃置费
    returnLoss: Money;              // 退货损失（不可售部分的商品成本）
  };
  
  // ===== 中间计算值 =====
  intermediateValues: {
    totalSalesQuantity: number;     // 总销售数量 = 日均销量 × 销售天数
    storageCoefficient: number;     // 仓储费系数
    actualStorageFeePerUnit: Money; // 实际单件仓储费
    returnQuantity: number;         // 退货数量
    resellableQuantity: number;     // 可重新销售数量
    unsellableQuantity: number;     // 不可售数量
    returnProcessingFeePerUnit: Money; // 单件退货处理费
  };
}

interface Money {
  usd: number;
  cny: number;
}
```

### 3. 项目保存结构

```typescript
interface SavedProject {
  id: string;                       // UUID
  name: string;                     // 项目名称
  description: string;              // 项目描述
  parentId: string | null;          // 父项目ID（用于分支功能）
  branchPath: string;               // 分支路径（如 "A", "A-A", "A-B-C"）
  input: FBACalculatorInput;        // 输入参数
  result: FBACalculationResult;     // 计算结果
  createdAt: string;                // 创建时间 ISO8601
  updatedAt: string;                // 更新时间 ISO8601
}
```

---

## 核心计算逻辑

### 算法伪代码

```python
def calculate_fba_profit(input: FBACalculatorInput) -> FBACalculationResult:
    """
    FBA 利润计算核心算法
    """
    
    # ========== 基础数值提取 ==========
    unit_cost = input.pre_purchase.unit_cost.usd
    quantity = input.pre_purchase.quantity
    shipping_per_unit = input.pre_purchase.shipping_per_unit.usd
    
    selling_price = input.during_sale.selling_price.usd
    daily_sales = input.during_sale.daily_sales
    sales_days = input.during_sale.sales_days
    referral_fee_rate = input.during_sale.referral_fee_rate / 100
    fba_fee_per_unit = input.during_sale.fba_fee_per_unit.usd
    monthly_storage_fee = input.during_sale.monthly_storage_fee.usd
    
    return_rate = input.after_sale.return_rate / 100
    resellable_rate = input.after_sale.resellable_rate / 100
    
    # ========== 售前成本计算 ==========
    purchase_cost = unit_cost * quantity
    shipping_cost = shipping_per_unit * quantity
    total_pre_cost = purchase_cost + shipping_cost
    
    # ========== 售中计算 ==========
    # 销售数量（取采购数量和计划销售数量的较小值）
    planned_sales = daily_sales * sales_days
    actual_sales_quantity = min(quantity, planned_sales)
    
    # 销售收入
    total_revenue = selling_price * actual_sales_quantity
    
    # 广告费用
    if input.during_sale.advertising_mode == 'budget':
        advertising_cost = input.during_sale.daily_ad_budget.usd * sales_days
    else:
        advertising_cost = total_revenue * (input.during_sale.ad_percentage / 100)
    
    # 销售佣金
    referral_fee_per_unit = selling_price * referral_fee_rate
    total_referral_fee = referral_fee_per_unit * actual_sales_quantity
    
    # FBA配送费
    total_fba_fee = fba_fee_per_unit * actual_sales_quantity
    
    # 仓储费计算
    # 仓储费系数 = 平均每件商品在仓库储存天数 / 30
    # 平均储存天数 = (第1件存储天数 + 第2件存储天数 + ... + 第N件存储天数) / N
    # 简化计算：假设均匀销售，平均存储天数 ≈ 销售天数 / 2
    avg_storage_days = sales_days / 2
    storage_coefficient = avg_storage_days / 30
    actual_storage_fee_per_unit = monthly_storage_fee * storage_coefficient
    total_storage_fee = actual_storage_fee_per_unit * actual_sales_quantity
    
    # ========== 售后成本计算 ==========
    # 退货数量
    return_quantity = actual_sales_quantity * return_rate
    
    # 退货处理费（单件）
    return_processing_fee_per_unit = min(referral_fee_per_unit * 0.20, 5.0)
    total_return_processing_fee = return_processing_fee_per_unit * return_quantity
    
    # 可售与不可售分类
    resellable_quantity = return_quantity * resellable_rate
    unsellable_quantity = return_quantity * (1 - resellable_rate)
    
    # 不可售库存弃置费 = FBA配送费 × 不可售数量
    unsellable_disposal_fee = fba_fee_per_unit * unsellable_quantity
    
    # 退货损失（不可售商品的成本损失）
    # 退货后，亚马逊会退还销售佣金，但商品成本已损失
    return_loss = (unit_cost + shipping_per_unit) * unsellable_quantity
    
    # ========== 利润汇总 ==========
    total_cost = (
        total_pre_cost +           # 售前：采购+头程
        advertising_cost +          # 售中：广告
        total_referral_fee +        # 售中：佣金
        total_fba_fee +             # 售中：FBA配送
        total_storage_fee +         # 售中：仓储
        total_return_processing_fee + # 售后：退货处理
        unsellable_disposal_fee +   # 售后：弃置费
        return_loss                 # 售后：退货商品损失
    )
    
    # 退货时亚马逊会退还销售佣金
    refunded_referral_fee = referral_fee_per_unit * return_quantity
    adjusted_referral_fee = total_referral_fee - refunded_referral_fee
    
    # 重新计算总成本（扣除退还的佣金）
    actual_total_cost = total_cost - refunded_referral_fee
    
    # 净利润
    net_profit = total_revenue - actual_total_cost
    
    # 利润率
    net_profit_margin = (net_profit / total_revenue) * 100 if total_revenue > 0 else 0
    
    # 单件利润
    profit_per_unit = net_profit / actual_sales_quantity if actual_sales_quantity > 0 else 0
    
    # ROI = 净利润 / 总投入成本
    total_investment = purchase_cost + shipping_cost + advertising_cost
    roi = (net_profit / total_investment) * 100 if total_investment > 0 else 0
    
    # 回本天数
    daily_profit = net_profit / sales_days if sales_days > 0 else 0
    break_even_days = total_investment / daily_profit if daily_profit > 0 else float('inf')
    
    return FBACalculationResult(...)
```

### 仓储费系数详细说明

```
仓储费系数计算逻辑：
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

假设场景：
- 采购数量：100件
- 销售天数：30天
- 日均销量：3件（假设每天均匀销售）

每件商品的存储天数：
- 第1天卖出的3件：存储 0.5 天（平均）
- 第2天卖出的3件：存储 1.5 天（平均）
- 第3天卖出的3件：存储 2.5 天（平均）
- ...
- 第N天卖出的商品：存储 (N-0.5) 天

简化计算：
平均存储天数 = (0.5 + 1.5 + 2.5 + ... + (N-0.5)) / 总件数
            ≈ 销售天数 / 2

仓储费系数 = 平均存储天数 / 30

示例：
- 销售天数 30 天 → 平均存储 15 天 → 系数 0.5
- 销售天数 60 天 → 平均存储 30 天 → 系数 1.0
- 销售天数 90 天 → 平均存储 45 天 → 系数 1.5
```

---

## UI/UX 设计规范

### 页面布局

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [Logo] Amazon FBA 利润预估器            汇率: [1 USD = _____ CNY]     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │     📦 售前参数              │  │      📊 计算结果                 │  │
│  ├─────────────────────────────┤  ├─────────────────────────────────┤  │
│  │ 采购单价      [USD] [CNY]   │  │  净利润：$XXX / ¥XXX            │  │
│  │ 采购数量      [_____]       │  │  利润率：XX.X%                   │  │
│  │ 单件头程运费  [USD] [CNY]   │  │  ROI：XX.X%                      │  │
│  └─────────────────────────────┘  │  回本天数：XX 天                 │  │
│                                    │                                  │  │
│  ┌─────────────────────────────┐  │  ─────────────────────────────  │  │
│  │     🛒 售中参数              │  │                                  │  │
│  ├─────────────────────────────┤  │       [成本构成饼图]             │  │
│  │ 产品售价      [USD] [CNY]   │  │                                  │  │
│  │ 日均销量      [_____]       │  │                                  │  │
│  │ 销售天数      [_____]       │  │                                  │  │
│  │                             │  │  ─────────────────────────────  │  │
│  │ ○ 单日广告预算 [USD] [CNY]  │  │                                  │  │
│  │ ○ 广告占比    [_____%]      │  │       [成本对比柱状图]           │  │
│  │                             │  │                                  │  │
│  │ 销售佣金费率  [_____%]      │  │                                  │  │
│  │ 单件FBA配送费 [USD] [CNY]   │  └─────────────────────────────────┘  │
│  │ 单件月均仓储费 [USD] [CNY]  │                                       │
│  └─────────────────────────────┘                                       │
│                                                                         │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │     📤 售后参数              │  │      💾 项目管理                 │  │
│  ├─────────────────────────────┤  ├─────────────────────────────────┤  │
│  │ 退货率        [_____%]      │  │  [保存项目]  [另存为分支]        │  │
│  │ 退货可售率    [_____%]      │  │                                  │  │
│  │                             │  │  已保存项目：                    │  │
│  │ (自动计算显示)              │  │  ├─ 项目A                        │  │
│  │ 退货处理费：$X.XX/件        │  │  │  ├─ A-A (预测分支)            │  │
│  │ 弃置费：$X.XX/件            │  │  │  └─ A-B (预测分支)            │  │
│  └─────────────────────────────┘  │  └─ 项目B                        │  │
│                                    └─────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 双币种输入组件规范

```
┌──────────────────────────────────────────┐
│  采购单价                                │
│  ┌─────────────┐ ┌─────────────┐        │
│  │ $  [12.50 ] │ │ ¥  [90.63 ] │  🔄    │
│  └─────────────┘ └─────────────┘        │
│  (输入任一侧自动计算另一侧，基于汇率)    │
└──────────────────────────────────────────┘

交互规则：
1. 用户输入 USD，自动计算 CNY = USD × 汇率
2. 用户输入 CNY，自动计算 USD = CNY ÷ 汇率
3. 记录 primaryCurrency 标识用户主要输入的币种
4. 🔄 按钮可切换主要显示币种
```

### 图表设计

#### 成本构成饼图
```
展示各成本类别占总成本的比例：
- 采购成本（含头程运费）
- 广告费用
- 销售佣金
- FBA配送费
- 仓储费
- 退货相关成本（处理费+弃置费+损失）
```

#### 成本对比柱状图
```
对比不同成本类别的绝对金额：
X轴：成本类别
Y轴：金额（USD）
支持切换：USD / CNY 显示
```

#### 利润瀑布图（可选增强）
```
展示从收入到净利润的逐级扣减：
收入 → -采购成本 → -运费 → -广告 → -佣金 → -FBA费 → -仓储 → -退货成本 → 净利润
```

---

## 项目管理功能规范

### 保存项目

```typescript
// 保存/更新项目
async function saveProject(project: Partial<SavedProject>): Promise<SavedProject> {
  // 如果是新项目，生成 ID 和初始分支路径
  if (!project.id) {
    project.id = generateUUID();
    project.branchPath = await generateNextRootPath(); // "A", "B", "C"...
    project.parentId = null;
  }
  // 更新时间戳
  project.updatedAt = new Date().toISOString();
  // 保存到数据库
  return await db.projects.upsert(project);
}
```

### 创建预测分支

```typescript
// 创建预测分支
async function createBranch(parentId: string, name: string, description: string): Promise<SavedProject> {
  const parent = await db.projects.findById(parentId);
  
  // 生成新的分支路径
  const siblingCount = await db.projects.countByParentId(parentId);
  const branchSuffix = String.fromCharCode(65 + siblingCount); // A, B, C...
  const newBranchPath = `${parent.branchPath}-${branchSuffix}`;
  
  // 复制父项目数据创建新分支
  const newBranch: SavedProject = {
    id: generateUUID(),
    name: name,
    description: description,
    parentId: parentId,
    branchPath: newBranchPath,
    input: { ...parent.input },  // 深拷贝输入参数
    result: { ...parent.result }, // 深拷贝计算结果
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  return await db.projects.create(newBranch);
}
```

### 项目树形结构展示

```
项目列表展示为可折叠树形结构：

📁 项目A - "iPhone 15 手机壳利润预估"
   ├── 📄 A-A - "乐观预测 - 日销10件"
   │   ├── 📄 A-A-A - "广告预算加倍"
   │   └── 📄 A-A-B - "降价促销"
   └── 📄 A-B - "保守预测 - 日销5件"
       
📁 项目B - "蓝牙耳机利润预估"
   └── 📄 B-A - "Q4旺季预测"

操作按钮：
- 📂 展开/折叠
- ✏️ 编辑（加载到计算器）
- 📋 创建分支
- 🗑️ 删除（级联删除子分支）
```

---

## API 接口设计

### RESTful API 端点

```yaml
# 计算接口
POST /api/calculate
  Request: FBACalculatorInput
  Response: FBACalculationResult

# 项目管理
GET    /api/projects                    # 获取所有项目（树形结构）
GET    /api/projects/:id                # 获取单个项目
POST   /api/projects                    # 创建新项目
PUT    /api/projects/:id                # 更新项目
DELETE /api/projects/:id                # 删除项目（含子分支）

POST   /api/projects/:id/branch         # 创建预测分支
  Request: { name: string, description: string }
  Response: SavedProject

# 设置
GET    /api/settings                    # 获取全局设置（如默认汇率）
PUT    /api/settings                    # 更新全局设置

# 导出
GET    /api/projects/:id/export         # 导出项目数据（JSON/CSV）
```

---

## Docker 部署规范

### Dockerfile（多阶段构建）

```dockerfile
# ===== 前端构建阶段 =====
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ===== 后端依赖阶段 =====
FROM python:3.11-slim AS backend-builder
WORKDIR /app

# 在容器内也使用 venv（与本地开发一致）
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# ===== 生产镜像 =====
FROM python:3.11-slim
WORKDIR /app

# 安装运行时依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# 复制后端代码和依赖
COPY --from=backend-builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY backend/ ./backend/

# 复制前端构建产物
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# 创建数据卷挂载点
RUN mkdir -p /app/data
VOLUME ["/app/data"]

# 环境变量
ENV DATABASE_PATH=/app/data/fba_calculator.db
ENV HOST=0.0.0.0
ENV PORT=8080

EXPOSE 8080

CMD ["python", "-m", "backend.main"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  fba-calculator:
    build:
      context: .
      dockerfile: Dockerfile
      platforms:
        - linux/amd64
        - linux/arm64
    image: fba-profit-calculator:latest
    container_name: fba-calculator
    ports:
      - "8080:8080"
    volumes:
      - fba-data:/app/data
    environment:
      - TZ=Asia/Shanghai
    restart: unless-stopped

volumes:
  fba-data:
    driver: local
```

### 多架构构建命令

```bash
# 创建多架构构建器
docker buildx create --name multiarch --use

# 构建并推送多架构镜像
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t yourusername/fba-calculator:latest \
  --push .
```

---

## 项目文件结构

```
fba-profit-calculator/
├── README.md
├── docker-compose.yml
├── Dockerfile
├── .gitignore
├── .env.example
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       │   ├── Calculator/
│       │   │   ├── PreSaleInputs.tsx       # 售前参数输入
│       │   │   ├── DuringSaleInputs.tsx    # 售中参数输入
│       │   │   ├── AfterSaleInputs.tsx     # 售后参数输入
│       │   │   └── MoneyInput.tsx          # 双币种输入组件
│       │   ├── Results/
│       │   │   ├── Summary.tsx             # 结果摘要
│       │   │   ├── CostPieChart.tsx        # 成本饼图
│       │   │   ├── CostBarChart.tsx        # 成本柱状图
│       │   │   └── ProfitDetails.tsx       # 详细利润明细
│       │   ├── ProjectManager/
│       │   │   ├── ProjectTree.tsx         # 项目树形列表
│       │   │   ├── SaveDialog.tsx          # 保存对话框
│       │   │   └── BranchDialog.tsx        # 创建分支对话框
│       │   └── Layout/
│       │       ├── Header.tsx              # 顶部导航（含汇率设置）
│       │       └── Sidebar.tsx             # 侧边栏
│       ├── hooks/
│       │   ├── useCalculator.ts            # 计算逻辑 Hook
│       │   ├── useProjects.ts              # 项目管理 Hook
│       │   └── useCurrency.ts              # 币种转换 Hook
│       ├── store/
│       │   └── index.ts                    # Zustand 状态管理
│       ├── api/
│       │   └── client.ts                   # API 请求封装
│       ├── types/
│       │   └── index.ts                    # TypeScript 类型定义
│       └── utils/
│           ├── calculator.ts               # 前端计算辅助函数
│           └── formatters.ts               # 格式化工具
│
├── backend/
│   ├── requirements.txt
│   ├── main.py                             # FastAPI 入口
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes.py                       # API 路由
│   │   └── deps.py                         # 依赖注入
│   ├── services/
│   │   ├── __init__.py
│   │   ├── calculator.py                   # 核心计算逻辑
│   │   └── project.py                      # 项目管理服务
│   ├── models/
│   │   ├── __init__.py
│   │   ├── schemas.py                      # Pydantic 模型
│   │   └── database.py                     # SQLite 数据库模型
│   └── utils/
│       ├── __init__.py
│       └── helpers.py                      # 工具函数
│
└── tests/
    ├── frontend/                           # 前端测试
    └── backend/                            # 后端测试
        └── test_calculator.py              # 计算逻辑测试
```

---

## 开发优先级与里程碑

### Phase 1：核心功能（MVP）
1. ✅ 项目初始化（前后端框架搭建）
2. ✅ 数据模型定义
3. ✅ 核心计算逻辑实现
4. ✅ 基础 UI（参数输入 + 结果展示）
5. ✅ 双币种输入组件

### Phase 2：可视化与存储
1. ✅ 成本饼图
2. ✅ 成本柱状图
3. ✅ SQLite 数据库集成
4. ✅ 项目保存/加载功能

### Phase 3：高级功能
1. ✅ 预测分支功能
2. ✅ 项目树形管理
3. ✅ 数据导出（JSON/CSV）

### Phase 4：部署优化
1. ✅ Docker 镜像构建
2. ✅ 多架构支持（amd64/arm64）
3. ✅ 生产环境配置

---

## 测试用例示例

```python
def test_fba_calculation():
    """
    测试案例：标准 FBA 商品利润计算
    """
    input_data = {
        "pre_purchase": {
            "unit_cost": {"usd": 10.00},
            "quantity": 100,
            "shipping_per_unit": {"usd": 2.00}
        },
        "during_sale": {
            "selling_price": {"usd": 29.99},
            "daily_sales": 5,
            "sales_days": 20,
            "advertising_mode": "percentage",
            "ad_percentage": 10,
            "referral_fee_rate": 15,
            "fba_fee_per_unit": {"usd": 4.50},
            "monthly_storage_fee": {"usd": 0.50}
        },
        "after_sale": {
            "return_rate": 5,
            "resellable_rate": 80
        },
        "settings": {
            "exchange_rate": 7.25
        }
    }
    
    result = calculate_fba_profit(input_data)
    
    # 验证计算结果
    assert result.summary.total_revenue.usd == pytest.approx(2999.00, rel=0.01)  # 29.99 × 100
    assert result.summary.net_profit_margin > 0  # 应该盈利
    assert result.intermediate_values.storage_coefficient == pytest.approx(0.33, rel=0.1)  # 20天/2/30
```

---

## 注意事项

1. **货币精度**：所有金额计算保留2位小数，使用 `Decimal` 类型避免浮点误差
2. **汇率更新**：汇率存储在本地设置中，用户可手动更新
3. **边界处理**：
   - 销售数量不能超过采购数量
   - 所有百分比限制在 0-100 范围
   - 金额不能为负数
4. **响应式设计**：UI 需适配桌面端和平板端
5. **数据备份**：SQLite 数据库文件通过 Docker Volume 持久化

---

## 附录：默认参数值

| 参数 | 默认值 | 说明 |
|------|--------|------|
| 汇率 | 7.25 | 1 USD = 7.25 CNY |
| 销售佣金费率 | 15% | 亚马逊标准佣金 |
| 退货率 | 5% | 行业平均水平 |
| 退货可售率 | 80% | 行业平均水平 |

---

*文档版本：v1.0*
*最后更新：2025年*
