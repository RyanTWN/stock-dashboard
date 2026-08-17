import './globals.css';

export const metadata = {
  title: '跨國股市即時儀表板',
  description: '支援台美股即時行情與自訂投資組合',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW">
      <body className="bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}