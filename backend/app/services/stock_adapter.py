from cachetools import TTLCache
from app.schemas.stock import StockQuote
from app.services.tw_stock import fetch_tw_quote
from app.services.us_stock import fetch_us_quote

# 報價快取 3 秒
quote_cache = TTLCache(maxsize=500, ttl=3)

async def get_stock_quote(symbol: str) -> StockQuote:
    clean_symbol = symbol.strip().upper()
    
    # 1. 命中快取直接回傳
    if clean_symbol in quote_cache:
        return quote_cache[clean_symbol]

    # 2. 市場分流
    if clean_symbol.endswith(".TW") or clean_symbol.endswith(".TWO") or clean_symbol.isdigit():
        quote = await fetch_tw_quote(clean_symbol)
    else:
        quote = await fetch_us_quote(clean_symbol)

    # 3. 寫入快取
    quote_cache[clean_symbol] = quote
    return quote