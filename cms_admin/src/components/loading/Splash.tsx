import { Box, Portal } from '@mui/material';
import { keyframes } from '@mui/system';

const rotate = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(1turn);
  }
`;

const rotateOpacity = keyframes`
  0% {
    transform: rotate(0deg);
    opacity: 0.1;
  }
  100% {
    transform: rotate(1turn);
    opacity: 1;
  }
`;

const Spinner = () => {
  return (
    <Portal>
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          height: '100vh',
          width: '100%',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            left: 'calc(50% - 35px)',
            top: '50%',
            width: '55px',
            height: '55px',
            borderRadius: '50%',
            boxSizing: 'border-box',
            border: '3px solid transparent',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              border: '3px solid transparent',
              borderLeft: '3px solid #2962ff',
              borderRadius: '50%',
              boxSizing: 'border-box',
              animation: `${rotate} 1s ease infinite`,
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              border: '3px solid transparent',
              borderLeft: '3px solid #2962ff',
              borderRadius: '50%',
              boxSizing: 'border-box',
              animation: `${rotateOpacity} 1s ease infinite 0.1s`,
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              border: '3px solid transparent',
              borderLeft: '3px solid #2962ff',
              borderRadius: '50%',
              boxSizing: 'border-box',
              animation: `${rotateOpacity} 1s ease infinite 0.2s`,
            }}
          />
        </Box>
      </Box>
    </Portal>
  );
};

export default Spinner;
