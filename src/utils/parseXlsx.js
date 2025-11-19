// src/utils/parseXlsx.js
import * as XLSX from "xlsx";
const randomId = () => Math.random().toString(36).slice(2, 9);

// Flexible helper for field resolution
const pickField = (row, keys) => {
  for (const key of keys) {
    if (row[key] != null && String(row[key]).trim() !== "") {
      return row[key];
    }
  }
  return "";
};

// Very flexible AV resolver
const resolveAVField = (row) => {
  if (!row) return "";

  // 1. Common explicit names
  const explicit = [
    "avStatus",
    "AVStatus",
    "AV Status",
    "AV_STATUS",
    "antivirus",
    "Antivirus",
    "antivirus_name",
    "av",
    "AV",
  ];

  for (const k of explicit) {
    if (row[k] != null && String(row[k]).trim() !== "") return row[k];
  }

  // 2. Flexible fuzzy search: any header containing "av" / "antivirus"
  const found = Object.keys(row).find((key) => {
    if (!key) return false;
    const lk = key.toLowerCase();
    return lk.includes("av") || lk.includes("antivirus") || lk.includes("avstatus");
  });

  if (found && row[found] != null && String(row[found]).trim() !== "") {
    return row[found];
  }

  return "";
};

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

        const normalized = json.map((r) => {
          // Normalize all keys once (lowercase map)
          const lower = {};
          for (const key of Object.keys(r)) {
            lower[key.toLowerCase()] = r[key];
          }

          return {
            id: randomId(),

            // IP
            ip: pickField(lower, ["ip", "ipaddress", "ipv4", "hostip"]),

            // Hostname
            hostname: pickField(lower, ["hostname", "host", "device", "computername"]),

            // Domain / Workgroup
            domainStatus: pickField(lower, ["domainstatus", "domain", "workgroup", "groups"]),

            // OS
            os: pickField(lower, ["osversion", "os", "windowsversion", "operatingsystem"]),

            // Timestamp
            timestamp: pickField(lower, ["timestamp", "time", "scantime", "scan_time", "date", "datetime"]),

            // Raw AV field
            avRaw: resolveAVField(r),
          };
        });

        resolve(normalized);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
