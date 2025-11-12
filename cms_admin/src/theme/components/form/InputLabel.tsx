import { Theme } from '@mui/material';
import { Components } from '@mui/material/styles/components';

const InputLabelComponent: Components<Omit<Theme, 'components'>>['MuiInputLabel'] = {
  defaultProps: { shrink: true },
  styleOverrides: {
    root: ({ theme }) => ({
      position: 'relative',
      color: theme.palette.text.primary,
      paddingBottom: theme.spacing(0.6),
    }),
    shrink: {
      transform: 'translate(0px, 0px)',
    },
  },
};

export default InputLabelComponent;
