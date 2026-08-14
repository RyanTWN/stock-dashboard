from sqlalchemy import Column, String, Numeric, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(50), nullable=False) # 例如：科技成長、高股息ETF
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 關聯持股明細 (當組合刪除時，連帶刪除所有持股)
    items = relationship("PortfolioItem", back_populates="portfolio", cascade="all, delete-orphan", lazy="selectin")

class PortfolioItem(Base):
    __tablename__ = "portfolio_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    portfolio_id = Column(String(36), ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False)
    symbol = Column(String(20), nullable=False)     # 2330.TW / NVDA
    market = Column(String(10), nullable=False)     # TW / US
    shares = Column(Numeric(12, 4), nullable=False) # 持有股數
    avg_price = Column(Numeric(12, 4), nullable=False) # 買進均價
    currency = Column(String(5), nullable=False)    # TWD / USD
    notes = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    portfolio = relationship("Portfolio", back_populates="items")