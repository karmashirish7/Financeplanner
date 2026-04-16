# Finance Planner — Project Plan

## Architecture

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 |
| Styling | Tailwind CSS v3 |
| Charts | Recharts |
| Routing | React Router v6 |
| State | React Context + useReducer |
| Persistence | localStorage (MVP) |
| AI | OpenRouter API |
| Icons | react-icons |

## Folder Structure

```
finance-planner/
├── plan.md
├── progress.md
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── .env.example
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── context/
    │   └── AppContext.jsx       # Global state + CRUD + computed values
    ├── services/
    │   └── openrouter.js        # AI recommendations via OpenRouter
    ├── utils/
    │   └── formatters.js        # Currency, date, percentage formatters
    ├── components/
    │   ├── layout/
    │   │   ├── Layout.jsx
    │   │   ├── Sidebar.jsx
    │   │   └── Header.jsx
    │   └── ui/
    │       ├── Modal.jsx
    │       └── StatCard.jsx
    └── pages/
        ├── Login.jsx
        ├── Dashboard.jsx
        ├── Transactions.jsx
        ├── Accounts.jsx
        ├── Goals.jsx
        ├── Budget.jsx
        ├── Analytics.jsx
        └── AIPlanner.jsx
```

## Data Models

### Account
```json
{ "id": "uuid", "name": "Nabil Bank", "type": "bank|cash|wallet", "balance": 250000, "color": "#6366f1" }
```

### Transaction
```json
{ "id": "uuid", "type": "income|expense", "amount": 85000, "accountId": "uuid", "categoryId": "uuid", "date": "ISO", "notes": "", "isRecurring": false }
```

### Category
```json
{ "id": "uuid", "name": "Food", "type": "income|expense", "color": "#ef4444", "icon": "🍔" }
```

### Asset
```json
{ "id": "uuid", "name": "Gold", "type": "gold|savings|investment|property|other", "value": 200000, "updatedAt": "ISO" }
```

### Goal
```json
{ "id": "uuid", "name": "Emergency Fund", "targetAmount": 300000, "currentAmount": 0, "deadline": "ISO", "monthlyContribution": 10000, "color": "#10b981" }
```

### Budget
```json
{ "id": "uuid", "categoryId": "uuid", "amount": 15000, "month": 4, "year": 2026 }
```

## Pages & Features

### Dashboard
- 4 KPI cards: Total Balance, Monthly Income, Monthly Expenses, Savings Rate
- Income vs Expense Bar Chart (last 6 months)
- Category Expense Pie Chart (current month)
- Net Worth Line Chart (last 12 months)
- Recent 5 transactions

### Transactions
- Filter by type, category, date range
- Tabular view with sort
- Add / Edit / Delete modal
- Recurring income toggle

### Accounts
- Account cards with type icons
- Add / Edit / Delete accounts
- Total balance summary

### Goals
- Progress bar per goal
- Monthly contribution needed
- Predicted achievable date
- Link income sources to goals

### Budget
- Month selector
- Set budget per category
- Budget vs Actual comparison bars
- Overspend alerts

### Analytics
- Spending trends
- Top expense categories
- Savings growth
- Burn rate gauge
- Financial health score (0–100)

### AI Planner
- OpenRouter API key input
- Structured financial summary sent to AI
- Personalized budget plan
- Expense reduction suggestions
- Investment/savings recommendations

## AI Prompt Strategy
The AI planner sends a structured JSON payload describing:
- Monthly income & expenses
- Savings rate
- Top spending categories
- Active goals and progress
- Account balances

The model (default: `google/gemini-flash-1.5`) returns a Markdown-formatted recommendation plan.

## Currency
Default currency: **NPR (Nepalese Rupee)**
All amounts formatted as: `NPR 1,00,000` (South Asian number format)
