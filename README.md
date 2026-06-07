# Real-Time Market Dashboard

A React + Node.js market dashboard for tracking NSE symbols with live ticks, detail charts, historical data, persisted watchlists, and a simple moving-average overlay.

## Features

- Search and add symbols to a watchlist
- Live watchlist cards powered by Socket.IO ticks
- Symbol detail screen with a live `CLOSE` price chart
- Intraday / Historical chart toggle
- Historical data loaded through the backend API
- Watchlist persistence with `localStorage`
- Historical chart caching with `localStorage`
- Socket reconnect handling with automatic resubscribe
- 5-point moving average overlay on charts
- Polished loading, empty, error, and connection states

## Tech Stack

- Frontend: React, Vite, Recharts, Axios, Socket.IO client
- Backend: Node.js, Express, Socket.IO, Axios
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
2. Confirm live prices appear in the watchlist.
3. Refresh the page and confirm the watchlist persists.
4. Click `RELIANCE` to open the detail screen.
5. Confirm the Intraday chart updates from live ticks using `CLOSE`.
6. Toggle to Historical and confirm historical `CLOSE` data loads.
7. Point out the dashed `MA 5` moving-average overlay.

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
```

Historical endpoint smoke test:

```bash
curl -s -X POST http://localhost:5050/api/historical \
  -H 'Content-Type: application/json' \
  -d '{"symbol":"RELIANCE","start_date":"2026-05-04","end_date":"2026-05-08","limit":1,"offset":0}'
```

## Notes

- The frontend calls only the local backend, not the remote mock API directly.
- The backend proxies REST requests and bridges remote ticker events to frontend clients.
- Watchlist and historical chart cache are frontend-only for this demo.
- A production version should move persistence to a backend store such as SQLite or Postgres.
