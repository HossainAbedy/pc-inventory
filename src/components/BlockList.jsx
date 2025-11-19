import React from "react";
import DownloadIcon from '@mui/icons-material/Download';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import {
  Paper, Typography, List, ListItem, ListItemText,
  Divider, Box, TextField, Button
} from "@mui/material";

import {
  analyzeBranchItems,
  getDomainStatusIcon,
  getWin7StatusIcon,
  getAVStatusIcon
} from "../utils/statusIcons";

import { formatDate } from "../utils/dateUtils";

export default function BlockList({
  blocksSummary,
  selectedBlock,
  setSelectedBlock,
  updateBranchName,
  downloadCSVForBlock
}) {

  return (
    <Paper
      sx={{
        p: 2,
        maxHeight: 520,
        overflowY: "auto",
        borderRadius: 3,
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(8px)",
      }}
      elevation={0}
    >
      <Typography sx={{ mb: 2, fontWeight: 700 }}>
        IP Blocks
      </Typography>

      <List disablePadding>
        {blocksSummary.map((b) => {
          const { totals, domainJoinedCount, win7Count, avProtectedCount } =
            analyzeBranchItems(b.items);

          return (
            <React.Fragment key={b.key}>
              <ListItem
                button
                selected={selectedBlock === b.key}
                onClick={() => setSelectedBlock(b.key)}
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  px: 1.5,
                  py: 1.5,
                  pr: "130px", // ← Reserve space for right-side status icons
                  position: "relative",
                  '&:hover': { background: "#f5f7ff" }
                }}
              >

                {/* RIGHT SIDE STATUS ICONS */}
                <Box
                  sx={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  {getWin7StatusIcon(win7Count)}
                  {getDomainStatusIcon(domainJoinedCount, totals)}
                  {getAVStatusIcon(avProtectedCount, totals)}
                </Box>

                {/* LEFT SIDE CONTENT */}
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography sx={{ fontWeight: 700, color: "#152238" }}>
                        {b.key}
                      </Typography>

                      <DesktopWindowsIcon sx={{ fontSize: 17, color: "#1976d2" }} />
                      <Typography sx={{ fontWeight: 700, fontSize: 13, color: "#1976d2" }}>
                        {b.count}
                      </Typography>
                    </Box>
                  }

                  secondary={
                    <Box sx={{ mt: 0.8 }}>
                      <Typography
                        variant="body2"
                        sx={{ color: "#008B8B  ", fontSize: 13, fontWeight: 700 }}
                      >
                        {b.branchName || "—"}
                      </Typography>

                      <Typography variant="caption" sx={{ color: "#777" }}>
                        {b.latest ? `Last seen: ${formatDate(b.latest)}` : "No activity"}
                      </Typography>
                    </Box>
                  }
                />

              </ListItem>

              {/* Branch name edit + export */}
              <Box sx={{ px: 1, pb: 1, display: "flex", gap: 1 }}>
                <TextField
                  size="small"
                  placeholder="Branch name"
                  value={b.branchName || ""}
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
                    borderRadius: 2,
                    background: "linear-gradient(90deg,#43cea2,#185a9d)",
                    "&:hover": { background: "linear-gradient(90deg,#185a9d,#43cea2)" },
                  }}
                >
                  Export
                </Button>
              </Box>

              <Divider sx={{ my: 1 }} />
            </React.Fragment>
          );
        })}
      </List>
    </Paper>
  );
}
