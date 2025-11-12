import { Theme } from '@mui/material';
import { Components } from '@mui/material/styles/components';

const CardComponent: Components<Omit<Theme, 'components'>>['MuiCard'] = {
  defaultProps: {},
  styleOverrides: {
    root: ({ theme }) => ({
      backgroundColor: theme.palette.common.white,
      backgroundClip: 'border-box',
      borderRadius: theme.shape.borderRadius * 6.25,
      boxShadow: theme.shadows[0],
    }),
  },
};

export default CardComponent;
