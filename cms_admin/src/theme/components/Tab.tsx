import { Theme } from '@mui/material';
import { Components } from '@mui/material/styles/components';

const TabComponent: Components<Omit<Theme, 'components'>>['MuiTab'] = {
  defaultProps: {
    disableRipple: true,
    disableTouchRipple: true,
    disableFocusRipple: true,
  },
  styleOverrides: {
    root: ({ theme }) => ({
      ...theme.typography.button,
      [theme.breakpoints.up('md')]: {
        ...theme.typography.body2,
        marginRight: theme.spacing(10),
      },
      marginRight: theme.spacing(5),
      paddingTop: theme.spacing(1),
      paddingBottom: theme.spacing(1.5),
      paddingRight: theme.spacing(0),
      paddingLeft: theme.spacing(0),
      minWidth: 0,
    }),
  },
};

export default TabComponent;
