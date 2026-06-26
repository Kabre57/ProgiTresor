'use client';

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  apexLineChartDefaultOption,
  apexBarChartDefaultOption,
  apexAreaChartDefaultOption,
  apexDonutChartDefaultOption,
  apexRadarChartDefaultOption,
} from '@/lib/configs/chart.config';

const notDonut = ['line', 'bar', 'area'];

// Dynamically import react-apexcharts to prevent SSR (window object reference) issues in Next.js
const ApexChart = dynamic(
  () => import('react-apexcharts').then((mod) => mod.default),
  {
    ssr: false,
  }
);

export interface ChartProps {
  series: any[];
  width?: string | number;
  height?: string | number;
  xAxis?: string[];
  customOptions?: any;
  type?: 'line' | 'bar' | 'area' | 'donut' | 'radar';
  donutTitle?: string;
  donutText?: string;
  className?: string;
}

export function Chart({
  series = [],
  width = '100%',
  height = 300,
  xAxis,
  customOptions,
  type = 'line',
  donutTitle,
  donutText,
  className,
  ...rest
}: ChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const chartDefaultOption = useMemo(() => {
    switch (type) {
      case 'line':
        return apexLineChartDefaultOption;
      case 'bar':
        return apexBarChartDefaultOption;
      case 'area':
        return apexAreaChartDefaultOption;
      case 'donut':
        return apexDonutChartDefaultOption;
      case 'radar':
        return apexRadarChartDefaultOption;
      default:
        return apexLineChartDefaultOption;
    }
  }, [type]);

  const options = useMemo(() => {
    let opt = JSON.parse(JSON.stringify(chartDefaultOption));

    if (notDonut.includes(type) && xAxis) {
      if (!opt.xaxis) opt.xaxis = {};
      opt.xaxis.categories = xAxis;
    }

    if (type === 'donut') {
      if (!opt.plotOptions) opt.plotOptions = {};
      if (!opt.plotOptions.pie) opt.plotOptions.pie = {};
      if (!opt.plotOptions.pie.donut) opt.plotOptions.pie.donut = {};
      if (!opt.plotOptions.pie.donut.labels) opt.plotOptions.pie.donut.labels = {};
      if (!opt.plotOptions.pie.donut.labels.total) opt.plotOptions.pie.donut.labels.total = {};

      if (donutTitle) {
        opt.plotOptions.pie.donut.labels.total.label = donutTitle;
      }
      if (donutText) {
        opt.plotOptions.pie.donut.labels.total.formatter = () => donutText;
      }
    }

    if (customOptions) {
      opt = { ...opt, ...customOptions };
    }

    return opt;
  }, [chartDefaultOption, type, xAxis, donutTitle, donutText, customOptions]);

  const setLegendOffset = useCallback(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (chartRef.current) {
      const legend = chartRef.current.querySelector('div.apexcharts-legend') as HTMLElement | null;
      if (isMobile && legend?.style) {
        legend.style.position = 'relative';
        legend.style.top = '0';
        legend.style.justifyContent = 'start';
        legend.style.padding = '0';
      }
    }
  }, []);

  useEffect(() => {
    if (notDonut.includes(type)) {
      setLegendOffset();
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', setLegendOffset);
        return () => window.removeEventListener('resize', setLegendOffset);
      }
    }
  }, [type, setLegendOffset]);

  return (
    <div ref={chartRef} className={className}>
      <ApexChart
        options={options}
        type={type}
        series={series}
        width={width}
        height={height}
        {...rest}
      />
    </div>
  );
}

export default Chart;
