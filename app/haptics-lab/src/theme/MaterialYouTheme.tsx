import React, { useMemo, useState, useEffect } from 'react';
import { ThemeProvider, CssBaseline, GlobalStyles } from '@mui/material';
import '@fontsource-variable/roboto-flex';
import '@fontsource-variable/jetbrains-mono';
import { getMaterialYouColours } from '@liminal-hq/plugin-material-you';
import { buildTheme } from './buildTheme';
import { fallbackRoles, rolesFromPalettes, rolesToCssVariables } from './roles';
import type { Roles } from './roles';

// Pages and code blocks still scroll, but no scrollbar is drawn. `scrollbar-width` covers
// Firefox and current Chromium; the `::-webkit-scrollbar` rule covers WebKitGTK and older WebViews.
const hiddenScrollbars = {
	'*': { scrollbarWidth: 'none' },
	'*::-webkit-scrollbar': { display: 'none' },
};

export const MaterialYouThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [roles, setRoles] = useState<Roles>(fallbackRoles);

	useEffect(() => {
		getMaterialYouColours()
			.then((response) => {
				if (response && response.supported && response.palettes) {
					setRoles(rolesFromPalettes(response.palettes));
				}
			})
			.catch((e: unknown) => console.warn('Failed to get Material You palette', e));
	}, []);

	const theme = useMemo(() => buildTheme(roles), [roles]);
	const variables = useMemo(() => ({ ':root': rolesToCssVariables(roles) }), [roles]);

	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<GlobalStyles styles={hiddenScrollbars} />
			<GlobalStyles styles={variables} />
			{children}
		</ThemeProvider>
	);
};
