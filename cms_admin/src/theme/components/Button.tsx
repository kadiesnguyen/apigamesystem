import { Theme } from '@mui/material';
import { Components } from '@mui/material/styles/components';
import pxToRem from 'theme/functions/pxToRem';

declare module '@mui/material' {
  interface ButtonPropsColorOverrides {
    neutral: true;
  }
}

const ButtonComponent: Components<Omit<Theme, 'components'>>['MuiButton'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      ...theme.typography.button,
      '&.Mui-disabled': {
        backgroundColor: theme.palette.action.disabled,
        boxShadow: 'none',
        color: theme.palette.text.disabled,
      },
      '&:hover': {
        boxShadow: theme.shadows[5],
      },
    }),
    text: ({ theme }) => ({
      backgroundColor: 'transparent',
      '&:hover': {
        backgroundColor: 'transparent',
        boxShadow: theme.shadows[0],
      },
    }),
    outlined: ({ theme }) => ({
      ...theme.typography.caption,
      fontWeight: theme.typography.fontWeightMedium,
      paddingTop: theme.spacing(1),
      paddingBottom: theme.spacing(1),
      borderRadius: theme.shape.borderRadius * 12.5,
    }),
    textPrimary: ({ theme }) => ({
      '&.Mui-disabled': {
        color: theme.palette.action.disabled,
      },
    }),
    outlinedPrimary: ({ theme }) => ({
      color: theme.palette.primary.darker,
      borderColor: theme.palette.primary.darker,
      '&:hover': {
        color: theme.palette.primary.main,
        borderColor: theme.palette.primary.main,
      },
      '&.Mui-disabled': {
        backgroundColor: theme.palette.action.disabledBackground,
        color: theme.palette.action.disabled,
      },
    }),
    sizeSmall: ({ theme }) => ({
      ...theme.typography.button,
      lineHeight: 1.1,
      paddingLeft: pxToRem(8),
      paddingRight: pxToRem(8),
    }),
    sizeMedium: ({ theme }) => ({
      fontSize: theme.typography.pxToRem(15),
      lineHeight: 1.6,
      paddingTop: pxToRem(7),
      paddingBottom: pxToRem(7),
      paddingLeft: pxToRem(14),
      paddingRight: pxToRem(14),
    }),
    sizeLarge: ({ theme }) => ({
      fontSize: theme.typography.pxToRem(18),
      lineHeight: 1.8,
      paddingLeft: theme.spacing(3),
      paddingRight: theme.spacing(3),
    }),
  },
};

export default ButtonComponent;
