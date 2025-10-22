import React from "react";
import DownloadIcon from '@mui/icons-material/Download';
import { Paper, Typography, List, ListItem, ListItemText, Divider, Box, TextField, Button} from "@mui/material";
import { analyzeBranchItems, getDomainStatusIcon, getWin7StatusIcon } from "../utils/statusIcons";
import { formatDate } from "../utils/dateUtils";

export default function BlockList({ blocksSummary, selectedBlock, setSelectedBlock, branchMap, updateBranchName, downloadCSVForBlock }) {
  return (
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
          const { totals, domainJoinedCount, win7Count } = analyzeBranchItems(b.items);
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
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "#222" }}>
                          {b.key}
                          {b.branchName ? ` — ${b.branchName}` : ""}
                        </Typography>
                            {/* domain status icon */}                        
                            <Box>{getWin7StatusIcon(win7Count)}</Box>
                            {/* win7 status icon */}                        
                            <Box>{getDomainStatusIcon(domainJoinedCount, totals)}</Box>
                        <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: "#1976d2" }}>
                                {b.count} PCs
                            </Typography>
                        </Box>
                      </Box>
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
  );
}