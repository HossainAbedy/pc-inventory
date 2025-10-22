// src/PCInventoryVisualizer.jsx
import React, { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import BRANCHES from "./data/branches";

import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CssBaseline,
  ThemeProvider,
  createTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from "@mui/material";

import DownloadIcon from "@mui/icons-material/Download";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RefreshIcon from "@mui/icons-material/Refresh";
import ClearIcon from "@mui/icons-material/Clear";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

// status icons
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";

// ===== Branch mapping load & persistence =====
const DEFAULT_BRANCHES = BRANCHES || {};

const loadStoredBranches = () => {
  try {
    const s = localStorage.getItem("pcinv_branch_map");
    return s ? JSON.parse(s) : {};
  } catch (e) {
    return {};
  }
};

const saveStoredBranches = (obj) => {
  try {
    localStorage.setItem("pcinv_branch_map", JSON.stringify(obj || {}));
  } catch (e) {
    // ignore
  }
};

const STORED_BRANCHES = loadStoredBranches();

// Merge stored overrides over defaults at runtime
const initialBranchMap = { ...DEFAULT_BRANCHES, ...STORED_BRANCHES };

// ===== Theme & design tokens =====
const theme = createTheme({
  palette: {
    mode: "light",
  },
  typography: {
    fontFamily: `Inter, Roboto, Helvetica, Arial, sans-serif`,
    button: { textTransform: "none", fontWeight: 700 },
  },
  shape: { borderRadius: 10 },
});

// 12 modern gradients (reused for OS cards)
const GRADIENTS = [
  "linear-gradient(135deg,#667eea 0%,#764ba2 100%)",
  "linear-gradient(135deg,#43cea2 0%,#185a9d 100%)",
  "linear-gradient(135deg,#ff9966 0%,#ff5e62 100%)",
  "linear-gradient(135deg,#56ccf2 0%,#2f80ed 100%)",
  "linear-gradient(135deg,#f7971e 0%,#ffd200 100%)",
  "linear-gradient(135deg,#00c6ff 0%,#0072ff 100%)",
  "linear-gradient(135deg,#8E2DE2 0%,#4A00E0 100%)",
  "linear-gradient(135deg,#00b09b 0%,#96c93d 100%)",
  "linear-gradient(135deg,#ff416c 0%,#ff4b2b 100%)",
  "linear-gradient(135deg,#11998e 0%,#38ef7d 100%)",
  "linear-gradient(135deg,#8360c3 0%,#2ebf91 100%)",
  "linear-gradient(135deg,#f953c6 0%,#b91d73 100%)",
];

// Expanded color palette for charts
const CHART_COLORS = [
  "#1976d2",
  "#2e7d32",
  "#ed6c02",
  "#d32f2f",
  "#6a1b9a",
  "#0288d1",
  "#8e24aa",
  "#f57c00",
  "#00bfa5",
  "#c2185b",
  "#7c4dff",
  "#388e3c",
];

const randomId = () => Math.random().toString(36).slice(2, 9);

// CSV escaping: quote if contains double-quote, comma or newline
function escapeCSV(value) {
  if (value == null) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// Parse a single XLSX file into normalized rows
function parseXlsxFile(file) {
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
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

// Merge strategies: 'latest' | 'first' | 'keep_all'
function mergeRowSets(listOfRowArrays, fileNames = [], strategy = "latest") {
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

function getBlockKeyFromIp(ip, size) {
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

function groupByBlock(list, size) {
  const g = {};
  (list || []).forEach((r) => {
    const key = getBlockKeyFromIp(r.ip || "", size);
    if (!g[key]) g[key] = [];
    g[key].push(r);
  });
  return g;
}

function formatDate(ts) {
  try {
    const d = new Date(ts);
    if (isNaN(d)) return ts || "—";
    return d.toLocaleString();
  } catch (e) {
    return ts || "—";
  }
}

export default function PCInventoryVisualizer() {
  const [rows, setRows] = useState([]);
  const [groupSize, setGroupSize] = useState(24);
  const [blocks, setBlocks] = useState({});
  const [branchMap, setBranchMap] = useState(initialBranchMap);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "info" });
  const [mergeStrategy, setMergeStrategy] = useState("latest");

  // modal state for OS details
  const [selectedOS, setSelectedOS] = useState(null);

  useEffect(() => {
    // keep branch map synced to storage
    saveStoredBranches(Object.fromEntries(Object.entries(branchMap).filter(([k, v]) => DEFAULT_BRANCHES[k] !== v)));
  }, [branchMap]);

  const btnBase = {
    px: 2,
    py: 1,
    borderRadius: 1,
    textTransform: "none",
    fontWeight: 700,
  };

  // ----- New helpers: analyze branch and produce icons -----
  // analyzeBranchItems: returns totals, domainJoinedCount, win7Count
  const analyzeBranchItems = (items = []) => {
    const totals = (items || []).length;
    let domainJoinedCount = 0;
    let win7Count = 0;

    const win7Regex = /\b(windows[\s-]*7|win7|\b7\b)/i;
    const domainRegex = /domain[:\s]/i; // look for "Domain:" or similar

    (items || []).forEach((r) => {
      if (String(r.domainStatus || "").match(domainRegex)) domainJoinedCount += 1;
      if (String(r.os || "").match(win7Regex)) win7Count += 1;
    });

    return { totals, domainJoinedCount, win7Count };
  };

  // getDomainStatusIcon: returns an icon + tooltip according to percentage rules
  const getDomainStatusIcon = (domainJoinedCount, totalCount) => {
    const pct = !totalCount ? 0 : Math.round((domainJoinedCount * 100) / totalCount);
    const title = `${domainJoinedCount}/${totalCount} domain-joined (${pct}%)`;

    if (totalCount === 0) {
      return (
        <Tooltip title="No hosts">
          <InfoOutlinedIcon sx={{ color: "#9e9e9e" }} fontSize="small" />
        </Tooltip>
      );
    }
    if (pct === 100) {
      return (
        <Tooltip title={title}>
          <CheckCircleIcon sx={{ color: "#2e7d32" }} fontSize="small" />
        </Tooltip>
      );
    }
    if (pct >= 80) {
      return (
        <Tooltip title={title}>
          <CheckCircleIcon sx={{ color: "#1976d2" }} fontSize="small" />
        </Tooltip>
      );
    }
    if (pct >= 66) {
      return (
        <Tooltip title={title}>
          <InfoOutlinedIcon sx={{ color: "#1976d2" }} fontSize="small" />
        </Tooltip>
      );
    }
    if (pct >= 50) {
      return (
        <Tooltip title={title}>
          <WarningAmberIcon sx={{ color: "#ffb300" }} fontSize="small" />
        </Tooltip>
      );
    }
    if (pct >= 20) {
      return (
        <Tooltip title={title}>
          <ErrorOutlineIcon sx={{ color: "#e53935" }} fontSize="small" />
        </Tooltip>
      );
    }
    // pct < 20
    return (
      <Tooltip title={title}>
        <CloseIcon sx={{ color: "#b71c1c" }} fontSize="small" />
      </Tooltip>
    );
  };

  // getWin7StatusIcon: returns icon + tooltip according to Win7 count rules
  const getWin7StatusIcon = (win7Count) => {
    const title = `Windows 7 hosts: ${win7Count}`;

    if (!win7Count) {
      return (
        <Tooltip title={title}>
          <CheckCircleIcon sx={{ color: "#2e7d32" }} fontSize="small" />
        </Tooltip>
      );
    }
    if (win7Count === 1) {
      return (
        <Tooltip title={title}>
          <CheckCircleIcon sx={{ color: "#1976d2" }} fontSize="small" />
        </Tooltip>
      );
    }
    if (win7Count >= 2 && win7Count <= 3) {
      return (
        <Tooltip title={title}>
          <InfoOutlinedIcon sx={{ color: "#1976d2" }} fontSize="small" />
        </Tooltip>
      );
    }
    if (win7Count >= 4 && win7Count <= 5) {
      return (
        <Tooltip title={title}>
          <WarningAmberIcon sx={{ color: "#ffb300" }} fontSize="small" />
        </Tooltip>
      );
    }
    if (win7Count >= 6 && win7Count <= 8) {
      return (
        <Tooltip title={title}>
          <ErrorOutlineIcon sx={{ color: "#e53935" }} fontSize="small" />
        </Tooltip>
      );
    }
    // > 8
    return (
      <Tooltip title={title}>
        <CloseIcon sx={{ color: "#b71c1c" }} fontSize="small" />
      </Tooltip>
    );
  };
  // ---------------------------------------------------------

  async function readExcelFile(file) {
    try {
      const normalized = await parseXlsxFile(file);
      applyRows(normalized, [file.name]);
      setSnack({ open: true, message: `Loaded ${normalized.length} rows from ${file.name}`, severity: "success" });
    } catch (err) {
      console.error(err);
      setSnack({ open: true, message: `Error reading ${file.name}: ${err.message || err}`, severity: "error" });
    }
  }

  async function handleMultiFiles(filesList) {
    const files = Array.from(filesList || []).filter(Boolean);
    if (!files.length) return;
    try {
      const parsePromises = files.map((f) => parseXlsxFile(f));
      const allArrays = await Promise.all(parsePromises);
      const merged = mergeRowSets(allArrays, files.map((f) => f.name), mergeStrategy);
      applyRows(merged, files.map((f) => f.name));
      setSnack({ open: true, message: `Merged ${files.length} files → ${merged.length} rows (${mergeStrategy})`, severity: "success" });
    } catch (err) {
      console.error("Merge error", err);
      setSnack({ open: true, message: `Error merging files: ${err.message || err}`, severity: "error" });
    }
  }

  function applyRows(normalizedRows, sourceFiles = []) {
    const grouped = groupByBlock(normalizedRows, groupSize);
    setRows(normalizedRows);
    setBlocks(grouped);
    setSelectedBlock(Object.keys(grouped)[0] || null);

    const detected = Object.keys(grouped);
    const newMap = { ...branchMap };
    detected.forEach((k) => {
      if (!newMap[k]) {
        if (DEFAULT_BRANCHES[k]) newMap[k] = DEFAULT_BRANCHES[k];
        else {
          const twoOct = k.split(".").slice(0, 2).join(".");
          if (DEFAULT_BRANCHES[twoOct]) newMap[k] = DEFAULT_BRANCHES[twoOct];
        }
      }
    });

    setBranchMap(newMap);
  }

  function handleGroupSizeChange(e) {
    const s = Number(e.target.value);
    setGroupSize(s);
    const grouped = groupByBlock(rows, s);
    setBlocks(grouped);
    setSelectedBlock(Object.keys(grouped)[0] || null);
  }

  function updateBranchName(blockKey, name) {
    const next = { ...branchMap, [blockKey]: name };
    setBranchMap(next);
  }

  function downloadCSVForBlock(blockKey) {
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

  const blocksSummary = useMemo(() => {
    const summary = Object.entries(blocks).map(([key, items]) => {
      const osCount = {};
      const domainCount = {};
      let latest = null;
      items.forEach((it) => {
        osCount[it.os] = (osCount[it.os] || 0) + 1;
        domainCount[it.domainStatus] = (domainCount[it.domainStatus] || 0) + 1;
        if (!latest || new Date(it.timestamp) > new Date(latest)) latest = it.timestamp;
      });
      return {
        key,
        items,
        count: items.length,
        osCount,
        domainCount,
        latest,
        branchName: branchMap[key] || "",
      };
    });
    summary.sort((a, b) => a.key.localeCompare(b.key));
    return summary;
  }, [blocks, branchMap]);

  const globalSummary = useMemo(() => {
    const total = rows.length;
    let domainJoined = 0;
    const osCounter = {};
    rows.forEach((r) => {
      if (String(r.domainStatus || "").toLowerCase().includes("domain:")) domainJoined += 1;
      osCounter[r.os] = (osCounter[r.os] || 0) + 1;
    });
    const workgroup = total - domainJoined;
    return { total, domainJoined, workgroup, uniqueOS: Object.keys(osCounter).length, osCounter };
  }, [rows]);

  const osBarData = useMemo(() => {
    const arr = Object.entries(globalSummary.osCounter || {}).map(([k, v]) => ({ os: k || "Unknown", count: v }));
    arr.sort((a, b) => b.count - a.count);
    return arr.slice(0, 10);
  }, [globalSummary]);

  function handleStartScheduler() {
    setIsStarting(true);
    setSnack({ open: true, message: "Launching scan...", severity: "info" });

    try {
      // Trigger the registered protocol
      window.location.href = "myapp://run?script=scanrange";

      // Give it a short delay before resetting button state
      setTimeout(() => {
        setIsStarting(false);
        setSnack({ open: true, message: "Scan command sent to launcher", severity: "success" });
      }, 1000);
    } catch (err) {
      console.error(err);
      setIsStarting(false);
      setSnack({ open: true, message: `Failed to start scan: ${err.message || err}`, severity: "error" });
    }
  }

  const onFilesChange = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (files.length === 1) readExcelFile(files[0]);
    else handleMultiFiles(files);
    e.target.value = "";
  };

  // open modal for OS
  const openOsModal = (os) => {
    setSelectedOS(os);
  };

  // close modal
  const closeOsModal = () => setSelectedOS(null);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ p: { xs: 2, md: 3 }, fontFamily: theme.typography.fontFamily }}>
        <Typography
          variant="h5"
          gutterBottom
          sx={{
            fontWeight: 800,
            fontFamily: "Inter, Roboto, Helvetica, Arial, sans-serif",
            background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: 1,
            fontSize: { xs: "1.4rem", md: "1.75rem" },
          }}
        >
          PC Inventory Visualizer
        </Typography>

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

            <TextField select label="Group by" value={groupSize} SelectProps={{ native: true }} onChange={handleGroupSizeChange} size="small" sx={{ width: 160 }}>
              <option value={24}>/24 (first 3 octets)</option>
              <option value={16}>/16 (first 2 octets)</option>
            </TextField>

            <Box sx={{ ml: "auto", display: "flex", gap: 1, alignItems: "center" }}>
              <Box sx={{ textAlign: "right" }}>
                <Typography variant="subtitle2">Detected rows</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {rows.length}
                </Typography>
              </Box>

              <Tooltip title="Start recurring scheduler">
                <span>
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
                </span>
              </Tooltip>
            </Box>
          </Box>
        </Paper>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 420px" }, gap: 2 }}>
          <Paper sx={{ p: 2, borderRadius: 3 }} elevation={1}>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="subtitle2">Total Hosts</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {globalSummary.total}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2">Domain Joined</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {globalSummary.domainJoined}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2">Workgroup</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {globalSummary.workgroup}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2">IP Blocks</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {Object.keys(blocks).length}
                </Typography>
              </Box>
            </Stack>

            <Box sx={{ mt: 2, height: 360 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={osBarData}>
                  <XAxis dataKey="os" hide={false} />
                  <YAxis />
                  <ReTooltip />
                  <Bar dataKey="count" radius={[6, 6, 6, 6]}>
                    {osBarData.map((entry, index) => (
                      <Cell key={`c-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>

          <Paper sx={{ p: 2, borderRadius: 3 }} elevation={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1">OS Distribution</Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" startIcon={<RefreshIcon />} onClick={() => setSnack({ open: true, message: "Manual refresh not implemented", severity: "info" })}>
                  Refresh
                </Button>
                <Button
                  size="small"
                  startIcon={<ClearIcon />}
                  onClick={() => {
                    setRows([]);
                    setBlocks({});
                    setSelectedBlock(null);
                    setSnack({ open: true, message: "Cleared data", severity: "info" });
                  }}
                >
                  Clear
                </Button>
              </Stack>
            </Stack>

            {/* OS quick cards: compact, fixed-size, wrapped labels (max 2 lines) */}
            <Box sx={{ mt: 1 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(92px, 1fr))", gap: 0.8 }}>
                {Object.entries(globalSummary.osCounter || {})
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 12)
                  .map(([os, count], i) => {
                    const handleClick = () => openOsModal(os);

                    return (
                      <Paper
                        key={os || i}
                        elevation={3}
                        onClick={handleClick}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") openOsModal(os);
                        }}
                        sx={{
                          p: 0.6,
                          minWidth: 92,
                          height: 72,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "center",
                          alignItems: "center",
                          background: GRADIENTS[i % GRADIENTS.length],
                          color: "#fff",
                          borderRadius: 1.5,
                          boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                          textAlign: "center",
                          overflow: "hidden",
                          cursor: "pointer",
                          transition: "transform 160ms ease, box-shadow 160ms ease",
                          "&:hover": { transform: "translateY(-4px)", boxShadow: "0 12px 28px rgba(0,0,0,0.14)" },
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: 10,
                            fontWeight: 600,
                            opacity: 0.95,
                            textTransform: "capitalize",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            wordBreak: "break-word",
                            lineHeight: "1.1",
                            maxHeight: "2.2em",
                            width: "100%",
                          }}
                          title={os}
                        >
                          {os || "Unknown"}
                        </Typography>

                        <Typography
                          variant="subtitle2"
                          sx={{
                            mt: 0.4,
                            fontWeight: 900,
                            fontSize: 13,
                            lineHeight: 1,
                            letterSpacing: 0.2,
                          }}
                        >
                          {count}
                        </Typography>
                      </Paper>
                    );
                  })}
              </Box>
            </Box>
          </Paper>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "320px 1fr" }, gap: 2, mt: 2 }}>
          <Paper
            sx={{
              p: 2,
              maxHeight: 520,
              overflowY: "auto",
              borderRadius: 3,
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(8px) saturate(120%)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            }}
            elevation={0}
          >
            <Typography
              variant="subtitle1"
              sx={{
                mb: 2,
                fontWeight: 700,
                letterSpacing: 0.5,
                fontFamily: "Inter, Roboto, Helvetica, Arial, sans-serif",
                color: "#3C3C3C",
              }}
            >
              IP Blocks
            </Typography>

            <List disablePadding>
              {blocksSummary.map((b) => {
                const { totals, domainJoinedCount, win7Count } = analyzeBranchItems(b.items || []);

                return (
                  <React.Fragment key={b.key}>
                    <ListItem
                      button
                      selected={selectedBlock === b.key}
                      onClick={() => setSelectedBlock(b.key)}
                      alignItems="flex-start"
                      sx={{
                        borderRadius: 2,
                        mb: 1,
                        px: 1.5,
                        py: 1,
                        transition: "0.2s all",
                        "&:hover": {
                          background: "linear-gradient(90deg, #667eea33, #764ba233)",
                        },
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              {/* domain status icon */}
                              <Box>{getDomainStatusIcon(domainJoinedCount, totals)}</Box>

                              {/* win7 status icon */}
                              <Box>{getWin7StatusIcon(win7Count)}</Box>

                              <Typography variant="body2" sx={{ fontWeight: 600, color: "#222" }}>
                                {b.key}
                                {b.branchName ? ` — ${b.branchName}` : ""}
                              </Typography>
                            </Box>

                            <Typography variant="body2" sx={{ fontWeight: 700, color: "#1976d2" }}>
                              {b.count}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography variant="caption" sx={{ color: "#555" }}>
                            {b.latest ? `Last seen: ${formatDate(b.latest)}` : "No activity"}
                          </Typography>
                        }
                      />
                    </ListItem>

                    <Box sx={{ px: 1, pb: 1, display: "flex", gap: 1 }}>
                      <TextField
                        size="small"
                        placeholder="Branch name"
                        value={b.branchName}
                        onChange={(e) => updateBranchName(b.key, e.target.value)}
                        fullWidth
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                            background: "#f5f5f5",
                            fontSize: 13,
                          },
                        }}
                      />
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<DownloadIcon />}
                        onClick={() => downloadCSVForBlock(b.key)}
                        sx={{
                          background: "linear-gradient(90deg, #43cea2 0%, #185a9d 100%)",
                          color: "#fff",
                          fontWeight: 600,
                          borderRadius: 2,
                          "&:hover": {
                            background: "linear-gradient(90deg, #185a9d 0%, #43cea2 100%)",
                          },
                        }}
                      >
                        Export
                      </Button>
                    </Box>

                    <Divider sx={{ my: 1, borderColor: "#e0e0e0" }} />
                  </React.Fragment>
                );
              })}
            </List>
          </Paper>

          <Paper sx={{ p: 2, borderRadius: 3 }} elevation={1}>
            {!selectedBlock && <Typography>Select an IP block to view details.</Typography>}

            {selectedBlock && blocks[selectedBlock] && (
              <Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Box>
                    <Typography variant="h6">Block: {selectedBlock}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Branch: {branchMap[selectedBlock] || "—"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Last seen:{" "}
                      {blocksSummary.find((b) => b.key === selectedBlock)?.latest ? formatDate(blocksSummary.find((b) => b.key === selectedBlock).latest) : "—"}
                    </Typography>
                  </Box>
                  <Button variant="contained" startIcon={<DownloadIcon />} onClick={() => downloadCSVForBlock(selectedBlock)} sx={{ background: "linear-gradient(90deg,#667eea 0%,#764ba2 100%)" }}>
                    Download CSV
                  </Button>
                </Box>

                {/* two-chart block: OS Distribution (fixed green/blue/red gradients) and Domain Status (green/red) */}
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mt: 2 }}>
                  {(() => {
                    // safe selected summary
                    const sel = blocksSummary.find((b) => b.key === selectedBlock) || { osCount: {}, domainCount: {} };

                    // color schemes (two-stop gradients)
                    const SCHEMES = {
                      win11: ["#2e7d32", "#66bb6a"], // green -> light green
                      win10: ["#1976d2", "#42a5f5"], // blue -> light blue
                      win7: ["#c62828", "#ff7961"], // red -> light red
                      domain: ["#2e7d32", "#81c784"], // domain green
                      workgroup: ["#c62828", "#ff8a80"], // workgroup red
                      other: ["#6c757d", "#b0b7bd"], // neutral grey
                    };

                    // simple classifier for OS names
                    const osCategory = (name) => {
                      if (!name) return "other";
                      const s = String(name).toLowerCase();
                      if (/\b(windows[\s-]*11|win11|\b11\b)/i.test(s)) return "win11";
                      if (/\b(windows[\s-]*10|win10|\b10\b)/i.test(s)) return "win10";
                      if (/\b(windows[\s-]*7|win7|\b7\b)/i.test(s)) return "win7";
                      return "other";
                    };

                    // produce a unique gradient id
                    const gradId = (prefix, i) => `${prefix}-grad-${i}`;

                    // build data arrays
                    const osData = Object.entries(sel.osCount || {}).map(([k, v]) => ({ name: k || "Unknown", value: v }));
                    const domainData = Object.entries(sel.domainCount || {}).map(([k, v]) => ({ name: k || "Unknown", value: v }));

                    return (
                      <>
                        {/* OS Distribution */}
                        <Paper sx={{ p: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="subtitle2">OS Distribution</Typography>

                            {/* status icons for this block (domain join % and Win7 count) */}
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                              {/* compute metrics for the selected block */}
                              {(() => {
                                const { totals = 0, domainJoinedCount = 0, win7Count = 0 } = analyzeBranchItems(sel.items || []);
                                return (
                                  <>
                                    {/* domain-join icon */}
                                    <Box>{getDomainStatusIcon(domainJoinedCount, totals)}</Box>

                                    {/* win7 icon */}
                                    <Box>{getWin7StatusIcon(win7Count)}</Box>
                                  </>
                                );
                              })()}
                            </Box>
                          </Box>

                          <Box sx={{ height: 240 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                {/* gradient defs for OS slices */}
                                <defs>
                                  {osData.map((d, i) => {
                                    const cat = osCategory(d.name);
                                    const colors = SCHEMES[cat] || SCHEMES.other;
                                    const id = gradId("os", i);
                                    return (
                                      <linearGradient id={id} key={id} x1="0" x2="1" y1="0" y2="1">
                                        <stop offset="0%" stopColor={colors[0]} stopOpacity="1" />
                                        <stop offset="100%" stopColor={colors[1]} stopOpacity="1" />
                                      </linearGradient>
                                    );
                                  })}
                                </defs>

                                <Pie data={osData} dataKey="value" nameKey="name" outerRadius={80} label>
                                  {osData.map((entry, index) => (
                                    <Cell key={`os-cell-${index}`} fill={`url(#${gradId("os", index)})`} stroke="#fff" strokeWidth={1} />
                                  ))}
                                </Pie>

                                <ReTooltip formatter={(value, name) => [`${value} hosts`, name]} />
                                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 12 }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </Box>
                        </Paper>

                        {/* Domain Status */}
                        <Paper sx={{ p: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="subtitle2">Domain Status</Typography>

                            {/* same status icons repeated here for visual parity */}
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                              {(() => {
                                const { totals = 0, domainJoinedCount = 0, win7Count = 0 } = analyzeBranchItems(sel.items || []);
                                return (
                                  <>
                                    <Box>{getDomainStatusIcon(domainJoinedCount, totals)}</Box>
                                    <Box>{getWin7StatusIcon(win7Count)}</Box>
                                  </>
                                );
                              })()}
                            </Box>
                          </Box>

                          <Box sx={{ height: 240 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                {/* gradient defs for domain chart */}
                                <defs>
                                  {domainData.map((d, i) => {
                                    const name = (d.name || "").toString().toLowerCase();
                                    const cat = name.includes("domain") ? "domain" : name.includes("workgroup") ? "workgroup" : "other";
                                    const colors = SCHEMES[cat] || SCHEMES.other;
                                    const id = gradId("dom", i);
                                    return (
                                      <linearGradient id={id} key={id} x1="0" x2="1" y1="0" y2="1">
                                        <stop offset="0%" stopColor={colors[0]} stopOpacity="1" />
                                        <stop offset="100%" stopColor={colors[1]} stopOpacity="1" />
                                      </linearGradient>
                                    );
                                  })}
                                </defs>

                                <Pie data={domainData} dataKey="value" nameKey="name" outerRadius={80} label>
                                  {domainData.map((entry, index) => (
                                    <Cell key={`dom-cell-${index}`} fill={`url(#${gradId("dom", index)})`} stroke="#fff" strokeWidth={1} />
                                  ))}
                                </Pie>

                                <ReTooltip formatter={(value, name) => [`${value} hosts`, name]} />
                                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 12 }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </Box>
                        </Paper>
                      </>
                    );
                  })()}
                </Box>

                <Box sx={{ mt: 2 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      mb: 1,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      fontFamily: "Inter, Roboto, Helvetica, Arial, sans-serif",
                      color: "#333",
                    }}
                  >
                    Hosts in this block
                  </Typography>

                  <Paper
                    sx={{
                      borderRadius: 3,
                      overflowX: "auto",
                      background: "rgba(255,255,255,0.95)",
                      backdropFilter: "blur(8px) saturate(120%)",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                    }}
                  >
                    <Table size="small" sx={{ minWidth: 650 }}>
                      <TableHead sx={{ background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)" }}>
                        <TableRow>
                          {["IP", "Hostname", "Domain", "OS", "Timestamp", "Source"].map((head) => (
                            <TableCell
                              key={head}
                              sx={{
                                color: "#fff",
                                fontWeight: 700,
                                fontSize: 13,
                                borderBottom: "none",
                              }}
                            >
                              {head}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {blocks[selectedBlock].map((r) => (
                          <TableRow
                            key={r.id}
                            hover
                            sx={{
                              "&:hover": { background: "rgba(102, 126, 234, 0.1)" },
                              transition: "0.2s all",
                            }}
                          >
                            <TableCell sx={{ fontSize: 13, color: "#222" }}>{r.ip}</TableCell>
                            <TableCell sx={{ fontSize: 13, color: "#222" }}>{r.hostname}</TableCell>
                            <TableCell sx={{ fontSize: 13, color: "#222" }}>{r.domainStatus}</TableCell>
                            <TableCell sx={{ fontSize: 13, color: "#222" }}>{r.os}</TableCell>
                            <TableCell sx={{ fontSize: 13, color: "#555" }}>{formatDate(r.timestamp)}</TableCell>
                            <TableCell sx={{ fontSize: 13, color: "#555" }}>{r.source || ""}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Paper>
                </Box>
              </Box>
            )}
          </Paper>
        </Box>

        {/* OS Modal: shows branches for selected OS with counts and IP stacks */}
        <Dialog fullWidth maxWidth="md" open={Boolean(selectedOS)} onClose={closeOsModal}>
          <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {selectedOS || ""}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Hosts total: {selectedOS ? rows.filter((r) => String(r.os || "").toLowerCase() === String(selectedOS || "").toLowerCase()).length : 0}
              </Typography>
            </Box>
            <IconButton onClick={closeOsModal}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent dividers>
            {(() => {
              if (!selectedOS) return null;

              // rows matching clicked OS (case-insensitive)
              const matching = rows.filter((r) => String(r.os || "").toLowerCase() === String(selectedOS || "").toLowerCase());

              // group matches by branchName (from branchMap with blockKey fallback)
              const byBranch = {};
              matching.forEach((r) => {
                const blockKey = getBlockKeyFromIp(r.ip || "", groupSize);
                const branchName = branchMap[blockKey] || blockKey || "Unknown";
                if (!byBranch[branchName]) byBranch[branchName] = { count: 0, ips: [], otherOS: {} };
                byBranch[branchName].count += 1;
                byBranch[branchName].ips.push(r);
              });

              // build other OS counts per branch for context (scan all blocks)
              Object.values(blocks).forEach((list) => {
                list.forEach((r) => {
                  const blockKey = getBlockKeyFromIp(r.ip || "", groupSize);
                  const branchName = branchMap[blockKey] || blockKey || "Unknown";
                  if (!byBranch[branchName]) byBranch[branchName] = { count: 0, ips: [], otherOS: {} };
                  const osName = r.os || "Unknown";
                  byBranch[branchName].otherOS[osName] = (byBranch[branchName].otherOS[osName] || 0) + 1;
                });
              });

              const branchList = Object.entries(byBranch)
                .map(([branch, info]) => ({ branch, ...info }))
                .sort((a, b) => b.count - a.count);

              if (branchList.length === 0) return <Typography>No branches contain this OS.</Typography>;

              return (
                <Stack spacing={1}>
                  {branchList.map((b, idx) => (
                    <Accordion key={b.branch} defaultExpanded={idx === 0}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                          <Box>
                            <Typography sx={{ fontWeight: 700 }}>{b.branch}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Matching hosts: {b.count}
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                            {Object.entries(b.otherOS || {})
                              .sort((x, y) => y[1] - x[1])
                              .slice(0, 3)
                              .map(([osName, cnt]) => (
                                <Chip key={osName} label={`${osName} (${cnt})`} size="small" sx={{ bgcolor: "#f3f4f6" }} />
                              ))}
                          </Box>
                        </Box>
                      </AccordionSummary>

                      <AccordionDetails>
                        <Stack spacing={0.5}>
                          {b.ips && b.ips.length > 0 ? (
                            b.ips.map((r) => (
                              <Box key={r.id} sx={{ p: 1, borderRadius: 1.5, background: "#fafafa", border: "1px solid #eee", display: "flex", justifyContent: "space-between", gap: 1 }}>
                                <Box>
                                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{r.ip}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {r.hostname || "—"}
                                  </Typography>
                                </Box>
                                <Box sx={{ textAlign: "right" }}>
                                  <Typography variant="caption" color="text.secondary">
                                    {formatDate(r.timestamp)}
                                  </Typography>
                                  <Typography variant="caption" sx={{ display: "block" }}>
                                    {r.source || ""}
                                  </Typography>
                                </Box>
                              </Box>
                            ))
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No matching hosts
                            </Typography>
                          )}
                        </Stack>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Stack>
              );
            })()}
          </DialogContent>

          <DialogActions>
            <Button onClick={closeOsModal}>Close</Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}>
          <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })}>
            {snack.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
