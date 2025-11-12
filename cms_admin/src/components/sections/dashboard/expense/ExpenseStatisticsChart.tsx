import { SxProps, useTheme } from '@mui/material';
import ReactEchart from 'components/base/ReactEchart';
import { ExpenseDataType } from 'data/expense-chart';
import { PieSeriesOption } from 'echarts';
import EChartsReactCore from 'echarts-for-react/lib/core';
import { PieChart } from 'echarts/charts';
import {
  GridComponent,
  GridComponentOption,
  LegendComponent,
  TooltipComponentOption,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import 'echarts/lib/component/tooltip';
import { CanvasRenderer } from 'echarts/renderers';
import { useMemo } from 'react';

// ComposeOption type
export type ECOption = echarts.ComposeOption<
  PieSeriesOption | TooltipComponentOption | GridComponentOption
>;
echarts.use([PieChart, LegendComponent, CanvasRenderer, GridComponent]);

interface ExpenseStatisticsChartProps {
  chartRef: React.MutableRefObject<EChartsReactCore | null>;
  sx?: SxProps;
  seriesData: ExpenseDataType;
}

const ExpenseStatisticsChart = ({ chartRef, ...rest }: ExpenseStatisticsChartProps) => {
  const { seriesData } = rest;
  const theme = useTheme();
  const { palette } = theme;

  // ✅ Tính phần trăm thủ công
  const total = seriesData.reduce((acc, cur) => acc + cur.value, 0);
  const processedData = seriesData.map((item) => ({
    ...item,
    percent: total > 0 ? ((item.value / total) * 100).toFixed(1) : 0,
  }));

  const chartOptions: ECOption = useMemo(() => {
    return {
      backgroundColor: palette.common.white,
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const data = params.data;
          return `${data.name}: ${data.value} (${data.percent}%)`;
        },
      },
      color: [
        palette.primary.darker,
        palette.primary.main,
        palette.secondary.main,
        palette.warning.main,
      ],
      legend: {
        orient: 'horizontal',
        bottom: 0,
        icon: 'circle',
        textStyle: {
          color: palette.text.primary,
          fontSize: 13,
        },
      },
      series: [
        {
          name: 'Expense',
          type: 'pie',
          radius: ['40%', '75%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: false,
          data: processedData,
          label: {
            show: true,
            position: 'inside',
            formatter: (params: any) => {
              const { percent } = params.data;
              return `${percent}%`;
            },
            fontSize: 14,
            fontWeight: 'bold',
            color: palette.common.white,
          },
          emphasis: {
            scale: true,
            itemStyle: {
              borderColor: palette.common.white,
              borderWidth: 3,
            },
          },
          animationType: 'scale',
          animationEasing: 'backOut',
          animationDuration: 800,
        },
      ],
    };
  }, [theme, seriesData]);

  return (
    <ReactEchart
      echarts={echarts}
      option={chartOptions}
      ref={chartRef}
      sx={{
        width: 1,
        height: 1,
        maxHeight: 300,
        minWidth: 1,
      }}
      {...rest}
    />
  );
};

export default ExpenseStatisticsChart;
