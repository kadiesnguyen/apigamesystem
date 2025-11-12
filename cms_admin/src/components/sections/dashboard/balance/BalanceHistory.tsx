'use client';
import { Box, Button, ButtonGroup, Tab, Tabs, useTheme } from '@mui/material';
import React, { useRef, useState } from 'react';
import EChartsReactCore from 'echarts-for-react/lib/core';
import TrafficHistoryChart from './BalanceHistoryChart';

export default function BalanceHistory() {
  const theme = useTheme();
  const chartRef = useRef<EChartsReactCore | null>(null);
  const [mode, setMode] = useState<'daily' | 'weekly'>('daily');

  // Dữ liệu mẫu cho demo
  const dailyData = [
    { date: '2025-11-01', traffic: 120 },
    { date: '2025-11-02', traffic: 180 },
    { date: '2025-11-03', traffic: 150 },
    { date: '2025-11-04', traffic: 210 },
    { date: '2025-11-05', traffic: 170 },
    { date: '2025-11-06', traffic: 240 },
    { date: '2025-11-07', traffic: 300 },
    { date: '2025-11-08', traffic: 467 },
    { date: '2025-11-09', traffic: 580 },
    { date: '2025-11-10', traffic: 400 },
    { date: '2025-11-11', traffic: 810 },
    { date: '2025-11-12', traffic: 790 },
  ];

  const weeklyData = [
    { date: 'Week 44', traffic: 800 },
    { date: 'Week 45', traffic: 1390 },
    { date: 'Week 46', traffic: 500 },
    { date: 'Week 47', traffic: 1710 },
  ];

  return (
    <Box
      sx={{
        bgcolor: theme.palette.background.paper,
        p: 2,
        borderRadius: 2,
        boxShadow: theme.shadows[2],
      }}
    >
      <Box sx={{ width: 300, mb: '80px' }}>
        <ButtonGroup
          variant="outlined"
          sx={{
            borderRadius: '8px',
            overflow: 'hidden',
            '& .MuiButton-root': {
              flex: 1,
              textTransform: 'none',
              fontWeight: 500,
              borderColor: 'divider',
            },
            '& .MuiButton-root.Mui-selected': {
              backgroundColor: 'primary.main',
              color: '#fff',
              borderColor: 'primary.main',
            },
          }}
        >
          <Button
            onClick={() => setMode('daily')}
            className={mode === 'daily' ? 'Mui-selected' : ''}
          >
            Daily
          </Button>
          <Button
            onClick={() => setMode('weekly')}
            className={mode === 'weekly' ? 'Mui-selected' : ''}
          >
            Weekly
          </Button>
        </ButtonGroup>
      </Box>

      {/* Biểu đồ */}
      <TrafficHistoryChart
        chartRef={chartRef}
        trafficData={mode === 'daily' ? dailyData : weeklyData}
        mode={mode}
      />
    </Box>
  );
}
