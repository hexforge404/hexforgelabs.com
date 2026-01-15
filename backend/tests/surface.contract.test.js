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

  test("returns validated status with extras stripped", async () => {
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

    const res = await request(app).get("/api/surface/jobs/bad-job");

    expect(fetchSpy).toHaveBeenCalledWith("http://glyphengine:8092/api/surface/jobs/bad-job", expect.any(Object));
    expect(res.status).toBe(502);
    expect(res.body).toEqual({
      job_id: "bad-job",
      status: "failed",
      service: "glyphengine",
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

    const res = await request(app).get("/api/surface/docs");

    expect(fetchSpy).toHaveBeenCalledWith("http://glyphengine:8092/docs");
    expect(res.status).toBe(200);
    expect(res.text).toContain("docs ok");
    expect(res.text).not.toContain("glyphengine:8092");
  });
});
