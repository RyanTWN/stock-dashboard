import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Plus, Trash2, RefreshCw, Globe, 
  DollarSign, BarChart2, PieChart, Search, Settings, ChevronRight, 
  ArrowUpRight, ArrowDownRight, Layers, Activity, Check, X, 
  Wifi, WifiOff, Edit3, ShieldAlert
} from 'lucide-react';

// --- 預設 Mock 股票數據 (當後端未連線時作為備用，確保介面體驗完整) ---
const INITIAL_MARKET_DATA = {
  '2330.TW': { symbol: '2330.TW', name: '台積電', market: 'TW', price: 985.0, change: 15.0, changePercent: 1.55, open: 975, high: 990, low: 970, prevClose: 970.0, volume: 34520000, currency: 'TWD', pe: 28.5, pb: 6.2, eps: 34.5, dividendYield: 1.8, foreignBuy: '+12,450張' },
  '2454.TW': { symbol: '2454.TW', name: '聯發科', market: 'TW', price: 1240.0, change: -15.0, changePercent: -1.20, open: 1255, high: 1260, low: 1235, prevClose: 1255.0, volume: 8900000, currency: 'TWD', pe: 21.3, pb: 4.1, eps: 58.2, dividendYield: 4.2, foreignBuy: '-2,100張' },
  '0050.TW': { symbol: '0050.TW', name: '元大台灣50', market: 'TW', price: 172.5, change: 1.2, changePercent: 0.70, open: 171.5, high: 173.0, low: 171.0, prevClose: 171.3, volume: 15400000, currency: 'TWD', pe: 19.8, pb: 2.8, eps: 8.7, dividendYield: 3.5, foreignBuy: '+5,300張' },
  'NVDA': { symbol: 'NVDA', name: '輝達 (NVIDIA)', market: 'US', price: 128.50, change: 4.20, changePercent: 3.38, open: 125.00, high: 129.80, low: 124.50, prevClose: 124.30, volume: 52100000, currency: 'USD', pe: 68.4, pb: 38.2, eps: 1.88, dividendYield: 0.03, foreignBuy: '機構高比重' },
  'AAPL': { symbol: 'AAPL', name: '蘋果 (Apple)', market: 'US', price: 224.30, change: 0.80, changePercent: 0.36, open: 223.50, high: 225.20, low: 222.80, prevClose: 223.50, volume: 38200000, currency: 'USD', pe: 33.1, pb: 48.5, eps: 6.78, dividendYield: 0.44, foreignBuy: '機構高比重' },
  'TSLA': { symbol: 'TSLA', name: '特斯拉 (Tesla)', market: 'US', price: 212.40, change: -5.60, changePercent: -2.57, open: 218.00, high: 219.50, low: 211.20, prevClose: 218.00, volume: 64100000, currency: 'USD', pe: 58.9, pb: 8.9, eps: 3.60, dividendYield: 0.00, foreignBuy: '高散戶參與' },
  'MSFT': { symbol: 'MSFT', name: '微軟 (Microsoft)', market: 'US', price: 421.80, change: 2.10, changePercent: 0.50, open: 420.00, high: 423.50, low: 419.20, prevClose: 419.70, volume: 18900000, currency: 'USD', pe: 35.6, pb: 12.1, eps: 11.80, dividendYield: 0.71, foreignBuy: '長期法人持有' }
};

// 預設投資組合資料
const DEFAULT_PORTFOLIOS = [
  {
    id: 'port-1',
    name: '核心台美科技',
    items: [
      { id: 'item-1', symbol: '2330.TW', market: 'TW', shares: 1000, avgPrice: 850, currency: 'TWD', notes: '定期定額扣款' },
      { id: 'item-2', symbol: 'NVDA', market: 'US', shares: 50, avgPrice: 110, currency: 'USD', notes: 'AI長線佈局' },
      { id: 'item-3', symbol: '2454.TW', market: 'TW', shares: 500, avgPrice: 1180, currency: 'TWD', notes: 'IC設計龍頭' }
    ]
  },
  {
    id: 'port-2',
    name: '美股成長ETF',
    items: [
      { id: 'item-4', symbol: 'AAPL', market: 'US', shares: 30, avgPrice: 195, currency: 'USD', notes: '蘋果生態系' },
      { id: 'item-5', symbol: 'MSFT', market: 'US', shares: 15, avgPrice: 380, currency: 'USD', notes: '雲端與AI' }
    ]
  }
];

export default function App() {
  // --- 狀態定義 ---
  const [portfolios, setPortfolios] = useState(() => {
    const saved = localStorage.getItem('stock_portfolios');
    return saved ? JSON.parse(saved) : DEFAULT_PORTFOLIOS;
  });
  const [activePortfolioId, setActivePortfolioId] = useState('port-1');
  const [selectedSymbol, setSelectedSymbol] = useState('2330.TW');
  const [marketQuotes, setMarketQuotes] = useState(INITIAL_MARKET_DATA);
  const [usdTwdRate, setUsdTwdRate] = useState(32.45);
  const [displayCurrency, setDisplayCurrency] = useState('TWD'); // 'TWD' | 'USD'
  const [colorMode, setColorMode] = useState('TW'); // 'TW' (紅漲綠跌) | 'US' (綠漲紅跌)
  
  // 後端 API 設定
  const [backendUrl, setBackendUrl] = useState('http://localhost:8000');
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 模態框狀態
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showAddPortfolioModal, setShowAddPortfolioModal] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');

  // 新增個股 Form
  const [newStock, setNewStock] = useState({
    symbol: '2330.TW',
    market: 'TW',
    shares: 1000,
    avgPrice: 900,
    currency: 'TWD',
    notes: ''
  });

  // 時間範圍與線圖控制
  const [chartTimeframe, setChartTimeframe] = useState('1M'); // '1D', '5D', '1M', '1Y'

  // 持久化保存投資組合至 LocalStorage
  useEffect(() => {
    localStorage.setItem('stock_portfolios', JSON.stringify(portfolios));
  }, [portfolios]);

  // 嘗試向 FastAPI 後端測通
  const checkBackendConnection = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`${backendUrl}/api/health`, { method: 'GET' });
      if (res.ok) {
        setIsBackendConnected(true);
        // 抓取即時匯率
        const fxRes = await fetch(`${backendUrl}/api/fx/usd-twd`);
        if (fxRes.ok) {
          const fxData = await fxRes.json();
          if (fxData.rate) setUsdTwdRate(fxData.rate);
        }
        // 嘗試抓取 API 投資組合
        const portRes = await fetch(`${backendUrl}/api/portfolios`);
        if (portRes.ok) {
          const apiPorts = await portRes.json();
          if (Array.isArray(apiPorts) && apiPorts.length > 0) {
            setPortfolios(apiPorts);
          }
        }
      } else {
        setIsBackendConnected(false);
      }
    } catch (err) {
      setIsBackendConnected(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    checkBackendConnection();
  }, []);

  // 模擬/同步更新單檔股票資料
  const refreshQuote = async (symbol) => {
    if (isBackendConnected) {
      try {
        const res = await fetch(`${backendUrl}/api/quote/${symbol}`);
        if (res.ok) {
          const data = await res.json();
          setMarketQuotes(prev => ({
            ...prev,
            [symbol]: {
              ...prev[symbol],
              price: data.current_price,
              change: data.change,
              changePercent: data.change_percent,
              open: data.open,
              high: data.high,
              low: data.low,
              prevClose: data.previous_close,
              volume: data.volume,
              currency: data.currency
            }
          }));
          return;
        }
      } catch (e) {
        console.warn('Backend fetch failed, fallback to local tick');
      }
    }

    // 本地模擬報價微幅跳動
    setMarketQuotes(prev => {
      const target = prev[symbol];
      if (!target) return prev;
      const fluctuation = (Math.random() - 0.48) * (target.price * 0.005);
      const newPrice = Math.max(1, +(target.price + fluctuation).toFixed(2));
      const change = +(newPrice - target.prevClose).toFixed(2);
      const changePercent = +((change / target.prevClose) * 100).toFixed(2);

      return {
        ...prev,
        [symbol]: {
          ...target,
          price: newPrice,
          change,
          changePercent,
          high: Math.max(target.high, newPrice),
          low: Math.min(target.low, newPrice)
        }
      };
    });
  };

  // 定時輪詢當前選擇股票的價格
  useEffect(() => {
    const timer = setInterval(() => {
      refreshQuote(selectedSymbol);
    }, 3000);
    return () => clearInterval(timer);
  }, [selectedSymbol, isBackendConnected]);

  // --- 計算屬性 ---
  const activePortfolio = useMemo(() => {
    return portfolios.find(p => p.id === activePortfolioId) || portfolios[0] || { id: 'default', name: '空白組合', items: [] };
  }, [portfolios, activePortfolioId]);

  // 當前選中的個股行情
  const currentQuote = useMemo(() => {
    return marketQuotes[selectedSymbol] || {
      symbol: selectedSymbol,
      name: selectedSymbol,
      market: selectedSymbol.includes('.TW') ? 'TW' : 'US',
      price: 100,
      change: 0,
      changePercent: 0,
      open: 100, high: 100, low: 100, prevClose: 100, volume: 0, currency: selectedSymbol.includes('.TW') ? 'TWD' : 'USD'
    };
  }, [marketQuotes, selectedSymbol]);

  // 投資組合總價值與未實現損益計算
  const portfolioStats = useMemo(() => {
    let totalValueTWD = 0;
    let totalCostTWD = 0;

    activePortfolio.items.forEach(item => {
      const quote = marketQuotes[item.symbol] || { price: item.avgPrice, currency: item.currency };
      const isUSD = item.currency === 'USD';
      const rate = isUSD ? usdTwdRate : 1;

      const itemValTWD = item.shares * quote.price * rate;
      const itemCostTWD = item.shares * item.avgPrice * rate;

      totalValueTWD += itemValTWD;
      totalCostTWD += itemCostTWD;
    });

    const totalUnrealizedPLTWD = totalValueTWD - totalCostTWD;
    const roiPercent = totalCostTWD > 0 ? (totalUnrealizedPLTWD / totalCostTWD) * 100 : 0;

    // 依顯示幣別換算
    const rateMultiplier = displayCurrency === 'USD' ? 1 / usdTwdRate : 1;

    return {
      totalValue: totalValueTWD * rateMultiplier,
      totalCost: totalCostTWD * rateMultiplier,
      unrealizedPL: totalUnrealizedPLTWD * rateMultiplier,
      roiPercent
    };
  }, [activePortfolio, marketQuotes, usdTwdRate, displayCurrency]);

  // 漲跌顏色判斷 (台股: 紅漲綠跌 / 美股: 綠漲紅跌)
  const getChangeColorClass = (val) => {
    if (val === 0) return 'text-slate-400';
    const isPositive = val > 0;
    if (colorMode === 'TW') {
      return isPositive ? 'text-red-500' : 'text-emerald-500';
    } else {
      return isPositive ? 'text-emerald-500' : 'text-red-500';
    }
  };

  const getChangeBgClass = (val) => {
    if (val === 0) return 'bg-slate-800 text-slate-300 border-slate-700';
    const isPositive = val > 0;
    if (colorMode === 'TW') {
      return isPositive ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    } else {
      return isPositive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20';
    }
  };

  // 處理新增持股
  const handleAddStock = () => {
    if (!newStock.symbol) return;
    const cleanSym = newStock.symbol.trim().toUpperCase();
    const market = cleanSym.endsWith('.TW') || cleanSym.endsWith('.TWO') ? 'TW' : 'US';
    const currency = market === 'TW' ? 'TWD' : 'USD';

    const newItem = {
      id: `item-${Date.now()}`,
      symbol: cleanSym,
      market,
      shares: Number(newStock.shares),
      avgPrice: Number(newStock.avgPrice),
      currency,
      notes: newStock.notes
    };

    setPortfolios(prev => prev.map(p => {
      if (p.id === activePortfolioId) {
        return { ...p, items: [...p.items, newItem] };
      }
      return p;
    }));

    if (!marketQuotes[cleanSym]) {
      setMarketQuotes(prev => ({
        ...prev,
        [cleanSym]: {
          symbol: cleanSym,
          name: cleanSym,
          market,
          price: Number(newStock.avgPrice),
          change: 0,
          changePercent: 0,
          open: Number(newStock.avgPrice),
          high: Number(newStock.avgPrice),
          low: Number(newStock.avgPrice),
          prevClose: Number(newStock.avgPrice),
          volume: 1000000,
          currency,
          pe: 20, pb: 3, eps: 5, dividendYield: 2.5, foreignBuy: '觀察中'
        }
      }));
    }

    setShowAddStockModal(false);
  };

  // 刪除持股
  const handleDeleteItem = (itemId) => {
    setPortfolios(prev => prev.map(p => {
      if (p.id === activePortfolioId) {
        return { ...p, items: p.items.filter(item => item.id !== itemId) };
      }
      return p;
    }));
  };

  // 新增投資組合
  const handleAddPortfolio = () => {
    if (!newPortfolioName.trim()) return;
    const newPort = {
      id: `port-${Date.now()}`,
      name: newPortfolioName.trim(),
      items: []
    };
    setPortfolios(prev => [...prev, newPort]);
    setActivePortfolioId(newPort.id);
    setNewPortfolioName('');
    setShowAddPortfolioModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* 1. 頂部導航列 (Top Navigation) */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-4 py-2.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-tr from-indigo-500 to-cyan-400 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
            <BarChart2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-wide flex items-center gap-2">
              跨國股市即時儀表板
              <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/30 font-normal">
                TW & US Market
              </span>
            </h1>
          </div>
        </div>

        {/* 大盤與外匯動態資訊 */}
        <div className="hidden lg:flex items-center space-x-6 text-xs bg-slate-950/60 px-4 py-1.5 rounded-full border border-slate-800">
          <div className="flex items-center space-x-2">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">USD/TWD:</span>
            <span className="font-semibold text-slate-200">{usdTwdRate}</span>
          </div>
          <div className="h-3 w-[1px] bg-slate-800" />
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">台股加權:</span>
            <span className={`font-semibold ${getChangeColorClass(120.5)}`}>23,450.2 (+0.52%)</span>
          </div>
          <div className="h-3 w-[1px] bg-slate-800" />
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">S&P 500:</span>
            <span className={`font-semibold ${getChangeColorClass(18.2)}`}>5,540.8 (+0.33%)</span>
          </div>
        </div>

        {/* 右側偏好設定控制項 */}
        <div className="flex items-center space-x-3">
          {/* 幣別切換 */}
          <button 
            onClick={() => setDisplayCurrency(prev => prev === 'TWD' ? 'USD' : 'TWD')}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-medium transition border border-slate-700"
            title="切換投資組合顯示計價幣別"
          >
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            <span>{displayCurrency}</span>
          </button>

          {/* 漲跌顏色切換 */}
          <button 
            onClick={() => setColorMode(prev => prev === 'TW' ? 'US' : 'TW')}
            className="hidden sm:flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg text-xs transition border border-slate-700 text-slate-300"
            title="切換紅綠漲跌習慣"
          >
            <span>{colorMode === 'TW' ? '🔴 漲/🟢 跌 (台)' : '🟢 漲/🔴 跌 (美)'}</span>
          </button>

          {/* 後端連線 Badge */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs transition border ${
              isBackendConnected 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
            }`}
          >
            {isBackendConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isBackendConnected ? 'NAS API 連線中' : '示範模式 (無連線)'}</span>
          </button>

          {/* 設定彈窗 */}
          <button 
            onClick={() => setShowSettingsModal(true)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-200 transition border border-slate-700"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. 主區域 (雙欄佈局) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 max-w-[1800px] w-full mx-auto">
        
        {/* === 左側：投資組合與持股明細 (7 欄) === */}
        <section className="lg:col-span-7 flex flex-col space-y-4">
          
          {/* A. 總資產淨值與損益統計 */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 p-4 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-400 font-medium tracking-wide">
                  [{activePortfolio.name}] 總資產市值 ({displayCurrency})
                </p>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 text-white">
                  {displayCurrency === 'TWD' ? 'NT$' : '$'} {portfolioStats.totalValue.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
              </div>

              <div className="flex items-center space-x-4">
                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                  <p className="text-[11px] text-slate-400">未實現總損益</p>
                  <p className={`text-base font-bold mt-0.5 ${getChangeColorClass(portfolioStats.unrealizedPL)}`}>
                    {portfolioStats.unrealizedPL >= 0 ? '+' : ''}
                    {portfolioStats.unrealizedPL.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                  <p className="text-[11px] text-slate-400">總報酬率 (ROI)</p>
                  <p className={`text-base font-bold mt-0.5 flex items-center ${getChangeColorClass(portfolioStats.roiPercent)}`}>
                    {portfolioStats.roiPercent >= 0 ? <ArrowUpRight className="w-4 h-4 mr-0.5" /> : <ArrowDownRight className="w-4 h-4 mr-0.5" />}
                    {portfolioStats.roiPercent >= 0 ? '+' : ''}{portfolioStats.roiPercent.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* B. 投資組合 Tabs & 新增按鈕 */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
              {portfolios.map(port => (
                <button
                  key={port.id}
                  onClick={() => setActivePortfolioId(port.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition whitespace-nowrap flex items-center space-x-2 ${
                    activePortfolioId === port.id 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{port.name}</span>
                  <span className="bg-slate-950/40 text-[10px] px-1.5 py-0.5 rounded-full border border-white/10">
                    {port.items.length}
                  </span>
                </button>
              ))}

              <button
                onClick={() => setShowAddPortfolioModal(true)}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-indigo-400 border border-dashed border-indigo-500/40 rounded-xl transition text-xs flex items-center space-x-1"
                title="建立新投資組合"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => setShowAddStockModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 shadow-lg shadow-indigo-600/20 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>新增持股</span>
            </button>
          </div>

          {/* C. 持股表格 */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-lg flex-1 flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-slate-800 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">代號 / 名稱</th>
                    <th className="py-3 px-3 text-right">即時現價</th>
                    <th className="py-3 px-3 text-right">漲跌幅</th>
                    <th className="py-3 px-3 text-right">持股數</th>
                    <th className="py-3 px-3 text-right">買入均價</th>
                    <th className="py-3 px-3 text-right">未實現損益 ({displayCurrency})</th>
                    <th className="py-3 px-4 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {activePortfolio.items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-500">
                        <PieChart className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        此投資組合尚無持股，請點擊「新增持股」按鈕
                      </td>
                    </tr>
                  ) : (
                    activePortfolio.items.map(item => {
                      const quote = marketQuotes[item.symbol] || { price: item.avgPrice, change: 0, changePercent: 0, currency: item.currency };
                      const isSelected = selectedSymbol === item.symbol;

                      const isUSD = item.currency === 'USD';
                      const rate = isUSD ? (displayCurrency === 'TWD' ? usdTwdRate : 1) : (displayCurrency === 'USD' ? 1 / usdTwdRate : 1);
                      const itemValue = item.shares * quote.price * rate;
                      const itemCost = item.shares * item.avgPrice * rate;
                      const itemPL = itemValue - itemCost;
                      const itemRoi = itemCost > 0 ? (itemPL / itemCost) * 100 : 0;

                      return (
                        <tr 
                          key={item.id}
                          onClick={() => setSelectedSymbol(item.symbol)}
                          className={`cursor-pointer transition hover:bg-slate-800/50 ${
                            isSelected ? 'bg-indigo-950/30 border-l-2 border-indigo-500' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 font-medium">
                            <div className="flex items-center space-x-2">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${
                                item.market === 'TW' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                              }`}>
                                {item.market}
                              </span>
                              <div>
                                <div className="font-bold text-slate-200 text-xs">{item.symbol}</div>
                                <div className="text-[11px] text-slate-400">{quote.name}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-3 text-right font-semibold text-slate-100">
                            {item.currency === 'USD' ? '$' : 'NT$'}{quote.price.toFixed(2)}
                          </td>

                          <td className="py-3.5 px-3 text-right">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border ${getChangeBgClass(quote.change)}`}>
                              {quote.changePercent >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
                            </span>
                          </td>

                          <td className="py-3.5 px-3 text-right text-slate-300 font-mono">
                            {item.shares.toLocaleString()}
                          </td>

                          <td className="py-3.5 px-3 text-right text-slate-400 font-mono">
                            {item.currency === 'USD' ? '$' : 'NT$'}{item.avgPrice}
                          </td>

                          <td className="py-3.5 px-3 text-right font-semibold">
                            <div className={getChangeColorClass(itemPL)}>
                              {itemPL >= 0 ? '+' : ''}{itemPL.toLocaleString('zh-TW', { maximumFractionDigits: 0 })}
                            </div>
                            <div className={`text-[10px] ${getChangeColorClass(itemRoi)}`}>
                              ({itemRoi >= 0 ? '+' : ''}{itemRoi.toFixed(2)}%)
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteItem(item.id);
                              }}
                              className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition"
                              title="移除個股"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* === 右側：個股深度看盤 (5 欄) === */}
        <section className="lg:col-span-5 flex flex-col space-y-4">
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl flex-1 flex flex-col space-y-4">
            
            {/* A. 個股行情 Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-xl font-black tracking-tight text-white">{currentQuote.symbol}</h3>
                  <span className="text-sm font-normal text-slate-400">{currentQuote.name}</span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                    {currentQuote.currency}
                  </span>
                </div>
                <div className="flex items-center space-x-3 mt-1 text-xs text-slate-400">
                  <span>成交量: {(currentQuote.volume / 1000).toFixed(0)} 千股</span>
                  <span>昨收: {currentQuote.prevClose}</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-black tracking-tight text-white">
                  {currentQuote.currency === 'USD' ? '$' : 'NT$'}{currentQuote.price.toFixed(2)}
                </div>
                <div className={`text-xs font-bold flex items-center justify-end mt-0.5 ${getChangeColorClass(currentQuote.change)}`}>
                  {currentQuote.change >= 0 ? '+' : ''}{currentQuote.change.toFixed(2)} ({currentQuote.changePercent >= 0 ? '+' : ''}{currentQuote.changePercent.toFixed(2)}%)
                </div>
              </div>
            </div>

            {/* B. 圖表時間區間選擇 */}
            <div className="flex items-center justify-between">
              <div className="flex space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                {['1D', '5D', '1M', '1Y'].map(tf => (
                  <button
                    key={tf}
                    onClick={() => setChartTimeframe(tf)}
                    className={`px-2.5 py-1 rounded-md transition font-medium ${
                      chartTimeframe === tf ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block mr-1" />MA5</span>
                <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-cyan-400 inline-block mr-1" />MA20</span>
              </div>
            </div>

            {/* C. Canvas K線繪製區塊 */}
            <div className="bg-slate-950 rounded-xl border border-slate-800 p-2 h-[260px] relative overflow-hidden">
              <CandleChartEngine 
                quote={currentQuote} 
                timeframe={chartTimeframe} 
                colorMode={colorMode} 
              />
            </div>

            {/* D. 基本面與統計數據 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <p className="text-slate-500 text-[10px]">開盤價</p>
                <p className="font-semibold text-slate-200 mt-0.5">{currentQuote.open}</p>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <p className="text-slate-500 text-[10px]">最高價</p>
                <p className="font-semibold text-red-400 mt-0.5">{currentQuote.high}</p>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <p className="text-slate-500 text-[10px]">最低價</p>
                <p className="font-semibold text-emerald-400 mt-0.5">{currentQuote.low}</p>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <p className="text-slate-500 text-[10px]">本益比 (P/E)</p>
                <p className="font-semibold text-slate-200 mt-0.5">{currentQuote.pe || '22.4'}</p>
              </div>
            </div>

            {/* E. 買賣五檔盤口 */}
            <div className="border-t border-slate-800 pt-3 flex-1 flex flex-col justify-end">
              <h4 className="text-xs font-bold text-slate-400 mb-2 flex items-center justify-between">
                <span>即時盤口五檔 (Level 2)</span>
                <span className="text-[10px] text-slate-500 font-normal">即時撮合</span>
              </h4>

              <OrderBookSimulation 
                currentPrice={currentQuote.price} 
                colorMode={colorMode} 
              />
            </div>

          </div>
        </section>

      </div>

      {/* === Modal 1: 新增持股 === */}
      {showAddStockModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button 
              onClick={() => setShowAddStockModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-4">新增持股標的</h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">股票代號 (例: 2330.TW 或 NVDA)</label>
                <input 
                  type="text" 
                  value={newStock.symbol}
                  onChange={e => {
                    const sym = e.target.value.toUpperCase();
                    const isTW = sym.includes('.TW') || /^\d{4}$/.test(sym);
                    setNewStock({
                      ...newStock,
                      symbol: sym,
                      market: isTW ? 'TW' : 'US',
                      currency: isTW ? 'TWD' : 'USD'
                    });
                  }}
                  placeholder="2330.TW / NVDA / AAPL"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 uppercase font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">持有股數</label>
                  <input 
                    type="number" 
                    value={newStock.shares}
                    onChange={e => setNewStock({ ...newStock, shares: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">買入均價 ({newStock.currency})</label>
                  <input 
                    type="number" 
                    value={newStock.avgPrice}
                    onChange={e => setNewStock({ ...newStock, avgPrice: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">備註 / 策略標籤</label>
                <input 
                  type="text" 
                  value={newStock.notes}
                  onChange={e => setNewStock({ ...newStock, notes: e.target.value })}
                  placeholder="如：波段操作、定期定額"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button 
                  onClick={() => setShowAddStockModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                >
                  取消
                </button>
                <button 
                  onClick={handleAddStock}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition shadow-lg shadow-indigo-600/20"
                >
                  確認新增
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === Modal 2: 新增投資組合 === */}
      {showAddPortfolioModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
            <button 
              onClick={() => setShowAddPortfolioModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-4">建立新投資組合</h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">投資組合名稱</label>
                <input 
                  type="text" 
                  value={newPortfolioName}
                  onChange={e => setNewPortfolioName(e.target.value)}
                  placeholder="如：美股ETF、股息收租"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button 
                  onClick={() => setShowAddPortfolioModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                >
                  取消
                </button>
                <button 
                  onClick={handleAddPortfolio}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition"
                >
                  建立組合
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === Modal 3: 後端 API 連線與設定 Modal === */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button 
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
              <Settings className="w-5 h-5 text-indigo-400" />
              <span>系統與後端 API 連線設定</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">FastAPI 後端 URL (NAS 或 Localhost)</label>
                <div className="flex space-x-2">
                  <input 
                    type="text" 
                    value={backendUrl}
                    onChange={e => setBackendUrl(e.target.value)}
                    placeholder="http://localhost:8000"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={checkBackendConnection}
                    disabled={isRefreshing}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition flex items-center space-x-1"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>測試</span>
                  </button>
                </div>
              </div>

              <div className={`p-3 rounded-xl border text-xs ${
                isBackendConnected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}>
                <div className="font-bold flex items-center space-x-1.5 mb-1">
                  {isBackendConnected ? <Check className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                  <span>{isBackendConnected ? '後端連線成功' : '目前為前端展示模式'}</span>
                </div>
                <p className="text-[11px] opacity-80 leading-relaxed">
                  {isBackendConnected 
                    ? '已成功與 FastAPI 後端連線，即時行情與 MariaDB 投資組合資料將優先由 NAS 端供應。'
                    : '未連線至 API。您可在本機啟動 `uvicorn app.main:app --port 8000` 後點擊「測試」同步真實數據。'}
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button 
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition"
                >
                  關閉
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// === 子組件 1: Canvas 專業 K 線圖繪製引擎 ===
function CandleChartEngine({ quote, timeframe, colorMode }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // 高 Dpi 渲染自適應
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // 清空背景
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    // 模擬歷史 K 線數據生成
    const basePrice = quote.price;
    const dataCount = timeframe === '1D' ? 24 : timeframe === '5D' ? 40 : 60;
    const candles = [];
    let currentBar = quote.prevClose || basePrice * 0.98;

    for (let i = 0; i < dataCount; i++) {
      const open = currentBar;
      const change = (Math.random() - 0.49) * (basePrice * 0.02);
      const close = Math.max(1, open + change);
      const high = Math.max(open, close) + Math.random() * (basePrice * 0.008);
      const low = Math.min(open, close) - Math.random() * (basePrice * 0.008);
      candles.push({ open, high, low, close });
      currentBar = close;
    }
    candles[candles.length - 1].close = quote.price;

    let minP = Math.min(...candles.map(c => c.low));
    let maxP = Math.max(...candles.map(c => c.high));
    const padding = (maxP - minP) * 0.1 || 1;
    minP -= padding;
    maxP += padding;

    // 繪製橫向背景網格
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let y = 30; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const candleWidth = (width - 20) / dataCount;
    const isUpRed = colorMode === 'TW';

    // 繪製蠟燭圖
    candles.forEach((c, i) => {
      const x = 10 + i * candleWidth + candleWidth / 2;
      const isUp = c.close >= c.open;

      const upColor = isUpRed ? '#ef4444' : '#10b981';
      const downColor = isUpRed ? '#10b981' : '#ef4444';
      const color = isUp ? upColor : downColor;

      const yOpen = height - ((c.open - minP) / (maxP - minP)) * (height - 30) - 15;
      const yClose = height - ((c.close - minP) / (maxP - minP)) * (height - 30) - 15;
      const yHigh = height - ((c.high - minP) / (maxP - minP)) * (height - 30) - 15;
      const yLow = height - ((c.low - minP) / (maxP - minP)) * (height - 30) - 15;

      // 影線 (Wick)
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();

      // 實體 (Body)
      ctx.fillStyle = color;
      const bodyY = Math.min(yOpen, yClose);
      const bodyH = Math.max(1, Math.abs(yOpen - yClose));
      ctx.fillRect(x - candleWidth * 0.35, bodyY, candleWidth * 0.7, bodyH);
    });

  }, [quote, timeframe, colorMode]);

  return <canvas ref={canvasRef} className="w-full h-full block" />;
}

// === 子組件 2: 最佳五檔即時盤口模擬器 ===
function OrderBookSimulation({ currentPrice, colorMode }) {
  const isTW = colorMode === 'TW';

  const bids = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => ({
      price: +(currentPrice - (i + 1) * 0.5).toFixed(2),
      size: Math.floor(Math.random() * 80) + 5
    }));
  }, [currentPrice]);

  const asks = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => ({
      price: +(currentPrice + (5 - i) * 0.5).toFixed(2),
      size: Math.floor(Math.random() * 80) + 5
    }));
  }, [currentPrice]);

  return (
    <div className="grid grid-cols-2 gap-2 text-[11px]">
      {/* 買盤 (Bids) */}
      <div className="space-y-1">
        <div className="text-slate-500 font-semibold mb-1 border-b border-slate-800 pb-0.5">買進 (Bid)</div>
        {bids.map((b, i) => (
          <div key={i} className="flex justify-between items-center bg-slate-950/40 px-2 py-0.5 rounded">
            <span className={isTW ? 'text-red-400 font-medium' : 'text-emerald-400 font-medium'}>{b.price}</span>
            <span className="text-slate-400 font-mono">{b.size}張</span>
          </div>
        ))}
      </div>

      {/* 賣盤 (Asks) */}
      <div className="space-y-1">
        <div className="text-slate-500 font-semibold mb-1 border-b border-slate-800 pb-0.5">賣出 (Ask)</div>
        {asks.map((a, i) => (
          <div key={i} className="flex justify-between items-center bg-slate-950/40 px-2 py-0.5 rounded">
            <span className={isTW ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>{a.price}</span>
            <span className="text-slate-400 font-mono">{a.size}張</span>
          </div>
        ))}
      </div>
    </div>
  );
}