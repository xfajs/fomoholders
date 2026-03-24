import { useEffect, useMemo, useState } from 'react'
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
  const [walletInput, setWalletInput] = useState('')
  const [walletLoading, setWalletLoading] = useState(false)
  const [walletResult, setWalletResult] = useState(null)
  const [health, setHealth] = useState(null)
  const [history, setHistory] = useState([])
  const [denseRows, setDenseRows] = useState(false)

  const rows = useMemo(() => estimateFomoWalletRows(result), [result])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/health`)
        const data = await res.json()
        if (alive && data?.ok) setHealth(data)
      } catch {
        // ignore health errors in UI
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const m = window.location.pathname.match(/^\/token\/([A-Za-z0-9]+)$/)
    if (!m) return
    const mint = m[1]
    setInput(mint)
    runScan(mint)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function runScan(value) {
    const mint = value.trim()
    if (!mint) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_BASE}/query/${mint}`)
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Query failed')
      setResult(data)

      const hRes = await fetch(`${API_BASE}/history/${mint}`)
      const hData = await hRes.json()
      if (hRes.ok && hData?.ok) setHistory(hData.points || [])
      else setHistory([])

      const nextPath = `/token/${mint}`
      if (window.location.pathname !== nextPath) {
        window.history.replaceState({}, '', nextPath)
      }
    } catch (err) {
      setResult(null)
      setHistory([])
      setError(err.message || 'Something broke')
    } finally {
      setLoading(false)
    }
  }

  async function onAnalyze(e) {
    e.preventDefault()
    const value = input.trim()
    if (!value) return
    await runScan(value)
  }

  async function onCheckWallet(e) {
    e.preventDefault()
    const value = walletInput.trim()
    if (!value) return

    setWalletLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_BASE}/query/wallet/${value}`)
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Wallet check failed')
      setWalletResult(data)
    } catch (err) {
      setWalletResult(null)
      setError(err.message || 'Something broke')
    } finally {
      setWalletLoading(false)
    }
  }

  async function copyShareLink() {
    if (!result?.mint) return
    const link = `${window.location.origin}/token/${result.mint}`
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      // ignore clipboard issues
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
          <span>API: {health?.ok ? 'online' : '...'}</span>
          <span className="pipe">|</span>
          <span>Indexed wallets: {health?.stats?.walletIndexSampleCount ?? '...'}</span>
          <span className="pipe">|</span>
          <span>Last tick: {health?.stats?.lastTickSummary?.indexed ?? '...'} tx</span>
        </div>
      </header>

      <section className="terminal-card search">
        <div className="health-grid">
          <div className="health-item">
            <span>Indexed wallets (sample)</span>
            <strong>{health?.stats?.walletIndexSampleCount ?? '...'}</strong>
          </div>
          <div className="health-item">
            <span>Has more indexed</span>
            <strong>{typeof health?.stats?.walletIndexHasMore === 'boolean' ? (health.stats.walletIndexHasMore ? 'YES' : 'NO') : '...'}</strong>
          </div>
          <div className="health-item">
            <span>Last tick wallets added</span>
            <strong>{health?.stats?.lastTickSummary?.walletsAdded ?? '...'}</strong>
          </div>
          <div className="health-item">
            <span>Last tick time</span>
            <strong>{health?.stats?.lastTickAt ? new Date(health.stats.lastTickAt).toLocaleTimeString() : '...'}</strong>
          </div>
        </div>

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
          Shows how much this token is held by wallets that have traded on FOMO. Shareable routes work like <code>/token/MINT</code>.
        </p>

        <form onSubmit={onCheckWallet} className="search-row wallet-row">
          <input
            value={walletInput}
            onChange={(e) => setWalletInput(e.target.value)}
            placeholder="Check wallet (is this a FOMO wallet?)"
          />
          <button disabled={walletLoading || !walletInput.trim()} type="submit">
            {walletLoading ? 'CHECKING...' : 'CHECK WALLET'}
          </button>
        </form>

        {walletResult && (
          <div className={`wallet-result ${walletResult.isFomoWallet ? 'yes' : 'no'}`}>
            {short(walletResult.wallet)} → {walletResult.isFomoWallet ? 'FOMO WALLET ✅' : 'NOT FOMO ❌'}
          </div>
        )}
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
            </article>
          </section>

          <section className="terminal-card chart-card">
            <h3>FOMO CONCENTRATION TREND</h3>
            {history.length >= 2 ? (
              <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="chart">
                <polyline
                  fill="none"
                  stroke="#00ff88"
                  strokeWidth="1.5"
                  points={history
                    .map((p, i) => {
                      const x = (i / (history.length - 1)) * 100
                      const vals = history.map((d) => Number(d.pctTotal || 0))
                      const min = Math.min(...vals)
                      const max = Math.max(...vals)
                      const range = max - min || 1
                      const y = 28 - (((Number(p.pctTotal || 0) - min) / range) * 24)
                      return `${x},${y}`
                    })
                    .join(' ')}
                />
              </svg>
            ) : (
              <p className="tiny">Need more scans on this token to draw a trend line.</p>
            )}
            <p className="tiny">Tracking FOMO % of total supply over time.</p>
          </section>

          <section className="terminal-card holder-list">
            <div className="holder-toolbar">
              <h3>TOKEN HOLDER LIST</h3>
              <div className="holder-actions">
                <button type="button" onClick={copyShareLink}>COPY SHARE LINK</button>
                <button type="button" onClick={() => setDenseRows((v) => !v)}>
                  {denseRows ? 'COMFY ROWS' : 'DENSE ROWS'}
                </button>
              </div>
            </div>
            <div className="holder-head row-lite">
              <span>#</span>
              <span>Wallet</span>
              <span>Amount</span>
              <span>Status</span>
            </div>
            <div className="holder-body">
              {(result.holderList || []).slice(0, 120).map((h) => (
                <div key={`${h.rank}-${h.owner}`} className={`holder-row ${h.isFomoWallet ? 'fomo' : ''} ${denseRows ? 'dense' : ''}`}>
                  <span>{h.rank}</span>
                  <code>{short(h.owner)}</code>
                  <span>{formatNum(h.uiAmount)}</span>
                  <strong>{h.isFomoWallet ? 'FOMO' : '-'}</strong>
                </div>
              ))}
            </div>
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

      <section className="terminal-card donate">
        <h3>SUPPORT THE PROJECT</h3>
        <p>Donations help cover RPC + API costs.</p>
        <code>94ZBnRkV9E5DJEFUZpBqFAT69Hh84VC2Ehd981HxCHCp</code>
      </section>
    </main>
  )
}
