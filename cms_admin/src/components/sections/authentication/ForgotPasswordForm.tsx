import { Button, Divider, Link, Stack, TextField, Typography } from '@mui/material';
import { useBreakpoints } from 'providers/useBreakpoints';
import { useState } from 'react';

const ForgetPasswordForm = () => {
  const [email, setEmail] = useState('');
  const { up } = useBreakpoints();
  const upSM = up('sm');

  const handleSubmit = () => {
    // Handle password reset logic here
    console.log('Reset password for:', email);
  };

  return (
    <>
      <Stack spacing={3}>
        <TextField
          fullWidth
          size={upSM ? 'medium' : 'small'}
          name="email"
          label="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Stack>

      <Button
        fullWidth
        size={upSM ? 'large' : 'medium'}
        type="submit"
        variant="contained"
        color="primary"
        sx={{ mt: 3 }}
        onClick={handleSubmit}
      >
        Send Reset Password Link
      </Button>
      <Divider sx={{ my: 2 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          OR
        </Typography>
      </Divider>
      <Typography textAlign="center" fontWeight={400} color="text.primary" variant="subtitle1">
        Remembered your Password?
      </Typography>
      <Button
        component={Link}
        href="/authentication/login"
        fullWidth
        size={upSM ? 'large' : 'medium'}
        type="submit"
        variant="contained"
        color="primary"
        sx={{ mt: 3, '&:hover': { color: 'common.white' } }}
      >
        Back to Sign-in
      </Button>
    </>
  );
};

export default ForgetPasswordForm;
