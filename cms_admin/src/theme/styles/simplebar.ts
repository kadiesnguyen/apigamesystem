import { Theme } from '@mui/material';

const simplebar = (theme: Theme) => ({
  '& .simplebar-track': {
    '&.simplebar-vertical': {
      '& .simplebar-scrollbar': {
        '&:before': {
          cursor: 'grab',
          backgroundColor: theme.palette.neutral.main,
        },

        '&.simplebar-visible': {
          '&:before': {
            opacity: 0.9,
          },
        },
      },
    },
    '&.simplebar-horizontal': {
      '& .simplebar-scrollbar': {
        '&:before': {
          cursor: 'grab',
          backgroundColor: theme.palette.neutral.main,
        },
      },
    },
  },
});
export default simplebar;
