export default function FintechLanding() {
  return (
    <div
      className="min-h-screen bg-[var(--bg)] text-[var(--text)]"
      style={{
        '--primary': '#0B1F3A',
        '--secondary': '#D4AF37',
        '--accent': '#2ECC71',
        '--danger': '#E74C3C',
        '--bg': '#0A1220',
        '--surface': '#0F1B2E',
        '--muted': '#9BA8BE',
        '--text': '#E6EDF6',
        '--card': '#0F1A2B',
        '--border': 'rgba(212,175,55,0.25)',
        '--shadow': '0 10px 30px rgba(0,0,0,0.35)',
        '--radius-lg': '16px',
        '--radius-md': '12px',
        '--radius-sm': '10px'
      }}
    >
      <style>
        {`
        .gold { color: var(--secondary); }
        .gold-bg { background: linear-gradient(135deg, rgba(212,175,55,0.95), rgba(212,175,55,0.70)); color:#111; }
        .btn { border-radius: var(--radius-md); padding: 0.75rem 1.1rem; font-weight: 600; }
        .btn-primary { background: var(--secondary); color: #111; box-shadow: var(--shadow); }
        .btn-primary:hover { filter: brightness(1.05); }
        .btn-outline { border: 1px solid var(--secondary); color: var(--text); }
        .card { background: linear-gradient(180deg, var(--card), #0A1324); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow); }
        .tag { border: 1px solid var(--border); border-radius: 999px; padding: .35rem .7rem; color: var(--muted); font-size: .75rem; }
        .glow { box-shadow: 0 0 0 2px rgba(212,175,55,0.15), 0 10px 40px rgba(212,175,55,0.12); }
      `}
      </style>

      <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-[#0A1220b3]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <Logo />
              <span className="text-lg font-semibold">Aureo Fintech</span>
              <span className="hidden md:inline tag">Secure • Growth • Insight</span>
            </div>
            <nav className="hidden md:flex items-center gap-6 text-sm text-[var(--muted)]">
              <a href="#features" className="hover:gold">Features</a>
              <a href="#analytics" className="hover:gold">Analytics</a>
              <a href="#pricing" className="hover:gold">Pricing</a>
              <a href="#faq" className="hover:gold">FAQ</a>
            </nav>
            <div className="flex items-center gap-3">
              <button className="btn btn-outline hidden sm:inline">Sign in</button>
              <button className="btn btn-primary glow">Get Started</button>
            </div>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-40" aria-hidden>
          <div
            className="absolute -top-32 -left-32 h-96 w-96 rounded-full blur-3xl"
            style={{
              background:
                'radial-gradient(closest-side, rgba(212,175,55,0.35), transparent)'
            }}
          />
          <div
            className="absolute -bottom-24 -right-24 h-[28rem] w-[28rem] rounded-full blur-3xl"
            style={{
              background:
                'radial-gradient(closest-side, rgba(46,204,113,0.25), transparent)'
            }}
          />
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 mb-5 tag">
                <span>Fintech Theme</span>
                <span className="h-1 w-1 rounded-full bg-[var(--secondary)]" />
                <span>Black • Gold • Emerald</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight">
                Build trust and signal <span className="gold">wealth</span> with a modern fintech UI.
              </h1>
              <p className="mt-4 text-[var(--muted)] max-w-prose">
                A ready-to-use landing and component style that merges institutional confidence with startup speed.
                Designed for dashboards, broker apps, robo-advisors, and wealth platforms.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button className="btn btn-primary glow">Launch Demo</button>
                <button className="btn btn-outline">View Components</button>
              </div>
              <div className="mt-6 flex items-center gap-6 text-sm text-[var(--muted)]">
                <div className="flex items-center gap-2">
                  <ShieldIcon /> Bank‑grade security
                </div>
                <div className="flex items-center gap-2">
                  <SparkIcon /> Real‑time analytics
                </div>
              </div>
            </div>
            <div>
              <div className="card p-5 md:p-6">
                <DashboardPreview />
              </div>
              <p className="text-[11px] text-[var(--muted)] mt-2">*Mock data for visual preview.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-6 border-y border-[var(--border)] bg-[#0B1527]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 opacity-70">
            {['Visa', 'Mastercard', 'Bloomberg', 'Morningstar', 'AWS', 'Cloudflare'].map((b, i) => (
              <div key={i} className="text-center text-xs sm:text-sm tracking-wide uppercase">
                {b}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Kpi title="AUM" value="$1.24B" hint="+7.2% MoM" positive />
            <Kpi title="Active Users" value="284k" hint="+12.1%" positive />
            <Kpi title="Latency" value="84 ms" hint="-18%" positive />
            <Kpi title="Risk Alerts" value="12" hint="-5 this week" />
          </div>
        </div>
      </section>

      <section id="features" className="py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              title="Smart Orders"
              desc="Route for best price, slippage control, and instant settlement."
              icon={<RouteIcon />}
            />
            <FeatureCard
              title="Insights Engine"
              desc="Explainable signals on yield, drawdown, and factor tilt."
              icon={<ChartIcon />}
            />
            <FeatureCard
              title="Compliance Guard"
              desc="KYC/AML ready with audit trails and anomaly detection."
              icon={<ShieldIcon />}
            />
          </div>
        </div>
      </section>

      <section id="analytics" className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="card p-8 md:p-10 flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-semibold">Crystal‑clear analytics, board‑room ready.</h2>
              <p className="mt-3 text-[var(--muted)]">
                Prebuilt KPI cards, risk widgets, and clean tables that respect financial semantics and color psychology.
              </p>
              <div className="mt-6 flex gap-3">
                <button className="btn btn-primary">Install Theme</button>
                <button className="btn btn-outline">Documentation</button>
              </div>
            </div>
            <div className="flex-1 w-full">
              <MiniChart />
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h3 className="text-center text-3xl font-semibold mb-10">Simple, transparent pricing</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <PriceCard
              name="Starter"
              price="$0"
              items={["Core components", "Email support", "MIT license"]}
              cta="Start Free"
            />
            <PriceCard
              name="Pro"
              price="$29/mo"
              items={["Advanced widgets", "Theming tokens", "Priority support"]}
              highlight
              cta="Go Pro"
            />
            <PriceCard
              name="Enterprise"
              price="Custom"
              items={["SSO/SAML", "Design tokens JSON", "White‑glove onboarding"]}
              cta="Contact Sales"
            />
          </div>
        </div>
      </section>

      <section id="faq" className="py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h3 className="text-center text-3xl font-semibold mb-10">FAQ</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <Faq q="Can I use this with React/Next?" a="Yes — it is plain React + Tailwind. You can also export tokens to CSS variables." />
            <Faq q="Is the palette accessible?" a="Yes — contrast is tuned for finance UIs. Always verify in your context and WCAG needs." />
            <Faq q="Can I switch to a light theme?" a="Yes — swap --bg to #F5F7FA and text to #2C3E50; keep gold as accent for wealth signal." />
            <Faq q="Does it include charts?" a="We include chart‑like UI. You can plug Recharts/ECharts later without visual drift." />
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] bg-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Logo small />
              <span className="text-sm text-[var(--muted)]">© {new Date().getFullYear()} Aureo Fintech</span>
            </div>
            <div className="flex gap-5 text-sm text-[var(--muted)]">
              <a href="#">隱私</a>
              <a href="#">條款</a>
              <a href="#">安全</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Logo({ small = false }) {
  return (
    <div className={`relative ${small ? 'h-6 w-6' : 'h-8 w-8'}`} aria-label="Aureo logo">
      <div
        className="absolute inset-0 rounded-xl"
        style={{
          background:
            'radial-gradient(65% 65% at 35% 35%, rgba(212,175,55,0.9), rgba(212,175,55,0.2))'
        }}
      />
      <div className="absolute inset-[2px] rounded-xl bg-[#0B1F3A]" />
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          width="60%"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#D4AF37"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 16l6-8 5 6 7-10" />
        </svg>
      </div>
    </div>
  );
}

function Kpi({ title, value, hint, positive }) {
  return (
    <div className="card p-5">
      <div className="text-sm text-[var(--muted)]">{title}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      <div className={`mt-3 text-xs ${positive ? 'text-[var(--accent)]' : 'text-[var(--danger)]'}`}>{hint}</div>
    </div>
  );
}

function FeatureCard({ title, desc, icon }) {
  return (
    <div className="card p-6">
      <div className="h-10 w-10 rounded-lg flex items-center justify-center gold-bg mb-4">
        {icon}
      </div>
      <h4 className="text-lg font-semibold">{title}</h4>
      <p className="text-sm text-[var(--muted)] mt-1">{desc}</p>
    </div>
  );
}

function PriceCard({ name, price, items, highlight, cta }) {
  return (
    <div className={`card p-6 ${highlight ? 'ring-2 ring-[var(--secondary)]' : ''}`}>
      <div className="text-sm text-[var(--muted)]">{name}</div>
      <div className="mt-1 text-3xl font-semibold">{price}</div>
      <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
        {items.map((i, idx) => (
          <li key={idx} className="flex items-center gap-2">
            <CheckIcon />
            {i}
          </li>
        ))}
      </ul>
      <button className={`btn w-full mt-6 ${highlight ? 'btn-primary' : 'btn-outline'}`}>{cta}</button>
    </div>
  );
}

function Faq({ q, a }) {
  return (
    <div className="card p-5">
      <div className="font-medium">{q}</div>
      <p className="text-sm text-[var(--muted)] mt-2">{a}</p>
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-[var(--muted)]">Portfolio Value</div>
          <div className="text-2xl font-semibold">
            $482,930 <span className="text-sm text-[var(--accent)] align-middle">+3.8%</span>
          </div>
        </div>
        <button className="btn btn-outline">Export</button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-[var(--border)]">
          <div className="text-xs text-[var(--muted)]">YTD Return</div>
          <div className="text-xl font-semibold text-[var(--accent)]">+12.4%</div>
          <SparkBars values={[6, 8, 5, 7, 9, 11, 10, 13, 12, 14]} />
        </div>
        <div className="p-4 rounded-xl border border-[var(--border)]">
          <div className="text-xs text-[var(--muted)]">Max Drawdown</div>
          <div className="text-xl font-semibold text-[var(--danger)]">-4.1%</div>
          <SparkBars negative values={[4, 5, 6, 6, 4, 3, 5, 4, 3, 2]} />
        </div>
        <div className="p-4 rounded-xl border border-[var(--border)]">
          <div className="text-xs text-[var(--muted)]">Sharpe Ratio</div>
          <div className="text-xl font-semibold">1.27</div>
          <SparkBars values={[3, 4, 5, 7, 6, 8, 9, 8, 10, 11]} />
        </div>
      </div>

      <div className="mt-2 p-4 rounded-xl border border-[var(--border)]">
        <div className="text-sm text-[var(--muted)] mb-3">Allocation</div>
        <div className="grid grid-cols-5 gap-2">
          {[
            { name: 'US Equity', v: 42, c: 'var(--secondary)' },
            { name: 'Intl Equity', v: 18, c: '#2ECC71' },
            { name: 'Fixed Income', v: 22, c: '#9BA8BE' },
            { name: 'Alternatives', v: 9, c: '#E74C3C' },
            { name: 'Cash', v: 9, c: '#0B88FF' }
          ].map((s, i) => (
            <div key={i} className="flex flex-col">
              <div
                className="h-24 w-full rounded-lg"
                style={{
                  background: `linear-gradient(180deg, ${s.c}, transparent)`,
                  border: '1px solid var(--border)'
                }}
              />
              <div className="mt-1 text-xs text-[var(--muted)]">{s.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SparkBars({ values = [], negative = false }) {
  const max = Math.max(...values, 1);
  return (
    <div className="mt-2 flex items-end gap-1 h-16">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm"
          style={{
            height: `${(v / max) * 100}%`,
            background: negative
              ? 'linear-gradient(180deg, rgba(231,76,60,0.9), rgba(231,76,60,0.2))'
              : 'linear-gradient(180deg, rgba(46,204,113,0.9), rgba(46,204,113,0.2))'
          }}
        />
      ))}
    </div>
  );
}

function MiniChart() {
  const series = [12, 16, 14, 18, 22, 20, 26, 28, 25, 31, 34, 37];
  const max = Math.max(...series);
  return (
    <div className="p-4 rounded-xl border border-[var(--border)] bg-[#0B1628]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-[var(--muted)]">Revenue (mock)</div>
          <div className="text-xl font-semibold">$3.7M</div>
        </div>
        <div className="tag">+18.2% YoY</div>
      </div>
      <div className="mt-4 h-40 w-full relative">
        <div className="absolute inset-0 flex items-end gap-2">
          {series.map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                height: `${(v / max) * 100}%`,
                background:
                  'linear-gradient(180deg, rgba(212,175,55,0.95), rgba(212,175,55,0.25))'
              }}
            />
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-[var(--border)]" />
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M5 12h14M12 5v14" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 3v18h18" />
      <rect x="6" y="10" width="3" height="8" />
      <rect x="11" y="6" width="3" height="12" />
      <rect x="16" y="13" width="3" height="5" />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="5" cy="6" r="2" />
      <circle cx="19" cy="18" r="2" />
      <path d="M7 6h5a5 5 0 015 5v7" />
    </svg>
  );
}
