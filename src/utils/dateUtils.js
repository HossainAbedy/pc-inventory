// src/utils/dateUtils.js
export function formatDate(ts) {
  try {
    const d = new Date(ts);
    if (isNaN(d)) return ts || "—";
    return d.toLocaleString();
  } catch (e) {
    return ts || "—";
  }
}