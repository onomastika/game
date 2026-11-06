# Keyboard Choice Lab — v1.1 (design refinement)

Dark, responsive, privacy-friendly keyboard chooser. No database, accounts, runtime dependencies or API keys.

## Files

- `index.html` — semantic UI
- `styles.css` — visual language + responsive layouts
- `engine.js` — pure matching, exclusions, freshness and tradeoffs
- `app.js` — state, persistence, catalogue, comparisons and details
- `catalog.json` — research snapshot (NOT live inventory)
- `tests/engine.test.mjs` — matching logic tests

## Local development

Serve the directory over HTTP for ES modules: `python -m http.server 8000`; visit `http://localhost:8000/`.
Run tests: `npm test`.

## Cloudflare Workers (Git integration)

Repository: `onomastika/game`; branch: `keyboard-choice-lab`; Root Directory: `docs`; Build command: leave empty; Deploy command: `npx wrangler deploy`.

No Supabase or backend needed. The UI does not collect personal information. Preferences stay in localStorage and migrate from v1. Prices are historic leads and not live stock.

No commits to `main`.
