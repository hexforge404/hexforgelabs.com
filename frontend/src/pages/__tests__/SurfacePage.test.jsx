import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SurfacePage from "../SurfacePage";

jest.mock("lucide-react", () => ({
  AlertTriangle: () => null,
  Clock3: () => null,
  Download: () => null,
  FileDown: () => null,
  Image: () => null,
  RefreshCw: () => null,
  Sparkles: () => null,
}));

jest.mock("../../services/surfaceApi", () => {
  return {
    createSurfaceJob: jest.fn(),
    getSurfaceJobStatus: jest.fn(),
    getSurfaceManifest: jest.fn(),
    SurfaceApiError: class SurfaceApiError extends Error {},
  };
});

import {
  createSurfaceJob,
  getSurfaceJobStatus,
  getSurfaceManifest,
} from "../../services/surfaceApi";

function mockFetchResponse(body, ok = true, status = 200) {
  global.fetch.mockResolvedValueOnce({
    ok,
    status,
    json: async () => body,
  });
}

const localStore = {};
function installLocalStorage() {
  Object.defineProperty(window, "localStorage", {
    value: {
      getItem: (k) => (k in localStore ? localStore[k] : null),
      setItem: (k, v) => {
        localStore[k] = String(v);
      },
      removeItem: (k) => {
        delete localStore[k];
      },
      clear: () => {
        Object.keys(localStore).forEach((k) => delete localStore[k]);
      },
    },
    writable: true,
    configurable: true,
  });
}

describe("SurfacePage heightmap integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    installLocalStorage();

    createSurfaceJob.mockResolvedValue({ job_id: "surface-job-1" });
    getSurfaceJobStatus.mockResolvedValue({ status: "complete", progress: 100 });
    getSurfaceManifest.mockResolvedValue({ public: {} });

    jest.spyOn(window, "setInterval").mockImplementation((fn) => {
      fn();
      return 0;
    });
    jest.spyOn(window, "clearInterval").mockImplementation(() => {});
  });

  test("shows error when no completed heightmap is available", async () => {
    mockFetchResponse({ ok: true, jobs: { items: [] } });

    const user = userEvent;
    render(<SurfacePage />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /generate relief/i }));
    });

    expect(screen.getByText(/select a completed heightmap first/i)).toBeInTheDocument();
    expect(createSurfaceJob).not.toHaveBeenCalled();
  });

  test("sends selected heightmap id and url in surface payload", async () => {
    mockFetchResponse({
      ok: true,
      jobs: {
        items: [
          {
            id: "hm-123",
            name: "Sample HM",
            status: "done",
            created_at: 1700000000,
            result: {
              public: {
                heightmap_url: "/assets/heightmap/sample.png",
                blender_previews_urls: { hero: "/assets/heightmap/hero.png" },
              },
            },
          },
        ],
      },
    });

    const user = userEvent;
    render(<SurfacePage />);

    await screen.findByRole("option", { name: /Sample HM/ });
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /generate relief/i }));
    });

    expect(createSurfaceJob).toHaveBeenCalledTimes(1);
    const payload = createSurfaceJob.mock.calls[0][0];
    expect(payload.source_heightmap_job_id).toBe("hm-123");
    expect(payload.source_heightmap_url).toContain("/assets/heightmap/");
  });
});
