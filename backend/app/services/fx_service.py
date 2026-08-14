import yfinance as yf
from datetime import datetime
from cachetools import TTLCache
from app.schemas.stock import FXRateResponse

# 匯率快取 60 秒
fx_cache = TTLCache(maxsize=10, ttl=60)

async def get_usd_twd_rate() -> FXRateResponse:
    if "USD_TWD" in fx_cache:
        return fx_cache["USD_TWD"]

    ticker = yf.Ticker("USDTWD=X")
    rate = round(float(ticker.fast_info.last_price), 3)
    
    response = FXRateResponse(
        currency_pair="USD/TWD",
        rate=rate,
        timestamp=datetime.utcnow().isoformat()
    )
    fx_cache["USD_TWD"] = response
    return response