import React, { useState, useEffect } from 'react';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';
import { getMaterialYouColours } from '@liminal-hq/plugin-material-you';

// Fallback theme for desktop or when Material You is unavailable
const fallbackTheme = createTheme({
	palette: {
		mode: 'dark',
		primary: { main: 'hsl(207 89% 77%)' },
		secondary: { main: 'hsl(337 80% 76%)' },
		background: { default: 'hsl(0 0% 7%)', paper: 'hsl(0 0% 12%)' },
	},
});

type TonePalette = Record<string, string | undefined>;
type MaterialYouPalettes = Record<string, TonePalette | undefined>;

const getTone = (palette: TonePalette | undefined, tone: number): string | undefined =>
	palette?.[String(tone)];

const mapMaterialYouToMui = (palettes: MaterialYouPalettes) =>
	createTheme({
		palette: {
			mode: 'dark',
			primary: {
				main: getTone(palettes.primary, 80) ?? getTone(palettes.primary, 40) ?? fallbackTheme.palette.primary.main,
				light: getTone(palettes.primary, 90) ?? fallbackTheme.palette.primary.light,
				dark: getTone(palettes.primary, 70) ?? fallbackTheme.palette.primary.dark,
				contrastText: getTone(palettes.primary, 20) ?? 'hsl(0 0% 0%)',
			},
			secondary: {
				main:
					getTone(palettes.secondary, 80) ??
					getTone(palettes.secondary, 40) ??
					fallbackTheme.palette.secondary.main,
				light: getTone(palettes.secondary, 90) ?? fallbackTheme.palette.secondary.light,
				dark: getTone(palettes.secondary, 70) ?? fallbackTheme.palette.secondary.dark,
				contrastText: getTone(palettes.secondary, 20) ?? 'hsl(0 0% 0%)',
			},
			error: {
				main: getTone(palettes.error, 80) ?? getTone(palettes.error, 40) ?? 'hsl(7 100% 84%)',
				contrastText: getTone(palettes.error, 20) ?? 'hsl(0 0% 0%)',
			},
			background: {
				default:
					getTone(palettes.neutral, 6) ??
					getTone(palettes.neutral, 10) ??
					fallbackTheme.palette.background.default,
				paper:
					getTone(palettes.neutralVariant, 12) ??
					getTone(palettes.neutral, 20) ??
					fallbackTheme.palette.background.paper,
			},
			text: {
				primary: getTone(palettes.neutral, 95) ?? 'hsl(0 0% 96%)',
				secondary: getTone(palettes.neutralVariant, 80) ?? 'hsl(0 0% 78%)',
			},
		},
	});

export const MaterialYouThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [theme, setTheme] = useState(fallbackTheme);

	useEffect(() => {
		// Initial fetch
		getMaterialYouColours()
			.then((response) => {
				if (response && response.supported && response.palettes) {
					setTheme(mapMaterialYouToMui(response.palettes as MaterialYouPalettes));
				}
			})
			.catch((e: unknown) => console.warn('Failed to get Material You palette', e));
	}, []);

	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			{children}
		</ThemeProvider>
	);
};
