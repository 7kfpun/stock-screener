import { DataGrid } from '@mui/x-data-grid';
import { Box } from '@mui/material';
import { useState, useCallback } from 'react';
import { formatMoney, formatVolume, formatPercent, formatPrice, formatNumber, formatCountry } from '../utils/formatters';

const COLORS = {
  success: '#00d4aa',
  danger: '#ff6b6b',
  primary: '#8b7ff5',
};

export default function TableView({ data }) {
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
    { field: 'Ticker', headerName: 'Ticker', width: 70 },
    { field: 'Company', headerName: 'Company', width: 200 },
    { field: 'Sector', headerName: 'Sector', width: 150 },
    { field: 'Industry', headerName: 'Industry', width: 180 },
    {
      field: 'Country',
      headerName: 'Co.',
      width: 45,
      valueFormatter: (value) => formatCountry(value),
      align: 'center',
      headerAlign: 'center',
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
      valueFormatter: (value) => {
        const num = parseFloat(value);
        if (isNaN(num)) return value;
        const formatted = formatPercent(value);
        return num > 0 ? `+${formatted}` : formatted;
      },
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

  const rows = data.map((row, index) => {
    // Convert all numeric fields to numbers for proper sorting
    const numericFields = [
      'Investor_Score', 'Price', 'Change', 'Market Cap', 'Volume',
      'P/E', 'Fwd P/E', 'PEG', 'P/S', 'P/B', 'ROE', 'ROA', 'ROIC',
      'Profit M', 'Gross M', 'EPS This Y', 'EPS Next Y', 'EPS Next 5Y',
      'Sales Past 5Y', 'Beta', 'SMA50', 'SMA200', '52W High', '52W Low', 'RSI'
    ];

    const processedRow = { id: index, ...row };

    numericFields.forEach(field => {
      const value = parseFloat(processedRow[field]);
      processedRow[field] = isNaN(value) ? null : value;
    });

    return processedRow;
  });

  return (
    <Box
      sx={{
        height: 'calc(100vh - 300px)',
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
      }}
    >
      <DataGrid
        rows={rows}
        columns={columns}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 50 },
          },
          sorting: {
            sortModel: [{ field: 'Investor_Score', sort: 'desc' }],
          },
        }}
        pageSizeOptions={[25, 50, 100]}
        disableRowSelectionOnClick
        density="compact"
      />
    </Box>
  );
}
