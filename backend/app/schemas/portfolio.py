from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# 持股明細 Schema
class PortfolioItemBase(BaseModel):
    symbol: str
    market: str
    shares: float
    avg_price: float
    currency: str
    notes: Optional[str] = None

class PortfolioItemCreate(PortfolioItemBase):
    pass

class PortfolioItemResponse(PortfolioItemBase):
    id: str
    portfolio_id: str
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# 投資組合 Schema
class PortfolioBase(BaseModel):
    name: str

class PortfolioCreate(PortfolioBase):
    pass

class PortfolioResponse(PortfolioBase):
    id: str
    created_at: Optional[datetime] = None
    items: List[PortfolioItemResponse] = []

    class Config:
        from_attributes = True