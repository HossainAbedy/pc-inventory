import * as XLSX from "xlsx";
const randomId = () => Math.random().toString(36).slice(2, 9);

export function parseXlsxFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheet];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        const normalized = json.map((r) => ({
          ip: String(r.IP || r.Ip || r.ip || r["IP"] || "").trim(),
          hostname: r.Hostname || r.hostname || r.Host || "",
          domainStatus: r.DomainStatus || r.domainStatus || r.Domain || "",
          os: r.OSVersion || r.os || r["OSVersion"] || "",
          timestamp: r.Timestamp || r.timestamp || r.Time || "",
          id: randomId(),
        }));
        resolve(normalized);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}