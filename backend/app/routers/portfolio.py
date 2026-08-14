from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.core.database import get_db
from app.models.portfolio import Portfolio, PortfolioItem
from app.schemas.portfolio import (
    PortfolioCreate, PortfolioResponse,
    PortfolioItemCreate, PortfolioItemResponse
)

router = APIRouter(prefix="/api/portfolios", tags=["投資組合管理"])

# 1. 取得所有投資組合 (含內含股票)
@router.get("", response_model=List[PortfolioResponse])
async def get_all_portfolios(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Portfolio))
    return result.scalars().all()

# 2. 新增投資組合 (如: "科技股組合")
@router.post("", response_model=PortfolioResponse)
async def create_portfolio(payload: PortfolioCreate, db: AsyncSession = Depends(get_db)):
    new_portfolio = Portfolio(name=payload.name)
    db.add(new_portfolio)
    await db.commit()
    await db.refresh(new_portfolio)
    return new_portfolio

# 3. 新增持股至指定組合
@router.post("/{portfolio_id}/items", response_model=PortfolioItemResponse)
async def add_stock_to_portfolio(
    portfolio_id: str,
    item: PortfolioItemCreate,
    db: AsyncSession = Depends(get_db)
):
    # 確認組合是否存在
    result = await db.execute(select(Portfolio).where(Portfolio.id == portfolio_id))
    portfolio = result.scalar_one_or_none()
    if not portfolio:
        raise HTTPException(status_code=404, detail="找不到該投資組合")

    new_item = PortfolioItem(portfolio_id=portfolio_id, **item.model_dump())
    db.add(new_item)
    await db.commit()
    await db.refresh(new_item)
    return new_item

# 4. 刪除持股
@router.delete("/items/{item_id}")
async def delete_portfolio_item(item_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PortfolioItem).where(PortfolioItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="找不到該筆持股")
    
    await db.delete(item)
    await db.commit()
    return {"message": "持股已成功刪除"}