'use client';
import { alpha, SxProps, useTheme } from '@mui/material';
import ReactEchart from 'components/base/ReactEchart';
import EChartsReactCore from 'echarts-for-react/lib/core';
import { LineChart, LineSeriesOption } from 'echarts/charts';
import {
  GridComponent,
  GridComponentOption,
  LegendComponent,
  TooltipComponent,
  TooltipComponentOption,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import React, { useMemo } from 'react';

echarts.use([LineChart, LegendComponent, CanvasRenderer, GridComponent, TooltipComponent]);

export type ECOption = echarts.ComposeOption<
  LineSeriesOption | TooltipComponentOption | GridComponentOption
>;

interface TrafficDataType {
  date: string;
  traffic: number;
}

interface TrafficChartProps {
  chartRef: React.MutableRefObject<EChartsReactCore | null>;
  sx?: SxProps;
  trafficData: TrafficDataType[];
  mode?: 'daily' | 'weekly';
}

const TrafficHistoryChart = ({ chartRef, trafficData, mode = 'daily', sx }: TrafficChartProps) => {
  const theme = useTheme();
  const { palette } = theme;

  const chartOptions: ECOption = useMemo(() => {
    const xAxisData = trafficData.map((item) => item.date);
    const trafficValues = trafficData.map((item) => item.traffic);

    return {
      grid: {
        left: '3%',
        right: '4%',
        top: '5%',
        bottom: '10%',
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const p = params[0];
          return `${p.axisValue}<br/><b>Traffic:</b> ${p.data.toLocaleString()}`;
        },
        backgroundColor: alpha(palette.background.paper, 0.9),
        borderColor: palette.divider,
        textStyle: { color: palette.text.primary },
      },
      xAxis: {
        type: 'category',
        data: xAxisData,
        boundaryGap: false,
        axisLabel: {
          rotate: mode === 'daily' ? 45 : 0,
          color: palette.text.secondary,
          fontSize: 12,
        },
        axisLine: { lineStyle: { color: palette.divider } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: palette.text.secondary,
          fontSize: 12,
        },
        splitLine: {
          show: true,
          lineStyle: { type: 'dashed', color: palette.divider },
        },
      },
      series: [
        {
          name: 'Traffic',
          type: 'line',
          smooth: true,
          data: trafficValues,
          symbol: 'circle',
          symbolSize: 6,
          showSymbol: true,
          lineStyle: { width: 3, color: palette.primary.main },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: alpha(palette.primary.main, 0.3) },
              { offset: 1, color: alpha(palette.background.paper, 0.1) },
            ]),
          },
        },
      ],
    };
  }, [theme, trafficData, mode]);

  return (
    <ReactEchart
      echarts={echarts}
      option={chartOptions}
      ref={chartRef}
      sx={{
        width: 1,
        height: 1,
        maxHeight: 260,
        minWidth: 1,
        ...sx,
      }}
    />
  );
};

export default TrafficHistoryChart;
