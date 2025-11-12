import { Box, Card, Stack, Typography } from '@mui/material';
import ForgetPasswordForm from 'components/sections/authentication/ForgotPasswordForm';

const ForgetPasswordPage = () => {
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
          <Box p={1}>
            <Typography variant="h4" fontWeight="700">
              Forgot your password?
            </Typography>

            <Typography
              color="textSecondary"
              variant="body1"
              fontWeight="400"
              sx={{ mb: 2.5, mt: 1.5 }}
            >
              Please enter the email address associated with your account
            </Typography>
            <ForgetPasswordForm />
          </Box>
        </Card>
      </Stack>
    </Box>
  );
};

export default ForgetPasswordPage;
