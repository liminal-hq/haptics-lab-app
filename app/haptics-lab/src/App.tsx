import { useState } from 'react';
import { Alert, BottomNavigation, BottomNavigationAction, Box } from '@mui/material';
import TuneRounded from '@mui/icons-material/TuneRounded';
import QueueMusicRounded from '@mui/icons-material/QueueMusicRounded';
import CompareArrowsRounded from '@mui/icons-material/CompareArrowsRounded';
import DataObjectRounded from '@mui/icons-material/DataObjectRounded';
import MemoryRounded from '@mui/icons-material/MemoryRounded';
import SplashScreen from './components/SplashScreen';
import TopBar from './components/TopBar';
import TransportBar from './components/TransportBar';
import { LabProvider, useLab } from './context/LabContext';
import { usePersistentState, writeStored } from './hooks/usePersistentState';
import type { BenchState } from './utils/bench';
import BenchScreen from './screens/BenchScreen';
import CompareScreen from './screens/CompareScreen';
import CuesScreen from './screens/CuesScreen';
import DeviceScreen from './screens/DeviceScreen';
import RawScreen from './screens/RawScreen';

type Tab = 'bench' | 'cues' | 'compare' | 'raw' | 'device';

function Shell() {
	const [tab, setTab] = usePersistentState<Tab>('tab', 'device');
	const { error, setError } = useLab();

	return (
		<Box
			sx={{
				display: 'flex',
				flexDirection: 'column',
				height: '100dvh',
				bgcolor: 'background.default',
				color: 'text.primary',
			}}
		>
			<TopBar onOpenDevice={() => setTab('device')} />
			{error ? (
				<Alert severity="error" onClose={() => setError(null)} sx={{ mx: 2, mb: 1 }}>
					{error}
				</Alert>
			) : null}
			<Box component="main" sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
				{tab === 'bench' ? <BenchScreen /> : null}
				{tab === 'cues' ? (
					<CuesScreen
						onOpenBench={(cue) => {
							if (cue.pattern) {
								writeStored<BenchState>('bench', {
									name: cue.id,
									usage: cue.pattern.usage ?? 'media',
									policy: cue.pattern.policy ?? 'interrupt',
									events: cue.pattern.events,
								});
							}
							setTab('bench');
						}}
						onOpenUiLane={() => {
							writeStored('raw-mode', 'ui');
							setTab('raw');
						}}
					/>
				) : null}
				{tab === 'compare' ? <CompareScreen /> : null}
				{tab === 'raw' ? <RawScreen /> : null}
				{tab === 'device' ? <DeviceScreen /> : null}
			</Box>
			<TransportBar />
			<BottomNavigation
				showLabels
				value={tab}
				onChange={(_, v: Tab) => setTab(v)}
				sx={{
					height: 'calc(72px + env(safe-area-inset-bottom, 0px))',
					pb: 'env(safe-area-inset-bottom, 0px)',
					bgcolor: 'container.high',
					// Five tabs must fit a 360 dp phone; MUI's default minimum would not.
					'& .MuiBottomNavigationAction-root': { minWidth: 0, px: 0.5 },
				}}
			>
				<BottomNavigationAction value="bench" label="Bench" icon={<TuneRounded />} />
				<BottomNavigationAction value="cues" label="Cues" icon={<QueueMusicRounded />} />
				<BottomNavigationAction value="compare" label="Compare" icon={<CompareArrowsRounded />} />
				<BottomNavigationAction value="raw" label="Raw" icon={<DataObjectRounded />} />
				<BottomNavigationAction value="device" label="Device" icon={<MemoryRounded />} />
			</BottomNavigation>
		</Box>
	);
}

function App() {
	const [showSplash, setShowSplash] = useState(true);

	if (showSplash) {
		return <SplashScreen onDone={() => setShowSplash(false)} />;
	}

	return (
		<LabProvider>
			<Shell />
		</LabProvider>
	);
}

export default App;
