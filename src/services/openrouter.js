const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'
const DEFAULT_MODEL   = 'google/gemini-flash-1.5'

/**
 * Build a structured financial summary to send to the AI.
 */
export function buildFinancialPrompt({ accounts, transactions, assets, goals, budgets, categories, computed }) {
  const { monthlyIncome, monthlyExpenses, savingsRate, totalBalance, totalAssets, netWorth, budgetStatus, healthScore } = computed

  // Category name helper
  const catName = (id) => categories.find(c => c.id === id)?.name || id

  // Top 5 expense categories this month
  const catBreakdown = Object.entries(computed.categoryExpenses)
    .map(([id, amt]) => ({ name: catName(id), amount: amt }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  // Overspent budgets
  const overspent = budgetStatus.filter(b => b.spent > b.amount)
    .map(b => ({ category: catName(b.categoryId), budget: b.amount, spent: b.spent }))

  // Goals summary
  const goalsSummary = goals.map(g => ({
    name: g.name,
    target: g.targetAmount,
    saved: g.currentAmount,
    progress: Math.round((g.currentAmount / g.targetAmount) * 100),
    monthlyContribution: g.monthlyContribution,
    deadline: g.deadline?.split('T')[0],
  }))

  // Assets by type
  const assetTypeMap = {}
  assets.forEach(a => {
    assetTypeMap[a.type] = (assetTypeMap[a.type] || 0) + a.value
  })
  const assetsSorted = [...assets].sort((a, b) => b.value - a.value)

  const prompt = `You are a professional financial advisor helping a user manage their personal finances.
Analyze the following financial data and provide actionable, specific recommendations.

## Financial Overview
- **Total Bank/Cash Balance:** NPR ${totalBalance.toLocaleString('en-IN')}
- **Total Assets (Gold, FD, Investments, etc.):** NPR ${totalAssets.toLocaleString('en-IN')}
- **Net Worth:** NPR ${netWorth.toLocaleString('en-IN')}
- **Monthly Income:** NPR ${monthlyIncome.toLocaleString('en-IN')}
- **Monthly Expenses:** NPR ${monthlyExpenses.toLocaleString('en-IN')}
- **Savings Rate:** ${savingsRate.toFixed(1)}%
- **Financial Health Score:** ${healthScore}/100

## Top Expense Categories (This Month)
${catBreakdown.map(c => `- ${c.name}: NPR ${c.amount.toLocaleString('en-IN')}`).join('\n') || '- No data'}

## Budget Status
${overspent.length > 0
  ? overspent.map(b => `- ⚠️ OVERSPENT: ${b.category} — Budget: NPR ${b.budget.toLocaleString('en-IN')}, Spent: NPR ${b.spent.toLocaleString('en-IN')}`).join('\n')
  : '- All budgets are on track this month ✅'}

## Asset Portfolio (NPR ${totalAssets.toLocaleString('en-IN')} total)
${assetsSorted.length > 0
  ? assetsSorted.map(a => `- ${a.name} [${a.type}]: NPR ${a.value.toLocaleString('en-IN')} (${totalAssets > 0 ? ((a.value / totalAssets) * 100).toFixed(1) : 0}% of assets)`).join('\n')
  : '- No assets recorded'}
${Object.keys(assetTypeMap).length > 1
  ? `\nAsset allocation: ${Object.entries(assetTypeMap).map(([t, v]) => `${t} ${((v / totalAssets) * 100).toFixed(1)}%`).join(', ')}`
  : ''}

## Financial Goals
${goalsSummary.map(g => `- ${g.name}: ${g.progress}% complete (NPR ${g.saved.toLocaleString('en-IN')} / ${g.target.toLocaleString('en-IN')}), target date: ${g.deadline}`).join('\n') || '- No goals set'}

---

Please provide a comprehensive financial plan including:

1. **Overall Assessment** — Comment on financial health score and current situation
2. **Budget Optimization** — Specific areas to cut spending with exact amounts in NPR
3. **Savings Strategy** — How to improve the ${savingsRate.toFixed(1)}% savings rate
4. **Goal Achievement Plan** — Month-by-month plan to reach goals faster
5. **Asset & Investment Recommendations** — Evaluate the current portfolio (${Object.keys(assetTypeMap).join(', ') || 'none yet'}) and suggest rebalancing or new asset classes to consider
6. **Quick Wins** — 3 immediate actions the user can take this week
7. **6-Month Forecast** — Predicted financial position if recommendations are followed

Format your response in clean Markdown with headers and bullet points.
Use NPR for all currency amounts. Be specific with numbers, not vague advice.
Currency is Nepalese Rupee (NPR). User is based in Nepal.`

  return prompt
}

/**
 * Call OpenRouter API and stream the AI response.
 * @param {string} prompt - The user prompt
 * @param {string} apiKey - OpenRouter API key
 * @param {function} onChunk - Called with each text chunk
 * @param {string} model - Model to use
 */
export async function getAIRecommendations({ prompt, apiKey, onChunk, model = DEFAULT_MODEL }) {
  const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Finance Planner',
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || `API error: ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter(l => l.startsWith('data: '))

    for (const line of lines) {
      const data = line.slice(6).trim()
      if (data === '[DONE]') return

      try {
        const json = JSON.parse(data)
        const text = json.choices?.[0]?.delta?.content
        if (text) onChunk(text)
      } catch { /* skip malformed chunks */ }
    }
  }
}

export const AVAILABLE_MODELS = [
  { id: 'google/gemini-flash-1.5',        label: 'Gemini Flash 1.5 (Fast, Free)' },
  { id: 'google/gemini-pro-1.5',          label: 'Gemini Pro 1.5 (Smart)' },
  { id: 'meta-llama/llama-3.1-8b-instruct:free', label: 'Llama 3.1 8B (Free)' },
  { id: 'mistralai/mistral-7b-instruct',  label: 'Mistral 7B' },
  { id: 'openai/gpt-4o-mini',             label: 'GPT-4o Mini' },
]
