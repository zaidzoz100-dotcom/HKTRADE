import { useId } from "react";

/**
 * Forex Alarm mark — a stylized candlestick chart fused with a glowing alert
 * bell, in gold + electric blue on a near-black badge. Used in the header
 * and (as a static /logo.svg copy) on the Clerk sign-in/sign-up pages.
 */
export function BrandLogo({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const uid = useId().replace(/[:]/g, "");
  const bgId = `fa-bg-${uid}`;
  const bellId = `fa-bell-${uid}`;
  const glowId = `fa-glow-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Forex Alarm"
    >
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#14161C" />
          <stop offset="100%" stopColor="#06070A" />
        </linearGradient>
        <linearGradient id={bellId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <filter id={glowId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect x="0.5" y="0.5" width="39" height="39" rx="9" fill={`url(#${bgId})`} stroke="#262A33" />

      {/* Candlestick chart */}
      <g strokeLinecap="round">
        <line x1="9" y1="12" x2="9" y2="30" stroke="#38BDF8" strokeWidth="1.3" opacity="0.7" />
        <rect x="6.7" y="17" width="4.6" height="8.5" rx="1.1" fill="#38BDF8" opacity="0.85" />

        <line x1="18" y1="20" x2="18" y2="34" stroke="#38BDF8" strokeWidth="1.3" />
        <rect x="15.7" y="24" width="4.6" height="7.5" rx="1.1" fill="#38BDF8" />

        <line x1="27" y1="16" x2="27" y2="27" stroke="#FCD34D" strokeWidth="1.3" opacity="0.9" />
        <rect x="24.7" y="18" width="4.6" height="6.5" rx="1.1" fill="#FCD34D" />
      </g>

      {/* Glowing alert bell, anchored top-right */}
      <g filter={`url(#${glowId})`}>
        <path
          d="M30.6 12.4c0-2.7 2.2-4.9 4.9-4.9s4.9 2.2 4.9 4.9c0 3.7 1.4 5.3 2.3 6.2.5.5.2 1.4-.5 1.4H28.8c-.7 0-1-.9-.5-1.4.9-.9 2.3-2.5 2.3-6.2z"
          transform="translate(-6.4 -3.4) scale(0.86)"
          fill={`url(#${bellId})`}
        />
        <path
          d="M33.4 21.2a2 2 0 0 0 3.6 0"
          transform="translate(-6.4 -3.4) scale(0.86)"
          stroke="#06070A"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <circle cx="35.2" cy="6.3" r="1.4" fill="#FDE68A" />
      </g>
    </svg>
  );
}
