# Real-Time Market Dashboard

A React + Node.js market dashboard for tracking NSE symbols with live ticks, detail charts, historical data, persisted watchlists, and a simple moving-average overlay.

## Features

- Search and add symbols to a watchlist
- Live watchlist cards powered by Socket.IO ticks with LTP, absolute change, and percentage change
- Remove symbols and unsubscribe from their ticker stream
- Reorder watchlist symbols with persisted up/down actions
- Symbol detail screen with a live `CLOSE` price chart
- Intraday / Historical chart toggle
- Historical data loaded through the backend API
- Watchlist persistence with backend SQLite
- Historical chart caching with `localStorage`
- Backend caching for symbol list and historical responses
- Socket reconnect handling with automatic resubscribe
- Per-client websocket subscriptions so clients only receive requested symbols
- Light/dark theme toggle
- 5-point moving average overlay on charts
- Simple per-symbol price alerts with in-app notifications
- Polished loading, empty, error, and connection states

## Tech Stack

- Frontend: React, Vite, Recharts, Axios, Socket.IO client
- Backend: Node.js, Express, Socket.IO, Axios, built-in SQLite
- Data source: `https://mock-data.tealvue.in`

## Project Structure

```txt
market-dashboard/
  client/        React app
  server/        Express + Socket.IO backend
  README.md
  ARCHITECTURE.md
```

## Prerequisites

- Node.js
- npm

The app currently uses backend port `5050` and frontend port `5173`.

## Setup

Install dependencies:

```bash
cd server
npm install
```

```bash
cd ../client
npm install
```

The backend expects `server/.env`:

```env
PORT=5050
MOCK_API_BASE_URL=https://mock-data.tealvue.in/api/v1
```

The frontend can use `client/.env`:

```env
VITE_API_BASE_URL=http://localhost:5050/api
VITE_SOCKET_URL=http://localhost:5050
```

## Running Locally

Start the backend:

```bash
cd server
npm run dev
```

Start the frontend in another terminal:

```bash
cd client
npm run dev
```

Open:

```txt
http://127.0.0.1:5173/
```

If the backend fails with `EADDRINUSE`, another process is already using port `5050`. Stop that process or close the duplicate backend terminal before restarting.

## Demo Flow

1. Add symbols such as `RELIANCE`, `TCS`, or `INFY`.
2. Confirm live prices, absolute change, and percentage change appear in the watchlist.
3. Refresh the page and confirm the watchlist persists.
4. Remove a symbol and confirm it leaves the watchlist.
5. Move a symbol up or down, refresh, and confirm the order persists.
6. Click `RELIANCE` to open the detail screen.
7. Confirm the Intraday chart updates from live ticks using `CLOSE`.
8. Toggle to Historical and confirm historical `CLOSE` data loads.
9. Point out the dashed `MA 5` moving-average overlay.
10. Toggle light/dark mode from the header.
11. Set a target price alert on a symbol detail page and wait for a live `CLOSE` crossing notification.

## Architecture Overview

The app is split into a React frontend and a Node/Express backend. The frontend is responsible for the UI, charts, live state, and chart caching. The backend is responsible for proxying REST calls to the mock API, bridging the remote ticker socket to the browser, and persisting the watchlist in SQLite.

```txt
React client
  | REST: /api/symbols, /api/intraday, /api/historical, /api/watchlist
  | Socket.IO: subscribe, ticker
  v
Node/Express backend
  | REST proxy
  | Socket.IO bridge
  v
mock-data.tealvue.in
```

Main frontend flow:

- `Dashboard.jsx` loads symbols and the saved backend watchlist, listens for live ticks, and opens the selected symbol detail screen.
- The header includes a visible Socket.IO connection indicator and a light/dark theme toggle.
- `Watchlist.jsx` and `WatchlistCard.jsx` render SQLite-backed watchlist symbols and latest tick values.
- Removed symbols emit `unsubscribe` so the backend can forward the unsubscribe request to the ticker source.
- Up/down reorder actions save the new watchlist order through `PUT /api/watchlist`.
- `StockDetail.jsx` owns the Intraday / Historical toggle and loads historical chart data.
- `StockDetail.jsx` also contains the price-alert input for the selected symbol.
- `StockChart.jsx` renders the `CLOSE` price line and the `MA 5` moving-average overlay using Recharts.

Main backend flow:

- `server/src/server.js` starts Express and Socket.IO.
- `marketRoutes.js` exposes `/symbols`, `/intraday`, `/historical`, and `/watchlist`.
- `marketController.js` validates requests and returns clean error responses.
- `marketService.js` calls the mock REST API.
- `marketService.js` caches symbol-list and historical responses in memory for 5 minutes.
- `watchlistStore.js` stores the watchlist in `server/data/market-dashboard.sqlite`.
- `server.js` tracks requested symbols per connected frontend socket and sends each tick only to matching clients.
- `tickerClient.js` connects to the remote ticker socket and keeps the upstream ticker subscribed to the aggregate set of requested symbols.

## API Endpoints

Backend routes are mounted under `/api`.

### `GET /api/symbols`

Returns available market symbols.

### `POST /api/intraday`

Request:

```json
{
  "symbol": "RELIANCE",
  "limit": 100,
  "offset": 0
}
```

### `POST /api/historical`

Request:

```json
{
  "symbol": "RELIANCE",
  "start_date": "2026-05-04",
  "end_date": "2026-05-08",
  "limit": 100,
  "offset": 0
}
```

The mock historical API accepts a limited date range. This project uses `2026-05-04` to `2026-05-08` for the demo.

### `GET /api/watchlist`

Returns the saved watchlist from SQLite.

### `PUT /api/watchlist`

Request:

```json
{
  "symbols": ["RELIANCE", "TCS", "INFY"]
}
```

The backend normalizes symbols to uppercase, removes duplicates, and stores the ordered list durably in `server/data/market-dashboard.sqlite`.

## API Inconsistencies And Handling

During mock API exploration I found a few differences between the documentation and actual behavior:

- The historical API examples mention dates outside the range that the API accepts. The actual usable trading-day range is `2026-05-04` through `2026-05-08`, so the frontend historical demo uses that range.
- The WebSocket documentation mentions a local-style port, but the real remote Socket.IO source is `https://mock-data.tealvue.in`. The backend connects to that remote source and exposes a local Socket.IO server for the frontend.
- The ticker subscription can send a burst of existing or simulated ticks before ongoing updates. The frontend treats incoming ticks as chart points for the selected symbol and caps the live chart to the latest 50 points.
- The docs show tick price as `LTP`, while the tested mock payloads include `CLOSE`. The frontend uses `CLOSE` as requested and falls back to `LTP` if a payload only has the documented field.
- Empty POST bodies can cause destructuring errors if not guarded. The backend controllers use `req.body || {}` and return validation messages such as `Symbol is required`.
- Pagination values can arrive as strings from clients, so the backend normalizes and validates `limit` and `offset` before proxying.
- Historical date inputs are validated for `YYYY-MM-DD` format and start/end ordering before forwarding.

Handling choices:

- The frontend calls only the local backend.
- Request validation happens in the backend before proxying to the mock API.
- Historical errors are surfaced as clean API responses and frontend error states.
- Reconnect handling resubscribes the current watchlist after the Socket.IO client reconnects.
- Per-client subscription tracking prevents one browser from receiving another browser's symbols.
- Symbol list and historical responses are cached in the backend to avoid repeatedly hitting the mock API during demos.
- The watchlist is stored behind backend APIs so it survives frontend refreshes and backend restarts.

## Verification

Frontend checks:

```bash
cd client
npm run lint
npm run build
```

Backend syntax spot checks:

```bash
node --check server/src/server.js
node --check server/src/controllers/marketController.js
node --check server/src/routes/marketRoutes.js
node --check server/src/services/marketService.js
node --check server/src/services/watchlistStore.js
```

Historical endpoint smoke test:

```bash
curl -s -X POST http://localhost:5050/api/historical \
  -H 'Content-Type: application/json' \
  -d '{"symbol":"RELIANCE","start_date":"2026-05-04","end_date":"2026-05-08","limit":1,"offset":0}'
```

Watchlist persistence smoke test:

```bash
curl -s -X PUT http://localhost:5050/api/watchlist \
  -H 'Content-Type: application/json' \
  -d '{"symbols":["RELIANCE","TCS"]}'

curl -s http://localhost:5050/api/watchlist
```

## What I Learned

- Keep external API details behind a backend boundary. It made validation, proxying, and error handling much easier to reason about.
- Real-time UI needs reconnect logic, not just an initial socket connection.
- Even small persistence features benefit from a backend boundary because validation, normalization, and durability are easier to reason about there.
- Chart components are easier to extend when both live and historical data are normalized into the same shape.
- API exploration matters. The date-range mismatch in the mock historical API changed how the historical demo had to be implemented.

## Known Issues

- The watchlist is persisted in a single local SQLite database, so it is durable but not multi-user isolated.
- Historical cache is still stored in `localStorage`, so it is browser-specific.
- The live chart only keeps the latest 50 selected-symbol points in memory.
- Historical range is hardcoded for the demo because the mock API only accepts a narrow range.
- Backend cache is in-memory, so it resets when the server restarts.
- Port `5050` must be free before starting the backend.

## With More Time I Would

- Track subscriptions per connected socket so each client receives only the symbols it requested.
- Replace in-memory backend cache with a more explicit cache layer if the API traffic grows.
- Add user-configurable historical date range controls with validation.
- Add automated backend tests for validation and proxy error handling.
- Add frontend tests for persistence, reconnect handling, and chart mode switching.
- Add persistent/backend-backed alerts with alert history and delivery status.

## Notes

- The frontend calls only the local backend, not the remote mock API directly.
- The backend proxies REST requests and bridges remote ticker events to frontend clients.
- Watchlist and historical chart cache are frontend-only for this demo.
- A production version should move persistence to a backend store such as SQLite or Postgres.
