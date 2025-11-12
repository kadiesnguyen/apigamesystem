import { Button, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import IconifyIcon from 'components/base/IconifyIcon';
import { useBreakpoints } from 'providers/useBreakpoints';

const SendAmountInput = () => {
  const { up } = useBreakpoints();
  const upMd = up('md');
  return (
    <Stack
      direction="row"
      sx={{
        justifyContent: 'space-between',
        alignItems: 'center',
        width: 1,
        px: 0.5,
        gap: { xs: 1.5, sm: 3 },
      }}
    >
      <Typography
        fontWeight="regular"
        color="text.secondary"
        whiteSpace="nowrap"
        sx={{ fontSize: { xs: 'caption.fontSize', md: 'body2.fontSize' } }}
      >
        Write Amount
      </Typography>
      <TextField
        type="number"
        placeholder="525.50"
        InputProps={{
          endAdornment: (
            <InputAdornment position="start">
              <Button
                variant="contained"
                color="primary"
                type="submit"
                size={upMd ? 'large' : 'medium'}
                sx={{
                  borderRadius: 'inherit',
                  minWidth: { xs: 80, sm: 120 },
                }}
                endIcon={<IconifyIcon icon="ph:telegram-logo" color="common.white" />}
              >
                Send
              </Button>
            </InputAdornment>
          ),
        }}
        size={upMd ? 'medium' : 'small'}
        variant="filled"
        sx={() => ({
          '& .MuiFilledInput-root': {
            paddingRight: 0,
            borderRadius: 40,
          },
          '& .MuiInputAdornment-root': {
            borderRadius: 40,
          },

          '&::placeholder': {
            color: 'text.secondary',
            ml: 5,
          },
        })}
      />
    </Stack>
  );
};

export default SendAmountInput;
