import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import StockDetail from "./StockDetail";
import { fetchHistoricalData } from "../services/api";

vi.mock("../services/api", () => ({
  fetchHistoricalData: vi.fn()
}));

vi.mock("./StockChart", () => ({
  default: ({ chartData, emptyMessage, title }) => (
    <div>
      <h3>{title}</h3>
      <p>points: {chartData.length}</p>
      {chartData.length === 0 && <p>{emptyMessage}</p>}
    </div>
  )
}));

const renderStockDetail = () => {
  return render(
    <StockDetail
      symbol="RELIANCE"
      tick={{
        CLOSE: 1435.7
      }}
      chartData={[
        {
          time: "15:20:00",
          price: 1435.7
        }
      ]}
      priceAlert={null}
      onBack={vi.fn()}
      onSetPriceAlert={vi.fn()}
    />
  );
};

describe("StockDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("switches from intraday to historical and loads historical data", async () => {
    const user = userEvent.setup();
    fetchHistoricalData.mockResolvedValue({
      data: {
        data: [
          {
            TS: "2026-05-04T09:15:00.000Z",
            CLOSE: 1430.25
          }
        ]
      }
    });

    renderStockDetail();

    expect(screen.getByText("RELIANCE Live CLOSE Chart")).toBeInTheDocument();
    expect(screen.getByText("points: 1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Historical" }));

    expect(screen.getByLabelText("Start")).toHaveValue("2026-05-04");
    expect(screen.getByLabelText("End")).toHaveValue("2026-05-08");

    await waitFor(() => {
      expect(fetchHistoricalData).toHaveBeenCalledWith({
        symbol: "RELIANCE",
        start_date: "2026-05-04",
        end_date: "2026-05-08",
        limit: 100,
        offset: 0
      });
    });

    expect(
      await screen.findByText("RELIANCE Historical CLOSE Chart")
    ).toBeInTheDocument();
  });

  it("validates historical date ranges before applying them", async () => {
    const user = userEvent.setup();
    fetchHistoricalData.mockResolvedValue({
      data: {
        data: []
      }
    });

    renderStockDetail();

    await user.click(screen.getByRole("button", { name: "Historical" }));
    await waitFor(() => {
      expect(fetchHistoricalData).toHaveBeenCalledTimes(1);
    });

    await user.clear(screen.getByLabelText("Start"));
    await user.type(screen.getByLabelText("Start"), "2026-05-08");
    await user.clear(screen.getByLabelText("End"));
    await user.type(screen.getByLabelText("End"), "2026-05-04");
    await user.click(screen.getByRole("button", { name: "Apply range" }));

    expect(
      screen.getByText("Start date cannot be after end date.")
    ).toBeInTheDocument();
    expect(fetchHistoricalData).toHaveBeenCalledTimes(1);
  });
});
