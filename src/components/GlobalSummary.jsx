import React, { useMemo } from "react";
import { Paper, Stack, Box, Typography, LinearProgress } from "@mui/material";
import {
  Cell,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLORS, PERCENT_COLOR_STOPS } from "../data/chartColors"; // <-- import

const pickColor = (p = 0, reverse = false) => {
  const idx = Math.min(10, Math.max(0, Math.round((Number(p) || 0) / 10)));
  return PERCENT_COLOR_STOPS[reverse ? 10 - idx : idx];
};

const Stat = ({ label, value, percent = 0, reverse = false }) => (
  <Box sx={{ minWidth: 160 }}>
    <Typography variant="subtitle2">{label}</Typography>
    <Typography variant="h5" sx={{ fontWeight: 800 }}>
      {value}
      <Typography component="span" variant="subtitle2" sx={{ color: "text.secondary", ml: 1 }}>
        ({percent}%)
      </Typography>
    </Typography>
    <LinearProgress
      variant="determinate"
      value={Number(percent)}
      sx={{
        height: 8,
        borderRadius: 5,
        mt: 0.8,
        backgroundColor: "grey.300",
        "& .MuiLinearProgress-bar": {
          borderRadius: 5,
          backgroundColor: pickColor(percent, reverse),
        },
      }}
    />
  </Box>
);

export default function GlobalSummary({ globalSummary = {}, blocks = {} }) {
  const osBarData = useMemo(() => {
    const arr = Object.entries(globalSummary.osCounter || {}).map(([k, v]) => ({ os: k || "Unknown", count: v }));
    arr.sort((a, b) => b.count - a.count);
    return arr.slice(0, 10);
  }, [globalSummary]);

  const total = Number(globalSummary.total || 0);
  const domainCount = Number(globalSummary.domainJoined || 0);
  const workgroupCount = Number(globalSummary.workgroup || 0);
  const avCount = Number(globalSummary.avProtected || 0); 

  const domainPct = total > 0 ? ((domainCount / total) * 100).toFixed(1) : "0.0";
  const workgroupPct = total > 0 ? ((workgroupCount / total) * 100).toFixed(1) : "0.0";
  const avPct = total > 0 ? ((avCount / total) * 100).toFixed(1) : "0.0"; 

  return (
    <Paper sx={{ p: 2, borderRadius: 3 }} elevation={1}>
      <Stack
  direction="row"
  spacing={3}
  alignItems="flex-start"
  justifyContent="space-between"
  flexWrap="wrap"
>
  <Box>
    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#152238" }}>
      Total Hosts
    </Typography>
      <Typography variant="h5" sx={{ fontWeight: 800 }}>{total}</Typography>
        </Box>
        {/* Domain Joined - TEAL */}
        <Box sx={{ color: "#008B8B", fontWeight: 700 }}>
          <Stat
            label={
              <Typography sx={{ color: "#008B8B", fontWeight: 700 }}>
                Domain Joined
              </Typography>
            }
            value={domainCount}
            percent={domainPct}
            reverse={true}
          />
        </Box>
        {/* Workgroup - ORANGE */}
        <Box sx={{ color: "#FF8C00", fontWeight: 700 }}>
          <Stat
            label={
              <Typography sx={{ color: "#FF8C00", fontWeight: 700 }}>
                Workgroup
              </Typography>
            }
            value={workgroupCount}
            percent={workgroupPct}
            reverse={false}
          />
        </Box>
        {/* AV Protected - GREEN */}
        <Box sx={{ color: "#228B22", fontWeight: 700 }}>
          <Stat
            label={
              <Typography sx={{ color: "#228B22", fontWeight: 700 }}>
                AV Protected
              </Typography>
            }
            value={avCount}
            percent={avPct}
            reverse={true}
          />
        </Box>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#152238" }}>
            IP Blocks
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {Object.keys(blocks || {}).length}
          </Typography>
        </Box>
      </Stack>
      <Box sx={{ mt: 3, height: 360 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={osBarData}>
            <defs>
              {osBarData.map((entry, index) => {
                const color = CHART_COLORS[index % CHART_COLORS.length];
                return (
                  <linearGradient id={`bar-grad-${index}`} key={index} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="1" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.6" />
                  </linearGradient>
                );
              })}
            </defs>
            <XAxis dataKey="os" />
            <YAxis />
            <ReTooltip />
            <Bar dataKey="count" radius={[6, 6, 6, 6]}>
              {osBarData.map((_, i) => <Cell key={i} fill={`url(#bar-grad-${i})`} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
}
