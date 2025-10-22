import React from "react";
import RefreshIcon from '@mui/icons-material/Refresh';
import ClearIcon from '@mui/icons-material/Clear';
import { Paper, Stack, Typography, Button, Box } from "@mui/material";
import { GRADIENTS } from "../data/gradients";

export default function OSDistribution({ globalSummary, setSelectedOS, setSnack, setRows, setBlocks, setSelectedBlock }) {
  return (
    <Paper sx={{ p: 2, borderRadius: 3 }} elevation={1}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1">OS Distribution</Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" startIcon={<RefreshIcon />} onClick={() => setSnack({ open: true, message: "Manual refresh not implemented", severity: "info" })}>Refresh</Button>
          <Button size="small" startIcon={<ClearIcon />} onClick={() => { setRows([]); setBlocks({}); setSelectedBlock(null); setSnack({ open: true, message: "Cleared data", severity: "info" }); }}>Clear</Button>
        </Stack>
      </Stack>
      <Box sx={{ mt: 1, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(92px, 1fr))", gap: 0.8 }}>
        {Object.entries(globalSummary.osCounter || {})
          .sort((a, b) => b[1] - a[1])
          .slice(0, 12)
          .map(([os, count], i) => (
            <Paper
              key={os || i}
              elevation={3}
              onClick={() => setSelectedOS(os)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setSelectedOS(os);
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
          ))}
      </Box>
    </Paper>
  );
}