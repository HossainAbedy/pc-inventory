// src/utils/csvUtils.js
export function escapeCSV(value) {
  if (value == null) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * downloadCSVForBlock(blockKey, blocksOrRows, options = {})
 *
 * - blocksOrRows: either an object mapping blockKey -> rows[] OR a direct rows[] array
 * - options: { includeAV: boolean, fileName?: string, setSnack?: fn }
 */
export function downloadCSVForBlock(blockKey, blocksOrRows = [], options = {}) {
  const { includeAV = false, fileName, setSnack } = options || {};
  let rows = [];

  if (Array.isArray(blocksOrRows)) {
    rows = blocksOrRows;
  } else if (blocksOrRows && typeof blocksOrRows === "object") {
    rows = blocksOrRows[blockKey] || [];
  }

  const header = ["IP", "Hostname", "DomainStatus", "OSVersion", "Timestamp", "Source"];
  if (includeAV) header.push("AVStatus");

  const lines = [header.join(",")];
  rows.forEach((r) => {
    const cells = [
      escapeCSV(r.ip || ""),
      escapeCSV(r.hostname || ""),
      escapeCSV(r.domainStatus || ""),
      escapeCSV(r.os || ""),
      escapeCSV(r.timestamp || ""),
      escapeCSV(r.source || ""),
    ];
    if (includeAV) cells.push(escapeCSV(r.avRaw ?? r.avStatus ?? r.AVStatus ?? ""));
    lines.push(cells.join(","));
  });

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || `${(blockKey || "export").toString().replace(/\./g, "-")}_export.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  try {
    if (typeof setSnack === "function") {
      setSnack({ open: true, message: `Exported ${rows.length} rows for ${blockKey}`, severity: "success" });
    }
  } catch (e) {
    /* ignore */
  }
}
