// src/utils/mergeRows.js
const randomId = () => Math.random().toString(36).slice(2, 9);

export function mergeRowSets(listOfRowArrays, fileNames = [], strategy = "latest") {
  if (strategy === "keep_all") {
    const all = [];
    listOfRowArrays.forEach((arr, idx) => {
      arr.forEach((r) => all.push({ ...r, source: fileNames[idx] || "", id: randomId() }));
    });
    return all;
  }

  const map = new Map();
  for (let arrIndex = 0; arrIndex < listOfRowArrays.length; arrIndex++) {
    const rows = listOfRowArrays[arrIndex];
    for (const r of rows) {
      const ip = (r.ip || "").trim();
      if (!ip) continue;
      const existing = map.get(ip);
      if (!existing) {
        map.set(ip, { ...r, source: fileNames[arrIndex] || "" });
        continue;
      }

      if (strategy === "first") continue;

      const a = existing.timestamp ? Date.parse(existing.timestamp) : NaN;
      const b = r.timestamp ? Date.parse(r.timestamp) : NaN;
      if (!isNaN(b) && (isNaN(a) || b >= a)) {
        map.set(ip, { ...r, source: fileNames[arrIndex] || "" });
      }
    }
  }

  return Array.from(map.values()).map((r) => ({ ...r, id: randomId() }));
}