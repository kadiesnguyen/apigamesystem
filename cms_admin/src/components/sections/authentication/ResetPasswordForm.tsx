import { Button, Divider, Link, Stack, TextField, Typography } from '@mui/material';
import { useBreakpoints } from 'providers/useBreakpoints';
import { useState } from 'react';

const ResetPasswordForm = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { up } = useBreakpoints();
  const upSM = up('sm');
  const handleSubmit = () => {
    console.log('New password:', password);
  };

  return (
    <>
      <Stack spacing={3}>
        <TextField
          fullWidth
          size={upSM ? 'medium' : 'small'}
          type="password"
          name="password"
          label="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <TextField
          fullWidth
          size={upSM ? 'medium' : 'small'}
          type="password"
          name="confirmPassword"
          label="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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
        disabled={!password || password !== confirmPassword}
      >
        Reset Password
      </Button>
      <Divider sx={{ my: 3 }}>
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
        sx={{ mt: 3 }}
      >
        Back to Sign-in
      </Button>
    </>
  );
};

export default ResetPasswordForm;
