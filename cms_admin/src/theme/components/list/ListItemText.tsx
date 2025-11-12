import { Theme } from '@mui/material';
import { Components } from '@mui/material/styles/components';

const ListItemTextComponent: Components<Omit<Theme, 'components'>>['MuiListItemText'] = {
  defaultProps: {},
  styleOverrides: {
    root: ({ theme }) => ({
      fontSize: theme.typography.pxToRem(14),
    }),
    multiline: ({ theme }) => ({
      marginTop: theme.spacing(1),
      marginBottom: theme.spacing(1),
      [`&.MuiListItemText-dense`]: {
        marginTop: theme.spacing(0.5),
        marginBottom: theme.spacing(0.5),
      },
    }),
  },
};

export default ListItemTextComponent;
