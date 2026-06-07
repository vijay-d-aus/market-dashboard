import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const MOVING_AVERAGE_WINDOW = 10;

const addMovingAverage = (data) => {
  return data.map((point, index) => {
    if (index < MOVING_AVERAGE_WINDOW - 1) {
      return {
        ...point,
        movingAverage: null
      };
    }

    const window = data.slice(index - MOVING_AVERAGE_WINDOW + 1, index + 1);
    const total = window.reduce((sum, item) => sum + item.price, 0);

    return {
      ...point,
      movingAverage: Number((total / MOVING_AVERAGE_WINDOW).toFixed(2))
    };
  });
};

function StockChart({
  chartData,
  emptyMessage = "Waiting for chart data...",
  symbol,
  title
}) {
  const chartDataWithAverage = addMovingAverage(chartData);
  const hasMovingAverage = chartData.length >= MOVING_AVERAGE_WINDOW;

  return (
    <div className="stock-chart">
      <div className="stock-chart__header">
        <h2>{title || `${symbol} CLOSE Chart`}</h2>

        {hasMovingAverage && (
          <div className="stock-chart__legend">
            <span>
              <i className="stock-chart__legend-line stock-chart__legend-line--price" />
              Close
            </span>
            <span>
              <i className="stock-chart__legend-line stock-chart__legend-line--average" />
              MA 10
            </span>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartDataWithAverage}>
          <XAxis dataKey="time" />
          <YAxis domain={["auto", "auto"]} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#2563eb"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="movingAverage"
            stroke="#f97316"
            strokeDasharray="5 4"
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>

      {chartData.length === 0 && (
        <p className="stock-chart__empty">{emptyMessage}</p>
      )}
    </div>
  );
}

export default StockChart;
