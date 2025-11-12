import CardContainer from 'components/common/CardContainter';
import ExpenseStatisticsChart from 'components/sections/dashboard/expense/ExpenseStatisticsChart';
import { expenseData, ExpenseDataType } from 'data/expense-chart';
import ReactECharts from 'echarts-for-react';
import { useChartResize } from 'providers/useEchartResize';
import { useEffect, useRef, useState } from 'react';

const ExpenseStatistics = () => {
  const chartRef = useRef<ReactECharts>(null);
  const [chartData, setChartData] = useState<ExpenseDataType>([]);
  useChartResize(chartRef);
  // Fetch sales data
  useEffect(() => {
    const fetchData = () => {
      setChartData(expenseData);
    };

    fetchData();
  }, []);
  return (
    <CardContainer title="Player per partner">
      <ExpenseStatisticsChart chartRef={chartRef} seriesData={chartData} />
    </CardContainer>
  );
};

export default ExpenseStatistics;
