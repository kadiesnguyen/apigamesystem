import { Theme } from '@mui/material';
import { Components } from '@mui/material/styles/components';

const InputAdornment: Components<Omit<Theme, 'components'>>['MuiInputAdornment'] = {
  defaultProps: { variant: 'standard' },
  styleOverrides: {
    root: ({ theme }) => ({
      cursor: 'pointer',
      '& .iconify': {
        flexShrink: 0,
        width: theme.spacing(2),
        height: theme.spacing(2),
      },
      marginRight: theme.spacing(0.5),
      marginLeft: theme.spacing(0.5),
      paddingTop: 0,
    }),
    positionStart: ({ theme }) => ({ paddingLeft: theme.spacing(0.5) }),
    positionEnd: ({ theme }) => ({ paddingRight: theme.spacing(0.5) }),
  },
};

export default InputAdornment;
