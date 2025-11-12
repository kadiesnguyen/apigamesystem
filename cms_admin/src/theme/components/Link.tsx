import { Theme } from '@mui/material';
import { Components } from '@mui/material/styles/components';
import { forwardRef } from 'react';
import { Link as RouterLink, LinkProps as RouterLinkProps } from 'react-router-dom';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LinkBehavior = forwardRef<any, Omit<RouterLinkProps, 'to'> & { href?: string }>(
  (props, ref) => <RouterLink ref={ref} to={props.href || '/'} {...props} />,
);
const LinkComponent: Components<Omit<Theme, 'components'>>['MuiLink'] = {
  defaultProps: {
    underline: 'none',
    component: LinkBehavior,
  },
  styleOverrides: {
    root: ({ theme }) => ({
      color: theme.palette.text.primary,
      cursor: 'pointer',
      transition: 'color 0.55s',
      WebkitTransition: 'color 0.55s',
      '&:hover': {
        color: theme.palette.text.primary,
        '& .MuiSvgIcon-root': { color: theme.palette.primary.main },
        boxShadow: theme.shadows[0],
      },
    }),
  },
};

export default LinkComponent;
