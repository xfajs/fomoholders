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
          Output shows both: <b>% of total supply</b> and <b>% within top-holder bucket</b>.
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
            <article className="terminal-card stat">
              <label>CACHE</label>
              <h2>{String(result.cache || 'miss').toUpperCase()}</h2>
            </article>
          </section>

          <section className="grid-2">
            <article className="terminal-card">
              <h3>SCAN DETAILS</h3>
              <ul className="kv-list">
                <li><span>Mint</span><code>{short(result.mint)}</code></li>
                <li><span>Method</span><code>{result.method}</code></li>
                <li><span>FOMO UI Amount</span><code>{formatNum(result.fomoUiAmount)}</code></li>
                <li><span>Total Supply UI</span><code>{formatNum(result.totalSupplyUi)}</code></li>
                <li><span>Top-Holder Bucket UI</span><code>{formatNum(result.totalUiAmountTopHolders)}</code></li>
                <li><span>Updated</span><code>{new Date(result.updatedAt).toLocaleString()}</code></li>
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
              <p className="tiny">Next upgrade: return exact matched wallet rows from API for full table view.</p>
            </article>
          </section>
        </>
      )}

      <section className="terminal-card explain">
        <h3>HOW IT WORKS (END-TO-END)</h3>
        <ol>
          <li>
            <b>Indexer cron runs</b> and scans recent signatures touching the FOMO fee token account
            <code> HrTf9... </code>.
          </li>
          <li>
            It batch-parses signatures via Helius and extracts sender wallets from <b>USDC transfers into HrTf...</b>.
          </li>
          <li>
            Each detected wallet is stored in KV as <code>wallet:&lt;address&gt; = 1</code>.
          </li>
          <li>
            Query endpoint pulls token top holders, maps token accounts to owner wallets, and intersects owners with the KV wallet set.
          </li>
          <li>
            API returns:
            <ul>
              <li>FOMO % of top-holder bucket</li>
              <li>FOMO % of total supply</li>
              <li>wallet hit count + coverage hints</li>
            </ul>
          </li>
        </ol>
      </section>
    </main>
  )
}
