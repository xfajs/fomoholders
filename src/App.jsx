import { useMemo, useState } from 'react'
import './App.css'

const API_BASE = 'https://api.fomoholders.app'

function short(addr = '') {
  if (addr.length < 12) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`
}

function formatPct(v) {
  if (typeof v !== 'number' || Number.isNaN(v)) return 'N/A'
  return `${v.toFixed(2)}%`
}

function formatNum(v) {
  if (typeof v !== 'number' || Number.isNaN(v)) return 'N/A'
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function estimateFomoWalletRows(result) {
  // v1 API does not return holder rows yet; show synthetic insight line.
  if (!result) return []
  return [
    {
      label: 'Matched wallets in top-holder scan',
      value: result.fomoWalletHits,
    },
    {
      label: 'Top holders scanned',
      value: result.topHolderCount,
    },
  ]
}

export default function App() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const rows = useMemo(() => estimateFomoWalletRows(result), [result])

  async function onAnalyze(e) {
    e.preventDefault()
    const value = input.trim()
    if (!value) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_BASE}/query/${value}`)
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Query failed')
      setResult(data)
    } catch (err) {
      setResult(null)
      setError(err.message || 'Something broke')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="terminal-page">
      <header className="topbar">
        <div className="brand-wrap">
          <div className="dot" />
          <div>
            <h1>FOMO HOLDERS TERMINAL</h1>
            <p>Realtime concentration scanner for indexed FOMO wallets</p>
          </div>
        </div>
        <div className="status">
          <span>API: online</span>
          <span className="pipe">|</span>
          <span>Indexer: cron active</span>
        </div>
      </header>

      <section className="terminal-card search">
        <form onSubmit={onAnalyze} className="search-row">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste token CA (ex: J8PS...pump)"
          />
          <button disabled={loading || !input.trim()} type="submit">
            {loading ? 'SCANNING...' : 'RUN SCAN'}
          </button>
        </form>
        <p className="hint">
          Shows how much this token is held by wallets that have traded on FOMO.
        </p>
      </section>

      {error && (
        <section className="terminal-card error">
          <span>[ERROR]</span> {error}
        </section>
      )}

      {result && (
        <>
          <section className="grid-4">
            <article className="terminal-card stat">
              <label>FOMO % TOTAL SUPPLY</label>
              <h2>{formatPct(result.fomoPctTotalSupply)}</h2>
            </article>
            <article className="terminal-card stat">
              <label>FOMO % TOP HOLDERS</label>
              <h2>{formatPct(result.fomoPctTopHolders)}</h2>
            </article>
            <article className="terminal-card stat">
              <label>FOMO WALLET HITS</label>
              <h2>{result.fomoWalletHits}</h2>
            </article>

          </section>

          <section className="grid-2">
            <article className="terminal-card">
              <h3>SCAN DETAILS</h3>
              <ul className="kv-list">
                <li><span>Token</span><code>{short(result.mint)}</code></li>
                <li><span>Held by FOMO wallets</span><code>{formatNum(result.fomoUiAmount)}</code></li>
                <li><span>Total token supply</span><code>{formatNum(result.totalSupplyUi)}</code></li>
                <li><span>Last updated</span><code>{new Date(result.updatedAt).toLocaleString()}</code></li>
              </ul>
            </article>

            <article className="terminal-card">
              <h3>MATCH SUMMARY</h3>
              <div className="table">
                {rows.map((r) => (
                  <div className="row" key={r.label}>
                    <span>{r.label}</span>
                    <strong>{r.value}</strong>
                  </div>
                ))}
              </div>
              <p className="tiny">More breakdown tools coming soon.</p>
            </article>
          </section>
        </>
      )}

      <section className="terminal-card explain">
        <h3>HOW IT WORKS</h3>
        <ol>
          <li>We track wallets that traded on FOMO.</li>
          <li>When you paste a token, we check whether those wallets hold it.</li>
          <li>We show simple percentages so you can judge concentration fast.</li>
        </ol>
        <ul>
          <li>% of total supply held by FOMO wallets</li>
          <li>% of top holders held by FOMO wallets</li>
          <li>How many FOMO wallets were found</li>
        </ul>
      </section>
    </main>
  )
}
