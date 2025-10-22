import React from "react";
import DownloadIcon from '@mui/icons-material/Download';
import { Paper, Box, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody } from "@mui/material";
import { PieChart, Pie, Cell, Tooltip as ReTooltip, Legend, ResponsiveContainer } from "recharts";
import { analyzeBranchItems, getDomainStatusIcon, getWin7StatusIcon } from "../utils/statusIcons";
import { formatDate } from "../utils/dateUtils";
import { GRADIENTS } from "../data/gradients"; // For pie gradients, but adjusted for schemes in code

export default function BlockDetails({ selectedBlock, blocks, branchMap, blocksSummary, downloadCSVForBlock }) {
  if (!selectedBlock) return <Typography>Select an IP block to view details.</Typography>;

  const sel = blocksSummary.find((b) => b.key === selectedBlock) || { osCount: {}, domainCount: {} };
  const { totals, domainJoinedCount, win7Count } = analyzeBranchItems(sel.items);

  // OS and Domain data prep (unchanged logic, but SCHEMES defined here or import if shared)
  const SCHEMES = {
    win11: ["#2e7d32", "#66bb6a"], // green -> light green
    win10: ["#1976d2", "#42a5f5"], // blue -> light blue
    win7: ["#c62828", "#ff7961"], // red -> light red
    domain: ["#2e7d32", "#81c784"], // domain green
    workgroup: ["#c62828", "#ff8a80"], // workgroup red
    other: ["#6c757d", "#b0b7bd"], // neutral grey
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

  const gradId = (prefix, i) => `${prefix}-grad-${i}`;

  return (
    <Paper sx={{ p: 2, borderRadius: 3 }} elevation={1}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Box>
          <Typography variant="h6">Block: {selectedBlock}</Typography>
          <Typography variant="body2" color="text.secondary">
            Branch: {branchMap[selectedBlock] || "—"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Last seen: {formatDate(sel.latest) || "—"}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<DownloadIcon />} onClick={() => downloadCSVForBlock(selectedBlock)} sx={{ background: "linear-gradient(90deg,#667eea 0%,#764ba2 100%)" }}>
          Download CSV
        </Button>
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mt: 2 }}>
        {/* OS Pie */}
        <Paper sx={{ p: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2">OS Distribution</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {/* {getDomainStatusIcon(domainJoinedCount, totals)} */}
              {getWin7StatusIcon(win7Count)}
            </Box>
          </Box>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
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
        </Paper>
        {/* Domain Pie (similar) */}
        <Paper sx={{ p: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2">Domain Status</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {getDomainStatusIcon(domainJoinedCount, totals)}
              {/* {getWin7StatusIcon(win7Count)} */}
            </Box>
          </Box>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
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
        </Paper>
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
    </Paper>
  );
}