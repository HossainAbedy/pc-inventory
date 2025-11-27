// src/utils/statusIcons.js
import {
  Tooltip,
} from "@mui/material";

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CloseIcon from '@mui/icons-material/Close';

export const analyzeBranchItems = (items = []) => {
  const totals = (items || []).length;
  let domainJoinedCount = 0;
  let win7Count = 0;
  let avProtectedCount = 0;

  const win7Regex = /\b(windows[\s-]*7|win7|\b7\b)/i;
  const domainRegex = /domain[:\s]/i;

  (items || []).forEach((r) => {
    if (String(r.domainStatus || "").match(domainRegex)) domainJoinedCount += 1;
    if (String(r.os || "").match(win7Regex)) win7Count += 1;
    const avRaw = (r.avRaw || "").toLowerCase().trim();
    // Only count as protected if it contains known AV products
    if (avRaw.includes("windows defender") || avRaw.includes("kaspersky")) {
      avProtectedCount += 1;
    }
  });

  return { totals, domainJoinedCount, win7Count, avProtectedCount };
};

export const getDomainStatusIcon = (domainJoinedCount, totalCount) => {
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
        <CheckCircleIcon sx={{ color: "#005800" }} fontSize="small" />
      </Tooltip>
    );
  }
  if (pct >= 80) {
    return (
      <Tooltip title={title}>
        <CheckCircleIcon sx={{ color: "#00d8d8" }} fontSize="small" />
      </Tooltip>
    );
  }
  if (pct >= 66) {
    return (
      <Tooltip title={title}>
        <InfoOutlinedIcon sx={{ color: "#00d8d8" }} fontSize="small" />
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
        <ErrorOutlineIcon sx={{ color: "#ff1a1a" }} fontSize="small" />
      </Tooltip>
    );
  }
  // pct < 20
  return (
    <Tooltip title={title}>
      <CloseIcon sx={{ color: "#ff1a1a" }} fontSize="small" />
    </Tooltip>
  );
};

export const getWin7StatusIcon = (win7Count) => {
  const title = `Windows 7 hosts: ${win7Count}`;

  if (!win7Count) {
    return (
      <Tooltip title={title}>
        <CheckCircleIcon sx={{ color: "#005800" }} fontSize="small" />
      </Tooltip>
    );
  }
  if (win7Count === 1) {
    return (
      <Tooltip title={title}>
        <CheckCircleIcon sx={{ color: "#00d8d8" }} fontSize="small" />
      </Tooltip>
    );
  }
  if (win7Count >= 2 && win7Count <= 3) {
    return (
      <Tooltip title={title}>
        <InfoOutlinedIcon sx={{ color: "#00d8d8" }} fontSize="small" />
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
        <ErrorOutlineIcon sx={{ color: "#ff1a1a" }} fontSize="small" />
      </Tooltip>
    );
  }
  // > 8
  return (
    <Tooltip title={title}>
      <CloseIcon sx={{ color: "#ff1a1a" }} fontSize="small" />
    </Tooltip>
  );
};

export const getAVStatusIcon = (avProtectedCount, totalCount) => {
  const pct = !totalCount ? 0 : Math.round((avProtectedCount * 100) / totalCount);
  const title = `${avProtectedCount}/${totalCount} hosts with AV (${pct}%)`;

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
        <CheckCircleIcon sx={{ color: "#005800" }} fontSize="small" />
      </Tooltip>
    );
  }
  if (pct >= 80) {
    return (
      <Tooltip title={title}>
        <CheckCircleIcon sx={{ color: "#00d8d8" }} fontSize="small" />
      </Tooltip>
    );
  }
  if (pct >= 66) {
    return (
      <Tooltip title={title}>
        <InfoOutlinedIcon sx={{ color: "#00d8d8" }} fontSize="small" />
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
        <ErrorOutlineIcon sx={{ color: "#ff1a1a" }} fontSize="small" />
      </Tooltip>
    );
  }

  return (
    <Tooltip title={title}>
      <CloseIcon sx={{ color: "#ff1a1a" }} fontSize="small" />
    </Tooltip>
  );
};
