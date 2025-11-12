import { Theme } from '@mui/material';
import { Components } from '@mui/material/styles/components';

const InputBaseComponent: Components<Omit<Theme, 'components'>>['MuiInputBase'] = {
  styleOverrides: {
    root: {
      '& .Mui-focused': {
        outline: 0,
        borderColor: 'success.main',
        borderStyle: 'solid',
        boxShadow: '',
      },
    },
    input: () => ({
      '&::placeholder': {
        opacity: 1,
      },
    }),
    multiline: ({ theme }) => ({
      padding: `${theme.typography.pxToRem(10)} ${theme.typography.pxToRem(12)}`,
    }),
  },
};

export default InputBaseComponent;
