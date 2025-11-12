import { Theme } from '@mui/material';
import { Components } from '@mui/material/styles/components';

const PaginationComponent: Components<Omit<Theme, 'components'>>['MuiPagination'] = {
  defaultProps: { shape: 'rounded' },
  styleOverrides: {
    ul: ({ theme }) => ({
      position: 'relative',

      '& .MuiPaginationItem-root': {
        color: theme.palette.primary.main,
      },
      '& .MuiPaginationItem-previousNext.Mui-disabled': {
        color: theme.palette.primary.dark,
        opacity: 0.2,
      },
    }),
  },
};

export default PaginationComponent;
