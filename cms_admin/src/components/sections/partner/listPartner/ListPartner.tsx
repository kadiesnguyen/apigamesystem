'use client';
import {
  Avatar,
  Box,
  Button,
  Card,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid, GridColDef, GridPaginationModel, GridRowsProp } from '@mui/x-data-grid';
import IconifyIcon from 'components/base/IconifyIcon';
import CustomPagination from 'components/sections/dashboard/invoice/CustomPagination';
import NoData from 'components/sections/dashboard/invoice/NoData';
import { partnerRowData, RowPartnerData } from 'data/partner-data';
import { dateFormatFromUTC } from 'helpers/utils';
import { useBreakpoints } from 'providers/useBreakpoints';
import { SyntheticEvent, useEffect, useMemo, useState } from 'react';

const columns: GridColDef[] = [
  { flex: 0.1, minWidth: 80, field: 'index', headerName: 'STT' },
  {
    field: 'fullName',
    headerName: 'Full Name',
    flex: 1,
    minWidth: 150,
    renderCell: (params) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <Avatar src="./profile/image-2.png" />
        <Typography
          sx={{
            fontSize: '13px',
            fontWeight: 600,
            whiteSpace: 'normal',
            wordBreak: 'break-word',
          }}
        >
          {params.row.fullName}
        </Typography>
      </Box>
    ),
  },
  { field: 'id', headerName: 'ID', minWidth: 100, flex: 1 },
  { field: 'phone', headerName: 'Phone', minWidth: 100, flex: 1 },
  { field: 'username', headerName: 'Username', minWidth: 100, flex: 1 },
  { field: 'email', headerName: 'Email', minWidth: 100, flex: 1 },
  {
    field: 'status',
    headerName: 'Status',
    minWidth: 120,
    flex: 1,
    renderCell: (params) => (
      <Typography
        sx={{
          color: params.value === 'active' ? 'green' : 'red',
          fontWeight: 600,
        }}
      >
        {params.value}
      </Typography>
    ),
  },
  {
    field: 'createDate',
    headerName: 'Create date',
    minWidth: 130,
    flex: 1,
    renderCell: (params) => <>{dateFormatFromUTC(params.value)}</>,
  },
  {
    field: 'Action',
    headerName: 'Action',
    sortable: false,
    flex: 1,
    minWidth: 150,

    renderCell: (params) => (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', height: 'auto', gap: '5px' }}>
        <Button variant="outlined" size="medium" onClick={() => console.log(params.row)}>
          Edit
        </Button>
        <Button
          color="secondary"
          variant="outlined"
          size="medium"
          onClick={() => console.log(params.row)}
        >
          View
        </Button>
        <Button
          color="success"
          variant="outlined"
          size="medium"
          onClick={() => console.log(params.row)}
        >
          Approve
        </Button>
        <Button
          variant="outlined"
          color="warning"
          size="medium"
          onClick={() => console.log(params.row)}
        >
          Send Mail
        </Button>
      </Box>
    ),
  },
];

const a11yProps = (index: number) => ({
  id: `transaction-tab-${index}`,
  'aria-controls': `transaction-tabpanel-${index}`,
});

const ListPartnerTable: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<GridRowsProp<RowPartnerData>>([]);
  const [value, setValue] = useState(0);
  const [search, setSearch] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const { down } = useBreakpoints();

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 100,
  });

  useEffect(() => {
    if (partnerRowData) setItems(partnerRowData);
  }, []);

  const isXs = down('sm');
  const rowHeight = isXs ? 55 : 64;

  const handleChange = (event: SyntheticEvent, newValue: number) => setValue(newValue);

  const handlePaginationModelChange = (model: GridPaginationModel) => setPaginationModel(model);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => setLoading(false), 300);
  }, [value]);

  //   const filteredItems = useMemo(() => {
  //     return items.filter((item) => {
  //       if (search) {
  //         const matchName =
  //           item.fullName?.toLowerCase().includes(search.toLowerCase()) ||
  //           item.id?.toString().includes(search);
  //         const matchStatus = status ? item.status === status : true;
  //         return matchName && matchStatus;
  //       }
  //     });
  //   }, [items, search, status]);

  return (
    <Stack sx={{ overflow: 'auto', justifyContent: 'space-between' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'secondary.lighter', mb: 3.5 }}>
        <Tabs value={value} onChange={handleChange} aria-label="transaction tabs">
          <Tab label="All Partner" {...a11yProps(0)} />
        </Tabs>
      </Box>

      {/* Data Table */}
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
            boxShadow: (theme) => `inset 0px -1px ${theme.palette.neutral.light}`,
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            mb: 1.5,
            mt: 3,
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
            pl: 4,
            pr: 4,
          }}
        >
          <Typography
            sx={{
              fontSize: { xs: 'body2.fontSize', md: 'h6.fontSize', xl: 'h3.fontSize' },
              fontWeight: 600,
            }}
          >
            Partner Management
          </Typography>
          <Button
            variant="contained"
            color="primary"
            sx={{ mt: 4, height: '50px' }}
            onClick={() => alert('Add Partner clicked')}
          >
            + Add Partner
          </Button>
        </Box>

        {/* Filter/Search */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3, ml: 4 }}>
          <TextField
            type="text"
            // value={search}
            onChange={(e) => setSearch(e.target.value)}
            label="Tìm kiếm"
            placeholder="Tìm theo tên hoặc ID"
            size={'medium'}
            sx={{
              borderRadius: '15px',
              '& .MuiFilledInput-root': {
                borderRadius: '15px',
              },
              '&::placeholder': {
                color: 'text.secondary',
              },
            }}
          />

          <FormControl sx={{ m: 1, minWidth: 220 }}>
            <InputLabel id="demo-simple-select-helper-label">Trạng thái</InputLabel>
            <Select
              labelId="demo-simple-select-helper-label"
              id="demo-simple-select-helper"
              value={status}
              label="Trạng thái"
              onChange={(e) => setStatus(e.target.value)}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="suspended">Suspended</MenuItem>
            </Select>
          </FormControl>
        </Stack>
        <DataGrid
          getRowHeight={() => 'auto'}
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
            pagination: () => null,
          }}
          loading={loading}
          sx={{
            px: { xs: 0, md: 3 },
            '& .MuiDataGrid-main': { minHeight: 300 },
            '& .MuiDataGrid-columnHeader': { fontSize: { xs: 13, lg: 16 } },
            '& .MuiDataGrid-cell': { fontSize: { xs: 13, lg: 16 } },
          }}
        />
      </Card>

      {/* Pagination */}
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

export default ListPartnerTable;
