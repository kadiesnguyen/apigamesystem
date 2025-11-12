import { Box, BoxProps } from '@mui/material';
import { forwardRef, ReactNode } from 'react';
import SwiperCore from 'swiper';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/scrollbar';
import { Navigation } from 'swiper/modules';
import { Swiper, SwiperProps, SwiperRef } from 'swiper/react';

SwiperCore.use([Navigation]);

export interface SwiperComponentProps extends BoxProps {
  children: ReactNode;
  swiperProps?: SwiperProps;
}

const ReactSwiper = forwardRef<SwiperRef, SwiperComponentProps>(
  ({ swiperProps, children, ...rest }, ref) => {
    return (
      <Box {...rest}>
        <Swiper ref={ref} {...swiperProps}>
          {children}
        </Swiper>
      </Box>
    );
  },
);

export default ReactSwiper;
