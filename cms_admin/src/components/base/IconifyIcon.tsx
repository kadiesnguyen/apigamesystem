import { Icon, IconProps } from '@iconify/react';
import { Box, BoxProps } from '@mui/material';

interface IconifyProps extends BoxProps {
  icon: IconProps['icon'];
}

const IconifyIcon = ({ icon, width = 20, sx, ...rest }: IconifyProps) => {
  const baseStyles = {
    width,
    height: width,
    flexShrink: 0,
    display: 'inline-flex',
  };
  return <Box component={Icon} icon={icon} sx={{ ...baseStyles, ...sx }} {...rest} />;
};

export default IconifyIcon;
