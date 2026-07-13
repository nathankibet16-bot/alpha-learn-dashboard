const ITEMS = [
  { sym: "BTC", price: "67,240.12", change: "+1.24%", up: true },
  { sym: "ETH", price: "3,512.88", change: "-0.86%", up: false },
  { sym: "SOL", price: "184.05", change: "+3.12%", up: true },
  { sym: "BNB", price: "612.44", change: "+0.42%", up: true },
  { sym: "XRP", price: "0.542", change: "-1.10%", up: false },
  { sym: "ADA", price: "0.412", change: "+2.05%", up: true },
  { sym: "DOGE", price: "0.148", change: "-2.44%", up: false },
  { sym: "AVAX", price: "36.21", change: "+1.88%", up: true },
  { sym: "LINK", price: "17.62", change: "-0.35%", up: false },
  { sym: "MATIC", price: "0.71", change: "+0.92%", up: true },
];

export function CryptoTicker() {
  const loop = [...ITEMS, ...ITEMS];
  return (
    <div className="w-full overflow-hidden border-b border-border bg-zinc-950/80 backdrop-blur">
      <div className="flex animate-marquee whitespace-nowrap py-2">
        {loop.map((it, i) => (
          <div key={i} className="mx-6 flex items-center gap-2 text-sm">
            <span className="font-semibold text-foreground">{it.sym}</span>
            <span className="text-muted-foreground">${it.price}</span>
            <span className={it.up ? "text-emerald-500" : "text-red-500"}>
              {it.up ? "▲" : "▼"} {it.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
