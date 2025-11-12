import { Theme } from '@mui/material';
import { Components } from '@mui/material/styles/components';

const ListItemComponent: Components<Omit<Theme, 'components'>>['MuiListItem'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      paddingTop: 0,
      paddingBottom: 0,
      cursor: 'pointer',
      borderRadius: theme.shape.borderRadius * 2,

      '& .MuiTypography-root': {
        transition: 'all .25s ease',
        WebkitTransition: 'all .25s ease',
      },
    }),
  },
};

export default ListItemComponent;
