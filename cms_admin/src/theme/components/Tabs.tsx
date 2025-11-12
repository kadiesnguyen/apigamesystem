import { Theme } from '@mui/material';
import { Components } from '@mui/material/styles/components';

const TabsComponent: Components<Omit<Theme, 'components'>>['MuiTabs'] = {
  defaultProps: {},
  styleOverrides: {
    root: ({ theme }) => ({
      ...theme.typography.button,
      minHeight: theme.spacing(0),
    }),
    indicator: {
      height: 3,
      borderTopLeftRadius: 4,
      borderTopRightRadius: 4,
    },
  },
};

export default TabsComponent;
