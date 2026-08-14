from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List

from app.schemas.stock import StockQuote, FXRateResponse
from app.services.stock_adapter import get_stock_quote
from app.services.fx_service import get_usd_twd_rate

app = FastAPI(
    title="跨國股市儀表板 API",
    description="支援台美股即時行情、匯率換算與自訂投資組合",
    version="1.0.0"
)

# 允許前端 (Vercel 或 Localhost) 跨域請求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 生產環境可指定 Vercel 網址
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

@app.get("/api/fx/usd-twd", response_model=FXRateResponse)
async def get_fx_rate():
    """取得即時 USD/TWD 匯率"""
    return await get_usd_twd_rate()

@app.get("/api/quote/{symbol}", response_model=StockQuote)
async def get_single_quote(symbol: str):
    """查詢單一個股即時行情 (例: 2330.TW 或 NVDA)"""
    try:
        return await get_stock_quote(symbol)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/api/quotes/batch", response_model=List[StockQuote])
async def get_batch_quotes(symbols: List[str] = Query(..., description="標的代號陣列")):
    """批次查詢多檔股票 (用於投資組合列表)"""
    results = []
    for sym in symbols:
        try:
            quote = await get_stock_quote(sym)
            results.append(quote)
        except Exception:
            continue # 忽略無效代號
    return results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)