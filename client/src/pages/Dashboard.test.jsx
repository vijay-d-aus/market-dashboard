import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Dashboard from "./Dashboard";
import api, {
  createPriceAlert,
  fetchCurrentUser,
  fetchAlerts,
  fetchWatchlist,
  getAuthToken,
  getStoredUser,
  login,
  logout,
  register,
  saveWatchlist,
  setAuthSession
} from "../services/api";
import socket from "../services/socket";

vi.mock("../services/api", () => ({
  default: {
    get: vi.fn()
  },
  clearAuthSession: vi.fn(),
  createPriceAlert: vi.fn(),
  fetchCurrentUser: vi.fn(),
  fetchAlerts: vi.fn(),
  fetchWatchlist: vi.fn(),
  getAuthToken: vi.fn(),
  getStoredUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  saveWatchlist: vi.fn(),
  setAuthSession: vi.fn()
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
  default: ({ chartData = [], title }) => (
    <div>
      <div>{title}</div>
      <div>chart points: {chartData.length}</div>
    </div>
  )
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
  fetchAlerts.mockResolvedValue({
    data: {
      data: []
    }
  });
  createPriceAlert.mockResolvedValue({
    data: {
      data: {
        id: 1,
        symbol: "RELIANCE",
        target: 1435,
        status: "active",
        delivery_status: "pending",
        history: []
      }
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
    getAuthToken.mockReturnValue("token-1");
    getStoredUser.mockReturnValue({
      id: "alice"
    });
    fetchCurrentUser.mockResolvedValue({
      data: {
        data: {
          user: {
            id: "alice"
          }
        }
      }
    });
    login.mockResolvedValue({
      data: {
        data: {
          token: "token-1",
          user: {
            id: "alice"
          }
        }
      }
    });
    register.mockResolvedValue({
      data: {
        data: {
          token: "token-1",
          user: {
            id: "alice"
          }
        }
      }
    });
    logout.mockResolvedValue({
      data: {
        success: true
      }
    });
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

    expect(socket.emit).toHaveBeenCalledWith("authenticate", "token-1");
    expect(socket.emit).toHaveBeenCalledWith("subscribe", ["RELIANCE", "TCS"]);
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("shows backend alert notifications from socket events", async () => {
    const handlers = {};
    socket.on.mockImplementation((event, handler) => {
      handlers[event] = handler;
    });
    setupInitialData(["RELIANCE"]);

    render(<Dashboard />);

    expect(await screen.findByText("RELIANCE")).toBeInTheDocument();

    act(() => {
      handlers.price_alert({
        id: 1,
        symbol: "RELIANCE",
        target: 1435,
        triggered_price: 1436,
        delivery_status: "pending",
        history: []
      });
    });

    expect(screen.getByText("RELIANCE alert triggered")).toBeInTheDocument();
    expect(screen.getByText("Delivery: pending")).toBeInTheDocument();
  });

  it("keeps live chart history for unselected symbols", async () => {
    const user = userEvent.setup();
    const handlers = {};
    socket.on.mockImplementation((event, handler) => {
      handlers[event] = handler;
    });
    setupInitialData(["RELIANCE", "TCS"]);

    render(<Dashboard />);

    expect(await screen.findByText("TCS")).toBeInTheDocument();

    act(() => {
      Array.from({ length: 60 }, (_, index) => index).forEach((index) => {
        handlers.ticker({
          SYMBOL: "TCS",
          TS: `2026-06-11T10:${String(index).padStart(2, "0")}:00.000Z`,
          CLOSE: 2400 + index,
          LTP: 2400 + index
        });
      });
    });

    await user.click(screen.getByText("TCS").closest("button"));

    expect(screen.getByText("TCS Live CLOSE Chart")).toBeInTheDocument();
    expect(screen.getByText("chart points: 60")).toBeInTheDocument();
  });

  it("signs in before loading user-owned watchlist data", async () => {
    const user = userEvent.setup();
    getAuthToken.mockReturnValue("");
    getStoredUser.mockReturnValue(null);
    setupInitialData(["TCS"]);

    render(<Dashboard />);

    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(fetchWatchlist).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Password"), "secret1");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(setAuthSession).toHaveBeenCalledWith({
        token: "token-1",
        user: {
          id: "alice"
        }
      });
    });

    expect(await screen.findByText("TCS")).toBeInTheDocument();
  });
});
