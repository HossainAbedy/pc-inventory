// src/utils/ipUtils.js
export function getBlockKeyFromIp(ip, size) {
  try {
    const parts = ip.split(".");
    if (parts.length !== 4) return ip;
    if (size === 24) return parts.slice(0, 3).join(".");
    if (size === 16) return parts.slice(0, 2).join(".");
    return parts.slice(0, 3).join(".");
  } catch (e) {
    return ip;
  }
}

export function groupByBlock(list, size) {
  const g = {};
  (list || []).forEach((r) => {
    const key = getBlockKeyFromIp(r.ip || "", size);
    if (!g[key]) g[key] = [];
    g[key].push(r);
  });
  return g;
}