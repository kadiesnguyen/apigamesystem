import { Theme } from '@mui/material';
import type { TypographyOptions } from '@mui/material/styles/createTypography';
import pxToRem from 'theme/functions/pxToRem';

// ----------------------------------------------------------------------

declare module '@mui/material/styles' {
  interface TypographyVariants {
    fontSecondaryFamily: React.CSSProperties['fontFamily'];
    fontWeightSemiBold: React.CSSProperties['fontWeight'];
    fontWeightLight: React.CSSProperties['fontWeight'];
    fontWeightExtraBold: React.CSSProperties['fontWeight'];
  }
  interface TypographyVariantsOptions {
    fontSecondaryFamily?: React.CSSProperties['fontFamily'];
    fontWeightLight?: React.CSSProperties['fontWeight'];
    fontWeightSemiBold?: React.CSSProperties['fontWeight'];
    fontWeightExtraBold?: React.CSSProperties['fontWeight'];
  }
  interface ThemeVars {
    typography: Theme['typography'];
  }
}

const typography: TypographyOptions = {
  fontFamily: ['Inter', 'sans-serif'].join(','),
  fontWeightLight: 300,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightSemiBold: 600,
  fontWeightBold: 700,
  fontWeightExtraBold: 800,
  h1: {
    fontWeight: 600,
    fontSize: pxToRem(28), // 28 px
    lineHeight: 1.2143, // 34px
  },
  h2: {
    fontWeight: 600,
    fontSize: pxToRem(25), // 25 px
    lineHeight: 1.2, // 30 px
  },
  h3: {
    fontWeight: 600,
    fontSize: pxToRem(22), // 22px
    lineHeight: 1.22727, // 27px
  },
  h4: {
    fontWeight: 600,
    fontSize: pxToRem(20), // 20px
    lineHeight: 1.2, // 24px
  },
  h5: {
    fontWeight: 600,
    fontSize: pxToRem(17), // 17px
    lineHeight: 1.2353, // 21px
  },
  h6: {
    fontWeight: 500,
    fontSize: pxToRem(18), // 18px
    lineHeight: 1.2222, // 22px
  },
  subtitle1: {
    fontWeight: 600,
    fontSize: pxToRem(14), // 14px
    lineHeight: 1.2143, // 17 px
  },
  subtitle2: {
    fontWeight: 400,
    fontSize: pxToRem(13),
  },
  body1: {
    fontWeight: 400,
    fontSize: pxToRem(15), // 15px
    lineHeight: 1.2, // 18px
  },
  body2: {
    fontWeight: 500,
    fontSize: pxToRem(16), // 16px
    lineHeight: 1.1875, // 19px
  },
  button: {
    fontWeight: 500,
    fontSize: pxToRem(13), // 13px
    lineHeight: 1.2308, // 16px
    textTransform: 'capitalize',
  },
  caption: {
    fontWeight: 400,
    fontSize: pxToRem(12), // 12px
    lineHeight: 1.25, // 15px
  },
  overline: {
    fontWeight: 400,
    fontSize: pxToRem(10), // 10px
    lineHeight: 1.2, // 12px
  },
};

export default typography;
