const randomId = () => Math.random().toString(36).slice(2, 9);

function extractAV(r) {
  if (!r) return null;
  const candidates = [
    r.AVStatus, r.avStatus, r.av, r.antivirus, r.AV, r['AV Status'], r['Antivirus']
  ];
  for (const c of candidates) {
    if (c !== undefined && c !== null && String(c).trim() !== "") return String(c).trim();
  }
  return null;
}

function normalizeRow(row, source = "") {
  const av = extractAV(row);
  // normalize common timestamp key names too
  const ts = row.timestamp || row.Timestamp || row.time || row.Time || null;
  return {
    ...row,
    AVStatus: av,
    timestamp: ts,
    source: source || "",
  };
}

export function mergeRowSets(listOfRowArrays, fileNames = [], strategy = "latest") {
  if (strategy === "keep_all") {
    const all = [];
    listOfRowArrays.forEach((arr, idx) => {
      arr.forEach((r) => all.push({ ...normalizeRow(r, fileNames[idx] || ""), id: randomId() }));
    });
    return all;
  }

  const map = new Map();
  for (let arrIndex = 0; arrIndex < listOfRowArrays.length; arrIndex++) {
    const rows = listOfRowArrays[arrIndex] || [];
    const source = fileNames[arrIndex] || "";
    for (const r of rows) {
      const ip = (r.ip || r.IP || "").toString().trim();
      if (!ip) continue;

      const norm = normalizeRow(r, source);
      const existing = map.get(ip);
      if (!existing) {
        map.set(ip, { ...norm });
        continue;
      }

      if (strategy === "first") continue;

      const a = existing.timestamp ? Date.parse(existing.timestamp) : NaN;
      const b = norm.timestamp ? Date.parse(norm.timestamp) : NaN;

      // Decide whether to use incoming row (norm) or keep existing
      let useIncoming = false;
      if (!isNaN(b) && (isNaN(a) || b >= a)) {
        useIncoming = true;
      } else if (isNaN(a) && isNaN(b)) {
        // neither has valid timestamp: keep existing (no change)
        useIncoming = false;
      }

      if (useIncoming) {
        // Merge but do not blindly overwrite non-empty existing fields with empty incoming fields
        const merged = { ...existing };
        for (const [k, v] of Object.entries(norm)) {
          if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) continue;
          merged[k] = v;
        }
        // ensure AVStatus is normalized (prefer AVStatus from merged)
        merged.AVStatus = merged.AVStatus || extractAV(existing) || null;
        map.set(ip, merged);
      } else {
        // incoming is older or has no timestamp; but it may contain AV when existing doesn't -> preserve
        if (!existing.AVStatus) {
          const avFromIncoming = extractAV(norm);
          if (avFromIncoming) {
            existing.AVStatus = avFromIncoming;
            map.set(ip, existing);
          }
        }
      }
    }
  }

  return Array.from(map.values()).map((r) => ({ ...r, id: randomId() }));
}
