const express = require("express");
const request = require("supertest");

process.env.GLYPHENGINE_URL = "http://glyphengine:8092";
process.env.SURFACE_SERVICE_NAME = "glyphengine";

const surfaceRoutes = require("../routes/surface");

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/surface", surfaceRoutes);
  return app;
}

describe("/api/surface contract proxy", () => {
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

  test("proxies job creation payload without stripping upstream fields", async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          job_id: "job-1",
          status: "queued",
          service: "glyphengine",
          updated_at: "2025-01-01T00:00:00Z",
          extra: "remove-me",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const res = await request(app).post("/api/surface/jobs").send({ foo: "bar" });

    expect(fetchSpy).toHaveBeenCalledWith("http://glyphengine:8092/api/surface/jobs", expect.any(Object));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      job_id: "job-1",
      status: "queued",
      service: "glyphengine",
      updated_at: "2025-01-01T00:00:00Z",
      extra: "remove-me",
    });
  });

  test("status passthrough builds manifest_url and derived state", async () => {
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

    const res = await request(app).get("/api/surface/jobs/bad-job");

    expect(fetchSpy).toHaveBeenCalledWith("http://glyphengine:8092/api/surface/jobs/bad-job", expect.any(Object));
    expect(res.status).toBe(200);
    expect(res.body.job_id).toBe("bad-job");
    expect(res.body.status).toBe("queued");
    expect(res.body.state).toBe("queued");
    expect(res.body.progress).toBe(10);
    expect(res.body.manifest_url).toBe("/assets/surface/bad-job/job_manifest.json");
  });

  test("/docs route is not exposed via backend proxy", async () => {
    const res = await request(app).get("/api/surface/docs");

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(res.status).toBe(404);
  });
});
