import { Stack, Typography } from '@mui/material';
import NoContentImage from 'assets/no-content.svg';
import Image from 'components/base/Image';

const NoData = () => {
  const title = 'No Data Available';
  const description = 'There is no data to display at the moment.';

  return (
    <Stack
      flexGrow={1}
      alignItems="center"
      justifyContent="center"
      sx={{
        px: 3,
        height: 1,
        py: 4,
      }}
    >
      <Image alt="empty content" src={NoContentImage} sx={{ width: 1, mr: 1.5, maxWidth: 160 }} />

      {title && (
        <Typography
          variant="h6"
          component="span"
          sx={{ mt: 1, textAlign: 'center', color: 'error.main' }}
        >
          {title}
        </Typography>
      )}

      {description && (
        <Typography variant="caption" sx={{ mt: 1, textAlign: 'center', color: 'text.disabled' }}>
          {description}
        </Typography>
      )}
    </Stack>
  );
};

export default NoData;
