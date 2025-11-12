import CardContainer from 'components/common/CardContainter';
import { SwiperSlide } from 'swiper/react';

// Import Swiper styles
import Image1 from 'assets/profile/image-1.png';
import Image2 from 'assets/profile/image-2.png';
import Image3 from 'assets/profile/image-3.png';
import Image4 from 'assets/profile/image-4.png';
import Image5 from 'assets/profile/image-5.png';
import Image6 from 'assets/profile/image-6.png';
import Image7 from 'assets/profile/image-7.png';

// import Swiper styles
import 'swiper/css';
// import Swiper core and required modules
import { Box, IconButton, Stack } from '@mui/material';
import IconifyIcon from 'components/base/IconifyIcon';
import ReactSwiper, { SwiperComponentProps } from 'components/base/ReactSwiper';
import SendAmountInput from 'components/sections/dashboard/transfer/SendAmountInput';
import SlideItem from 'components/sections/dashboard/transfer/SlideItem';
import { useBreakpoints } from 'providers/useBreakpoints';
import { useState } from 'react';

/* ------------------------- Carousel Data ---------------------------- */
const ItemData = [
  { id: 1, image: Image3, name: 'Livia Bator', designation: 'CEO' },
  { id: 2, image: Image2, name: 'Randy Press', designation: 'Director' },
  { id: 3, image: Image1, name: 'Workman', designation: 'Designer' },
  { id: 4, image: Image4, name: 'Kevin Reed', designation: 'UX' },
  { id: 5, image: Image5, name: 'Sofia Gill', designation: 'Director' },
  { id: 6, image: Image6, name: 'Jo Barnes', designation: 'Analyst' },
  { id: 7, image: Image7, name: 'Felix Vidal', designation: 'CTO' },
];
/* -------------------------------------------------------------------------- */
const cardSize = { lg: 70, md: 50, sm: 50 }; // Adjust card size as needed

const QuickTransfer = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { only } = useBreakpoints();
  const isMd = only('md');
  const isSm = only('sm');

  const totalSlides = ItemData.length;
  const slidesPerView = (isMd && totalSlides >= 5) || (isSm && totalSlides >= 5) ? 5 : 3;

  const swiperProps: SwiperComponentProps['swiperProps'] = {
    navigation: { nextEl: '.arrow-left', prevEl: '.arrow-right' },
    slidesPerView: slidesPerView,
    spaceBetween: 15,
    slideToClickedSlide: true,
    loop: true,
    centeredSlides: true,
    slideActiveClass: 'swiper-slide-active',
    onRealIndexChange: (swiper) => setCurrentSlide(swiper.realIndex),
    passiveListeners: true,
  };

  return (
    <CardContainer title="Quick Transfer">
      <Stack gap={4} justifyContent="space-between" sx={{ flex: 1, pl: 0.5 }}>
        <Stack direction="row" sx={{ alignItems: 'center', mt: 2 }}>
          {/** Slider main container */}
          <Box sx={{ minWidth: 0, overflow: 'hidden', flex: 1 }}>
            <ReactSwiper swiperProps={swiperProps}>
              {ItemData.map((item, index) => (
                <SwiperSlide key={item.id}>
                  <SlideItem data={item} cardSize={cardSize} active={currentSlide === index} />
                </SwiperSlide>
              ))}
            </ReactSwiper>
          </Box>
          <IconButton
            className="arrow-left"
            sx={(theme) => ({
              zIndex: 1,
              bgcolor: 'common.white',
              boxShadow: theme.shadows[2],
              mr: 1.15,
              ml: 1,
            })}
          >
            <IconifyIcon icon="iconoir:nav-arrow-right" />
          </IconButton>
        </Stack>
        <SendAmountInput />
      </Stack>
    </CardContainer>
  );
};

export default QuickTransfer;
