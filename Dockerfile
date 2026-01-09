# ===== 前端构建阶段 =====
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install --no-audit --no-fund; fi
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
