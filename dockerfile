FROM python:3.11-slim

# 設定工作目錄
WORKDIR /app

# 設定環境變數防止產生 .pyc 檔及確保輸出即時顯示
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 安裝系統必要依賴
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 複製依賴檔並安裝 Python 套件
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 複製專案程式碼
COPY . .

# 暴露 FastAPI 預設 Port 8000
EXPOSE 8000

# 啟動命令
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]