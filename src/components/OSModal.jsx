import React from "react";
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, Stack, Typography, Accordion, AccordionSummary, AccordionDetails, Chip, Box } from "@mui/material";
import { getBlockKeyFromIp } from "../utils/ipUtils";
import { formatDate } from "../utils/dateUtils";
import { GRADIENTS } from "../data/gradients";

export default function OSModal({ selectedOS, setSelectedOS, rows, groupSize, branchMap, blocks }) {
  if (!selectedOS) return null;

  const matching = rows.filter((r) => String(r.os || "").toLowerCase() === selectedOS.toLowerCase());
  const byBranch = {};
  matching.forEach((r) => {
    const blockKey = getBlockKeyFromIp(r.ip, groupSize);
    const branchName = branchMap[blockKey] || blockKey || "Unknown";
    if (!byBranch[branchName]) byBranch[branchName] = { count: 0, ips: [], otherOS: {} };
    byBranch[branchName].count += 1;
    byBranch[branchName].ips.push(r);
  });

  // Add otherOS counts...
  Object.values(blocks).forEach((list) => {
    list.forEach((r) => {
      const blockKey = getBlockKeyFromIp(r.ip, groupSize);
      const branchName = branchMap[blockKey] || blockKey || "Unknown";
      if (!byBranch[branchName]) byBranch[branchName] = { count: 0, ips: [], otherOS: {} };
      byBranch[branchName].otherOS[r.os || "Unknown"] = (byBranch[branchName].otherOS[r.os || "Unknown"] || 0) + 1;
    });
  });

  const branchList = Object.entries(byBranch).map(([branch, info]) => ({ branch, ...info })).sort((a, b) => b.count - a.count);

  return (
    <Dialog fullWidth maxWidth="md" open={!!selectedOS} onClose={() => setSelectedOS(null)} sx={{ "& .MuiDialog-paper": { background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)" } }}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)", color: "#fff", px: 3, py: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "#fff" }}>
            {selectedOS}
          </Typography>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)" }}>
            Hosts total: {matching.length}
          </Typography>
        </Box>
        <IconButton onClick={() => setSelectedOS(null)} sx={{ color: "#fff" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ background: "#fff", p: 2 }}>
        <Stack spacing={1}>
          {branchList.length === 0 ? (
            <Typography>No branches contain this OS.</Typography>
          ) : (
            branchList.map((b, idx) => (
              <Accordion
                key={b.branch}
                defaultExpanded={idx === 0}
                sx={{
                  borderRadius: 2,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  "&:before": { display: "none" },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ color: "#1976d2" }} />}
                  sx={{
                    background: GRADIENTS[idx % GRADIENTS.length],
                    color: "#fff",
                    borderTopLeftRadius: 2,
                    borderTopRightRadius: 2,
                    "& .MuiAccordionSummary-content": { alignItems: "center" },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                    <Box>
                      <Typography sx={{ fontWeight: 700, color: "#fff" }}>{b.branch}</Typography>
                      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)" }}>
                        Matching hosts: {b.count}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                      {Object.entries(b.otherOS || {})
                        .sort((x, y) => y[1] - x[1])
                        .slice(0, 3)
                        .map(([osName, cnt]) => (
                          <Chip key={osName} label={`${osName} (${cnt})`} size="small" sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.5)" }} />
                        ))}
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 2, background: "#fafafa" }}>
                  <Stack spacing={0.5}>
                    {b.ips && b.ips.length > 0 ? (
                      b.ips.map((r) => (
                        <Box
                          key={r.id}
                          sx={{
                            p: 1,
                            borderRadius: 1.5,
                            background: "linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)",
                            border: "1px solid #eee",
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 1,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                          }}
                        >
                          <Box>
                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#222" }}>{r.ip}</Typography>
                            <Typography variant="caption" sx={{ color: "#555" }}>
                              {r.hostname || "—"}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: "right" }}>
                            <Typography variant="caption" sx={{ color: "#555" }}>
                              {formatDate(r.timestamp)}
                            </Typography>
                            <Typography variant="caption" sx={{ display: "block", color: "#555" }}>
                              {r.source || ""}
                            </Typography>
                          </Box>
                        </Box>
                      ))
                    ) : (
                      <Typography variant="body2" sx={{ color: "#777" }}>
                        No matching hosts
                      </Typography>
                    )}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            ))
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, background: "#f5f5f5" }}>
        <Button onClick={() => setSelectedOS(null)} sx={{ color: "#1976d2", fontWeight: 600 }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}