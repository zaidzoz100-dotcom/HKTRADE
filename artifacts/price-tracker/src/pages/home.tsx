import { useLocation } from 'wouter';
import { BrandLogo } from '@/components/brand-logo';

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo size={32} />
            <div>
              <h1 className="font-mono font-bold tracking-widest leading-none text-primary uppercase">Forex Alarm</h1>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">Price Alerts</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setLocation('/sign-in')}
              className="font-mono text-xs uppercase tracking-wide text-foreground/80 hover:text-foreground"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setLocation('/sign-up')}
              className="font-mono text-xs uppercase tracking-wide bg-primary text-black px-4 py-2 rounded-sm hover:bg-primary/90"
            >
              Get started
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 gap-8">
        <div className="space-y-4 max-w-2xl">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Live gold, silver &amp; forex — with alarms that won't let you miss it
          </h2>
          <p className="text-muted-foreground text-lg">
            Set a target price. Forex Alarm watches the markets and sounds a real alarm the instant it hits.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setLocation('/sign-up')}
            className="font-mono uppercase tracking-wide bg-primary text-black px-6 py-3 rounded-sm hover:bg-primary/90"
          >
            Start free 4-day trial
          </button>
          <button
            type="button"
            onClick={() => setLocation('/sign-in')}
            className="font-mono uppercase tracking-wide border border-border px-6 py-3 rounded-sm hover:bg-card"
          >
            Sign in
          </button>
        </div>
      </main>
    </div>
  );
}
