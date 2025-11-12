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
          <Box pb={2.5}></Box>
        </Container>
      </Box>
    </>
  );
};

export default Footer;
