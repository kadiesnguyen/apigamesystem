import { Theme } from '@mui/material';
import { Components } from '@mui/material/styles/components';

const CardContentComponent: Components<Omit<Theme, 'components'>>['MuiCardContent'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      paddingLeft: theme.spacing(0),
      paddingRight: theme.spacing(0),
      '&:last-child': {
        paddingBottom: theme.spacing(1.25),
      },
      [theme.breakpoints.up('sm')]: {
        paddingLeft: theme.spacing(1),
        paddingRight: theme.spacing(1),
        '&:last-child': {
          paddingBottom: theme.spacing(1.5),
        },
      },
      [theme.breakpoints.up('md')]: {
        paddingLeft: theme.spacing(2),
        paddingRight: theme.spacing(2),
        '&:last-child': {
          paddingBottom: theme.spacing(2.5),
        },
      },
    }),
  },
};

export default CardContentComponent;
