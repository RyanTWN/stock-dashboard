from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
import os

# 請替換為您自家 NAS 的 IP、連接埠、帳號與密碼
# 格式: mysql+aiomysql://<帳號>:<密碼>@<NAS_IP>:<Port>/<資料庫名稱>
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "mysql+aiomysql://root:kakcsv3@Dmin0609@192.168.173.200:3306/stock_dashboard"
)

engine = create_async_engine(DATABASE_URL, echo=True, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

# FastAPI 依賴注入：獲取 DB Session
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session