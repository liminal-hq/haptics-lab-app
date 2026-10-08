import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { MaterialYouThemeProvider } from './theme/MaterialYouTheme';
import { initLogger } from './services/logger';

initLogger('main');

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<React.StrictMode>
		<MaterialYouThemeProvider>
			<App />
		</MaterialYouThemeProvider>
	</React.StrictMode>,
);
