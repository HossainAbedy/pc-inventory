import React from "react";
import DownloadIcon from '@mui/icons-material/Download';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';  // Only if used (e.g., in UploadSection)
import { Typography, Paper, Box, Button, FormControl, InputLabel, Select, MenuItem, TextField, CircularProgress } from "@mui/material";
import { parseXlsxFile } from "../utils/parseXlsx";
import { mergeRowSets } from "../utils/mergeRows";

export default function UploadSection({ mergeStrategy, setMergeStrategy, groupSize, setGroupSize, rowsLength, isStarting, handleStartScheduler, applyRows, setSnack }) {
  const readExcelFile = async (file) => {
    try {
      const normalized = await parseXlsxFile(file);
      applyRows(normalized);
      setSnack({ open: true, message: `Loaded ${normalized.length} rows from ${file.name}`, severity: "success" });
    } catch (err) {
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
      setSnack({ open: true, message: `Merged ${files.length} files → ${merged.length} rows (${mergeStrategy})`, severity: "success" });
    } catch (err) {
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
        <Button variant="contained" component="label" startIcon={<DownloadIcon />} sx={{ ...btnBase, background: "linear-gradient(90deg,#667eea 0%,#764ba2 100%)" }}>
          Upload Excel(s)
          <input hidden accept=".xlsx,.xls" type="file" multiple onChange={onFilesChange} />
        </Button>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="merge-strategy-label">Merge strategy</InputLabel>
          <Select labelId="merge-strategy-label" value={mergeStrategy} label="Merge strategy" onChange={(e) => setMergeStrategy(e.target.value)}>
            <MenuItem value="latest">Latest timestamp (default)</MenuItem>
            <MenuItem value="first">First seen (file order)</MenuItem>
            <MenuItem value="keep_all">Keep all rows (no dedupe)</MenuItem>
          </Select>
        </FormControl>
        <TextField select label="Group by" value={groupSize} SelectProps={{ native: true }} onChange={(e) => setGroupSize(Number(e.target.value))} size="small" sx={{ width: 160 }}>
          <option value={24}>/24 (first 3 octets)</option>
          <option value={16}>/16 (first 2 octets)</option>
        </TextField>
        <Box sx={{ ml: "auto", display: "flex", gap: 1, alignItems: "center" }}>
          <Box sx={{ textAlign: "right" }}>
            <Typography variant="subtitle2">Detected rows</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>{rowsLength}</Typography>
          </Box>
          <Button
            variant="contained"
            onClick={handleStartScheduler}
            startIcon={<PlayArrowIcon />}
            disabled={isStarting}
            aria-label="Start scheduler"
            aria-busy={isStarting ? "true" : "false"}
            sx={{
              ...btnBase,
              boxShadow: "0 8px 20px rgba(56,142,60,0.12)",
              background: "linear-gradient(90deg,#66BB6A 0%,#2E7D32 100%)",
              color: "common.white",
              "&:hover": { boxShadow: "0 10px 26px rgba(46,125,50,0.18)" },
            }}
          >
            {isStarting && <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />}
            Start
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}