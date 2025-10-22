// src/utils/csvUtils.js
export function escapeCSV(value) {
  if (value == null) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function downloadCSVForBlock(blockKey, blocks, setSnack) {
  const data = blocks[blockKey] || [];
  const header = ["IP", "Hostname", "DomainStatus", "OSVersion", "Timestamp", "Source"];
  const lines = [header.join(",")];
  data.forEach((r) => {
    const line = [
      escapeCSV(r.ip),
      escapeCSV(r.hostname),
      escapeCSV(r.domainStatus),
      escapeCSV(r.os),
      escapeCSV(r.timestamp),
      escapeCSV(r.source || ""),
    ].join(",");
    lines.push(line);
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${blockKey.replace(/\./g, "-")}_export.csv`;
  a.click();
  URL.revokeObjectURL(url);
  setSnack({ open: true, message: `Exported ${data.length} rows for ${blockKey}`, severity: "success" });
}