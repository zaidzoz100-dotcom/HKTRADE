const CONTACT_ADMIN_URL = "https://t.me/hackedtrad";

const FEATURES = [
  "Real-time Instant Gold & Forex Sound Alarms (No delays)",
  "24/7 Market Monitoring (Crypto, Gold, Silver & Major Forex pairs)",
  "Unlimited simultaneous alerts",
  "Premium VIP Telegram Support",
];

function FeatureList() {
  return (
    <ul className="space-y-2.5 text-left">
      {FEATURES.map((feature) => (
        <li key={feature} className="flex items-start gap-2.5 text-sm text-white/85">
          <span className="text-primary font-bold leading-none mt-0.5">✔</span>
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  );
}

export function PremiumPlansSection() {
  return (
    <section className="w-full max-w-4xl mx-auto px-4 pt-8 pb-24">
      <div className="text-center space-y-2 mb-10">
        <h3 className="font-sans font-extrabold text-3xl md:text-4xl tracking-tight">
          <span className="text-white">Premium </span>
          <span className="text-gold-gradient">Plans</span>
        </h3>
        <p style={{ color: '#E0E0E0', textShadow: '1px 2px 4px rgba(0,0,0,0.9)' }}>
          Unlock unlimited alerts and never miss a move in the market again.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        {/* Monthly Plan */}
        <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-sm p-6 flex flex-col gap-5">
          <div>
            <h4 className="font-sans font-bold text-lg text-white">Monthly Plan</h4>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-mono font-extrabold text-3xl text-primary">30 USDT</span>
              <span className="text-sm text-muted-foreground">/ month</span>
            </div>
          </div>
          <FeatureList />
        </div>

        {/* 2-Month Plan — popular */}
        <div className="relative rounded-2xl border-2 border-emerald-400/70 bg-card/70 backdrop-blur-sm p-6 flex flex-col gap-5 shadow-[0_0_35px_rgba(52,211,153,0.3)]">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-400 text-black text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full shadow-[0_0_15px_rgba(52,211,153,0.6)] whitespace-nowrap">
            Popular Choice
          </span>
          <div>
            <h4 className="font-sans font-bold text-lg text-white">2-Month Plan</h4>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-mono font-extrabold text-3xl text-primary">40 USDT</span>
              <span className="text-sm text-muted-foreground">/ 2 months</span>
            </div>
            <div className="text-xs text-emerald-400 font-semibold mt-1">Great deal — more days for less</div>
          </div>
          <FeatureList />
        </div>

        {/* Yearly Plan — highlighted */}
        <div className="relative rounded-2xl border-2 border-primary bg-card/70 backdrop-blur-sm p-6 flex flex-col gap-5 shadow-[0_0_35px_rgba(252,211,77,0.35)]">
          <span className="absolute -top-3 right-6 bg-primary text-black text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full shadow-[0_0_15px_rgba(252,211,77,0.6)]">
            Best Value
          </span>
          <div>
            <h4 className="font-sans font-bold text-lg text-white">Yearly Plan</h4>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-mono font-extrabold text-3xl text-primary">70 USDT</span>
              <span className="text-sm text-muted-foreground">/ year</span>
            </div>
            <div className="text-xs text-emerald-400 font-semibold mt-1">Save over 80%!</div>
          </div>
          <FeatureList />
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-6">
        <span className="font-semibold text-foreground">Important:</span> We accept USDT payments only.
      </p>

      <div className="flex justify-center mt-8">
        <a
          href={CONTACT_ADMIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center text-center font-mono uppercase tracking-wide text-sm md:text-base bg-primary text-black px-8 py-4 rounded-full hover:bg-primary/90 transition-shadow shadow-[0_0_25px_rgba(252,211,77,0.5)] hover:shadow-[0_0_40px_rgba(252,211,77,0.75)]"
        >
          Contact Admin on Telegram to Upgrade (USDT Only)
        </a>
      </div>
    </section>
  );
}
