# Architecture Note

## Overview

The app is split into a React frontend and a Node/Express backend. The frontend owns the user experience, chart rendering, watchlist persistence, and temporary historical cache. The backend owns communication with the mock market API and the remote ticker socket.

```txt
React client
  | REST: /api/symbols, /api/historical, /api/intraday
  | Socket.IO: subscribe, ticker
  v
Node/Express backend
  | REST proxy
  | Socket.IO bridge
  v
mock-data.tealvue.in
```

## Frontend

`Dashboard.jsx` is the main state container. It loads symbols, stores the watchlist, listens for socket ticks, and opens the selected symbol detail screen.

Key responsibilities:

- Load symbols from `GET /api/symbols`
- Persist `watchlist` to `localStorage`
- Restore watchlist on refresh
- Resubscribe the restored watchlist on socket reconnect
- Store latest ticks by `SYMBOL`
- Build intraday chart points from live tick `CLOSE`

`StockDetail.jsx` owns the chart mode:

- `Intraday`: uses live chart data passed from `Dashboard`
- `Historical`: calls `POST /api/historical`
- Caches historical chart points in `localStorage` using symbol/date/limit/offset as the key

`StockChart.jsx` renders the Recharts chart. It plots:

- `price`: CLOSE value
- `movingAverage`: 5-point moving average

## Backend

`server/src/server.js` creates the Express app, HTTP server, and Socket.IO server.

REST routes live in `server/src/routes/marketRoutes.js`:

- `GET /api/symbols`
- `POST /api/intraday`
- `POST /api/historical`

Controllers validate request bodies before forwarding to the service layer. Missing bodies return clean validation errors instead of crashing.

`marketService.js` proxies REST calls to the mock API base URL from `MOCK_API_BASE_URL`.

`tickerClient.js` connects to the remote Socket.IO source. The backend forwards frontend `subscribe` events to the remote ticker and broadcasts received `ticker` events back to all frontend clients.

## Persistence And Caching

Current demo persistence is frontend-only:

- `watchlist`: `localStorage["watchlist"]`
- historical chart cache: `localStorage["historical:<symbol>:<start>:<end>:<limit>:<offset>"]`

This keeps the demo simple and reload-safe. For production, these should move to backend persistence, ideally SQLite for a small local app or Postgres for multi-user use.

## Reconnect Handling

Socket reconnects are handled in `Dashboard.jsx`. On `connect`, the app reads the latest watchlist from a ref and emits `subscribe` again. This keeps live ticks working after browser reloads, backend restarts, or transient socket disconnects.

## Known Constraints

- Historical date range is constrained by the mock API.
- The backend currently broadcasts all received ticks to connected clients.
- Port `5050` must be free before starting the backend.
