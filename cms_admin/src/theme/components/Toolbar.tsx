import { Theme } from '@mui/material';
import { Components } from '@mui/material/styles/components';

const ToolbarComponent: Components<Omit<Theme, 'components'>>['MuiToolbar'] = {
  defaultProps: {
    variant: 'dense',
    disableGutters: true,
  },
  styleOverrides: {
    root: ({ theme }) => ({
      minHeight: theme.spacing(7.5),
    }),
    regular: ({ theme }) => ({
      height: theme.spacing(7.5),
      paddingLeft: theme.spacing(3),
    }),

    dense: ({ theme }) => ({
      justifyContent: 'center',
      minHeight: theme.spacing(7.5),
      height: theme.spacing(7.5),
      paddingLeft: theme.spacing(3.15),
      paddingRight: theme.spacing(3.15),
      [theme.breakpoints.up('md')]: {
        paddingLeft: theme.spacing(4.5),
        paddingRight: theme.spacing(4.5),
      },
      [theme.breakpoints.up('xl')]: {
        paddingLeft: theme.spacing(7),
        paddingRight: theme.spacing(7),
      },
    }),
  },
};

export default ToolbarComponent;
