import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ExternalLink, FileDown, Image as ImageIcon, RefreshCw } from "lucide-react";
import "./PreviewGallery.css";

function PreviewGallery({ previews = {}, manifestUrl, missingLabel = "Preview pending", onReload }) {
  const previewList = useMemo(() => {
    const entries = [
      { key: "hero", label: "Hero", url: previews.hero },
      { key: "iso", label: "ISO", url: previews.iso },
      { key: "top", label: "Top", url: previews.top },
      { key: "side", label: "Side", url: previews.side },
    ].filter((item, idx, arr) => item.url && arr.findIndex((candidate) => candidate.url === item.url) === idx);

    if (entries.length === 0) {
      return [{ key: "none", label: "Preview", url: null }];
    }
    return entries;
  }, [previews]);

  const [activeKey, setActiveKey] = useState(previewList[0]?.key || "none");
  const [imageError, setImageError] = useState("");
  const [failedUrls, setFailedUrls] = useState({});

  const safePreviewList = useMemo(() => {
    return previewList.map((item) => (failedUrls[item.url] ? { ...item, url: null } : item));
  }, [previewList, failedUrls]);

  useEffect(() => {
    if (!safePreviewList.some((item) => item.key === activeKey)) {
      setActiveKey(safePreviewList[0]?.key || "none");
      setImageError("");
    }
  }, [safePreviewList, activeKey]);

  const active = safePreviewList.find((item) => item.key === activeKey) || safePreviewList[0] || { url: null };

  const handleImageError = (url) => {
    setFailedUrls((prev) => ({ ...prev, [url]: true }));
    setImageError("Preview image could not be loaded");
  };

  return (
    <div className="surface-gallery">
      <div className="surface-gallery__main">
        {active?.url ? (
          <img
            src={active.url}
            alt="Surface hero preview"
            onError={() => handleImageError(active.url)}
          />
        ) : (
          <div className="surface-placeholder surface-gallery__placeholder">
            <ImageIcon size={22} />
            <p>{missingLabel}</p>
          </div>
        )}

        <div className="surface-gallery__actions">
          <button
            type="button"
            className="surface-button surface-button-ghost"
            onClick={() => active?.url && window.open(active.url, "_blank")}
            disabled={!active?.url}
          >
            <ExternalLink size={14} /> Open image
          </button>
          {manifestUrl && (
            <button
              type="button"
              className="surface-button surface-button-ghost"
              onClick={() => window.open(manifestUrl, "_blank")}
            >
              <FileDown size={14} /> Manifest
            </button>
          )}
          {onReload && (
            <button type="button" className="surface-button surface-button-ghost" onClick={onReload}>
              <RefreshCw size={14} /> Reload
            </button>
          )}
        </div>

        {imageError && (
          <div className="surface-alert surface-alert-warn" style={{ marginTop: "0.5rem" }}>
            <AlertTriangle size={16} />
            <div>
              <p className="surface-alert-title">{imageError}</p>
              <p className="surface-alert-body">The preview link exists but the image could not be fetched.</p>
            </div>
          </div>
        )}
      </div>

      <div className="surface-gallery__thumbs previewGrid">
        {safePreviewList.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`surface-gallery__thumb ${item.key === activeKey ? "is-active" : ""}`}
            onClick={() => {
              setActiveKey(item.key);
              setImageError("");
            }}
            disabled={!item.url}
            title={item.url ? item.label : "Preview unavailable"}
          >
            {item.url ? (
              <img
                src={item.url}
                alt={`${item.label} preview`}
                onError={() => handleImageError(item.url)}
              />
            ) : (
              <div className="surface-gallery__thumb-missing">
                <ImageIcon size={14} />
              </div>
            )}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default PreviewGallery;
