import { Theme } from '@mui/material';
import { Components } from '@mui/material/styles/components';

const AvatarComponent: Components<Omit<Theme, 'components'>>['MuiAvatar'] = {
  defaultProps: {},
  styleOverrides: {
    root: ({ theme }) => ({
      boxShadow: theme.shadows[0],
      width: theme.spacing(6.25),
      height: theme.spacing(6.25),
    }),
  },
};

export default AvatarComponent;
