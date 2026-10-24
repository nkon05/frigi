# frigi

Snap a grocery receipt, get your food items with estimated expiry dates, and use them before they go bad.

## Setup

```bash
npm install
cp .env.example .env.local   # then paste your Gemini API key
npm run dev
```

- `GEMINI_API_KEY` is read only on the server (see `lib/llm.ts`) and never sent to the browser.
- All LLM calls go through `lib/llm.ts`; the model name is the `MODEL` constant at the top.
- Data is stored in the browser's localStorage. No database, no accounts.

## Deploy

Deploy to Vercel and add `GEMINI_API_KEY` under Project Settings → Environment Variables.
