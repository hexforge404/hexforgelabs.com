const {
  assertJobStatusEnvelope,
  buildErrorEnvelope,
  ContractError,
} = require("../utils/contractValidation");

const baseStatus = {
  job_id: "job-123",
  status: "queued",
  service: "glyphengine",
  updated_at: "2025-01-01T00:00:00Z",
};

describe("contractValidation", () => {
  test("accepts a valid job status envelope without mutation", () => {
    const payload = { ...baseStatus };
    const result = assertJobStatusEnvelope(payload);
    expect(result).toEqual(baseStatus);
  });

  test("strips additional properties via AJV removeAdditional", () => {
    const payload = {
      ...baseStatus,
      extra_field: "should_be_removed",
      nested: { keep: true, drop: "x" },
    };

    const result = assertJobStatusEnvelope(payload);
    expect(result.extra_field).toBeUndefined();
    expect(result.nested).toBeUndefined();
  });

  test("invalid payload raises ContractError and can be wrapped", () => {
    const invalid = {
      job_id: "job-123",
      status: "queued",
      updated_at: "2025-01-01T00:00:00Z",
    }; // missing service

    try {
      assertJobStatusEnvelope(invalid);
      throw new Error("expected ContractError");
    } catch (err) {
      expect(err).toBeInstanceOf(ContractError);
      expect(err.code).toBe("INVALID_JOB_STATUS");
      const envelope = buildErrorEnvelope(invalid.job_id, "glyphengine", err.code, err.detail);
      expect(envelope).toEqual({
        job_id: "job-123",
        status: "failed",
        service: "glyphengine",
        updated_at: expect.any(String),
        error: {
          code: "INVALID_JOB_STATUS",
          detail: expect.stringContaining("service"),
        },
      });
    }
  });
});
