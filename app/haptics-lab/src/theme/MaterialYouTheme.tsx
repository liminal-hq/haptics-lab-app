import React, { useState, useEffect } from 'react';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';
import { getMaterialYouColours } from '@liminal-hq/plugin-material-you';

// Fallback theme for desktop or when Material You is unavailable
const fallbackTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#90caf9' },
    secondary: { main: '#f48fb1' },
    background: { default: '#121212', paper: '#1e1e1e' },
  },
});

export const MaterialYouThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme] = useState(fallbackTheme);

  useEffect(() => {
    // Initial fetch
    getMaterialYouColours().then((response) => {
      if (response && response.supported && response.palettes) {
        // TODO: Map Material You palettes to MUI theme properly
        // For now, we'll keep the fallback theme as a placeholder until the mapping logic is defined
        // const muiTheme = mapMaterialYouToMui(response.palettes);
        // setTheme(muiTheme);
        console.log("Material You palettes found:", response.palettes);
      }
    }).catch((e: unknown) => console.warn("Failed to get Material You palette", e));
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};
