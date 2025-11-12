import { Box, Card, Stack, Tab, Tabs, Typography } from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
  GridRowsProp,
  GridValidRowModel,
} from '@mui/x-data-grid';
import CustomPagination from 'components/sections/dashboard/invoice/CustomPagination';
import NoData from 'components/sections/dashboard/invoice/NoData';
import RenderCellDescription from 'components/sections/dashboard/invoice/RenderCellDescription';
import RenderCellDownload from 'components/sections/dashboard/invoice/RenderCellDownload';
import { invoiceRowData, RowData } from 'data/invoice-data';
import { currencyFormat, dateFormatFromUTC } from 'helpers/utils';
import { useBreakpoints } from 'providers/useBreakpoints';
import { SyntheticEvent, useEffect, useState } from 'react';

const columns: GridColDef[] = [
  {
    field: 'description',
    headerName: 'Description',
    width: 230,
    hideable: false,
    renderCell: (params) => <RenderCellDescription params={params} />,
    valueGetter: (params: GridValidRowModel) => params.title,
  },
  {
    field: 'transactionId',
    headerName: 'Transaction ID',
    flex: 1,
    minWidth: 150,
    hideable: false,
    renderCell: (params) => <>#{params.value}</>,
  },
  {
    field: 'type',
    headerName: 'Type',
    flex: 1,
    minWidth: 100,
    hideable: false,
  },
  {
    field: 'card',
    headerName: 'Card',
    minWidth: 100,
    flex: 1,
    hideable: false,
  },
  {
    field: 'date',
    headerName: 'Date',
    minWidth: 130,
    flex: 1,
    hideable: false,
    renderCell: (params) => <>{dateFormatFromUTC(params.value)}</>,
  },
  {
    field: 'amount',
    headerName: 'Amount',
    flex: 1,
    minWidth: 100,
    hideable: false,
    renderCell: (params) => {
      const color = params.row.description.revenue === 'down' ? 'error.main' : 'success.main';
      const symbol = params.row.description.revenue === 'down' ? '-' : '+';

      return (
        <Typography variant="body2" color={color}>
          {symbol} {currencyFormat(params.value)}
        </Typography>
      );
    },
  },
  {
    field: 'download',
    headerName: 'Download',
    sortable: false,
    flex: 1,
    minWidth: 150,
    renderCell: (params) => <RenderCellDownload params={params} />,
  },
];

const a11yProps = (index: number) => ({
  id: `transaction-tab-${index}`,
  'aria-controls': `transaction-tabpanel-${index}`,
});

let rowHeight = 60; // default row height

const InvoiceOverviewTable: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<GridRowsProp<RowData>>([]);
  const [value, setValue] = useState(0);
  const { down } = useBreakpoints();

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 5,
  });

  const isXs = down('sm');

  if (isXs) {
    rowHeight = 55;
  } else {
    rowHeight = 64;
  }

  const handleChange = (event: SyntheticEvent, newValue: number) => {
    setValue(newValue);
    filterData(newValue);
  };

  const handlePaginationModelChange = (model: GridPaginationModel) => {
    setPaginationModel(model);
  };

  const filterData = (tabIndex: number) => {
    switch (tabIndex) {
      case 1:
        setItems(invoiceRowData.filter((row) => row.description.revenue === 'up'));
        break;
      case 2:
        setItems(invoiceRowData.filter((row) => row.description.revenue === 'down'));
        break;
      default:
        setItems(invoiceRowData);
        break;
    }
  };

  useEffect(() => {
    setLoading(true);
    filterData(value);
    setLoading(false);
  }, [value]);

  return (
    <Stack sx={{ overflow: 'auto', justifyContent: 'space-between' }}>
      <Box sx={{ mb: 1.5, mt: 3 }}>
        <Typography
          sx={{
            fontSize: {
              xs: 'body2.fontSize',
              md: 'h6.fontSize',
              xl: 'h3.fontSize',
            },
            fontWeight: 600,
          }}
        >
          Recent Invoice
        </Typography>
      </Box>
      <Box sx={{ borderBottom: 1, borderColor: 'secondary.lighter', mb: 3.5 }}>
        <Tabs value={value} onChange={handleChange} aria-label="transaction tabs">
          <Tab label="All Transactions" {...a11yProps(0)} />
          <Tab label="Income" {...a11yProps(1)} />
          <Tab label="Expense" {...a11yProps(2)} />
        </Tabs>
      </Box>
      <Card
        sx={{
          flexGrow: { md: 1 },
          display: { md: 'flex' },
          flexDirection: { md: 'column' },
          overflow: 'hidden',
          borderRadius: 6.5,
          '&.MuiPaper-root': {
            p: 1,
            border: 1,
            borderColor: 'neutral.light',
            bgcolor: { xs: 'transparent', sm: 'white' },
            boxShadow: (theme) => `inset 0px -1px ${theme.palette.neutral.light}`, // color for row border
          },
        }}
      >
        <DataGrid
          rowHeight={rowHeight}
          rows={items.slice(
            paginationModel.page * paginationModel.pageSize,
            (paginationModel.page + 1) * paginationModel.pageSize,
          )}
          rowCount={items.length}
          columns={columns}
          disableRowSelectionOnClick
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={handlePaginationModelChange}
          slots={{
            noRowsOverlay: () => <NoData />,
            pagination: () => null, // Hide the default pagination component
          }}
          loading={loading}
          sx={{
            px: { xs: 0, md: 3 },
            '& .MuiDataGrid-main': {
              minHeight: 300,
            },
            '& .MuiDataGrid-virtualScroller': {
              minHeight: 300,
              p: 0,
            },
            '& .MuiDataGrid-columnHeader': {
              fontSize: { xs: 13, lg: 16 },
            },
            '& .MuiDataGrid-cell': {
              fontSize: { xs: 13, lg: 16 },
            },
            '& .MuiTypography-root': {
              fontSize: { xs: 13, lg: 16 },
            },
          }}
        />
      </Card>
      <Box sx={{ mt: 2, display: 'flex', justifyContent: { xs: 'center', md: 'flex-end' } }}>
        <CustomPagination
          page={paginationModel.page + 1}
          pageCount={Math.ceil(items.length / paginationModel.pageSize)}
          onPageChange={(event, value) =>
            setPaginationModel((prev) => ({ ...prev, page: value - 1 }))
          }
        />
      </Box>
    </Stack>
  );
};

export default InvoiceOverviewTable;
