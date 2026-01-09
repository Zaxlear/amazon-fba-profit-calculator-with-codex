# CLAUDE.md - Claude Code 项目指南

## 项目简介

这是一个 **Amazon FBA 利润预估器** Web 应用，用于计算亚马逊 FBA 商品的利润。

**详细开发规范请参阅：** `CLAUDE_CODE_DEV_SPEC.md`

---

## 快速开始命令

```bash
# 开发环境
cd frontend && npm install && npm run dev

# 后端（必须使用 venv，禁止直接使用系统 pip）
cd backend
python -m venv .venv
source .venv/bin/activate  # macOS/Linux
# Windows PowerShell: .\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python main.py

# 生产构建
docker-compose up --build
```

---

## 核心开发任务清单

按以下顺序完成开发：

### 任务1：项目初始化
- [ ] 创建 `frontend/` 目录，使用 Vite + React + TypeScript
- [ ] 创建 `backend/` 目录，使用 FastAPI + SQLite
- [ ] 安装依赖：前端 (antd, echarts, zustand, tailwindcss)，后端 (fastapi, uvicorn, sqlalchemy, pydantic)

### 任务2：后端核心逻辑
- [ ] 实现 `backend/models/schemas.py` - Pydantic 数据模型
- [ ] 实现 `backend/services/calculator.py` - 利润计算核心算法
- [ ] 实现 `backend/api/routes.py` - API 路由

### 任务3：前端基础 UI
- [ ] 实现 `MoneyInput` 双币种输入组件
- [ ] 实现售前/售中/售后三个输入面板
- [ ] 实现计算结果展示面板

### 任务4：图表可视化
- [ ] 实现成本构成饼图
- [ ] 实现成本对比柱状图

### 任务5：项目管理功能
- [ ] 实现 SQLite 数据库模型
- [ ] 实现项目保存/加载
- [ ] 实现预测分支功能（树形结构）

### 任务6：Docker 部署
- [ ] 创建多阶段 Dockerfile
- [ ] 配置 docker-compose.yml
- [ ] 支持 amd64/arm64 多架构

---

## 关键计算公式

```python
# 仓储费系数
storage_coefficient = (sales_days / 2) / 30

# 退货处理费（单件）
return_processing_fee = min(selling_price * referral_fee_rate * 0.20, 5.0)

# 不可售库存弃置费 = FBA配送费
unsellable_disposal_fee = fba_fee_per_unit * unsellable_quantity

# 退货时退还销售佣金，但收取退货处理费
refunded_referral_fee = referral_fee_per_unit * return_quantity
```

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18, TypeScript, Vite, Ant Design, ECharts, Zustand, TailwindCSS |
| 后端 | Python 3.11, FastAPI, SQLAlchemy, SQLite, Pydantic |
| 部署 | Docker, docker-compose, 支持 linux/amd64 + linux/arm64 |

---

## 重要约定

1. **货币处理**：所有金额使用 Decimal 类型，保留2位小数
2. **双币种**：每个金额输入都有 USD 和 CNY 两个输入框，自动联动
3. **汇率**：页面右上角显示汇率输入框，默认 1 USD = 7.25 CNY
4. **分支命名**：根项目用 A, B, C...，子分支用 A-A, A-B, A-A-A...
5. **数据持久化**：使用 SQLite，通过 Docker Volume 挂载
6. **Python 依赖安装**：后端依赖必须安装在 `backend/.venv/` 中（venv），不要把依赖装到系统 Python

---

## 文件结构参考

```
fba-profit-calculator/
├── CLAUDE.md                    # 本文件
├── CLAUDE_CODE_DEV_SPEC.md      # 详细开发规范
├── docker-compose.yml
├── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Calculator/      # 输入组件
│   │   │   ├── Results/         # 结果展示
│   │   │   └── ProjectManager/  # 项目管理
│   │   └── ...
│   └── ...
└── backend/
    ├── main.py
    ├── services/calculator.py   # 核心计算
    ├── models/schemas.py        # 数据模型
    └── ...
```

---

## 开发时参考

遇到不确定的实现细节，请查阅 `CLAUDE_CODE_DEV_SPEC.md` 中的：
- **数据模型设计** - 完整的 TypeScript 接口定义
- **核心计算逻辑** - 详细的算法伪代码
- **UI/UX 设计规范** - 布局和交互说明
- **API 接口设计** - RESTful 端点定义
