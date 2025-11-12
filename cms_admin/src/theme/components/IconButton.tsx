import { Theme } from '@mui/material';
import { Components } from '@mui/material/styles/components';

const IconButtonComponent: Components<Omit<Theme, 'components'>>['MuiIconButton'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      color: theme.palette.primary.light,
      transition: 'all 0.3s ease-in-out',
    }),

    sizeMedium: ({ theme }) => ({
      padding: theme.spacing(1.5),
      fontSize: theme.typography.pxToRem(26),
    }),
    sizeLarge: ({ theme }) => ({
      fontSize: theme.typography.pxToRem(28),
    }),
    sizeSmall: ({ theme }) => ({
      fontSize: theme.typography.pxToRem(15),
      padding: theme.spacing(0.75),
    }),
  },
};

export default IconButtonComponent;
