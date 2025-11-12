import { Stack, StackProps } from '@mui/material';

import LinearProgress from '@mui/material/LinearProgress';

// ----------------------------------------------------------------------

const LoadingProgress = ({ sx, ...other }: StackProps) => {
  const content = (
    <Stack
      sx={{
        px: 5,
        width: 1,
        flexGrow: 1,
        minHeight: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...sx,
      }}
      {...other}
    >
      <LinearProgress color="primary" sx={{ width: 1, maxWidth: 360 }} />
    </Stack>
  );

  return content;
};

export default LoadingProgress;
