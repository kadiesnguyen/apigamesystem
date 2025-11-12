import { Theme } from '@mui/material';
import { Components } from '@mui/material/styles/components';
import pxToRem from 'theme/functions/pxToRem';

const OutlinedInputComponent: Components<Omit<Theme, 'components'>>['MuiOutlinedInput'] = {
  defaultProps: {
    notched: false,
  },
  styleOverrides: {
    input: ({ theme }) => ({
      height: pxToRem(22),
      paddingTop: theme.spacing(1.5),
      paddingRight: 1,
      paddingBottom: theme.spacing(1.5),
    }),
    inputSizeSmall: ({ theme }) => ({
      paddingTop: theme.spacing(0.75),
      paddingBottom: theme.spacing(0.75),
    }),
    notchedOutline: ({ theme }) => ({
      borderColor: theme.palette.action.focus,
    }),
  },
};

export default OutlinedInputComponent;
