import { Box, Button, Container, Link, Typography } from '@mui/material';
import NotFoundSVG from 'assets/not-found.svg';
import Image from 'components/base/Image';
const NotFoundPage = () => {
  return (
    <Container>
      <Box
        sx={{
          py: 12,
          maxWidth: 480,
          mx: 'auto',
          display: 'flex',
          minHeight: '100vh',
          textAlign: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <Typography variant="h3" sx={{ mb: 3 }}>
          Oops! Page Not Found
        </Typography>

        <Typography sx={{ color: 'text.secondary' }}>
          We couldn’t locate the page you’re trying to reach. We apologize for any inconvenience
          this may have caused. Thank you for your understanding!
        </Typography>

        <Image
          alt="Not Found Image"
          src={NotFoundSVG}
          sx={{
            mx: 'auto',
            height: 260,
            my: { xs: 1, sm: 2 },
            width: { xs: 1, sm: 340 },
          }}
        />

        <Button
          href="/"
          size="large"
          variant="contained"
          component={Link}
          sx={{ '&:hover': { color: 'common.white' } }}
        >
          Go Home
        </Button>
      </Box>
    </Container>
  );
};

export default NotFoundPage;
