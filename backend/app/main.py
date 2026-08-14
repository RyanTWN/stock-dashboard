from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List

from app.core.database import engine, Base
from app.schemas.stock import StockQuote, FXRateResponse
from app.services.stock_adapter import get_stock_quote
from app.services.fx_service import get_usd_twd_rate
from app.routers import portfolio

# 1. 使用 asynccontextmanager 定義生命週期 (Lifespan)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 【啟動時執行】自動在 MariaDB 建立未存在的資料表
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # 【關閉時執行】如需釋放資源可寫在此處（目前無則留空即可）

# 2. 將 lifespan 傳入 FastAPI 實例
app = FastAPI(
    title="跨國股市儀表板 API",
    description="支援台美股即時行情、匯率換算與自訂投資組合",
    version="1.0.0",
    lifespan=lifespan
)

# 允許前端 (Vercel 或 Localhost) 跨域請求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 註冊 API 路由
app.include_router(portfolio.router)

@app.get("/api/health", tags=["系統"])
async def health_check():
    return {"status": "ok"}

@app.get("/api/fx/usd-twd", response_model=FXRateResponse, tags=["行情數據"])
async def get_fx_rate():
    """取得即時 USD/TWD 匯率"""
    return await get_usd_twd_rate()

@app.get("/api/quote/{symbol}", response_model=StockQuote, tags=["行情數據"])
async def get_single_quote(symbol: str):
    """查詢單一個股即時行情 (例: 2330.TW 或 NVDA)"""
    try:
        return await get_stock_quote(symbol)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/api/quotes/batch", response_model=List[StockQuote], tags=["行情數據"])
async def get_batch_quotes(symbols: List[str] = Query(..., description="標的代號陣列")):
    """批次查詢多檔股票 (用於投資組合列表)"""
    results = []
    for sym in symbols:
        try:
            quote = await get_stock_quote(sym)
            results.append(quote)
        except Exception:
            continue
    return results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)