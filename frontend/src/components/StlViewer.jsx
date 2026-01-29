import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Download, Loader2, RefreshCw, Sparkles, Camera, Layers } from "lucide-react";
import "./StlViewer.css";

function StlViewer({ urls = {}, height = 320 }) {
  const mountRef = useRef(null);
  const contextRef = useRef(null);
  const meshRef = useRef(null);
  const frameRef = useRef(null);
  const boundsRef = useRef(null);
  const wireframeRef = useRef(false);

  const [activeKey, setActiveKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [moduleLoading, setModuleLoading] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [scale, setScale] = useState(1);

  const options = useMemo(() => {
    const opts = [];
    if (urls.base) opts.push({ key: "base", label: "Base", url: urls.base });
    if (urls.lid) opts.push({ key: "lid", label: "Lid", url: urls.lid });
    if (urls.panel) opts.push({ key: "panel", label: "Panel", url: urls.panel });
    if (urls.main) opts.push({ key: "main", label: "Mesh", url: urls.main });
    return opts;
  }, [urls]);

  useEffect(() => {
    if (options.length === 0) {
      setActiveKey(null);
      return;
    }
    if (!options.some((o) => o.key === activeKey)) {
      setActiveKey(options[0].key);
    }
  }, [options, activeKey]);

  const active = options.find((o) => o.key === activeKey) || options[0] || null;
  const activeUrl = active?.url || null;

  useEffect(() => {
    let cancelled = false;

    const ensureViewer = async () => {
      if (!activeUrl) return;
      setModuleLoading(true);
      try {
        const { default: THREE } = await import("three");
        const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
        const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");

        if (!mountRef.current || cancelled) return;

        const width = mountRef.current.clientWidth || 360;
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0b111a);

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
        camera.position.set(2.2, 1.8, 2.2);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.enablePan = true;

        const hemi = new THREE.HemisphereLight(0xcde8ff, 0x0b111a, 0.6);
        scene.add(hemi);
        const dir1 = new THREE.DirectionalLight(0xffffff, 0.9);
        dir1.position.set(2, 3, 2);
        scene.add(dir1);
        const dir2 = new THREE.DirectionalLight(0x7ee0ff, 0.5);
        dir2.position.set(-2, -1, -2);
        scene.add(dir2);

        mountRef.current.innerHTML = "";
        mountRef.current.appendChild(renderer.domElement);

        const loader = new STLLoader();

        const animate = () => {
          if (cancelled) return;
          frameRef.current = requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
          if (!mountRef.current) return;
          const nextWidth = mountRef.current.clientWidth || width;
          camera.aspect = nextWidth / height;
          camera.updateProjectionMatrix();
          renderer.setSize(nextWidth, height);
        };
        window.addEventListener("resize", handleResize);

        contextRef.current = { THREE, renderer, scene, camera, controls, loader, handleResize };
        setReady(true);

        return () => {
          window.removeEventListener("resize", handleResize);
          cancelAnimationFrame(frameRef.current);
          if (meshRef.current) {
            scene.remove(meshRef.current);
            meshRef.current.geometry?.dispose();
            meshRef.current.material?.dispose();
            meshRef.current = null;
          }
          controls.dispose();
          renderer.dispose();
          scene.clear();
          if (mountRef.current) {
            mountRef.current.innerHTML = "";
          }
          contextRef.current = null;
          boundsRef.current = null;
        };
      } catch (err) {
        console.warn("stl viewer init failed", err);
        setError("3D viewer unavailable in this browser");
        return () => {};
      } finally {
        setModuleLoading(false);
      }
    };

    let cleanup = () => {};
    ensureViewer().then((fn) => {
      if (fn && !cancelled) cleanup = fn;
    });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [activeUrl, height]);

  useEffect(() => {
    const ctx = contextRef.current;
    if (!ctx || !activeUrl) return undefined;

    const { loader, scene, THREE, camera, controls } = ctx;
    setLoading(true);
    setError("");

    if (meshRef.current) {
      scene.remove(meshRef.current);
      meshRef.current.geometry?.dispose();
      meshRef.current.material?.dispose();
      meshRef.current = null;
    }

    let disposed = false;

    const fitToView = (geometry) => {
      geometry.computeBoundingBox();
      const bbox = geometry.boundingBox || new THREE.Box3();
      const size = bbox.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const center = bbox.getCenter(new THREE.Vector3());

      geometry.translate(-center.x, -center.y, -center.z);
      boundsRef.current = { size, maxDim };

      const fov = (camera.fov * Math.PI) / 180;
      const fitHeightDistance = maxDim / (2 * Math.tan(fov / 2));
      const fitWidthDistance = fitHeightDistance / (camera.aspect || 1);
      const distance = 1.4 * Math.max(fitHeightDistance, fitWidthDistance);
      camera.position.set(distance, distance * 0.75, distance);
      controls.target.set(0, 0, 0);
      controls.update();
    };

    loader.load(
      activeUrl,
      (geometry) => {
        if (disposed) return;
        geometry = geometry.clone();
        geometry.scale(scale, scale, scale);
        fitToView(geometry);

        const material = new THREE.MeshStandardMaterial({
          color: 0x7bdcff,
          metalness: 0.18,
          roughness: 0.42,
          side: THREE.DoubleSide,
          wireframe: wireframeRef.current,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        meshRef.current = mesh;
        setLoading(false);
      },
      undefined,
      (err) => {
        if (disposed) return;
        console.warn("stl viewer load failed", err);
        setError("Failed to load STL");
        setLoading(false);
      }
    );

    return () => {
      disposed = true;
    };
  }, [activeUrl, scale]);

  const toggleWireframe = () => {
    setWireframe((prev) => {
      const next = !prev;
      wireframeRef.current = next;
      if (meshRef.current) {
        meshRef.current.material.wireframe = next;
        meshRef.current.material.needsUpdate = true;
      }
      return next;
    });
  };

  const resetView = () => {
    const ctx = contextRef.current;
    if (!ctx || !meshRef.current || !boundsRef.current) return;
    const { camera, controls } = ctx;
    const { maxDim } = boundsRef.current;
    const fov = (camera.fov * Math.PI) / 180;
    const fitHeightDistance = maxDim / (2 * Math.tan(fov / 2));
    const fitWidthDistance = fitHeightDistance / (camera.aspect || 1);
    const distance = 1.4 * Math.max(fitHeightDistance, fitWidthDistance);
    camera.position.set(distance, distance * 0.75, distance);
    controls.target.set(0, 0, 0);
    controls.update();
  };

  const handleScreenshot = () => {
    const ctx = contextRef.current;
    if (!ctx || !ctx.renderer) return;
    const dataUrl = ctx.renderer.domElement.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `stl-viewer-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="surface-stl-viewer">
      <div className="surface-stl-toolbar">
        <div className="surface-stl-select">
          <label className="surface-k" htmlFor="stl-select">STL to view</label>
          <select
            id="stl-select"
            value={activeKey || ""}
            onChange={(e) => setActiveKey(e.target.value)}
            disabled={options.length === 0}
          >
            {options.map((opt) => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
            {options.length === 0 && <option value="">No STL yet</option>}
          </select>
        </div>
        <div className="surface-stl-actions">
          <button
            type="button"
            className="surface-button surface-button-ghost"
            onClick={() => activeUrl && window.open(activeUrl, "_blank")}
            disabled={!activeUrl}
          >
            <Download size={14} /> Open STL
          </button>
          <button
            type="button"
            className="surface-button surface-button-ghost"
            onClick={resetView}
            disabled={!options.length}
          >
            <RefreshCw size={14} /> Reset view
          </button>
          <button
            type="button"
            className="surface-button surface-button-ghost"
            onClick={toggleWireframe}
            disabled={!activeUrl || !ready}
          >
            <Layers size={14} /> {wireframe ? "Wireframe" : "Solid"}
          </button>
          <div className="surface-stl-scale">
            <label htmlFor="stl-scale">Scale</label>
            <select
              id="stl-scale"
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              disabled={!activeUrl}
            >
              <option value={1}>1x (mm)</option>
              <option value={0.1}>0.1x</option>
              <option value={10}>10x</option>
            </select>
          </div>
          <button
            type="button"
            className="surface-button surface-button-ghost"
            onClick={handleScreenshot}
            disabled={!ready}
          >
            <Camera size={14} /> Screenshot
          </button>
        </div>
      </div>

      <div className="surface-stl-canvas" ref={mountRef} style={{ minHeight: `${height}px` }}>
        {!activeUrl && <div className="surface-stl-placeholder">STL Unavailable. Select a finished job.</div>}
        {loading && (
          <div className="surface-stl-overlay">
            <Loader2 className="spin" size={18} />
            <span>Loading mesh…</span>
          </div>
        )}
        {moduleLoading && !loading && (
          <div className="surface-stl-overlay">
            <Sparkles size={16} />
            <span>Loading 3D…</span>
          </div>
        )}
        {error && (
          <div className="surface-alert surface-alert-warn surface-stl-inline">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default StlViewer;
