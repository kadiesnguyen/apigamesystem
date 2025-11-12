import { SxProps, useTheme } from '@mui/material';
import ReactEchart from 'components/base/ReactEchart';
import { TransactionDataType } from 'data/activity-chart';
import { LegendComponentOption } from 'echarts';
import EChartsReactCore from 'echarts-for-react/lib/core';
import { BarChart, BarSeriesOption } from 'echarts/charts';
import {
  GridComponent,
  GridComponentOption,
  LegendComponent,
  TitleComponent,
  TooltipComponentOption,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import 'echarts/lib/component/tooltip';
import { CanvasRenderer } from 'echarts/renderers';
import { TitleComponentOption } from 'echarts/types/src/export/option.js';
import { useBreakpoints } from 'providers/useBreakpoints';
import React, { useMemo } from 'react';

// Use ComposeOption to compose an Option type that only has required components and charts
export type ECOption = echarts.ComposeOption<
  | BarSeriesOption
  | TooltipComponentOption
  | GridComponentOption
  | TitleComponentOption
  | LegendComponentOption
>;

// Register required components
echarts.use([BarChart, LegendComponent, CanvasRenderer, GridComponent, TitleComponent]);

interface WeeklyActivityChartProps {
  chartRef: React.MutableRefObject<EChartsReactCore | null>;
  sx?: SxProps;
  seriesData: TransactionDataType;
}
const WeeklyActivityChart = ({ chartRef, ...rest }: WeeklyActivityChartProps) => {
  const { seriesData } = rest;
  const theme = useTheme();
  const { up } = useBreakpoints();
  const upSm = up('sm');
  const upMd = up('md');
  const upLg = up('lg');
  const { palette } = theme;
  const barWidth = upMd ? 15 : upSm ? 10 : 7;
  const barSpacing = upMd ? 1 : upSm ? 0.8 : 0.6;

  const chartOptions: ECOption = useMemo(() => {
    const xAxisData = seriesData.map((item) => item.day);
    const depositData = seriesData.map((item) => item.deposit);
    const withdrawData = seriesData.map((item) => item.withdraw);
    return {
      title: { show: false },
      xAxis: {
        axisLabel: {
          padding: 10,
          baseline: 'top',
          color: palette.primary.light,
          fontSize: 13,
        },
        axisLine: { show: false },
        axisTick: { show: false },
        type: 'category',
        data: xAxisData,
      },
      yAxis: {
        axisLabel: { color: palette.primary.light, fontSize: 13 },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          lineStyle: {
            color: palette.secondary.contrastText,
          },
        },
        type: 'value',
      },
      grid: {
        left: '2%',
        top: '15%',
        right: '2%',
        bottom: '5%',
        containLabel: true,
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: ${c}',
        backgroundColor: palette.neutral.dark,
        textStyle: { color: palette.secondary.contrastText },
        borderWidth: 0,
        padding: 10,
      },
      legend: {
        data: [
          { name: 'Deposit', icon: 'circle' },
          { name: 'Withdraw', icon: 'circle' },
        ],
        itemGap: 33,
        itemHeight: 16,
        textStyle: {
          color: palette.primary.light,
        },
        right: -2,
        zLevel: 10,
        padding: [10, 20, 30, 40],
      },
      series: [
        {
          data: depositData,
          type: 'bar',
          stack: '1',
          name: 'Deposit',
          barWidth: barWidth,
          itemStyle: {
            borderRadius: 30,
          },
          color: palette.primary.main,
          emphasis: {
            itemStyle: { color: palette.primary.dark },
          },
          showBackground: false,
          barGap: barSpacing,
          animationDuration: 500,
        },
        {
          data: withdrawData,
          type: 'bar',
          stack: '2',
          name: 'Withdraw',
          barWidth: barWidth,
          itemStyle: {
            borderRadius: 30,
          },
          color: palette.success.light,
          showBackground: false,
          animationDuration: 500,
        },
      ],
    };
  }, [theme, seriesData, upLg, barWidth]);

  return (
    <ReactEchart
      echarts={echarts}
      option={chartOptions}
      ref={chartRef}
      sx={{
        width: 1,
        height: 1,
        maxHeight: 270,
        minWidth: 1,
      }}
      {...rest}
    />
  );
};

export default WeeklyActivityChart;
