import { useState, useRef } from 'react'
import { HiSparkles, HiKey, HiPlay, HiClipboardDocument, HiCheckCircle, HiChevronDown } from 'react-icons/hi2'
import { useApp } from '../context/AppContext'
import { buildFinancialPrompt, getAIRecommendations, AVAILABLE_MODELS } from '../services/openrouter'
import { formatCurrency, formatPercent } from '../utils/formatters'

const KEY_STORAGE = 'finance_planner_ai_key'
const MODEL_STORAGE = 'finance_planner_ai_model'

// Simple markdown-to-JSX renderer
function RenderMarkdown({ text }) {
  const lines = text.split('\n')
  return (
    <div className="space-y-1.5 text-sm text-gray-700 leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) return <h2 key={i} className="text-base font-bold text-gray-900 mt-4 mb-1">{line.slice(3)}</h2>
        if (line.startsWith('### ')) return <h3 key={i} className="text-sm font-bold text-gray-900 mt-3 mb-0.5">{line.slice(4)}</h3>
        if (line.startsWith('# ')) return <h1 key={i} className="text-lg font-bold text-gray-900 mt-4 mb-1">{line.slice(2)}</h1>
        if (line.startsWith('- ') || line.startsWith('* ')) {
          const content = line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          return <li key={i} className="ml-4 list-disc" dangerouslySetInnerHTML={{ __html: content }} />
        }
        if (/^\d+\./.test(line)) {
          const content = line.replace(/^\d+\.\s*/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          return <li key={i} className="ml-4 list-decimal" dangerouslySetInnerHTML={{ __html: content }} />
        }
        if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-bold text-gray-900">{line.slice(2, -2)}</p>
        if (line.trim() === '') return <div key={i} className="h-1" />
        const content = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        return <p key={i} dangerouslySetInnerHTML={{ __html: content }} />
      })}
    </div>
  )
}

export default function AIPlanner() {
  const appData = useApp()
  const { computed } = appData

  const [apiKey, setApiKey]     = useState(() => localStorage.getItem(KEY_STORAGE) || '')
  const [model, setModel]       = useState(() => localStorage.getItem(MODEL_STORAGE) || AVAILABLE_MODELS[0].id)
  const [loading, setLoading]   = useState(false)
  const [response, setResponse] = useState('')
  const [error, setError]       = useState('')
  const [copied, setCopied]     = useState(false)
  const [showKey, setShowKey]   = useState(false)
  const responseRef = useRef(null)

  function saveKey(k) {
    setApiKey(k)
    localStorage.setItem(KEY_STORAGE, k)
  }

  function saveModel(m) {
    setModel(m)
    localStorage.setItem(MODEL_STORAGE, m)
  }

  async function handleGenerate() {
    if (!apiKey.trim()) return setError('Please enter your OpenRouter API key.')
    setError('')
    setResponse('')
    setLoading(true)

    try {
      const prompt = buildFinancialPrompt(appData)
      await getAIRecommendations({
        prompt,
        apiKey: apiKey.trim(),
        model,
        onChunk: (chunk) => {
          setResponse(prev => {
            const next = prev + chunk
            // Auto-scroll
            setTimeout(() => responseRef.current?.scrollTo({ top: responseRef.current.scrollHeight, behavior: 'smooth' }), 50)
            return next
          })
        },
      })
    } catch (e) {
      setError(e.message || 'Failed to get AI response. Check your API key.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(response)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header card */}
      <div className="card p-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <HiSparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg">AI Financial Advisor</h2>
            <p className="text-indigo-200 text-xs">Powered by OpenRouter · Your data stays private</p>
          </div>
        </div>
        <p className="text-indigo-100 text-sm mt-2">
          Get a personalized financial plan based on your real income, expenses, goals, and spending patterns.
          The AI analyzes your data and provides specific, actionable recommendations.
        </p>
      </div>

      {/* Financial Snapshot */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Your Financial Snapshot</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Monthly Income',  value: formatCurrency(computed.monthlyIncome),  color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Monthly Expenses',value: formatCurrency(computed.monthlyExpenses), color: 'text-red-500',     bg: 'bg-red-50' },
            { label: 'Savings Rate',    value: formatPercent(computed.savingsRate),      color: 'text-indigo-600',  bg: 'bg-indigo-50' },
            { label: 'Health Score',    value: `${computed.healthScore}/100`,            color: 'text-amber-600',   bg: 'bg-amber-50' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl p-3`}>
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={`text-base font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          This data will be sent to the AI (no account names or personal identifiers — only numbers and categories).
        </p>
      </div>

      {/* API Setup */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <HiKey className="w-4 h-4 text-gray-400" /> API Configuration
        </h3>

        <div className="space-y-3">
          <div>
            <label className="label">OpenRouter API Key</label>
            <div className="flex gap-2">
              <input
                type={showKey ? 'text' : 'password'}
                placeholder="sk-or-v1-..."
                className="input-field font-mono text-xs"
                value={apiKey}
                onChange={e => saveKey(e.target.value)}
              />
              <button type="button" onClick={() => setShowKey(s => !s)}
                className="btn-secondary flex-shrink-0 text-xs px-3">
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Get your free key at{' '}
              <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer"
                className="text-indigo-600 hover:underline">
                openrouter.ai/keys
              </a>
              {' '}· Key is stored only in your browser.
            </p>
          </div>

          <div>
            <label className="label">AI Model</label>
            <div className="relative">
              <select className="input-field pr-8 appearance-none" value={model} onChange={e => saveModel(e.target.value)}>
                {AVAILABLE_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
              <HiChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={loading || !apiKey.trim()}
        className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Analyzing your finances...
          </>
        ) : (
          <>
            <HiPlay className="w-5 h-5" />
            Generate My Financial Plan
          </>
        )}
      </button>

      {error && (
        <div className="card p-4 border-red-200 bg-red-50">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* AI Response */}
      {(response || loading) && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <HiSparkles className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-semibold text-gray-900">AI Recommendations</span>
              {loading && <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />}
            </div>
            {response && !loading && (
              <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">
                {copied ? <HiCheckCircle className="w-4 h-4 text-emerald-500" /> : <HiClipboardDocument className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            )}
          </div>
          <div ref={responseRef} className="p-5 max-h-[600px] overflow-y-auto">
            {response
              ? <RenderMarkdown text={response} />
              : <div className="flex items-center gap-2 text-gray-400 text-sm"><span className="animate-pulse">●</span> Thinking...</div>
            }
          </div>
        </div>
      )}

      {/* Tips */}
      {!response && !loading && (
        <div className="card p-5 border-dashed">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">What the AI will analyze</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              '📊 Monthly income vs. expenses breakdown',
              '🎯 Progress on your financial goals',
              '⚠️ Overspent budget categories',
              '💡 Personalized savings opportunities',
              '📈 Investment & wealth-building strategy',
              '🚀 Specific actions to reach goals faster',
            ].map(tip => (
              <div key={tip} className="flex items-start gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                {tip}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
