import React, { useState, useEffect } from 'react';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';
import { getMaterialYouPalette, subscribeMaterialYouPalette } from '@liminal-hq/plugin-material-you';

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
  const [theme, setTheme] = useState(fallbackTheme);

  useEffect(() => {
    // Initial fetch
    getMaterialYouPalette().then((palette: any) => {
      if (palette) {
        setTheme(createTheme({ palette }));
      }
    }).catch((e: any) => console.warn("Failed to get Material You palette", e));

    // Subscription
    const unsub = subscribeMaterialYouPalette((palette: any) => {
      if (palette) {
        setTheme(createTheme({ palette }));
      }
    });

    return () => {
      unsub.then((fn: () => void) => fn && fn());
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};
