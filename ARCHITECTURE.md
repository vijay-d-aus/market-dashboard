# Architecture Note

## Overview

The app is split into a React frontend and a Node/Express backend. The frontend owns the user experience, chart rendering, live state, and temporary historical cache. The backend owns communication with the mock market API, the remote ticker socket, and watchlist persistence.

```txt
React client
  | REST: /api/symbols, /api/historical, /api/intraday, /api/watchlist
  | Socket.IO: subscribe, ticker
  v
Node/Express backend
  | REST proxy
  | Socket.IO bridge
  v
mock-data.tealvue.in
```

## Frontend

`Dashboard.jsx` is the main state container. It loads symbols, loads the persisted watchlist from the backend, listens for socket ticks, and opens the selected symbol detail screen.

Key responsibilities:

- Load symbols from `GET /api/symbols`
- Persist `watchlist` through user-scoped `GET /api/watchlist` and `PUT /api/watchlist`
- Restore the SQLite-backed watchlist for the active demo user on refresh
- Save remove and reorder actions through the same backend watchlist endpoint
- Resubscribe the restored watchlist on socket reconnect
- Store latest ticks by `SYMBOL`
- Build intraday chart points from live tick `CLOSE`, falling back to `LTP` if needed

`StockDetail.jsx` owns the chart mode:

- `Intraday`: uses live chart data passed from `Dashboard`
- `Historical`: calls `POST /api/historical`
- Validates user-selected historical start/end dates before calling the backend
- Caches historical chart points in `localStorage` using symbol/date/limit/offset as the key
- Provides a per-symbol target price alert input and alert history

`StockChart.jsx` renders the Recharts chart. It plots:

- `price`: CLOSE value
- `movingAverage`: 5-point moving average

## Backend

`server/src/server.js` creates the Express app, HTTP server, and Socket.IO server.

REST routes live in `server/src/routes/marketRoutes.js`:

- `GET /api/symbols`
- `POST /api/intraday`
- `POST /api/historical`
- `GET /api/watchlist`
- `PUT /api/watchlist`

Controllers validate request bodies before forwarding to the service layer. Missing bodies return clean validation errors instead of crashing.

`marketService.js` proxies REST calls to the mock API base URL from `MOCK_API_BASE_URL`.
It calls through `cacheStore.js` for cacheable symbol-list and historical responses.

`cacheStore.js` uses Node's built-in SQLite module to store cache entries in `server/data/market-dashboard.sqlite`. Each cache row stores a key, serialized JSON response, and expiry timestamp.

`watchlistStore.js` uses Node's built-in SQLite module to store watchlist symbols and their positions by demo user in `server/data/market-dashboard.sqlite`. Incoming watchlists are normalized to uppercase, deduplicated, and written inside a transaction.

`alertStore.js` stores price-alert definitions and history by demo user in the same SQLite database. Alert rows track active/triggered status, delivery status, target price, triggered price, and timestamps. History rows record created, triggered, and delivered events.

`tickerClient.js` connects to the remote Socket.IO source. The backend tracks requested symbols per frontend socket, keeps the remote ticker subscribed to the aggregate set of requested symbols, and sends each received `ticker` event only to clients that subscribed to that symbol.

## Persistence And Caching

Watchlist persistence is backend-owned:

- `watchlist`: `server/data/market-dashboard.sqlite`, scoped by `X-Demo-User`

Historical chart caching is still frontend-local:

- historical chart cache: `localStorage["historical:<symbol>:<start>:<end>:<limit>:<offset>"]`

Backend caching is intentionally lightweight but explicit:

- symbols cache key: `symbols`
- historical cache key: `historical:<symbol>:<start>:<end>:<limit>:<offset>`
- TTL: 5 minutes

The cache reduces repeated mock API calls during demos and can survive backend restarts until entries expire. It is still local to the app database.

## Reconnect Handling

Socket reconnects are handled in `Dashboard.jsx`. On `connect`, the app reads the latest watchlist from a ref and emits `subscribe` again. This keeps live ticks working after browser reloads, backend restarts, or transient socket disconnects.

The backend also handles upstream ticker reconnects. If the remote ticker connection comes back while frontend clients are still connected, the backend resubscribes the aggregate symbol set upstream.

## Price Alerts

Price alerts are backend-backed and scoped by demo user. `Dashboard.jsx` loads saved alerts from `GET /api/alerts` and creates new alerts through `POST /api/alerts`, with the active workspace sent as `X-Demo-User`. The backend checks active alerts as live ticks arrive. When the latest `CLOSE` crosses the target in either direction, the alert is marked as triggered, an event is written to history, and matching subscribed frontend clients receive a `price_alert` socket event. If at least one matching client receives the event, the backend marks the alert delivery status as `delivered` and emits `price_alert_updated`.

## Tests

Backend tests use Node's built-in test runner. They call the market controllers directly with mocked responses and mocked service failures to cover request validation and proxy error handling without hitting the remote mock API.

Frontend tests use Vitest, jsdom, and Testing Library. They mock the backend API, socket client, and chart renderer to cover watchlist persistence, reconnect resubscribe behavior, alert notifications, alert history, and Intraday/Historical mode switching.

## Known Constraints

- Demo-user isolation uses a local header rather than real authentication.
- Historical date controls are constrained by the mock API's supported range.
- Port `5050` must be free before starting the backend.
