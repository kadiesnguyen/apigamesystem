import { Box, Container, Grid, Link, Stack, Typography } from '@mui/material';
import IconifyIcon from 'components/base/IconifyIcon';

/* ----------------  Links Data  ------------------------------ */
const data = [
  { href: '#!', title: 'Themewagon', key: 'team' },
  { href: '#!', title: 'About Us', key: 'about' },
  { href: '#!', title: 'Blog ', key: 'blog' },
  { href: '#!', title: 'License ', key: 'license' },
];
/* ------------------------------------------------------------ */
const Footer = () => {
  return (
    <>
      <Box component="section" textAlign="center">
        <Container maxWidth="xl" disableGutters>
          <Box pb={2.5}>
            <Grid container justifyContent="space-between" alignItems="center">
              <Grid item xs={12} lg="auto">
                <Stack
                  alignItems="center"
                  sx={{
                    flexDirection: {
                      xs: 'column',
                      lg: 'row',
                    },
                    gap: 1,
                  }}
                >
                  <Typography
                    fontWeight="regular"
                    sx={{ fontSize: { xs: 'caption.fontSize', md: 'body2.fontSize' } }}
                  >
                    &copy; {new Date().getFullYear()}, Your Company Inc.
                  </Typography>
                  <Typography
                    mb={0}
                    sx={{ fontSize: { xs: 'caption.fontSize', md: 'body2.fontSize' } }}
                  >
                    Made with
                    <IconifyIcon
                      icon="ri:heart-fill"
                      width={15}
                      sx={{ mx: 1, pt: 0.2, color: 'error.main' }}
                    />
                    by
                    <Link
                      href="https://themewagon.com/"
                      target="_blank"
                      color="inherit"
                      sx={{
                        textDecoration: 'none',
                        transition: 'background 1s, color 0.5s',
                        ml: 1,
                        fontWeight: 'bold',
                        '&:hover': { color: 'primary.main' },
                      }}
                    >
                      ThemeWagon
                    </Link>
                  </Typography>
                </Stack>
              </Grid>
              <Grid item xs={12} lg="auto" mb={{ xs: 1, lg: 0 }} alignItems="center">
                <Stack
                  flexDirection="row"
                  flexWrap="wrap"
                  alignItems="center"
                  justifyContent="center"
                  component="ul"
                  sx={{
                    listStyle: 'none',
                    mt: { xs: 3, lg: 0 },
                    mb: 0,
                    p: 0,
                  }}
                >
                  {data?.map((link) => (
                    <Link
                      fontWeight="regular"
                      color="text.secondary"
                      key={link.key}
                      href={`${link.href}`}
                      sx={{
                        px: 2,
                        lineHeight: 1,
                        '& :hover': { color: 'primary.main' },
                        fontSize: { xs: 'button.fontSize', md: 'body1.fontSize' },
                      }}
                    >
                      {link.title}
                    </Link>
                  ))}
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </Container>
      </Box>
    </>
  );
};

export default Footer;
