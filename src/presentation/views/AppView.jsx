import { useState, useEffect, useMemo } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TableRowsIcon from '@mui/icons-material/TableRows';
import GridViewIcon from '@mui/icons-material/GridView';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import { useStockData } from '../../application/useStockData.js';
import TableView from '../components/TableView.jsx';
import HeatmapView from '../components/HeatmapView.jsx';

const getTheme = (mode) => createTheme({
  palette: {
    mode,
    primary: {
      main: '#8b7ff5',
    },
    secondary: {
      main: '#00d4aa',
    },
    error: {
      main: '#ff6b6b',
    },
    background: mode === 'dark' ? {
      default: '#0f1118',
      paper: '#1a1d2e',
    } : {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
});

function AppView() {
  const {
    stocks,
    availableDates,
    selectedDate,
    loading,
    error,
    lastUpdated,
    selectDate,
  } = useStockData();
  const [searchTerm, setSearchTerm] = useState('');
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('themeMode') || 'auto';
  });
  const [view, setView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') || 'table';
  });

  // Detect system theme preference
  const systemPrefersDark = useMemo(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }, []);

  // Determine actual theme to use
  const actualTheme = useMemo(() => {
    if (themeMode === 'auto') {
      return systemPrefersDark ? 'dark' : 'light';
    }
    return themeMode;
  }, [themeMode, systemPrefersDark]);

  const theme = useMemo(() => getTheme(actualTheme), [actualTheme]);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (themeMode !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      // Force re-render by updating a dummy state or just let the actualTheme memo handle it
      setThemeMode('auto'); // This will trigger re-render
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [themeMode]);

  const toggleTheme = () => {
    const modes = ['auto', 'dark', 'light'];
    const currentIndex = modes.indexOf(themeMode);
    const newMode = modes[(currentIndex + 1) % modes.length];
    setThemeMode(newMode);
    localStorage.setItem('themeMode', newMode);
  };

  const handleDateChange = (date) => {
    selectDate(date);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('view', view);
    window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
  }, [view]);

  const handleViewChange = (_event, newView) => {
    if (newView !== null) {
      setView(newView);
    }
  };

  const filteredData = useMemo(() => {
    if (!searchTerm) return stocks;
    const query = searchTerm.toLowerCase();
    return stocks.filter((stock) =>
      Object.values(stock).some((value) =>
        String(value ?? '').toLowerCase().includes(query)
      )
    );
  }, [stocks, searchTerm]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 3, p: 3, bgcolor: 'background.paper', borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
              Stock Screener
            </Typography>
            <IconButton onClick={toggleTheme} color="primary" size="large" title={`Theme: ${themeMode}`}>
              {themeMode === 'auto' && <SettingsBrightnessIcon />}
              {themeMode === 'dark' && <DarkModeIcon />}
              {themeMode === 'light' && <LightModeIcon />}
            </IconButton>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            {view === 'table' && (
              <TextField
                placeholder="Search ticker, company, sector..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                sx={{ flexGrow: 1, minWidth: 260 }}
              />
            )}

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', ml: 'auto', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <FormControl sx={{ minWidth: 150 }}>
                <Select value={selectedDate} onChange={(e) => handleDateChange(e.target.value)} size="small">
                  {availableDates.map(date => (
                    <MenuItem key={date} value={date}>{date}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <ToggleButtonGroup
                value={view}
                exclusive
                onChange={handleViewChange}
                size="small"
              >
                <ToggleButton value="table">
                  <TableRowsIcon sx={{ mr: 1 }} />
                  Table
                </ToggleButton>
                <ToggleButton value="heatmap">
                  <GridViewIcon sx={{ mr: 1 }} />
                  Heatmap
                </ToggleButton>
              </ToggleButtonGroup>

              <Box sx={{ display: 'flex', gap: 2, fontSize: '0.875rem', color: 'text.secondary' }}>
                <span>{stocks.length} stocks</span>
                {lastUpdated && <span>Updated: {lastUpdated}</span>}
              </Box>
            </Box>
          </Box>
        </Box>

        <Accordion sx={{ mb: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{
              '&:hover': { bgcolor: 'action.hover' },
              borderRadius: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              📊 Screening Methodology
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 3 }}>
              <Box
                sx={{
                  bgcolor: actualTheme === 'dark' ? 'rgba(139, 127, 245, 0.08)' : 'rgba(139, 127, 245, 0.05)',
                  p: 3,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: actualTheme === 'dark' ? 'rgba(139, 127, 245, 0.2)' : 'rgba(139, 127, 245, 0.15)',
                }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{
                    color: 'primary.main',
                    fontWeight: 700,
                    mb: 2,
                    fontSize: '1.1rem',
                    letterSpacing: '0.3px',
                  }}
                >
                  🔍 Initial Filters
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2.5, '& li': { mb: 1, fontSize: '0.875rem', lineHeight: 1.6 } }}>
                  <li>Market Cap: Over $300M (Small cap+)</li>
                  <li>Average Volume: Over 100K</li>
                  <li>Price: Over $15</li>
                  <li>50-Day SMA: Price above SMA50</li>
                  <li>200-Day SMA: Price above SMA200</li>
                  <li>Institutional Ownership: Over 20%</li>
                  <li>EPS growth this year: Positive (&gt;0%)</li>
                  <li>EPS growth next year: Positive (&gt;0%)</li>
                  <li>EPS growth past 5 years: Positive (&gt;0%)</li>
                  <li>EPS growth next 5 years: Positive (&gt;0%)</li>
                  <li>EPS growth qtr over qtr: High (&gt;25%)</li>
                  <li>Sales growth past 5 years: Positive (&gt;0%)</li>
                  <li>Sales growth qtr over qtr: Positive (&gt;0%)</li>
                </Box>
              </Box>

              <Box
                sx={{
                  bgcolor: actualTheme === 'dark' ? 'rgba(0, 212, 170, 0.08)' : 'rgba(0, 212, 170, 0.05)',
                  p: 3,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: actualTheme === 'dark' ? 'rgba(0, 212, 170, 0.2)' : 'rgba(0, 212, 170, 0.15)',
                }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{
                    color: 'secondary.main',
                    fontWeight: 700,
                    mb: 2,
                    fontSize: '1.1rem',
                    letterSpacing: '0.3px',
                  }}
                >
                  ✓ Additional Filters
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2.5, '& li': { mb: 1, fontSize: '0.875rem', lineHeight: 1.6 } }}>
                  <li>Market Cap: Must be over $500M (stricter)</li>
                  <li>52-Week Low: Price at least 30% above low</li>
                  <li>52-Week High: Price within 20% of high</li>
                </Box>
              </Box>

              <Box
                sx={{
                  bgcolor: actualTheme === 'dark' ? 'rgba(255, 107, 107, 0.08)' : 'rgba(255, 107, 107, 0.05)',
                  p: 3,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: actualTheme === 'dark' ? 'rgba(255, 107, 107, 0.2)' : 'rgba(255, 107, 107, 0.15)',
                }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{
                    color: 'error.main',
                    fontWeight: 700,
                    mb: 2,
                    fontSize: '1.1rem',
                    letterSpacing: '0.3px',
                  }}
                >
                  ⭐ Investor Score (0-100)
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.875rem',
                    mb: 2,
                    color: 'text.secondary',
                    fontStyle: 'italic',
                    lineHeight: 1.6,
                  }}
                >
                  Stocks are ranked based on four key factors:
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2.5, '& li': { mb: 1, fontSize: '0.875rem', lineHeight: 1.6 } }}>
                  <li>
                    <strong>PEG Ratio</strong> (max 30 pts): &lt;1 = 30pts, 1-2 = 20pts, &gt;2 = 10pts
                  </li>
                  <li>
                    <strong>ROE</strong> (max 30 pts): &gt;20% = 30pts, &gt;10% = 20pts, &gt;0% = 10pts
                  </li>
                  <li>
                    <strong>Profit Margin</strong> (max 20 pts): &gt;20% = 20pts, &gt;10% = 15pts, &gt;0% = 10pts
                  </li>
                  <li>
                    <strong>EPS Growth Next 5Y</strong> (max 20 pts): &gt;30% = 20pts, &gt;20% = 15pts, &gt;10% = 10pts
                  </li>
                </Box>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Error loading data: {error}
          </Alert>
        )}

        {!loading && !error && (
          <>
            {view === 'table' && <TableView data={filteredData} />}
            {view === 'heatmap' && <HeatmapView data={stocks} />}
          </>
        )}
      </Container>
    </ThemeProvider>
  );
}

export default AppView;
