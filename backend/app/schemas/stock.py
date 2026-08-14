from pydantic import BaseModel
from typing import Optional

class StockQuote(BaseModel):
    symbol: str             # 如: 2330.TW, NVDA
    name: str               # 股票名稱
    market: str             # TW 或 US
    current_price: float    # 現價
    change: float           # 漲跌點數
    change_percent: float   # 漲跌幅 (%)
    open: float             # 開盤價
    high: float             # 最高價
    low: float              # 最低價
    previous_close: float   # 昨收價
    volume: int             # 成交量 (股數)
    currency: str           # TWD 或 USD
    timestamp: str          # 報價時間 (ISO格式)

class FXRateResponse(BaseModel):
    currency_pair: str      # USD/TWD
    rate: float             # 匯率
    timestamp: str