const express = require("express");
const request = require("supertest");

process.env.HEIGHTMAPENGINE_URL = "http://heightmapengine:8093";
process.env.HEIGHTMAP_SERVICE_NAME = "heightmapengine";

const heightmapRoutes = require("../routes/heightmap");

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/heightmap", heightmapRoutes);
  return app;
}

describe("/api/heightmap contract proxy", () => {
  let fetchSpy;
  let consoleErrorSpy;
  let app;

  beforeAll(() => {
    app = makeApp();
  });

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, "fetch");
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  const publicSection = {
    job_json: "/assets/heightmap/job-1/job.json",
    enclosure: { stl: "/assets/heightmap/job-1/enclosure/enclosure.stl" },
    textures: {
      texture_png: "/assets/heightmap/job-1/textures/texture.png",
      heightmap_png: "/assets/heightmap/job-1/textures/heightmap.png",
    },
    previews: {
      hero: "/assets/heightmap/job-1/previews/hero.png",
      iso: "/assets/heightmap/job-1/previews/iso.png",
      top: "/assets/heightmap/job-1/previews/top.png",
      side: "/assets/heightmap/job-1/previews/side.png",
    },
  };

  test("returns validated status with extras stripped", async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          job_id: "job-1",
          status: "queued",
          service: "heightmapengine",
          updated_at: "2025-01-01T00:00:00Z",
          extra: "remove-me",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const res = await request(app).post("/api/heightmap/jobs").send({});

    expect(fetchSpy).toHaveBeenCalledWith("http://heightmapengine:8093/api/heightmap/jobs", expect.any(Object));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      job_id: "job-1",
      status: "queued",
      service: "heightmapengine",
      updated_at: "2025-01-01T00:00:00Z",
    });
    expect(res.body.extra).toBeUndefined();
  });

  test("invalid upstream payload is wrapped as contract error", async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          job_id: "bad-job",
          status: "queued",
          updated_at: "2025-01-01T00:00:00Z",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const res = await request(app).get("/api/heightmap/jobs/bad-job");

    expect(fetchSpy).toHaveBeenCalledWith("http://heightmapengine:8093/api/heightmap/jobs/bad-job", expect.any(Object));
    expect(res.status).toBe(502);
    expect(res.body).toEqual({
      job_id: "bad-job",
      status: "failed",
      service: "heightmapengine",
      updated_at: expect.any(String),
      error: {
        code: "INVALID_JOB_STATUS",
        detail: expect.stringContaining("service"),
      },
    });
  });

  test("proxies docs without leaking internal hostname", async () => {
    fetchSpy.mockResolvedValue(
      new Response("<html>docs ok</html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      })
    );

    const res = await request(app).get("/api/heightmap/docs");

    expect(fetchSpy).toHaveBeenCalledWith("http://heightmapengine:8093/docs");
    expect(res.status).toBe(200);
    expect(res.text).toContain("docs ok");
    expect(res.text).not.toContain("heightmapengine:8093");
  });
});
