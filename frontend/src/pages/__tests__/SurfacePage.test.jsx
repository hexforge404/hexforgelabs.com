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
    installLocalStorage();
    jest.useFakeTimers();

    global.fetch = jest.fn((url, opts = {}) => {
      if (opts.method === "HEAD") {
        return Promise.resolve({ ok: true, status: 200, headers: { get: () => "123" } });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true, jobs: { items: [] } }) });
    });

    createSurfaceJob.mockResolvedValue({ job_id: "surface-job-1" });
    getSurfaceJobStatus.mockResolvedValue({ status: "complete", progress: 100, manifest_url: "/assets/surface/demo/job_manifest.json" });
    getSurfaceManifest.mockResolvedValue({ public: {}, outputs: [] });
  });

  afterEach(() => {
    jest.useRealTimers();
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

  test("polls status, fetches manifest, and renders outputs", async () => {
    mockFetchResponse({
      ok: true,
      jobs: {
        items: [
          {
            id: "hm-321",
            name: "HM Ready",
            status: "done",
            created_at: 1700000000,
            result: { public: { heightmap_url: "/assets/heightmap/hm.png", blender_previews_urls: { hero: "/assets/heightmap/hm-hero.png" } } },
          },
        ],
      },
    });

    getSurfaceJobStatus.mockResolvedValue({
      status: "complete",
      progress: undefined,
      manifest_url: "/assets/surface/demo/job_manifest.json",
    });

    getSurfaceManifest.mockResolvedValue({
      manifest_url: "/assets/surface/demo/job_manifest.json",
      outputs: [
        { type: "preview.hero", url: "/assets/surface/demo/previews/hero.png" },
        { type: "mesh.stl", url: "/assets/surface/demo/enclosure/enclosure.stl" },
      ],
    });

    const user = userEvent;
    render(<SurfacePage />);

    await screen.findByRole("option", { name: /HM Ready/ });
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /generate relief/i }));
    });

    await waitFor(() => expect(getSurfaceJobStatus).toHaveBeenCalled());
    await waitFor(() => expect(getSurfaceManifest).toHaveBeenCalled());

    expect(await screen.findByAltText(/Surface hero preview/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Enclosure STL/i })).toBeEnabled();
  });

  test("derives preview url from manifest public_root when outputs are relative", async () => {
    mockFetchResponse({
      ok: true,
      jobs: {
        items: [
          {
            id: "hm-777",
            name: "HM Ready",
            status: "done",
            created_at: 1700000000,
            result: { public: { heightmap_url: "/assets/heightmap/hm.png" } },
          },
        ],
      },
    });

    getSurfaceJobStatus.mockResolvedValue({
      status: "complete",
      progress: undefined,
      manifest_url: "/assets/surface/demo/job_manifest.json",
    });

    getSurfaceManifest.mockResolvedValue({
      manifest_url: "/assets/surface/demo/job_manifest.json",
      public_root: "/assets/surface/demo",
      outputs: [
        { type: "preview.hero", path: "previews/hero.png" },
        { type: "mesh.stl", path: "enclosure/enclosure.stl" },
      ],
    });

    const user = userEvent;
    render(<SurfacePage />);

    await screen.findByRole("option", { name: /HM Ready/ });
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /generate relief/i }));
    });

    await waitFor(() => expect(getSurfaceJobStatus).toHaveBeenCalled());
    await waitFor(() => expect(getSurfaceManifest).toHaveBeenCalled());

    const img = await screen.findByAltText(/Surface hero preview/i);
    expect(img).toHaveAttribute("src", expect.stringContaining("/assets/surface/demo/previews/hero.png"));
  });

  test("falls back to manifest subfolder when public_root is missing", async () => {
    mockFetchResponse({
      ok: true,
      jobs: {
        items: [
          {
            id: "hm-555",
            name: "HM Ready",
            status: "done",
            created_at: 1700000000,
            result: { public: { heightmap_url: "/assets/heightmap/hm.png" } },
          },
        ],
      },
    });

    getSurfaceJobStatus.mockResolvedValue({
      status: "complete",
      progress: undefined,
      job_id: "job-123",
      manifest_url: "/assets/surface/job-123/job_manifest.json",
    });

    getSurfaceManifest.mockResolvedValue({
      manifest_url: "/assets/surface/job-123/job_manifest.json",
      subfolder: "proof-run",
      outputs: [
        { type: "preview.hero", path: "previews/hero.png" },
      ],
    });

    const user = userEvent;
    render(<SurfacePage />);

    await screen.findByRole("option", { name: /HM Ready/ });
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /generate relief/i }));
    });

    await waitFor(() => expect(getSurfaceJobStatus).toHaveBeenCalled());
    await waitFor(() => expect(getSurfaceManifest).toHaveBeenCalled());

    const img = await screen.findByAltText(/Surface hero preview/i);
    expect(img.getAttribute("src")).toContain("/assets/surface/proof-run/job-123/previews/hero.png");
  });

  test("shows error on missing manifest", async () => {
    mockFetchResponse({
      ok: true,
      jobs: {
        items: [
          {
            id: "hm-999",
            name: "HM",
            status: "done",
            created_at: 1700000000,
            result: { public: { heightmap_url: "/assets/heightmap/hm.png" } },
          },
        ],
      },
    });

    getSurfaceJobStatus.mockRejectedValueOnce(new Error("Surface job completed but manifest is missing"));

    const user = userEvent;
    render(<SurfacePage />);

    await screen.findByRole("option", { name: /HM/ });
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /generate relief/i }));
    });

    await waitFor(() => expect(screen.getByText(/manifest is missing/i)).toBeInTheDocument());
  });
});
