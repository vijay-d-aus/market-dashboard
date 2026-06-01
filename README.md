# Mock API Exploration Notes

## APIs tested

I tested the mock market REST APIs in Postman:

1. `GET /api/v1/symbols`
2. `POST /api/v1/realtime-current`
3. `POST /api/v1/historical`

## Findings

The symbols API worked as expected and returned a list of NSE equity symbols with details like symbol, name, exchange, type, and active status.

The realtime current API requires a `symbol` field in the request body. When I tested it with a valid symbol like `RELIANCE`, it returned intraday tick data. When I sent an empty request body, the API returned a validation error, which confirms that backend validation will also be needed before forwarding requests.

The historical API works only for a limited date range. While the documentation example uses dates like `2026-05-01` to `2026-05-04`, the actual API response says historical data is strictly limited to trading days between `2026-05-04` and `2026-05-08`. This looks like one inconsistency between the documentation example and the API validation behavior.

## Inconsistencies or unclear points

1. The documentation example for historical data uses `2026-05-01`, but the actual API rejects dates outside `2026-05-04` to `2026-05-08`.
2. The WebSocket section mentions “Port 5000”, but the actual connection address is the remote Socket.IO URL `https://mock-data.tealvue.in`. This could be confusing because local port `5000` may also conflict with system services on macOS.
3. The WebSocket docs mention a simulation loop from May 04 to May 07, but the historical API validation message allows up to May 08. This date boundary needs to be handled carefully.
4. The subscribe event sends an initial burst of previous ticks before live updates, so the frontend chart logic should avoid treating all received ticks as only new live ticks.

## Backend decisions based on this

I will keep the frontend calling only my backend, and my backend will call the mock API. I will add validation for required fields like `symbol`, `start_date`, and `end_date`. I will also handle API errors clearly so that users can understand whether the issue is missing input, invalid dates, or a mock API failure.
