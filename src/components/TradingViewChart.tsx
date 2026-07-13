export function TradingViewChart({ symbol, title }: { symbol: string; title: string }) {
  const src = `https://s.tradingview.com/widgetembed/?frameElementId=tv_${symbol}&symbol=${encodeURIComponent(
    symbol,
  )}&interval=60&hidesidetoolbar=1&symboledit=0&saveimage=0&toolbarbg=131722&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&hideideas=1`;
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="font-display text-sm font-semibold">{title}</h3>
        </div>
        <span className="text-xs text-muted-foreground">Simulated market data</span>
      </div>
      <iframe
        title={title}
        src={src}
        className="h-[360px] w-full"
        allowTransparency
        scrolling="no"
        frameBorder={0}
      />
    </div>
  );
}
