const Ajv = require("ajv/dist/2020");
const addFormats = require("ajv-formats");

const jobStatusSchema = require("../schemas/job_status.schema.json");
const jobManifestSchema = require("../schemas/job_manifest.schema.json");

const ajv = new Ajv({ allErrors: true, strict: false, removeAdditional: "all" });
addFormats(ajv);

const validateJobStatus = ajv.compile(jobStatusSchema);
const validateJobManifest = ajv.compile(jobManifestSchema);
const validateManifestPublic = ajv.compile({
  ...jobManifestSchema.properties.public,
  $id: "https://hexforgelabs.com/schemas/job_manifest_public.schema.json",
});

class ContractError extends Error {
  constructor(code, detail, meta = {}) {
    super(detail);
    this.code = code;
    this.detail = detail;
    this.jobId = meta.jobId;
  }
}

function formatAjvErrors(errors = []) {
  return errors
    .map((err) => {
      const path = err.instancePath || "/";
      return `${path} ${err.message}`.trim();
    })
    .join("; ");
}

function assertManifestPublic(payload) {
  if (!validateManifestPublic(payload)) {
    throw new ContractError("INVALID_MANIFEST_PUBLIC", formatAjvErrors(validateManifestPublic.errors));
  }
  return payload;
}

function assertJobManifest(payload) {
  if (!validateJobManifest(payload)) {
    throw new ContractError("INVALID_JOB_MANIFEST", formatAjvErrors(validateJobManifest.errors));
  }
  return payload;
}

function assertJobStatusEnvelope(payload, { requirePublicOnComplete = false } = {}) {
  if (!validateJobStatus(payload)) {
    throw new ContractError("INVALID_JOB_STATUS", formatAjvErrors(validateJobStatus.errors), {
      jobId: payload?.job_id,
    });
  }

  if (payload.status === "complete" && requirePublicOnComplete) {
    const publicSection = payload?.result?.public;
    if (!publicSection) {
      throw new ContractError("MISSING_RESULT_PUBLIC", "result.public is required when status=complete", {
        jobId: payload.job_id,
      });
    }
    assertManifestPublic(publicSection);
  }

  return payload;
}

function buildErrorEnvelope(jobId, service, code, detail) {
  return {
    job_id: jobId || "unknown",
    status: "failed",
    service,
    updated_at: new Date().toISOString(),
    error: { code, detail },
  };
}

module.exports = {
  assertJobManifest,
  assertJobStatusEnvelope,
  assertManifestPublic,
  buildErrorEnvelope,
  ContractError,
  formatAjvErrors,
};
