// src/components/UploadSection.jsx
import React from "react";
import DownloadIcon from "@mui/icons-material/Download";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import {
  Typography,
  Paper,
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import * as XLSX from "xlsx";
import { parseXlsxFile } from "../utils/parseXlsx";
import { mergeRowSets } from "../utils/mergeRows";

/**
 * UploadSection
 *
 * Props:
 * - mergeStrategy, setMergeStrategy
 * - groupSize, setGroupSize
 * - rowsLength, rows (array)
 * - isStarting, handleStartScheduler
 * - applyRows (function that accepts normalized rows array)
 * - setSnack (function to show snack/alert)
 */
export default function UploadSection({
  mergeStrategy,
  setMergeStrategy,
  groupSize,
  setGroupSize,
  rowsLength,
  rows = [], // <-- pass current rows from parent
  isStarting,
  handleStartScheduler,
  applyRows,
  setSnack,
}) {
  const readExcelFile = async (file) => {
    try {
      const normalized = await parseXlsxFile(file);
      applyRows(normalized);
      setSnack({ open: true, message: `Loaded ${normalized.length} rows from ${file.name}`, severity: "success" });
    } catch (err) {
      console.error("readExcelFile", err);
      setSnack({ open: true, message: `Error reading ${file.name}: ${err.message || err}`, severity: "error" });
    }
  };

  const handleMultiFiles = async (filesList) => {
    const files = Array.from(filesList).filter(Boolean);
    if (!files.length) return;
    try {
      const parsePromises = files.map(parseXlsxFile);
      const allArrays = await Promise.all(parsePromises);
      const merged = mergeRowSets(allArrays, files.map((f) => f.name), mergeStrategy);
      applyRows(merged);
      setSnack({
        open: true,
        message: `Merged ${files.length} files → ${merged.length} rows (${mergeStrategy})`,
        severity: "success",
      });
    } catch (err) {
      console.error("handleMultiFiles", err);
      setSnack({ open: true, message: `Error merging files: ${err.message || err}`, severity: "error" });
    }
  };

  const onFilesChange = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (files.length === 1) readExcelFile(files[0]);
    else handleMultiFiles(files);
    e.target.value = "";
  };

  // ---- Export merged excel helper ----
  function exportMergedExcel({ filename = "pc-inventory-merged.xlsx", dedupe = mergeStrategy } = {}) {
    try {
      const allRows = Array.isArray(rows) ? rows.slice() : [];

      if (!allRows.length) {
        setSnack({ open: true, message: "No rows to export. Upload/merge some scanned files first.", severity: "warning" });
        return;
      }

      let exportRows = allRows;

      // dedupe: keep_all | first | latest
      if (dedupe && dedupe !== "keep_all") {
        const map = new Map();
        for (const r of exportRows) {
          const ip = (r.ip || "").trim();
          if (!ip) {
            // keep rows without IP with unique key to avoid collisions
            const key = `NOIP_${Math.random().toString(36).slice(2, 9)}`;
            map.set(key, { ...r });
            continue;
          }
          const existing = map.get(ip);
          if (!existing) {
            map.set(ip, { ...r });
            continue;
          }
          if (dedupe === "first") {
            // keep existing (first), do nothing
          } else if (dedupe === "latest") {
            const a = existing.timestamp ? Date.parse(existing.timestamp) : NaN;
            const b = r.timestamp ? Date.parse(r.timestamp) : NaN;
            if (!isNaN(b) && (isNaN(a) || b >= a)) {
              map.set(ip, { ...r });
            }
          }
        }
        exportRows = Array.from(map.values());
      }

      // Normalize to friendly column headings
      const sheetData = exportRows.map((r) => ({
        IP: r.ip || "",
        Hostname: r.hostname || "",
        DomainStatus: r.domainStatus || "",
        OSVersion: r.os || "",
        Timestamp: r.timestamp || "",
        Source: r.source || "",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(wb, ws, "Merged");
      XLSX.writeFile(wb, filename);

      setSnack({ open: true, message: `Saved ${sheetData.length} rows → ${filename}`, severity: "success" });
    } catch (err) {
      console.error("exportMergedExcel", err);
      setSnack({ open: true, message: `Export failed: ${err.message || err}`, severity: "error" });
    }
  }

  const btnBase = {
    px: 2,
    py: 1,
    borderRadius: 1,
    textTransform: "none",
    fontWeight: 700,
  };

  return (
    <Paper sx={{ p: 2, mb: 3, borderRadius: 3, backdropFilter: "saturate(120%) blur(6px)" }} elevation={2}>
      <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
        <Button
          variant="contained"
          component="label"
          startIcon={<DownloadIcon />}
          sx={{ ...btnBase, 
                borderRadius: 2,
                mr: 1,
                background: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)" }}
        >
          Import 
          <input hidden accept=".xlsx,.xls" type="file" multiple onChange={onFilesChange} />
        </Button>

        <Tooltip title="Export merged scanned results (uses current merge strategy)">
            <Button
            //   variant="outlined"
              variant="contained"
              onClick={() => exportMergedExcel({ filename: "pc-inventory-merged.xlsx", dedupe: mergeStrategy })}
              startIcon={<DownloadIcon />}
              sx={{
                ...btnBase,
                borderRadius: 2,
                mr: 1,
                background: "linear-gradient(135deg,#f953c6 0%,#b91d73 100%)"
              }}
            >
              Export 
            </Button>
        </Tooltip>

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="merge-strategy-label">Merge strategy</InputLabel>
          <Select
            labelId="merge-strategy-label"
            value={mergeStrategy}
            label="Merge strategy"
            onChange={(e) => setMergeStrategy(e.target.value)}
          >
            <MenuItem value="latest">Latest timestamp (default)</MenuItem>
            <MenuItem value="first">First seen (file order)</MenuItem>
            <MenuItem value="keep_all">Keep all rows (no dedupe)</MenuItem>
          </Select>
        </FormControl>

        <TextField
          select
          label="Group by"
          value={groupSize}
          SelectProps={{ native: true }}
          onChange={(e) => setGroupSize(Number(e.target.value))}
          size="small"
          sx={{ width: 160 }}
        >
          <option value={24}>/24 (first 3 octets)</option>
          <option value={16}>/16 (first 2 octets)</option>
        </TextField>

        <Box sx={{ ml: "auto", display: "flex", gap: 1, alignItems: "center" }}>
          <Box sx={{ textAlign: "right" }}>
            <Typography variant="subtitle2">Detected rows</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {rowsLength}
            </Typography>
          </Box>

          <Button
            variant="contained"
            onClick={handleStartScheduler}
            startIcon={<PlayArrowIcon />}
            disabled={isStarting}
            aria-label="Start scanner"
            aria-busy={isStarting ? "true" : "false"}
            sx={{
              ...btnBase,
              borderRadius: 2,
              mr: 1,
              boxShadow: "0 8px 20px rgba(56,142,60,0.12)",
              background: "linear-gradient(90deg,#66BB6A 0%,#2E7D32 100%)",
              color: "common.white",
              "&:hover": { boxShadow: "0 10px 26px rgba(46,125,50,0.18)" },
            }}
          >
            {isStarting && <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />}
            Scan
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
