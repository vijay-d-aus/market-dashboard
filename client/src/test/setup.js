import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

const createStorage = () => {
  let store = {};

  return {
    clear() {
      store = {};
    },
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key)
        ? store[key]
        : null;
    },
    removeItem(key) {
      delete store[key];
    },
    setItem(key, value) {
      store[key] = String(value);
    }
  };
};

const testStorage = createStorage();

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: testStorage
});

Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: testStorage
});

afterEach(() => {
  localStorage.clear();
});
