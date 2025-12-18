import { DataGrid } from '@mui/x-data-grid';
import { Box, Typography } from '@mui/material';
import { useState, useEffect, useMemo } from 'react';
import { formatMoney, formatVolume, formatPrice, formatNumber, formatPercent } from '../../shared/formatters';
import { formatSignedPercent } from './StockTooltipConfig';
import { trackTableInteraction } from '../../shared/analytics';
import { CountryFlag } from './CountryFlag';

const COLORS = {
  success: '#00d4aa',
  danger: '#ff6b6b',
  primary: '#8b7ff5',
};

export default function TableView({ data, onStockSelect, selectedTicker }) {
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 50 });
  const [sortModel, setSortModel] = useState([{ field: 'Investor_Score', sort: 'desc' }]);
  const [focusedRowIndex, setFocusedRowIndex] = useState(null);

  const columns = [
    {
      field: 'Investor_Score',
      headerName: 'Score',
      width: 90,
      type: 'number',
      valueFormatter: (value) => {
        const num = parseFloat(value);
        return isNaN(num) ? '-' : num.toFixed(0);
      },
      cellClassName: (params) => {
        const num = parseFloat(params.value);
        if (isNaN(num)) return '';
        if (num >= 80) return 'score-high';
        if (num >= 50) return 'score-medium';
        return 'score-low';
      },
    },
    {
      field: 'identity',
      headerName: 'Company',
      width: 260,
      sortable: false,
      renderCell: (params) => {
        const ticker = String(params.row.Ticker || '').toUpperCase();
        const name = params.row.Company || '';
        const sector = params.row.Sector || '-';
        const industry = params.row.Industry || '-';
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, justifyContent: 'center', height: '100%' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{name} ({ticker})</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
              <Box component='span'>{sector}</Box>
              <Box component='span' sx={{ mx: 0.5 }}>{'•'}</Box>
              <Box component='span'>{industry}</Box>
              <Box component='span' sx={{ ml: 0.75, display: 'inline-flex', alignItems: 'center' }}>
                <CountryFlag country={params.row.Country} width={16} height={12} />
              </Box>
            </Typography>
          </Box>
        );
      },
    },
    {
      field: 'Price',
      headerName: 'Price',
      width: 100,
      type: 'number',
      valueFormatter: (value) => formatPrice(value),
      align: 'right',
      headerAlign: 'right',
    },
    {
      field: 'Change',
      headerName: 'Change',
      width: 100,
      type: 'number',
      valueFormatter: (value) => formatSignedPercent(value),
      cellClassName: (params) => {
        const num = parseFloat(params.value);
        if (isNaN(num)) return '';
        return num > 0 ? 'change-positive' : num < 0 ? 'change-negative' : '';
      },
      align: 'right',
      headerAlign: 'right',
    },
    {
      field: 'Market Cap',
      headerName: 'Market Cap',
      width: 120,
      type: 'number',
      valueFormatter: (value) => formatMoney(value),
      align: 'right',
      headerAlign: 'right',
    },
    {
      field: 'Volume',
      headerName: 'Volume',
      width: 100,
      type: 'number',
      valueFormatter: (value) => formatVolume(value),
      align: 'right',
      headerAlign: 'right',
    },
    {
      field: 'P/E',
      headerName: 'P/E',
      width: 80,
      type: 'number',
      valueFormatter: (value) => formatNumber(value, 2),
      align: 'right',
      headerAlign: 'right',
    },
    {
      field: 'Fwd P/E',
      headerName: 'Fwd P/E',
      width: 80,
      type: 'number',
      valueFormatter: (value) => formatNumber(value, 2),
      align: 'right',
      headerAlign: 'right',
    },
    {
      field: 'PEG',
      headerName: 'PEG',
      width: 80,
      type: 'number',
      valueFormatter: (value) => formatNumber(value, 2),
      align: 'right',
      headerAlign: 'right',
    },
    {
      field: 'P/S',
      headerName: 'P/S',
      width: 80,
      type: 'number',
      valueFormatter: (value) => formatNumber(value, 2),
      align: 'right',
      headerAlign: 'right',
    },
    {
      field: 'P/B',
      headerName: 'P/B',
      width: 80,
      type: 'number',
      valueFormatter: (value) => formatNumber(value, 2),
      align: 'right',
      headerAlign: 'right',
    },
    {
      field: 'ROE',
      headerName: 'ROE',
      width: 90,
      type: 'number',
      valueFormatter: (value) => formatPercent(value),
      align: 'right',
      headerAlign: 'right',
    },
    {
      field: 'ROA',
      headerName: 'ROA',
      width: 90,
      type: 'number',
      valueFormatter: (value) => formatPercent(value),
      align: 'right',
      headerAlign: 'right',
    },
    {
      field: 'ROIC',
      headerName: 'ROIC',
      width: 80,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
    },
    {
      field: 'Profit M',
      headerName: 'Profit M',
      width: 90,
      type: 'number',
      valueFormatter: (value) => formatPercent(value),
      align: 'right',
      headerAlign: 'right',
    },
    {
      field: 'Gross M',
      headerName: 'Gross M',
      width: 90,
      type: 'number',
      valueFormatter: (value) => formatPercent(value),
      align: 'right',
      headerAlign: 'right',
    },
    {
      field: 'EPS This Y',
      headerName: 'EPS This Y',
      width: 100,
      type: 'number',
      valueFormatter: (value) => formatPercent(value),
      align: 'right',
      headerAlign: 'right',
    },
    {
      field: 'EPS Next Y',
      headerName: 'EPS Next Y',
      width: 100,
      type: 'number',
      valueFormatter: (value) => formatPercent(value),
      align: 'right',
      headerAlign: 'right',
    },
    {
      field: 'EPS Next 5Y',
      headerName: 'EPS Next 5Y',
      width: 110,
      type: 'number',
      valueFormatter: (value) => formatPercent(value),
      align: 'right',
      headerAlign: 'right',
    },
    {
      field: 'Sales Past 5Y',
      headerName: 'Sales Past 5Y',
      width: 120,
      type: 'number',
      valueFormatter: (value) => formatPercent(value),
      align: 'right',
      headerAlign: 'right',
    },
    {
      field: 'Beta',
      headerName: 'Beta',
      width: 80,
      type: 'number',
      valueFormatter: (value) => formatNumber(value, 2),
      align: 'right',
      headerAlign: 'right',
    },
    {
      field: 'SMA50',
      headerName: 'SMA50',
      width: 90,
      type: 'number',
      valueFormatter: (value) => formatPercent(value),
      align: 'right',
      headerAlign: 'right',
    },
    {
      field: 'SMA200',
      headerName: 'SMA200',
      width: 90,
      type: 'number',
      valueFormatter: (value) => formatPercent(value),
      align: 'right',
      headerAlign: 'right',
    },
    {
      field: '52W High',
      headerName: '52W High',
      width: 100,
      type: 'number',
      valueFormatter: (value) => formatPercent(value),
      align: 'right',
      headerAlign: 'right',
    },
    {
      field: '52W Low',
      headerName: '52W Low',
      width: 100,
      type: 'number',
      valueFormatter: (value) => formatPercent(value),
      align: 'right',
      headerAlign: 'right',
    },
    {
      field: 'RSI',
      headerName: 'RSI',
      width: 80,
      type: 'number',
      valueFormatter: (value) => formatNumber(value, 2),
      align: 'right',
      headerAlign: 'right',
    },
  ];

  const rows = useMemo(() => data.map((row, index) => ({
    id: row.Ticker || index,
    ...row,
  })), [data]);

  const sortedRows = useMemo(() => {
    const sorted = [...rows];
    if (sortModel.length > 0) {
      const { field, sort } = sortModel[0];
      sorted.sort((a, b) => {
        const aVal = a[field] ?? '';
        const bVal = b[field] ?? '';
        if (sort === 'asc') {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        }
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      });
    }
    return sorted;
  }, [rows, sortModel]);

  const visibleRows = useMemo(() => {
    const start = paginationModel.page * paginationModel.pageSize;
    const end = start + paginationModel.pageSize;
    return sortedRows.slice(start, end);
  }, [sortedRows, paginationModel]);

  const handleSortModelChange = (model) => {
    setSortModel(model);
    setFocusedRowIndex(null); // Reset focus when sorting changes
    if (model.length > 0) {
      trackTableInteraction('sort', {
        field: model[0].field,
        sort: model[0].sort,
      });
    }
  };

  const handlePaginationModelChange = (model) => {
    setPaginationModel(model);
    setFocusedRowIndex(null); // Reset focus when page changes
    trackTableInteraction('pagination', {
      page: model.page,
      pageSize: model.pageSize,
    });
  };

  const handleRowClick = (params) => {
    trackTableInteraction('row_click', {
      ticker: params.row.Ticker,
      company: params.row.Company,
    });
    onStockSelect(params.row.Ticker);
  };

  // Keyboard navigation - select immediately on arrow key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (visibleRows.length === 0) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        let currentIndex = focusedRowIndex;

        // If no focused index, find currently selected ticker's index
        if (currentIndex === null && selectedTicker) {
          currentIndex = visibleRows.findIndex(r => r.Ticker === selectedTicker);
          if (currentIndex === -1) currentIndex = null;
        }

        const newIndex = currentIndex === null
          ? 0
          : Math.min(currentIndex + 1, visibleRows.length - 1);
        setFocusedRowIndex(newIndex);

        const selectedRow = visibleRows[newIndex];
        if (selectedRow) {
          trackTableInteraction('keyboard_navigate', {
            ticker: selectedRow.Ticker,
            company: selectedRow.Company,
            direction: 'down'
          });
          onStockSelect(selectedRow.Ticker);
        }
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        let currentIndex = focusedRowIndex;

        // If no focused index, find currently selected ticker's index
        if (currentIndex === null && selectedTicker) {
          currentIndex = visibleRows.findIndex(r => r.Ticker === selectedTicker);
          if (currentIndex === -1) currentIndex = null;
        }

        const newIndex = currentIndex === null
          ? visibleRows.length - 1
          : Math.max(currentIndex - 1, 0);
        setFocusedRowIndex(newIndex);

        const selectedRow = visibleRows[newIndex];
        if (selectedRow) {
          trackTableInteraction('keyboard_navigate', {
            ticker: selectedRow.Ticker,
            company: selectedRow.Company,
            direction: 'up'
          });
          onStockSelect(selectedRow.Ticker);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedRowIndex, onStockSelect, selectedTicker, visibleRows]);

  return (
    <>
      <Box
        sx={{
          height: '100%',
          bgcolor: 'background.paper',
          borderRadius: 3,
          '& .MuiDataGrid-root': {
            border: 'none',
          },
          '& .MuiDataGrid-columnHeaders': {
            bgcolor: 'rgba(31, 34, 55, 0.8)',
            borderRadius: '12px 12px 0 0',
          },
          '& .MuiDataGrid-virtualScroller': {
            bgcolor: 'background.paper',
          },
          '& .score-high': {
            bgcolor: 'rgba(0, 212, 170, 0.15)',
            color: COLORS.success,
            fontWeight: 700,
          },
          '& .score-medium': {
            bgcolor: 'rgba(139, 127, 245, 0.15)',
            color: COLORS.primary,
            fontWeight: 700,
          },
          '& .score-low': {
            bgcolor: 'rgba(255, 107, 107, 0.15)',
            color: COLORS.danger,
            fontWeight: 700,
          },
          '& .change-positive': {
            color: COLORS.success,
            fontWeight: 600,
          },
          '& .change-negative': {
            color: COLORS.danger,
            fontWeight: 600,
          },
          '& .MuiDataGrid-row': {
            cursor: 'pointer',
          },
          '& .MuiDataGrid-row.selected-row': {
            bgcolor: 'action.selected',
            '&:hover': {
              bgcolor: 'action.hover',
            },
          },
          '& .MuiDataGrid-row.focused-row': {
            outline: '2px solid',
            outlineColor: COLORS.primary,
            outlineOffset: '-2px',
          },
        }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          paginationModel={paginationModel}
          sortModel={sortModel}
          pageSizeOptions={[25, 50, 100]}
          disableRowSelectionOnClick
          density="compact"
          getRowHeight={() => 54}
          getRowClassName={(params) => {
            const rowIndex = visibleRows.findIndex(r => r.id === params.id);
            const isFocused = focusedRowIndex !== null && rowIndex === focusedRowIndex;
            const isSelected = params.row.Ticker === selectedTicker;

            if (isFocused && isSelected) return 'focused-row selected-row';
            if (isFocused) return 'focused-row';
            if (isSelected) return 'selected-row';
            return '';
          }}
          onSortModelChange={handleSortModelChange}
          onPaginationModelChange={handlePaginationModelChange}
          onRowClick={handleRowClick}
        />
      </Box>
    </>
  );
}
