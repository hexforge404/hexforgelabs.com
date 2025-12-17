export async function engineHealth() {
  const r = await fetch("/api/media/health");
  if (!r.ok) throw new Error(`health failed: ${r.status}`);
  return r.json();
}
export async function queueImage(payload) {
  const r = await fetch("/api/media/queue/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return r.json();
}
export async function queueVoice(payload) {
  const r = await fetch("/api/media/queue/voice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return r.json();
}
export async function queue3DJob(payload) {
  const r = await fetch("/api/media/queue/3d", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return r.json();
}
export async function vectorizeForLaser(payload) {
  const r = await fetch("/api/media/queue/laser/vectorize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return r.json();
}
