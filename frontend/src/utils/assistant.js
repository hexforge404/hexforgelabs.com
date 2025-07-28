export const checkPing = async () => {
  try {
    const res = await fetch('/assistant/health');
    const data = await res.json();
    return res.ok && data.status === 'ok';
  } catch {
    return false;
  }
};