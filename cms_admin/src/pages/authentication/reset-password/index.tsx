import { Box, Card, Stack, Typography } from '@mui/material';
import ResetPasswordForm from 'components/sections/authentication/ResetPasswordForm';

const ResetPasswordPage = () => {
  return (
    <Box
      sx={{
        width: 1,
        position: 'relative',
        zIndex: 100,
      }}
    >
      <Stack alignItems="center" justifyContent="center" sx={{ height: 1 }}>
        <Card
          sx={{
            p: { xs: 3, sm: 5 },
            width: 1,
            maxWidth: 480,
          }}
        >
          <Typography variant="h4">Reset Password</Typography>

          <Typography variant="subtitle1" color="neutral.main" sx={{ mt: 2, mb: 5 }}>
            Please enter your new password and confirm it below.
          </Typography>

          <ResetPasswordForm />
        </Card>
      </Stack>
    </Box>
  );
};

export default ResetPasswordPage;
