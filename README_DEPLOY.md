跨國股市儀表板 - 標準部署流程指南 (本機 ➔ GitHub ➔ Vercel ➔ NAS)本指南依照 「本機開發測試 ➔ 推送至 GitHub ➔ Vercel 前端自動發布 ➔ NAS 部署後端 Docker」 的標準自動化流程進行建置與營運。階段一：本機開發與測試 (Local Development)在將程式碼推送到雲端前，請先於本地電腦確認前後端功能正常。1. 專案目錄架構建議專案採用前後端整合儲存庫 (Monorepo) 架構：stock-dashboard/
├── backend/                  # FastAPI 後端 API
│   ├── app/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── requirements.txt
├── frontend/                 # Next.js / React 前端介面
│   ├── src/ (或 app/)
│   └── package.json
└── README.md
2. 本地功能驗證後端測試：cd backend
pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload
開啟 http://localhost:8000/docs 測試 API 運作。前端測試：cd frontend
npm install
npm run dev
開啟 http://localhost:3000 測試看盤介面與 API 連線。階段二：版控與推送至 GitHub (GitHub Repository)將本機完成的程式碼版控並上傳至 GitHub，作為後續自動化部署的核心源頭。1. 本機初始化 Git 儲存庫在專案根目錄（stock-dashboard/）執行：# 初始化 Git
git init

# 新增 .gitignore (排除 node_modules, __pycache__, .env)
echo "node_modules/\n.next/\n__pycache__/\n*.pyc\n.env" > .gitignore

# 提交本地版控
git add .
git commit -m "feat: initial commit for stock dashboard"
2. 推送至 GitHub 遠端儲存庫開啟 GitHub 並建立一個新儲存庫（Repository Name 例：stock-dashboard）。在本地終端機將程式碼推送到 GitHub：git remote add origin [https://github.com/your-username/stock-dashboard.git](https://github.com/your-username/stock-dashboard.git)
git branch -M main
git push -u origin main
階段三：Vercel 前端自動化部署 (Vercel CD)透過 Vercel 與 GitHub 的整合，未來只要 git push 程式碼，Vercel 就會自動為前端進行建置與部署。1. 匯入 GitHub 專案至 Vercel登入 Vercel 官網。點擊 Add New... ➔ Project。在 Import Git Repository 清單中，選擇剛推送的 stock-dashboard 專案並點擊 Import。2. 設定 Build 參數Framework Preset: Next.jsRoot Directory: 選取 frontend 目錄（若前端放在專案根目錄則保持預設）Environment Variables (環境變數)：NEXT_PUBLIC_API_URL: 設定為 NAS API 的外網位址（例：http://my-nas.ddns.net:8000），亦可留空於網頁介面上設定。3. 部署完成點擊 Deploy，等待 1~2 分鐘，即可獲得 Vercel 提供的固定前端網址（如 https://stock-dashboard.vercel.app）。階段四：NAS 遠端部署與運行 (NAS Docker)最後在自家 NAS 上拉取 GitHub 最新後端程式碼，並啟動 Docker 容器與 MariaDB。1. 在 NAS 上同步 GitHub 專案透過 SSH 連線至 NAS，或使用 NAS 的 Git 工具將專案 Clone 下來：# 進入 NAS Docker 資料夾
cd /volume1/docker/

# 從 GitHub 拉取最新程式碼
git clone [https://github.com/your-username/stock-dashboard.git](https://github.com/your-username/stock-dashboard.git)
cd stock-dashboard/backend
(未來若後端有更新，只需在 NAS 執行 git pull 即可同步最新程式碼)2. 啟動 NAS 容器服務在 NAS 的 backend 目錄下執行 Docker Compose：docker-compose up -d --build
提示：亦可在群暉 Container Manager / 威聯通 Container Station 中直接建立「專案 (Project)」，並將目錄指向此 docker-compose.yml 執行啟動。3. 設定外網連線 (路由器 Port Forwarding)在路由器設定埠號轉發：將外部 Port 8000 指向 NAS 的內網 IP 的 8000 Port。開啟瀏覽器訪問 http://my-nas.ddns.net:8000/docs 確認外網 API 服務正常。階段五：雙端連線測試打開 Vercel 部署好的前端網址（https://stock-dashboard.vercel.app）。點擊右上角 ⚙️ 「設定」。在 FastAPI 後端 URL 輸入您的 NAS 外網網址：http://my-nas.ddns.net:8000。點擊 「測試」，確認狀態顯示 「NAS API 連線成功」。至此，整套 「本機開發 ➔ GitHub 版控 ➔ Vercel 前端 ➔ NAS 後端」 的標準流水線即全數建置完成！