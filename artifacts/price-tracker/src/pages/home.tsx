import { useLocation } from 'wouter';
import { BrandLogo } from '@/components/brand-logo';

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-[100dvh] text-foreground flex flex-col">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandLogo size={30} />
            <div className="flex flex-col justify-center">
              <h1 className="font-sans font-extrabold text-base leading-none tracking-tight">
                <span className="text-white">FOREX</span><span className="text-primary">ALARM</span>
              </h1>
              <span className="text-[10px] font-sans text-muted-foreground tracking-[0.15em] mt-0.5">Price Alerts</span>
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

      <main className="flex-1 flex flex-col items-center text-center px-4 pt-28 pb-16 md:pt-40 gap-8">
        <div className="space-y-4 max-w-2xl">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Live gold, silver and forex — with{' '}
            <span className="text-gold-gradient">alarms</span> that{' '}
            <span className="text-gold-gradient">won't let you miss it</span>
          </h2>
          <p
            className="text-lg"
            style={{ color: '#E0E0E0', textShadow: '1px 2px 4px rgba(0,0,0,0.9)' }}
          >
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
