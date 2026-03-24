import { useMemo, useState } from 'react'
import './App.css'

const API_BASE = 'https://api.fomoholders.app'

function short(addr = '') {
  if (addr.length < 10) return addr
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`
}

function guessType(input) {
  const v = input.trim()
  if (!v) return 'unknown'
  return 'mint' // keep simple for now
}

export default function App() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const mode = useMemo(() => guessType(input), [input])

  async function onAnalyze(e) {
    e.preventDefault()
    const value = input.trim()
    if (!value) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_BASE}/query/${value}`)
      const data = await res.json()
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Failed to analyze token')
      }
      setResult(data)
    } catch (err) {
      setError(err.message || 'Something went wrong')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page">
      <div className="glow glow-a" />
      <div className="glow glow-b" />

      <header className="hero">
        <div className="badge">FOMO HOLDERS</div>
        <h1>Track Smart Money Concentration</h1>
        <p>
          Paste a token CA and instantly see how much of the top holder supply belongs to indexed FOMO wallets.
        </p>
      </header>

      <section className="panel search-panel">
        <form onSubmit={onAnalyze} className="search-row">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste token CA (pump.fun / SPL)"
          />
          <button type="submit" disabled={loading || !input.trim()}>
            {loading ? 'Scanning...' : 'Analyze'}
          </button>
        </form>

        <div className="meta-row">
          <span>Mode: {mode}</span>
          <span>API: {API_BASE}</span>
          <span className="live">Indexer: Live</span>
        </div>
      </section>

      {error && (
        <section className="panel error">
          <strong>Error:</strong> {error}
        </section>
      )}

      {result && (
        <>
          <section className="stats-grid">
            <article className="panel stat-card">
              <h3>FOMO % (Total Supply)</h3>
              <div className="big">
                {typeof result.fomoPctTotalSupply === 'number'
                  ? `${result.fomoPctTotalSupply.toFixed(2)}%`
                  : 'N/A'}
              </div>
              <p>Based on full token supply.</p>
            </article>

            <article className="panel stat-card">
              <h3>FOMO Wallet Hits</h3>
              <div className="big">{result.fomoWalletHits}</div>
              <p>Matched indexed wallets in holder set.</p>
            </article>

            <article className="panel stat-card">
              <h3>Top Holders Scanned</h3>
              <div className="big">{result.topHolderCount}</div>
              <p>Fast mode coverage for this query.</p>
            </article>

            <article className="panel stat-card">
              <h3>Cache</h3>
              <div className="big caps">{result.cache}</div>
              <p>{result.indexCoverageHint}</p>
            </article>
          </section>

          <section className="panel details">
            <h3>Query Output</h3>
            <ul>
              <li><b>Mint:</b> {short(result.mint)}</li>
              <li><b>Method:</b> {result.method}</li>
              <li><b>FOMO UI Amount:</b> {Number(result.fomoUiAmount).toLocaleString()}</li>
              <li><b>Total Top-Holder UI Amount:</b> {Number(result.totalUiAmountTopHolders).toLocaleString()}</li>
              <li><b>FOMO % of Top Holders:</b> {Number(result.fomoPctTopHolders).toFixed(2)}%</li>
              <li><b>Total Supply UI:</b> {typeof result.totalSupplyUi === 'number' ? Number(result.totalSupplyUi).toLocaleString() : 'N/A'}</li>
              <li><b>FOMO % of Total Supply:</b> {typeof result.fomoPctTotalSupply === 'number' ? `${Number(result.fomoPctTotalSupply).toFixed(2)}%` : 'N/A'}</li>
              <li><b>Updated:</b> {new Date(result.updatedAt).toLocaleString()}</li>
            </ul>
          </section>
        </>
      )}
    </main>
  )
}
