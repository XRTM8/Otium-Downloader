import React from 'react';

interface ThroughputSparklineProps {
  history: number[];
  className?: string;
  width?: number;
  height?: number;
}

export const ThroughputSparkline: React.FC<ThroughputSparklineProps> = ({
  history,
  className = 'w-16 h-5',
  width = 64,
  height = 20
}) => {
  if (!history || history.length < 2) return null;

  const max = Math.max(...history, 1);
  const points = history.map((val, idx) => {
    const x = (idx / (history.length - 1)) * width;
    const y = height - (val / max) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `M ${points[0]} L ${points.join(' L ')} L ${width},${height} L 0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="otium-sparkline-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00e599" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#00e599" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#otium-sparkline-grad)" />
      <path
        d={pathD}
        stroke="#00e599"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
