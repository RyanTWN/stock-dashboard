import yfinance as yf
from datetime import datetime
from app.schemas.stock import StockQuote

async def fetch_us_quote(symbol: str) -> StockQuote:
    ticker = yf.Ticker(symbol)
    # 取得當日即時/延遲數據
    info = ticker.fast_info
    
    current_price = round(float(info.last_price), 2)
    prev_close = round(float(info.previous_close), 2)
    change = round(current_price - prev_close, 2)
    change_percent = round((change / prev_close) * 100, 2) if prev_close else 0.0

    return StockQuote(
        symbol=symbol.upper(),
        name=symbol.upper(),
        market="US",
        current_price=current_price,
        change=change,
        change_percent=change_percent,
        open=round(float(info.open), 2) if info.open else current_price,
        high=round(float(info.day_high), 2) if info.day_high else current_price,
        low=round(float(info.day_low), 2) if info.day_low else current_price,
        previous_close=prev_close,
        volume=int(info.last_volume) if info.last_volume else 0,
        currency="USD",
        timestamp=datetime.utcnow().isoformat()
    )