export const COLORS = [
  '#2a85ff', // Bleu
  '#7cbc7d', // Vert
  '#ff6a55', // Rouge
  '#8C62FF', // Violet
  '#fbc13e', // Jaune
  '#00C7BE', // Turquoise
  '#FE964A', // Orange
  '#febb7b', // Orange clair
  '#7cd2fa', // Bleu clair
  '#bee9d3', // Vert clair
];

export const apexLineChartDefaultOption = {
  chart: {
    zoom: {
      enabled: false,
    },
    toolbar: {
      show: false,
    },
  },
  colors: [...COLORS],
  dataLabels: {
    enabled: false,
  },
  stroke: {
    width: 2.5,
    curve: 'smooth' as const,
    lineCap: 'round' as const,
  },
  legend: {
    itemMargin: {
      vertical: 10,
    },
  },
  xaxis: {
    categories: [] as string[],
  },
};

export const apexAreaChartDefaultOption = {
  ...apexLineChartDefaultOption,
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.3,
      opacityTo: 0.6,
      stops: [0, 70, 100],
    },
  },
};

export const apexBarChartDefaultOption = {
  chart: {
    zoom: {
      enabled: false,
    },
    toolbar: {
      show: false,
    },
  },
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '35px',
      borderRadius: 4,
      borderRadiusApplication: 'end' as const,
    },
  },
  colors: [...COLORS],
  dataLabels: {
    enabled: false,
  },
  stroke: {
    show: true,
    width: 1,
    curve: 'smooth' as const,
    colors: ['transparent'],
  },
  legend: {
    itemMargin: {
      vertical: 10,
    },
  },
  xaxis: {
    categories: [] as string[],
  },
  fill: {
    opacity: 1,
  },
  tooltip: {
    y: {
      formatter: (val: number) => `${val}`,
    },
  },
};

export const apexDonutChartDefaultOption = {
  colors: [...COLORS],
  plotOptions: {
    pie: {
      donut: {
        labels: {
          show: true,
          total: {
            show: true,
            showAlways: true,
            label: '',
            formatter: function (w: any) {
              return w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
            },
          },
        },
        size: '85%',
      },
    },
  },
  stroke: {
    colors: ['transparent'],
  },
  labels: [] as string[],
  dataLabels: {
    enabled: false,
  },
  legend: {
    show: false,
  },
};

export const apexSparklineChartDefaultOption = {
  chart: {
    type: 'line' as const,
    sparkline: {
      enabled: true,
    },
  },
  stroke: {
    width: 2,
    curve: 'smooth' as const,
  },
  tooltip: {
    fixed: {
      enabled: false,
    },
    x: {
      show: false,
    },
    y: {
      title: {
        formatter: function () {
          return '';
        },
      },
    },
    marker: {
      show: false,
    },
  },
};

export const apexRadarChartDefaultOption = {
  chart: {
    type: 'radar' as const,
    zoom: {
      enabled: false,
    },
    toolbar: {
      show: false,
    },
  },
  colors: [...COLORS],
};
