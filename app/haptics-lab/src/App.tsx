import { useState, useEffect } from "react";
import { Container, Typography, Button, Stack, Paper, Alert, TextField, Slider, Box } from "@mui/material";
import * as haptics from "@liminal-hq/plugin-haptics";

function App() {
  const [caps, setCaps] = useState<haptics.Capabilities | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Waveform Editor State
  const [timings, setTimings] = useState<string>("0, 50, 50, 100");
  const [amplitudes, setAmplitudes] = useState<string>("0, 128, 0, 255");
  const [repeat, setRepeat] = useState<number>(-1);

  useEffect(() => {
    haptics.capabilities()
      .then(setCaps)
      .catch((e: unknown) => setError(String(e)));
  }, []);

  const playClick = async () => {
    try {
      await haptics.play({
        usage: "touch",
        effect: {
          type: "predefined",
          effectId: "click",
        },
      });
    } catch (e: unknown) {
      setError(String(e));
    }
  };

  const playOneShot = async () => {
    try {
      await haptics.play({
        usage: "touch",
        effect: {
          type: "oneshot",
          durationMs: 50,
          amplitude: 255,
        },
      });
    } catch (e: unknown) {
      setError(String(e));
    }
  };

  const playWaveform = async () => {
    try {
      const timingsArr = timings.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n));
      const amplitudesArr = amplitudes.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n));

      if (timingsArr.length === 0) {
        throw new Error("Timings cannot be empty");
      }

      await haptics.play({
        usage: "touch",
        effect: {
          type: "waveform",
          timingsMs: timingsArr,
          amplitudes: amplitudesArr.length > 0 ? amplitudesArr : undefined,
          repeat: repeat,
        },
      });
    } catch (e: unknown) {
      setError(String(e));
    }
  };

  const stop = async () => {
    try {
      await haptics.stop();
    } catch (e: unknown) {
      setError(String(e));
    }
  };

  const exportJson = () => {
     const timingsArr = timings.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n));
     const amplitudesArr = amplitudes.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n));
     const payload = {
        type: "waveform",
        timingsMs: timingsArr,
        amplitudes: amplitudesArr,
        repeat
     };
     navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
     alert("Copied to clipboard!");
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Haptics Lab
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Capabilities</Typography>
        <pre style={{ overflowX: "auto" }}>
          {JSON.stringify(caps, null, 2)}
        </pre>
      </Paper>

      <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
        <Button variant="contained" onClick={playClick}>
          Play Click
        </Button>
        <Button variant="contained" onClick={playOneShot}>
          One Shot (50ms)
        </Button>
        <Button variant="outlined" color="error" onClick={stop}>
          Stop
        </Button>
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Waveform Editor</Typography>
        <Stack spacing={2}>
           <TextField
              label="Timings (ms) - comma separated"
              fullWidth
              value={timings}
              onChange={(e) => setTimings(e.target.value)}
              helperText="e.g. 0, 50, 50, 100 (off, on, off, on...)"
           />
           <TextField
              label="Amplitudes (0-255) - optional"
              fullWidth
              value={amplitudes}
              onChange={(e) => setAmplitudes(e.target.value)}
              helperText="e.g. 0, 128, 0, 255 (must match timings count if provided)"
           />

           <Box>
             <Typography gutterBottom>Repeat Index (-1 to disable)</Typography>
             <Slider
                value={repeat}
                min={-1}
                max={10}
                step={1}
                marks
                valueLabelDisplay="auto"
                onChange={(_, v) => setRepeat(v as number)}
             />
           </Box>

           <Stack direction="row" spacing={2}>
              <Button variant="contained" color="secondary" onClick={playWaveform}>
                Play Waveform
              </Button>
               <Button variant="outlined" onClick={exportJson}>
                Export JSON
              </Button>
           </Stack>
        </Stack>
      </Paper>
    </Container>
  );
}

export default App;
