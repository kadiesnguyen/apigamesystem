import { Pagination, PaginationItem, Stack, Typography } from '@mui/material';
import IconifyIcon from 'components/base/IconifyIcon';
import { ChangeEvent } from 'react';

const Prev = () => (
  <Stack direction="row" spacing={0.15} sx={{ alignItems: 'center' }}>
    <IconifyIcon icon="lets-icons:expand-left" />
    <Typography
      fontWeight="medium"
      sx={{
        fontSize: { xs: 'caption.fontSize', md: 'body1.fontSize' },
      }}
    >
      Previous
    </Typography>
  </Stack>
);

const Next = () => (
  <Stack direction="row" spacing={0.15} sx={{ alignItems: 'center' }}>
    <Typography
      fontWeight="medium"
      sx={{
        fontSize: { xs: 'caption.fontSize', md: 'body1.fontSize' },
      }}
    >
      Next
    </Typography>
    <IconifyIcon icon="lets-icons:expand-right" />
  </Stack>
);

interface CustomPaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (event: ChangeEvent<unknown>, value: number) => void;
}

const CustomPagination: React.FC<CustomPaginationProps> = ({ page, pageCount, onPageChange }) => {
  return (
    <Stack
      spacing={2}
      sx={{
        justifyContent: 'space-between',
        alignItems: 'end',
        py: 1.5,
        mt: 1.25,
      }}
    >
      <Pagination
        shape="rounded"
        page={page}
        count={pageCount}
        onChange={onPageChange}
        color="primary"
        sx={{
          flex: 1,
          px: 0,
        }}
        renderItem={(item) => (
          <PaginationItem
            {...item}
            slots={{
              previous: Prev,
              next: Next,
            }}
          />
        )}
      />
    </Stack>
  );
};

export default CustomPagination;
