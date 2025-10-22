import React, { useMemo } from "react";
import { Paper, Stack, Box, Typography } from "@mui/material";
import { Cell, Tooltip as ReTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { CHART_COLORS } from "../data/chartColors";

export default function GlobalSummary({ globalSummary, blocks }) {
  const osBarData = useMemo(() => {
    const arr = Object.entries(globalSummary.osCounter || {}).map(([k, v]) => ({ os: k || "Unknown", count: v }));
    arr.sort((a, b) => b.count - a.count);
    return arr.slice(0, 10);
  }, [globalSummary]);

  const gradId = (i) => `bar-grad-${i}`;

  return (
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
            {Object.keys(blocks || {}).length}
          </Typography>
        </Box>
      </Stack>
      <Box sx={{ mt: 2, height: 360 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={osBarData}>
            <defs>
              {osBarData.map((entry, index) => {
                const color = CHART_COLORS[index % CHART_COLORS.length];
                return (
                  <linearGradient id={gradId(index)} key={index} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="1" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.6" />
                  </linearGradient>
                );
              })}
            </defs>
            <XAxis dataKey="os" hide={false} />
            <YAxis />
            <ReTooltip />
            <Bar dataKey="count" radius={[6, 6, 6, 6]}>
              {osBarData.map((entry, index) => (
                <Cell key={`c-${index}`} fill={`url(#${gradId(index)})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
}