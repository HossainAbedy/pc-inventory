// src/components/BlockDetails.jsx
import React, { useState, useMemo } from "react";
import DownloadIcon from "@mui/icons-material/Download";
import FilterListIcon from "@mui/icons-material/FilterList";
import {
  Paper,
  Box,
  Typography,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Tooltip,
} from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { downloadCSVForBlock as utilDownloadCSV } from "../utils/csvUtils";
import {
  analyzeBranchItems,
  getDomainStatusIcon,
  getWin7StatusIcon,
  getAVStatusIcon,
} from "../utils/statusIcons";
import { formatDate } from "../utils/dateUtils";

/**
 * BlockDetails (letter-only AV badges)
 * - Table shows only single-letter AV badges: K = Kaspersky, W = Defender, O = Other, X = Not detected
 * - Tooltip on each badge displays the full AV text (from AV raw field)
 */
export default function BlockDetails({
  selectedBlock,
  blocks = {},
  branchMap = {},
  blocksSummary = [],
  downloadCSVForBlock: propDownload,
}) {
  // Win11-like font stack to apply across the component (only visual change)
  const WIN11_FONT =
    '"Segoe UI Variable", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

  // Hooks (always called)
  const [showMissingOnly, setShowMissingOnly] = useState(false);

  // Helpers: read AV from row (robust)
  const resolveAVField = (row) => {
    if (!row || typeof row !== "object") return null;
    if (row.avRaw && String(row.avRaw).trim()) return row.avRaw;
    // case-insensitive key map
    const keyMap = {};
    Object.keys(row).forEach((k) => (keyMap[k.toLowerCase().replace(/\s+/g, "")] = k));
    const candidates = [
      "avraw",
      "avstatus",
      "av",
      "antivirus",
      "antivirusname",
      "av_status",
      "installedav",
      "avstatusraw",
      "avrawtext",
    ];
    for (const c of candidates) {
      if (keyMap[c] && row[keyMap[c]] != null && String(row[keyMap[c]]).trim() !== "") {
        return row[keyMap[c]];
      }
    }
    // fuzzy search
    const found = Object.keys(row).find((k) =>
      /(^|\W)(av|antivirus|anti-?virus|avstatus)(\W|$)/i.test(k)
    );
    if (found && row[found] != null && String(row[found]).trim() !== "") return row[found];
    return null;
  };

  const parseAvList = (raw) => {
    if (raw == null) return [];
    let s = String(raw).trim();
    if (!s) return [];
    // remove obvious "Installed:" prefix and normalize separators to semicolon
    s = s.replace(/^\s*installed[:\-\s]*/i, "");
    s = s.replace(/\r\n|\n|\t/g, ";").replace(/[\/|]/g, ";").replace(/,\s*/g, ";");
    const parts = s.split(/;+/).map((p) => p.trim()).filter(Boolean);
    const seen = new Set();
    const out = [];
    for (let p of parts) {
      p = p.replace(/\s+/g, " ").trim();
      if (/^not\s*detected$/i.test(p) || /^notdetected$/i.test(p)) p = "NotDetected";
      const key = p.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(p);
      }
    }
    return out;
  };

  // Determine letter(s) for a parsed AV list
  const avLettersFor = (list) => {
    // returns ordered unique letters array, prefer K then W then O
    if (!list || !list.length) return ["X"];
    const joined = list.join(" ").toLowerCase();
    const letters = [];
    if (joined.includes("kaspersky")) letters.push("K");
    if (joined.includes("defender") || joined.includes("windows defender")) letters.push("W");
    const hasOther = list.some((p) => {
      const lk = p.toLowerCase();
      if (lk.includes("kaspersky") || lk.includes("defender") || /^notdetected$/.test(lk)) return false;
      return true;
    });
    if (hasOther) letters.push("O");
    if (letters.length === 0) letters.push("X");
    return letters;
  };

  const colorForLetter = (letter) => {
    if (letter === "K") return "#2e7d32"; // green
    if (letter === "W") return "#1976d2"; // blue
    if (letter === "O") return "#6c757d"; // grey
    if (letter === "X") return "#c62828"; // red
    return "#9e9e9e";
  };

  // Data derived
  const blockRows = blocks?.[selectedBlock] || [];
  const sel = blocksSummary.find((b) => b.key === selectedBlock) || { osCount: {}, domainCount: {}, items: [] };
  const { totals, domainJoinedCount, win7Count, avProtectedCount } = analyzeBranchItems(sel.items || []);

  // AV stats for pie
  const avStats = useMemo(() => {
    const counts = { Kaspersky: 0, Defender: 0, Other: 0, Missing: 0 };
    for (const r of blockRows) {
      const raw = resolveAVField(r);
      const list = parseAvList(raw);
      if (!list.length || (list.length === 1 && /^notdetected$/i.test(String(list[0])))) {
        counts.Missing += 1;
      } else {
        const joined = list.join(" ").toLowerCase();
        if (joined.includes("kaspersky")) counts.Kaspersky += 1;
        else if (joined.includes("defender")) counts.Defender += 1;
        else counts.Other += 1;
      }
    }
    return {
      counts,
      data: [
        { name: "Kaspersky", value: counts.Kaspersky },
        { name: "Defender", value: counts.Defender },
        { name: "Other AV", value: counts.Other },
        { name: "Missing", value: counts.Missing },
      ],
    };
  }, [blockRows]);

  const displayedRows = useMemo(() => {
    if (!showMissingOnly) return blockRows;
    return blockRows.filter((r) => {
      const list = parseAvList(resolveAVField(r));
      return !list.length || (list.length === 1 && /^notdetected$/i.test(String(list[0])));
    });
  }, [blockRows, showMissingOnly]);

  // Early return
  if (!selectedBlock) return <Typography>Select an IP block to view details.</Typography>;

  // gradient helper
  const renderDefs = (items = [], prefix = "g", colorPicker = () => ["#888", "#bbb"]) =>
    items.map((d, i) => {
      const id = `${prefix}-grad-${i}`;
      const colors = colorPicker(d);
      return (
        <linearGradient id={id} key={id} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={colors[0]} stopOpacity="1" />
          <stop offset="100%" stopColor={colors[1]} stopOpacity="1" />
        </linearGradient>
      );
    });

  const SCHEMES = {
    win11: ["#2e7d32", "#66bb6a"],
    win10: ["#1976d2", "#42a5f5"],
    win7: ["#c62828", "#ff7961"],
    domain: ["#2e7d32", "#81c784"],
    workgroup: ["#c62828", "#ff8a80"],
    other: ["#6c757d", "#b0b7bd"],
  };

  const osCategory = (name) => {
    if (!name) return "other";
    const s = String(name).toLowerCase();
    if (/\b(windows[\s-]*11|win11|\b11\b)/i.test(s)) return "win11";
    if (/\b(windows[\s-]*10|win10|\b10\b)/i.test(s)) return "win10";
    if (/\b(windows[\s-]*7|win7|\b7\b)/i.test(s)) return "win7";
    return "other";
  };

  const osData = Object.entries(sel.osCount || {}).map(([k, v]) => ({ name: k || "Unknown", value: v }));
  const domainData = Object.entries(sel.domainCount || {}).map(([k, v]) => ({ name: k || "Unknown", value: v }));

  const gradientPicker = (type) => (d) => {
    if (type === "os") {
      const cat = osCategory(d.name);
      return SCHEMES[cat] || SCHEMES.other;
    }
    if (type === "domain") {
      const n = (d.name || "").toString().toLowerCase();
      const cat = n.includes("domain") ? "domain" : n.includes("workgroup") ? "workgroup" : "other";
      return SCHEMES[cat] || SCHEMES.other;
    }
    if (type === "av") {
      const map = {
        Kaspersky: ["#2e7d32", "#66bb6a"],
        Defender: ["#1976d2", "#42a5f5"],
        "Other AV": ["#6c757d", "#b0b7bd"],
        Missing: ["#c62828", "#ff8a80"],
      };
      return map[d.name] || ["#888", "#bbb"];
    }
    return ["#888", "#bbb"];
  };

  // download handler
  const handleDownload = (opts = { includeAV: true }) => {
    if (typeof propDownload === "function") {
      try {
        propDownload(selectedBlock, blocks, opts);
      } catch (e) {
        try {
          propDownload(selectedBlock, opts);
        } catch (e2) {
          utilDownloadCSV(selectedBlock, blocks, opts);
        }
      }
    } else {
      utilDownloadCSV(selectedBlock, blocks, opts);
    }
  };

  // Render single-letter AV badges (only letters; tooltip shows full AV text)
  const renderAV = (row) => {
    const raw = resolveAVField(row);
    const list = parseAvList(raw);
    const letters = avLettersFor(list);
    const tooltipText = (list && list.length) ? list.join("; ") : (raw || "No AV info");

    return (
      <Tooltip title={tooltipText} arrow>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {letters.map((L, i) => (
            <Box
              key={`${row.ip || row.id || "r"}-letter-${i}`}
              sx={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                bgcolor: colorForLetter(L),
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 800,
                fontSize: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
              }}
              aria-label={`AV ${L}`}
            >
              {L}
            </Box>
          ))}
        </Box>
      </Tooltip>
    );
  };

  // ---------- UI ----------
  return (
    <Paper sx={{ p: 2, borderRadius: 3, fontFamily: WIN11_FONT }} elevation={1}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#152238" }}>Block: {selectedBlock}</Typography>
          <Typography variant="body2" sx={{ color: "#008B8B  ", fontSize: 13, fontWeight: 700 }}>
            Branch: {branchMap[selectedBlock] || "—"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Last seen: {formatDate(sel.latest) || "—"}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant={showMissingOnly ? "contained" : "outlined"}
            startIcon={<FilterListIcon />}
            onClick={() => setShowMissingOnly((s) => !s)}
            sx={showMissingOnly ? { background: "linear-gradient(90deg,#ff8a80 0%,#ff5252 100%)", color: "#fff" } : {}}
          >
            {showMissingOnly ? `Showing missing AV (${avStats.counts.Missing})` : `Show missing AV (${avStats.counts.Missing})`}
          </Button>

          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => handleDownload({ includeAV: true })}
            sx={{ background: "linear-gradient(90deg,#667eea 0%,#764ba2 100%)" }}
          >
            Download CSV
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 2, mt: 2 }}>
        {/* OS */}
        <Paper sx={{ p: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700,color: "#152238" }}>OS Distribution</Typography>
            <Box>{getWin7StatusIcon(win7Count)}</Box>
          </Box>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <defs>{renderDefs(osData, "os", gradientPicker("os"))}</defs>
              <Pie data={osData} dataKey="value" nameKey="name" outerRadius={60} label>
                {osData.map((e, i) => (
                  <Cell key={i} fill={`url(#os-grad-${i})`} stroke="#fff" strokeWidth={1} />
                ))}
              </Pie>
              <ReTooltip formatter={(value, name) => [`${value} hosts`, name]} />
              <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Paper>

        {/* Domain */}
        <Paper sx={{ p: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700,color: "#152238" }}>Domain Status</Typography>
            <Box>{getDomainStatusIcon(domainJoinedCount, totals)}</Box>
          </Box>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <defs>{renderDefs(domainData, "dom", gradientPicker("domain"))}</defs>
              <Pie data={domainData} dataKey="value" nameKey="name" outerRadius={60} label>
                {domainData.map((e, i) => (
                  <Cell key={i} fill={`url(#dom-grad-${i})`} stroke="#fff" strokeWidth={1} />
                ))}
              </Pie>
              <ReTooltip formatter={(value, name) => [`${value} hosts`, name]} />
              <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Paper>

        {/* AV */}
        <Paper sx={{ p: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700,color: "#152238" }}>AV Distribution</Typography>
            <Typography variant="caption" color="text.secondary">
              {blockRows.length} hosts
            </Typography>
            <Box>{getAVStatusIcon(avProtectedCount, totals)}</Box>
          </Box>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <defs>{renderDefs(avStats.data, "av", gradientPicker("av"))}</defs>
              <Pie data={avStats.data} dataKey="value" nameKey="name" outerRadius={60} label>
                {avStats.data.map((e, i) => (
                  <Cell key={i} fill={`url(#av-grad-${i})`} stroke="#fff" strokeWidth={1} />
                ))}
              </Pie>
              <ReTooltip formatter={(value, name) => [`${value} hosts`, name]} />
              <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Paper>
      </Box>

      {/* Hosts table */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
          Hosts in this block
        </Typography>
        <Paper sx={{ borderRadius: 3, overflowX: "auto", background: "rgba(255,255,255,0.95)" }}>
          <Table size="small" sx={{ minWidth: 800, fontFamily: WIN11_FONT }}>
            <TableHead sx={{ background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)" }}>
              <TableRow>
                {["IP", "Hostname", "Domain", "OS", "AV", "Timestamp", "Source"].map((h) => (
                  <TableCell key={h} sx={{ color: "#fff", fontWeight: 700, fontSize: 13, borderBottom: "none" }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedRows.map((r) => (
                <TableRow key={r.id || r.ip} hover sx={{ "&:hover": { background: "rgba(102, 126, 234, 0.1)" } }}>
                  <TableCell sx={{ fontSize: 13 }}>{r.ip}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{r.hostname}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{r.domainStatus}</TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{r.os}</TableCell>
                  <TableCell sx={{ fontSize: 13, textAlign: "center", width: 90 }}>{renderAV(r)}</TableCell>
                  <TableCell sx={{ fontSize: 13, color: "#555" }}>{formatDate(r.timestamp)}</TableCell>
                  <TableCell sx={{ fontSize: 13, color: "#555" }}>{r.source || ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Box>
    </Paper>
  );
}
