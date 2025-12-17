import { DataGrid, GridRow } from '@mui/x-data-grid';
import { Box, Tooltip, Typography } from '@mui/material';
import { forwardRef, useState } from 'react';
import { formatMoney, formatVolume, formatPrice, formatNumber, formatCountry, formatPercent } from '../../shared/formatters';
import { StockTooltip } from './StockTooltip';
import { formatSignedPercent } from './StockTooltipConfig';
import { trackTableInteraction } from '../../shared/analytics';
import { StockScoreDrawer } from './StockScoreDrawer';

const COLORS = {
  success: '#00d4aa',
  danger: '#ff6b6b',
  primary: '#8b7ff5',
};

const TooltipRow = forwardRef(function TooltipRow(props, ref) {
  const { row } = props;
  const tooltipContent = row ? <StockTooltip stock={row} /> : '';

  return (
    <Tooltip
      title={tooltipContent}
      arrow
      followCursor
      enterDelay={150}
      componentsProps={{
        tooltip: {
          sx: {
            bgcolor: 'rgba(15,17,24,0.95)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
            maxWidth: 380,
            p: 1.5,
          },
        },
        arrow: {
          sx: { color: 'rgba(15,17,24,0.95)' },
        },
      }}
    >
      <GridRow ref={ref} {...props} />
    </Tooltip>
  );
});

export default function TableView({ data }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);

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
        const flag = formatCountry(params.row.Country);
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, justifyContent: 'center', height: '100%' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{name} ({ticker})</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
              <Box component='span'>{sector}</Box>
              <Box component='span' sx={{ mx: 0.5 }}>{'•'}</Box>
              <Box component='span'>{industry}</Box>
              <Box component='span' sx={{ ml: 0.75 }}>* {flag}</Box>
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

  const rows = data.map((row, index) => ({
    id: row.Ticker || index,
    ...row,
  }));

  const handleSortModelChange = (model) => {
    if (model.length > 0) {
      trackTableInteraction('sort', {
        field: model[0].field,
        sort: model[0].sort,
      });
    }
  };

  const handlePaginationModelChange = (model) => {
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
    setSelectedStock(params.row);
    setDrawerOpen(true);
  };

  return (
    <>
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
          '& .MuiDataGrid-row': {
            cursor: 'pointer',
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
          getRowHeight={() => 54}
          slots={{
            row: TooltipRow,
          }}
          onSortModelChange={handleSortModelChange}
          onPaginationModelChange={handlePaginationModelChange}
          onRowClick={handleRowClick}
        />
      </Box>

      <StockScoreDrawer
        open={drawerOpen}
        stock={selectedStock}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}
