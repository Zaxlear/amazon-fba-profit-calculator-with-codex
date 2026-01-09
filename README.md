# 📈 Amazon FBA 利润预估器（Profit Calculator）

> 一个用于精确估算 Amazon FBA 商品利润的 Web 应用：覆盖售前 / 售中 / 售后成本，支持 USD/CNY 双币种输入、图表可视化、项目保存与预测分支管理。

---

## ✨ 功能特性

- 💱 **双币种输入**：每个金额字段同时支持 USD / CNY，随汇率自动联动
- 🧮 **核心指标**：净利润、净利率、毛利润、单件利润、ROI、回本天数
- 📊 **可视化**：成本构成饼图、成本对比柱状图（支持 USD/CNY 切换）
- 🗂️ **项目管理**：保存/加载项目、创建预测分支（树形结构）、级联删除
- 🐳 **一键部署**：Docker + SQLite，数据库通过 Volume 持久化

---

## 🧱 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | React 18 + TypeScript + Vite + Ant Design + ECharts + Zustand + TailwindCSS |
| 后端 | Python + FastAPI + SQLAlchemy + SQLite + Pydantic |
| 部署 | Docker + Docker Compose（支持 linux/amd64 与 linux/arm64） |

---

## 🚀 快速开始（开发环境）

> [!IMPORTANT]
> 后端依赖必须安装在 `backend/.venv/`（venv）中，**不要**对系统 Python 直接 `pip install`。

### 1) 启动后端（FastAPI）

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # macOS/Linux
python -m pip install -r requirements.txt
python main.py
```

后端默认地址：`http://localhost:8080`

### 2) 启动前端（Vite + React）

```bash
cd frontend
npm install
npm run dev
```

前端默认地址：`http://localhost:5173`

> [!TIP]
> 开发模式下，前端会把 `/api/*` 代理到后端（见 `frontend/vite.config.ts`），因此前端只需访问同域的 `/api` 即可。

---

## 🐳 Docker 部署（推荐）

```bash
docker-compose up --build
```

部署后访问：`http://localhost:8080`

SQLite 数据会写入容器 Volume（见 `docker-compose.yml`）。

---

## ⚙️ 配置

项目提供 `.env.example`，常用环境变量：

- `DATABASE_PATH`：SQLite 数据库路径（默认：`./data/fba_calculator.db`）
- `HOST`：后端监听地址（默认：`0.0.0.0`）
- `PORT`：后端端口（默认：`8080`）

---

## 🔌 API 简表

计算：
- `POST /api/calculate`

项目管理：
- `GET /api/projects`（树形结构）
- `GET /api/projects/:id`
- `POST /api/projects`
- `PUT /api/projects/:id`
- `DELETE /api/projects/:id`（级联删除子分支）
- `POST /api/projects/:id/branch`
- `GET /api/projects/:id/export?format=json|csv`

设置：
- `GET /api/settings`
- `PUT /api/settings`

---

## 🧪 测试（后端）

```bash
cd backend
source .venv/bin/activate
PYTHONPYCACHEPREFIX=.pycache python -m pytest -q
```

---

## 📁 项目结构

```text
.
├── frontend/                 # 前端（Vite + React + TS）
│   ├── src/
│   │   ├── components/       # 输入/结果/项目管理等组件
│   │   ├── store/            # Zustand 状态管理
│   │   └── api/              # API 客户端
│   └── ...
├── backend/                  # 后端（FastAPI + SQLite）
│   ├── api/                  # 路由与依赖注入
│   ├── services/             # 计算 & 项目管理服务
│   ├── models/               # SQLAlchemy/Pydantic 模型
│   └── main.py               # 入口
├── docker-compose.yml
├── Dockerfile
└── CLAUDE.md / CLAUDE_CODE_DEV_SPEC.md  # 开发规范与详细设计
```

---

## 📝 开发说明

- 货币精度：后端计算使用 `Decimal`，按 2 位小数四舍五入
- 双币种输入：输入 USD 自动计算 CNY（反之亦然），并记录主要输入币种 `primaryCurrency`
- 分支命名：根项目 `A/B/C...`，子分支 `A-A/A-B...`（与规范保持一致）

---

如果你希望我下一步补充：截图/GIF、在线 Demo、或完善导出 CSV 字段与前端展示，我也可以继续做。  
