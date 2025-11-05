import React, { useState, useMemo, useEffect } from "react";
import { Box, CssBaseline, ThemeProvider, Typography, Snackbar, Alert } from "@mui/material";
import { theme } from "./data/theme"; // Imported theme
import { groupByBlock } from './utils/ipUtils';
import { downloadCSVForBlock } from './utils/csvUtils';
import { loadStoredBranches, saveStoredBranches } from "./utils/storageUtils"; // Storage helpers
import { initialBranchMap } from "./data/branches"; // Branch data
import UploadSection from "./components/UploadSection";
import GlobalSummary from "./components/GlobalSummary";
import OSDistribution from "./components/OSDistribution";
import BlockList from "./components/BlockList";
import BlockDetails from "./components/BlockDetails";
import OSModal from "./components/OSModal";

export default function PCInventoryVisualizer() {
  const [rows, setRows] = useState([]);
  const [groupSize, setGroupSize] = useState(24);
  const [blocks, setBlocks] = useState({});
  const [branchMap, setBranchMap] = useState(initialBranchMap);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: "", severity: "info" });
  const [mergeStrategy, setMergeStrategy] = useState("latest");
  const [selectedOS, setSelectedOS] = useState(null);

  useEffect(() => {
    saveStoredBranches(Object.fromEntries(Object.entries(branchMap).filter(([k, v]) => initialBranchMap[k] !== v)));
  }, [branchMap]);

  const applyRows = (normalizedRows) => {
    // Grouping logic moved to utils, but called here
    const grouped = groupByBlock(normalizedRows, groupSize); // From ipUtils
    setRows(normalizedRows);
    setBlocks(grouped);
    setSelectedBlock(Object.keys(grouped)[0] || null);
    // Update branchMap...
    const detected = Object.keys(grouped);
    const newMap = { ...branchMap };
    detected.forEach((k) => {
      if (!newMap[k]) {
        const twoOct = k.split(".").slice(0, 2).join(".");
        newMap[k] = initialBranchMap[twoOct] || "";
      }
    });
    setBranchMap(newMap);
  };

  const blocksSummary = useMemo(() => {
    // Summary computation
    const summary = Object.entries(blocks).map(([key, items]) => {
      const osCount = {};
      const domainCount = {};
      let latest = null;
      items.forEach((it) => {
        osCount[it.os] = (osCount[it.os] || 0) + 1;
        domainCount[it.domainStatus] = (domainCount[it.domainStatus] || 0) + 1;
        if (!latest || new Date(it.timestamp) > new Date(latest)) latest = it.timestamp;
      });
      return { key, items, count: items.length, osCount, domainCount, latest, branchName: branchMap[key] || "" };
    });
    summary.sort((a, b) => a.key.localeCompare(b.key));
    return summary;
  }, [blocks, branchMap]);

  const globalSummary = useMemo(() => {
    // Global computation
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

  const handleStartScheduler = () => {
    // Scheduler logic (unchanged)
    setIsStarting(true);
    setSnack({ open: true, message: "Launching scan...", severity: "info" });
    try {
      window.location.href = "myapp://run?script=scanrange";
      setTimeout(() => {
        setIsStarting(false);
        setSnack({ open: true, message: "Scan command sent to launcher", severity: "success" });
      }, 1000);
    } catch (err) {
      setIsStarting(false);
      setSnack({ open: true, message: `Failed to start scan: ${err.message || err}`, severity: "error" });
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Typography
          variant="h5"
          component="h1"
          gutterBottom
          sx={{
            fontWeight: 900,
            fontSize: { xs: "1.25rem", sm: "1.5rem", md: "1.85rem" },
            lineHeight: 1.05,
            letterSpacing: "0.6px",
            // vibrant multi-stop gradient
            background: "linear-gradient(90deg, #667eea 0%, #764ba2 40%, #43cea2 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            // soft glow for depth (keeps text crisp)
            textShadow: "0 2px 12px rgba(102,126,234,0.12)",
            // accessible fallback color for UAs that ignore bg-clip
            color: "#2b2b2b",
            display: "inline-block",
            px: 0.25,
          }}
        >
          SBAC Inventory Visualizer
        </Typography>
        <UploadSection
          mergeStrategy={mergeStrategy}
          setMergeStrategy={setMergeStrategy}
          groupSize={groupSize}
          setGroupSize={setGroupSize}
          rowsLength={rows.length}
          rows={rows} 
          isStarting={isStarting}
          handleStartScheduler={handleStartScheduler}
          applyRows={applyRows}
          setSnack={setSnack}
        />
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 420px" }, gap: 2 }}>
          <GlobalSummary globalSummary={globalSummary} blocks={blocks} />
          <OSDistribution globalSummary={globalSummary} setSelectedOS={setSelectedOS} setSnack={setSnack} setRows={setRows} setBlocks={setBlocks} setSelectedBlock={setSelectedBlock} />
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "320px 1fr" }, gap: 2, mt: 2 }}>
          <BlockList blocksSummary={blocksSummary} selectedBlock={selectedBlock} setSelectedBlock={setSelectedBlock} branchMap={branchMap} updateBranchName={(k, v) => setBranchMap({ ...branchMap, [k]: v })} downloadCSVForBlock={downloadCSVForBlock} />
          <BlockDetails selectedBlock={selectedBlock} blocks={blocks} branchMap={branchMap} blocksSummary={blocksSummary} downloadCSVForBlock={downloadCSVForBlock} />
        </Box>
        <OSModal selectedOS={selectedOS} setSelectedOS={setSelectedOS} rows={rows} groupSize={groupSize} branchMap={branchMap} blocks={blocks} />
        <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}>
          <Alert severity={snack.severity}>{snack.message}</Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}