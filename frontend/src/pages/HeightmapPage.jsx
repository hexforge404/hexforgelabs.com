import React, { useMemo, useState } from "react";
import "./HeightmapPage.css";

/**
 * ENV (set in frontend/.env.production):
 * REACT_APP_TOOLS_BASE_URL=https://tools.hexforgelabs.com
 * REACT_APP_HEIGHTMAP_ASSETS_URL=https://hexforgelabs.com/assets/heightmap
 *
 * Notes:
 * - Tools base must be absolute to bypass Cloudflare timeouts.
 * - Assets base can stay on main domain (cached) or move later.
 */
const TOOLS_BASE =
  (process.env.REACT_APP_TOOLS_BASE_URL || "").replace(/\/+$/, "");
const ASSETS_BASE =
  (process.env.REACT_APP_HEIGHTMAP_ASSETS_URL || "/assets/heightmap").replace(
    /\/+$/,
    ""
  );

function toHeightmapAssetUrl(enginePathOrUrl) {
  if (!enginePathOrUrl) return null;

  const s = String(enginePathOrUrl).trim();

  // If backend ever returns a real URL, just use it.
  if (/^https?:\/\//i.test(s)) return s;

  // Otherwise treat it like a path and grab the filename.
  const file = s.split("/").pop();
  if (!file) return null;

  return `${ASSETS_BASE}/${file}`;
}

function makeDefaultName() {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  return `heightmap_${ts}`;
}

export default function HeightmapPage() {
  const [file, setFile] = useState(null);
  const [name, setName] = useState(makeDefaultName());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resp, setResp] = useState(null);

  const previewUrl = useMemo(
    () => toHeightmapAssetUrl(resp?.result?.heightmap),
    [resp]
  );
  const stlUrl = useMemo(() => toHeightmapAssetUrl(resp?.result?.stl), [resp]);
  const manifestUrl = useMemo(
    () => toHeightmapAssetUrl(resp?.result?.manifest),
    [resp]
  );

  async function generate() {
    setError("");
    setResp(null);

    if (!file) return setError("Select an image first.");
    if (!name.trim()) return setError("Name is required.");

    // 🔥 If env var missing, fail loud (so you don't silently hit Cloudflare again)
    if (!TOOLS_BASE) {
      return setError(
        "Tools base URL is not configured. Set REACT_APP_TOOLS_BASE_URL in frontend/.env.production."
      );
    }

    const fd = new FormData();
    fd.append("image", file);
    fd.append("name", name.trim());

    setLoading(true);
    try {
      const r = await fetch(`${TOOLS_BASE}/tool/heightmap/v1`, {
        method: "POST",
        body: fd,
        // If you later switch to API-key header auth, add it here.
        // headers: { "X-HexForge-Tools-Key": "..." }
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok || data?.ok !== true) {
        const msg =
          data?.detail?.[0]?.msg ||
          data?.error ||
          `Request failed (${r.status})`;
        throw new Error(msg);
      }

      setResp(data);
    } catch (e) {
      setError(e?.message || "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFile(null);
    setName(makeDefaultName());
    setResp(null);
    setError("");
  }

  return (
    <div className="hf-hm-page">
      <div className="hf-hm-header">
        <h1>Heightmap STL Generator</h1>
        <p>Upload an image → generate STL + manifest + preview (API v1).</p>
      </div>

      <div className="hf-hm-card">
        <div className="hf-hm-row">
          <label className="hf-hm-label">
            <span>Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>

          <label className="hf-hm-label">
            <span>Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="hexforge_logo_relief"
            />
          </label>
        </div>

        <div className="hf-hm-actions">
          <button
            className="hf-hm-btn primary"
            onClick={generate}
            disabled={loading}
          >
            {loading ? "Generating…" : "Generate"}
          </button>

          <button className="hf-hm-btn" onClick={reset} disabled={loading}>
            Reset
          </button>

          {error && <div className="hf-hm-error">{error}</div>}
        </div>
      </div>

      {resp && (
        <div className="hf-hm-results">
          <div className="hf-hm-card">
            <div className="hf-hm-links">
              {stlUrl && (
                <a className="hf-hm-link" href={stlUrl} download>
                  ⬇ Download STL
                </a>
              )}
              {manifestUrl && (
                <a className="hf-hm-link" href={manifestUrl} download>
                  ⬇ Download Manifest
                </a>
              )}
              {previewUrl && (
                <a
                  className="hf-hm-link"
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  👁 Open Preview
                </a>
              )}
            </div>

            {previewUrl && (
              <div className="hf-hm-preview">
                <img src={previewUrl} alt="Heightmap preview" />
              </div>
            )}
          </div>

          <details className="hf-hm-raw">
            <summary>Raw API response</summary>
            <pre>{JSON.stringify(resp, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
