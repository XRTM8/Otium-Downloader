import React from 'react';

interface OtiumLogoProps {
  className?: string;
  glow?: boolean;
}

export const OtiumLogo: React.FC<OtiumLogoProps> = ({
  className = 'w-4 h-4',
  glow = false
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${
        glow ? 'drop-shadow-[0_0_8px_rgba(0,229,153,0.45)]' : ''
      }`}
    >
      {/* Precision Geometric Squircle */}
      <rect
        x="2.5"
        y="2.5"
        width="19"
        height="19"
        rx="6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeOpacity="0.3"
      />
      {/* Downward Velocity Vector */}
      <path
        d="M12 6.5V14M12 14L8.75 10.75M12 14L15.25 10.75"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Ground Landing Baseline */}
      <path
        d="M8.5 17.5H15.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};
