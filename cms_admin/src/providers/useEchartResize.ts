import ReactECharts from 'echarts-for-react';
import { RefObject, useEffect } from 'react';

export const useChartResize = (chartRef: RefObject<ReactECharts>) => {
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current) {
        chartRef.current.getEchartsInstance().resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [chartRef]);
};
