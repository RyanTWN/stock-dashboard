import httpx
from datetime import datetime
from app.schemas.stock import StockQuote

async def fetch_tw_quote(symbol: str) -> StockQuote:
    # 去除後綴取得純代號 (如: 2330.TW -> 2330)
    raw_code = symbol.split('.')[0]
    
    # 查詢證交所 MIS 即時盤資訊
    twse_url = f"https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_{raw_code}.tw|otc_{raw_code}.tw"
    
    async with httpx.AsyncClient(timeout=5.0) as client:
        res = await client.get(twse_url, headers={"User-Agent": "Mozilla/5.0"})
        data = res.json()
        
    msg_array = data.get("msgArray", [])
    if not msg_array:
        raise ValueError(f"查無台股標的: {symbol}")
        
    stock_data = msg_array[0]
    
    # 解析最新成交價 (若無成交價則取最佳買價或昨收)
    prev_close = float(stock_data.get("y", 0.0))
    current_price = float(stock_data.get("z", stock_data.get("a", str(prev_close)).split('_')[0]))
    
    # 計算漲跌
    change = round(current_price - prev_close, 2)
    change_percent = round((change / prev_close) * 100, 2) if prev_close > 0 else 0.0

    return StockQuote(
        symbol=f"{raw_code}.TW",
        name=stock_data.get("n", raw_code),
        market="TW",
        current_price=current_price,
        change=change,
        change_percent=change_percent,
        open=float(stock_data.get("o", current_price)),
        high=float(stock_data.get("h", current_price)),
        low=float(stock_data.get("l", current_price)),
        previous_close=prev_close,
        volume=int(stock_data.get("v", 0)) * 1000, # 轉換成股數
        currency="TWD",
        timestamp=datetime.utcnow().isoformat()
    )