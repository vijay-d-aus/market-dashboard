import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Dashboard from "./Dashboard";
import api, { fetchWatchlist, saveWatchlist } from "../services/api";
import socket from "../services/socket";

vi.mock("../services/api", () => ({
  default: {
    get: vi.fn()
  },
  fetchWatchlist: vi.fn(),
  saveWatchlist: vi.fn()
}));

vi.mock("../services/socket", () => ({
  default: {
    connected: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    emit: vi.fn(),
    off: vi.fn(),
    on: vi.fn()
  }
}));

vi.mock("../components/StockChart", () => ({
  default: ({ title }) => <div>{title}</div>
}));

const symbolsResponse = {
  data: {
    data: [
      {
        symbol: "RELIANCE",
        name: "Reliance Industries Ltd."
      },
      {
        symbol: "TCS",
        name: "Tata Consultancy Services Ltd."
      }
    ]
  }
};

const setupInitialData = (watchlist = ["RELIANCE"]) => {
  api.get.mockResolvedValue(symbolsResponse);
  fetchWatchlist.mockResolvedValue({
    data: {
      data: watchlist
    }
  });
  saveWatchlist.mockImplementation((symbols) => {
    return Promise.resolve({
      data: {
        data: symbols
      }
    });
  });
};

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    socket.connected = false;
  });

  it("loads the persisted backend watchlist and saves additions", async () => {
    const user = userEvent.setup();
    setupInitialData(["RELIANCE"]);

    render(<Dashboard />);

    expect(await screen.findByText("RELIANCE")).toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox"), "TCS");

    await waitFor(() => {
      expect(saveWatchlist).toHaveBeenCalledWith(["RELIANCE", "TCS"]);
    });

    expect(await screen.findByText("TCS")).toBeInTheDocument();
  });

  it("resubscribes the restored watchlist after socket reconnect", async () => {
    const handlers = {};
    socket.on.mockImplementation((event, handler) => {
      handlers[event] = handler;
    });
    setupInitialData(["RELIANCE", "TCS"]);

    render(<Dashboard />);

    expect(await screen.findByText("RELIANCE")).toBeInTheDocument();

    act(() => {
      handlers.connect();
    });

    expect(socket.emit).toHaveBeenCalledWith("subscribe", ["RELIANCE", "TCS"]);
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });
});
