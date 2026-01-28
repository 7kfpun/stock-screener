import { useState, useEffect, useMemo, useRef } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  Box,
  Typography,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Alert,
  IconButton,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import TableRowsIcon from '@mui/icons-material/TableRows';
import GridViewIcon from '@mui/icons-material/GridView';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { useStockData } from '../../application/useStockData.js';
import TableView from '../components/TableView.jsx';
import HeatmapView from '../components/HeatmapView.jsx';
import DatePickerPopover from '../components/DatePickerPopover.jsx';
import { StockDetailPanel } from '../components/StockDetailPanel.jsx';
import { trackThemeChange, trackViewChange, trackSearch } from '../../shared/analytics.js';

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
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
      },
    },
  },
});

function AppView() {
  const {
    stocks,
    summary,
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
  const [selectedTicker, setSelectedTicker] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('ticker') || null;
  });
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const hasAutoSelected = useRef(false);

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
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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
    trackThemeChange(newMode);
  };

  const handleDateChange = (date) => {
    selectDate(date);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('view', view);
    if (selectedTicker) {
      params.set('ticker', selectedTicker);
    } else {
      params.delete('ticker');
    }
    window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
  }, [view, selectedTicker]);

  const handleViewChange = (_event, newView) => {
    if (newView !== null) {
      setView(newView);
      trackViewChange(newView);
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

  // Auto-select top-ranked stock on initial load (desktop only)
  useEffect(() => {
    if (!hasAutoSelected.current && !selectedTicker && stocks.length > 0 && !isMobile) {
      const topStock = [...stocks].sort((a, b) =>
        (b.Investor_Score || 0) - (a.Investor_Score || 0)
      )[0];
      if (topStock) {
        hasAutoSelected.current = true;
        // Defer state update to avoid synchronous setState in effect
        queueMicrotask(() => setSelectedTicker(topStock.Ticker));
      }
    }
  }, [stocks, selectedTicker, isMobile]);

  // Calculate selected stock from current data
  const selectedStock = useMemo(() => {
    if (!selectedTicker) return null;
    return (view === 'table' ? filteredData : stocks).find(
      s => s.Ticker === selectedTicker
    );
  }, [selectedTicker, filteredData, stocks, view]);

  // Track search with debouncing
  useEffect(() => {
    if (searchTerm) {
      const timeoutId = setTimeout(() => {
        trackSearch(searchTerm);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="xl" sx={{ py: 2, height: '100vh', overflow: 'hidden' }}>
        <Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
              Stock Screener
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Box
                onClick={() => setMethodologyOpen(true)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1.5,
                  py: 0.5,
                  bgcolor: 'primary.main',
                  color: 'white',
                  borderRadius: 1,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                    transform: 'translateY(-1px)',
                    boxShadow: 2,
                  },
                }}
              >
                <InfoOutlinedIcon fontSize="small" />
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  Methodology
                </Typography>
              </Box>
              <IconButton onClick={toggleTheme} color="primary" size="small" title={`Theme: ${themeMode}`}>
                {themeMode === 'auto' && <SettingsBrightnessIcon />}
                {themeMode === 'dark' && <DarkModeIcon />}
                {themeMode === 'light' && <LightModeIcon />}
              </IconButton>
            </Box>
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
              <DatePickerPopover
                selectedDate={selectedDate}
                availableDates={availableDates}
                onDateChange={handleDateChange}
              />

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
                  <Box component="span" sx={{ ml: 0.5, px: 0.5, py: 0.1, fontSize: '0.6rem', fontWeight: 700, bgcolor: 'warning.main', color: 'warning.contrastText', borderRadius: 0.5, lineHeight: 1.2 }}>
                    Beta
                  </Box>
                </ToggleButton>
              </ToggleButtonGroup>

              <Box sx={{ display: 'flex', gap: 2, fontSize: '0.875rem', color: 'text.secondary' }}>
                <span>{stocks.length} stocks</span>
                {lastUpdated && <span>Updated: {lastUpdated}</span>}
              </Box>
            </Box>
          </Box>
        </Box>

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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: 'calc(100vh - 200px)' }}>

            {/* Daily Summary Section Removed as per request */}

            <Box sx={{ display: 'flex', gap: 0, flexGrow: 1, minHeight: 0 }}>
              <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                {view === 'table' && (
                  <TableView
                    data={filteredData}
                    onStockSelect={setSelectedTicker}
                    selectedTicker={selectedTicker}
                  />
                )}
              {view === 'heatmap' && (
                <HeatmapView
                  data={stocks}
                  onStockSelect={setSelectedTicker}
                  selectedTicker={selectedTicker}
                />
              )}
            </Box>

            {!isMobile && selectedStock && (
              <StockDetailPanel
                stock={selectedStock}
                summary={summary}
                onClose={() => setSelectedTicker(null)}
                isMobile={false}
              />
            )}
            </Box>
          </Box>
        )}

        {isMobile && selectedStock && (
          <StockDetailPanel
            stock={selectedStock}
            summary={summary}
            onClose={() => setSelectedTicker(null)}
            isMobile={true}
          />
        )}

        {/* Disclaimer - bottom of screen */}
        {!loading && !error && (
          <Box sx={{ py: 1, px: 2, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>
              <Box component="span" sx={{ fontWeight: 700, color: 'warning.main' }}>⚠️ IMPORTANT DISCLAIMER: </Box>
              This screener is for informational and educational purposes only. It does not constitute investment advice,
              financial advice, or a recommendation to buy or sell any securities. Past performance does not guarantee future results.
              Always consult with a qualified financial advisor before making investment decisions.
            </Typography>
          </Box>
        )}

        <Dialog
          open={methodologyOpen}
          onClose={() => setMethodologyOpen(false)}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              maxHeight: '90vh',
            }
          }}
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              📊 Screening Methodology
            </Typography>
            <IconButton onClick={() => setMethodologyOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {/* Philosophy Section */}
            <Box sx={{ mb: 4, p: 3, bgcolor: 'action.hover', borderRadius: 2, borderLeft: '4px solid', borderColor: 'primary.main' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                💡 Investment Philosophy
              </Typography>
              <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                Our screening methodology is built on the principles of <strong>quality growth investing</strong> and <strong>momentum analysis</strong>.
                We believe that the best investment opportunities combine strong fundamentals, consistent growth, reasonable valuations,
                and positive price momentum.
              </Typography>
              <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                This screener identifies companies that are not only financially healthy but are also positioned for sustainable growth.
                By filtering for stocks trading above their moving averages and showing strong earnings trends, we focus on companies
                with both solid fundamentals and positive market sentiment.
              </Typography>
              <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
                The <strong>Investor Score</strong> (0-100) combines four key metrics that research has shown to be predictive of future returns:
                valuation efficiency (PEG), profitability (ROE & Profit Margin), and growth potential (EPS Growth).
                This multi-factor approach helps identify well-rounded investment opportunities rather than one-dimensional plays.
              </Typography>
            </Box>

            {/* Filtering Strategy */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                🎯 Two-Stage Filtering Strategy
              </Typography>
              <Typography variant="body1" paragraph sx={{ lineHeight: 1.8, mb: 3 }}>
                Our methodology uses a <strong>two-stage filtering process</strong> to identify quality growth stocks with momentum:
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 3, mb: 4 }}>
              <Box
                sx={{
                  bgcolor: actualTheme === 'dark' ? 'rgba(139, 127, 245, 0.08)' : 'rgba(139, 127, 245, 0.05)',
                  p: 2,
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
                    mb: 1.5,
                    fontSize: '1rem',
                  }}
                >
                  🔍 Initial Filters
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2, '& li': { mb: 0.5, fontSize: '0.8rem', lineHeight: 1.5 } }}>
                  <li>Market Cap: Over $300M</li>
                  <li>Average Volume: Over 100K</li>
                  <li>Price: Over $15</li>
                  <li>50-Day SMA: Price above SMA50</li>
                  <li>200-Day SMA: Price above SMA200</li>
                  <li>Institutional Ownership: Over 20%</li>
                  <li>EPS growth this year: Positive</li>
                  <li>EPS growth next year: Positive</li>
                  <li>EPS growth past 5 years: Positive</li>
                  <li>EPS growth next 5 years: Positive</li>
                  <li>EPS growth qtr over qtr: High (&gt;25%)</li>
                  <li>Sales growth past 5 years: Positive</li>
                  <li>Sales growth qtr over qtr: Positive</li>
                </Box>
              </Box>

              <Box
                sx={{
                  bgcolor: actualTheme === 'dark' ? 'rgba(0, 212, 170, 0.08)' : 'rgba(0, 212, 170, 0.05)',
                  p: 2,
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
                    mb: 1.5,
                    fontSize: '1rem',
                  }}
                >
                  ✓ Additional Filters
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2, '& li': { mb: 0.5, fontSize: '0.8rem', lineHeight: 1.5 } }}>
                  <li>Market Cap: Must be over $500M</li>
                  <li>52-Week Low: Price at least 30% above low</li>
                  <li>52-Week High: Price within 20% of high</li>
                </Box>
              </Box>

              <Box
                sx={{
                  bgcolor: actualTheme === 'dark' ? 'rgba(255, 107, 107, 0.08)' : 'rgba(255, 107, 107, 0.05)',
                  p: 2,
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
                    mb: 1.5,
                    fontSize: '1rem',
                  }}
                >
                  ⭐ Investor Score (0-100)
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.8rem',
                    mb: 1,
                    color: 'text.secondary',
                    fontStyle: 'italic',
                  }}
                >
                  Stocks ranked on four key factors:
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2, '& li': { mb: 0.5, fontSize: '0.8rem', lineHeight: 1.5 } }}>
                  <li><strong>PEG Ratio</strong> (max 30 pts): &lt;1 = 30pts, 1-2 = 20pts, &gt;2 = 10pts</li>
                  <li><strong>ROE</strong> (max 30 pts): &gt;20% = 30pts, &gt;10% = 20pts, &gt;0% = 10pts</li>
                  <li><strong>Profit Margin</strong> (max 20 pts): &gt;20% = 20pts, &gt;10% = 15pts, &gt;0% = 10pts</li>
                  <li><strong>EPS Growth Next 5Y</strong> (max 20 pts): &gt;30% = 20pts, &gt;20% = 15pts, &gt;10% = 10pts</li>
                </Box>
              </Box>
            </Box>

            {/* How to Use Section */}
            <Box sx={{ mb: 4, p: 3, bgcolor: 'action.hover', borderRadius: 2, borderLeft: '4px solid', borderColor: 'secondary.main' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                📈 How to Use This Screener
              </Typography>
              <Box component="ol" sx={{ m: 0, pl: 3, '& li': { mb: 1.5, lineHeight: 1.8 } }}>
                <li>
                  <strong>Start with high-scoring stocks:</strong> Sort by Investor Score to identify the best overall opportunities
                  based on our multi-factor approach.
                </li>
                <li>
                  <strong>Review fundamentals:</strong> Click on any stock to see detailed metrics. Pay attention to valuation (PEG ratio),
                  profitability (ROE, margins), and growth rates.
                </li>
                <li>
                  <strong>Check momentum indicators:</strong> Look at the distance from 52-week high/low and moving averages
                  to understand current price momentum.
                </li>
                <li>
                  <strong>Diversify by sector:</strong> Use the heatmap view to visualize sector exposure and ensure you&apos;re not
                  over-concentrated in any single industry.
                </li>
                <li>
                  <strong>Do your own research:</strong> This screener is a starting point. Always conduct thorough due diligence
                  before making investment decisions.
                </li>
              </Box>
            </Box>

          </DialogContent>
        </Dialog>
      </Container>
    </ThemeProvider>
  );
}

export default AppView;
