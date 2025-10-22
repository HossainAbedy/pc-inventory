// src/data/theme.js
import { createTheme } from "@mui/material";

export const theme = createTheme({
  palette: {
    mode: "light",
  },
  typography: {
    fontFamily: `Inter, Roboto, Helvetica, Arial, sans-serif`,
    button: { textTransform: "none", fontWeight: 700 },
  },
  shape: { borderRadius: 10 },
});