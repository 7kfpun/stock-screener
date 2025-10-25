import { Box, Typography, Dialog, DialogTitle, DialogContent, DialogContentText, Select, MenuItem, FormControl } from '@mui/material';
import { useState, useMemo } from 'react';
import { formatMoney, formatPercent, formatPrice, formatNumber } from '../utils/formatters';

function getHeatmapColor(changePercent) {
  const percent = changePercent * 100;

  // Smooth gradient from red to green
  // Clamp between -5% and +5%
  const clampedPercent = Math.max(-5, Math.min(5, percent));

  // Normalize to 0-1 scale
  const normalized = (clampedPercent + 5) / 10;

  let r, g, b;

  if (normalized < 0.5) {
    // Red to gray (negative)
    const t = normalized * 2;
    r = 220;
    g = Math.round(40 + (100 - 40) * t);
    b = Math.round(40 + (100 - 40) * t);
  } else {
    // Gray to green (positive)
    const t = (normalized - 0.5) * 2;
    r = Math.round(100 - (100 - 0) * t);
    g = Math.round(100 + (212 - 100) * t);
    b = Math.round(100 - (100 - 170) * t);
  }

  return `rgb(${r}, ${g}, ${b})`;
}

// Squarified treemap layout algorithm
function squarify(items, x, y, width, height) {
  if (items.length === 0) return [];

  const totalValue = items.reduce((sum, item) => sum + item.value, 0);
  if (totalValue === 0) return [];

  const result = [];
  let remainingItems = [...items];
  let currentX = x;
  let currentY = y;
  let remainingWidth = width;
  let remainingHeight = height;

  while (remainingItems.length > 0) {
    // Determine orientation (horizontal or vertical split)
    const useHorizontal = remainingWidth >= remainingHeight;

    // Take items for current row/column
    const row = [];
    let rowValue = 0;
    const remainingValue = remainingItems.reduce((sum, item) => sum + item.value, 0);

    for (let i = 0; i < remainingItems.length; i++) {
      row.push(remainingItems[i]);
      rowValue += remainingItems[i].value;

      // Stop if we've taken enough for a good aspect ratio or running out
      if (rowValue / remainingValue > 0.3 || i === remainingItems.length - 1) {
        break;
      }
    }

    // Layout this row
    if (useHorizontal) {
      const rowWidth = (rowValue / remainingValue) * remainingWidth;
      let itemY = currentY;

      row.forEach(item => {
        const itemHeight = (item.value / rowValue) * remainingHeight;
        result.push({
          ...item,
          x: currentX,
          y: itemY,
          width: rowWidth,
          height: itemHeight
        });
        itemY += itemHeight;
      });

      currentX += rowWidth;
      remainingWidth -= rowWidth;
    } else {
      const rowHeight = (rowValue / remainingValue) * remainingHeight;
      let itemX = currentX;

      row.forEach(item => {
        const itemWidth = (item.value / rowValue) * remainingWidth;
        result.push({
          ...item,
          x: itemX,
          y: currentY,
          width: itemWidth,
          height: rowHeight
        });
        itemX += itemWidth;
      });

      currentY += rowHeight;
      remainingHeight -= rowHeight;
    }

    // Remove processed items
    remainingItems = remainingItems.slice(row.length);
  }

  return result;
}

export default function HeatmapView({ data }) {
  const [selectedStock, setSelectedStock] = useState(null);
  const [groupBy, setGroupBy] = useState(() => {
    return localStorage.getItem('heatmapGroupBy') || 'sector';
  });
  const [sizeBy, setSizeBy] = useState(() => {
    return localStorage.getItem('heatmapSizeBy') || 'marketCap';
  });

  const handleGroupByChange = (event) => {
    const newValue = event.target.value;
    setGroupBy(newValue);
    localStorage.setItem('heatmapGroupBy', newValue);
  };

  const handleSizeByChange = (event) => {
    const newValue = event.target.value;
    setSizeBy(newValue);
    localStorage.setItem('heatmapSizeBy', newValue);
  };

  // Helper function to get size value based on selected metric
  const getSizeValue = (stock) => {
    switch (sizeBy) {
      case 'marketCap':
        return parseFloat(stock['Market Cap']) || 0;
      case 'volume':
        return parseFloat(stock.Volume) || 0;
      case 'score':
        return parseFloat(stock.Investor_Score) || 0;
      case 'monoSize':
        return 1; // All stocks same size
      default:
        return parseFloat(stock['Market Cap']) || 0;
    }
  };

  const sectors = useMemo(() => {
    if (groupBy === 'none') {
      // No grouping - create a single group with all stocks
      const allStocks = data.map(stock => {
        const sizeValue = getSizeValue(stock);
        const marketCap = parseFloat(stock['Market Cap']) || 0;
        return {
          ticker: stock.Ticker,
          company: stock.Company,
          change: parseFloat(stock.Change) || 0,
          value: sizeValue,
          marketCap: marketCap,
          stockData: stock
        };
      }).sort((a, b) => b.value - a.value);

      return [{
        name: 'All Stocks',
        stocks: allStocks,
        totalMarketCap: allStocks.reduce((sum, s) => sum + s.marketCap, 0)
      }];
    }

    // Group stocks by sector
    const sectorMap = {};
    data.forEach(stock => {
      const sector = stock.Sector || 'Other';
      if (!sectorMap[sector]) {
        sectorMap[sector] = {
          name: sector,
          stocks: [],
          totalMarketCap: 0
        };
      }
      const sizeValue = getSizeValue(stock);
      const marketCap = parseFloat(stock['Market Cap']) || 0;
      sectorMap[sector].stocks.push({
        ticker: stock.Ticker,
        company: stock.Company,
        change: parseFloat(stock.Change) || 0,
        value: sizeValue,
        marketCap: marketCap,
        stockData: stock
      });
      sectorMap[sector].totalMarketCap += marketCap;
    });

    // Sort stocks within each sector first, then sort sectors by the first stock's value
    return Object.values(sectorMap)
      .map(sector => ({
        ...sector,
        stocks: sector.stocks.sort((a, b) => b.value - a.value)
      }))
      .sort((a, b) => {
        // Sort by the largest stock's value in each sector
        const aFirstStockVal = a.stocks[0]?.value || 0;
        const bFirstStockVal = b.stocks[0]?.value || 0;
        return bFirstStockVal - aFirstStockVal;
      });
  }, [data, groupBy, getSizeValue]);

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          gap: 4,
          alignItems: 'center',
          mb: 2,
          p: 2,
          bgcolor: 'background.paper',
          borderRadius: 2,
          flexWrap: 'wrap',
        }}
      >
        <FormControl sx={{ minWidth: 150 }}>
          <Select
            value={groupBy}
            onChange={handleGroupByChange}
            size="small"
            startAdornment={
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  Group by:
                </Typography>
              </Box>
            }
          >
            <MenuItem value="sector">Sector</MenuItem>
            <MenuItem value="none">No group</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 170 }}>
          <Select
            value={sizeBy}
            onChange={handleSizeByChange}
            size="small"
            startAdornment={
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  Size by:
                </Typography>
              </Box>
            }
          >
            <MenuItem value="marketCap">Market Cap</MenuItem>
            <MenuItem value="volume">Volume</MenuItem>
            <MenuItem value="score">Investor Score</MenuItem>
            <MenuItem value="monoSize">Mono Size</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Color:
          </Typography>
          <Box
            sx={{
              width: 120,
              height: 20,
              borderRadius: 1,
              background: 'linear-gradient(to right, rgb(220, 40, 40), rgb(100, 100, 100), rgb(0, 212, 170))',
            }}
          />
          <Typography variant="body2" color="text.secondary">
            -5%
          </Typography>
          <Typography variant="body2" color="text.secondary">
            +5%
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 3,
          p: 1,
          height: 'calc(100vh - 320px)',
        }}
      >
        {sectors.map((sector) => {
          // Calculate treemap layout for this sector
          const isNoGroup = groupBy === 'none';
          // For no group, use almost all available space; for sectors, divide space equally
          const sectorHeight = isNoGroup
            ? window.innerHeight - 340 // Full height minus headers
            : Math.max(200, (window.innerHeight - 340) / sectors.length - 8); // Divide by number of sectors
          const sectorWidth = 1200; // Approximate container width
          const layout = squarify(sector.stocks, 0, 0, sectorWidth, sectorHeight);

          return (
            <Box key={sector.name} sx={{ mb: 1, position: 'relative' }}>
              {/* Sector label - hide for "All Stocks" in no group mode */}
              {!(isNoGroup && sector.name === 'All Stocks') && (
                <Typography
                  sx={{
                    position: 'absolute',
                    left: 8,
                    top: 8,
                    zIndex: 100,
                    bgcolor: 'rgba(0,0,0,0.7)',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1,
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    color: 'white',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  {sector.name}
                </Typography>
              )}

              {/* Treemap container */}
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: `${sectorHeight}px`,
                  bgcolor: '#1a1d2e',
                  borderRadius: 1,
                  overflow: 'hidden',
                }}
              >
                {layout.map((item) => {
                  const color = getHeatmapColor(item.change);
                  const changeText = item.change >= 0
                    ? `+${(item.change * 100).toFixed(2)}%`
                    : `${(item.change * 100).toFixed(2)}%`;
                  const score = parseFloat(item.stockData.Investor_Score) || 0;

                  return (
                    <Box
                      key={item.ticker}
                      onClick={() => setSelectedStock(item.stockData)}
                      sx={{
                        position: 'absolute',
                        left: `${(item.x / sectorWidth) * 100}%`,
                        top: `${(item.y / sectorHeight) * 100}%`,
                        width: `${(item.width / sectorWidth) * 100}%`,
                        height: `${(item.height / sectorHeight) * 100}%`,
                        bgcolor: color,
                        border: '1px solid rgba(0,0,0,0.2)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        p: 0.5,
                        transition: 'all 0.15s',
                        '&:hover': {
                          filter: 'brightness(1.2)',
                          zIndex: 50,
                          boxShadow: '0 0 0 2px white',
                        },
                      }}
                    >
                      {/* Score badge */}
                      {score > 0 && item.width > 60 && item.height > 60 && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            bgcolor: 'rgba(0,0,0,0.6)',
                            px: 0.5,
                            py: 0.25,
                            borderRadius: 0.5,
                            fontSize: '0.625rem',
                            fontWeight: 700,
                            color: 'white',
                          }}
                        >
                          {Math.round(score)}
                        </Box>
                      )}

                      {/* Ticker */}
                      <Typography
                        sx={{
                          fontSize: item.width > 80 ? '0.875rem' : '0.75rem',
                          fontWeight: 700,
                          color: 'white',
                          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                          textAlign: 'center',
                          lineHeight: 1.2,
                        }}
                      >
                        {item.ticker}
                      </Typography>

                      {/* Change percentage */}
                      {item.height > 40 && (
                        <Typography
                          sx={{
                            fontSize: item.width > 80 ? '0.75rem' : '0.625rem',
                            fontWeight: 600,
                            color: 'white',
                            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                            mt: 0.25,
                          }}
                        >
                          {changeText}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          );
        })}
      </Box>

      <Dialog open={!!selectedStock} onClose={() => setSelectedStock(null)}>
        {selectedStock && (
          <>
            <DialogTitle>
              {selectedStock.Company} ({selectedStock.Ticker})
            </DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'grid', gap: 1 }}>
                <DialogContentText>
                  <strong>Price:</strong> {formatPrice(selectedStock.Price)}
                </DialogContentText>
                <DialogContentText>
                  <strong>Change:</strong>{' '}
                  {parseFloat(selectedStock.Change) >= 0
                    ? `+${formatPercent(selectedStock.Change)}`
                    : formatPercent(selectedStock.Change)}
                </DialogContentText>
                <DialogContentText>
                  <strong>Market Cap:</strong> {formatMoney(selectedStock['Market Cap'])}
                </DialogContentText>
                <DialogContentText>
                  <strong>P/E:</strong> {formatNumber(selectedStock['P/E'], 2)}
                </DialogContentText>
                <DialogContentText>
                  <strong>ROE:</strong> {formatPercent(selectedStock.ROE)}
                </DialogContentText>
                <DialogContentText>
                  <strong>Investor Score:</strong> {Math.round(selectedStock.Investor_Score)}
                </DialogContentText>
                <DialogContentText>
                  <strong>Sector:</strong> {selectedStock.Sector}
                </DialogContentText>
                <DialogContentText>
                  <strong>Industry:</strong> {selectedStock.Industry}
                </DialogContentText>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}
