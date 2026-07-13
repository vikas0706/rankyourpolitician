// Friendly, rounded stroke icons. One component, many names, so pages stay tidy.
import type { SVGProps } from 'react';

export type IconName =
  | 'search' | 'pin' | 'parliament' | 'law' | 'wallet' | 'shield' | 'star'
  | 'people' | 'clock' | 'arrow' | 'chevron' | 'globe' | 'home' | 'back'
  | 'info' | 'warn' | 'check' | 'megaphone' | 'cap' | 'briefcase' | 'calendar'
  | 'link' | 'sparkle' | 'scales' | 'flag' | 'layers' | 'x';

const P: Record<IconName, React.ReactNode> = {
  search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
  pin: <><path d="M12 21s7-6.3 7-11a7 7 0 10-14 0c0 4.7 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  parliament: <><path d="M3 21h18M4 21V10m16 11V10M4 10l8-5 8 5M8 21v-6m4 6v-6m4 6v-6" /></>,
  law: <><path d="M12 3v18M7 7h10M6 7l-2 6a3 3 0 006 0L8 7m8 0l-2 6a3 3 0 006 0l-2-6M8 21h8" /></>,
  scales: <><path d="M12 3v18M7 7h10M6 7l-2 6a3 3 0 006 0L8 7m8 0l-2 6a3 3 0 006 0l-2-6M8 21h8" /></>,
  wallet: <><rect x="3" y="6" width="18" height="14" rx="3" /><path d="M3 10h18M16 15h2" /></>,
  shield: <><path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></>,
  star: <><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5z" /></>,
  people: <><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0112 0M16 6a3 3 0 010 6m5 8a6 6 0 00-4-5.7" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  chevron: <><path d="M6 9l6 6 6-6" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 3.5 6 3.5 9S14.5 18.5 12 21c-2.5-2.5-3.5-6-3.5-9S9.5 5.5 12 3z" /></>,
  home: <><path d="M4 11l8-7 8 7M6 10v9h12v-9" /></>,
  back: <><path d="M19 12H5M11 6l-6 6 6 6" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  warn: <><path d="M12 4l9 16H3L12 4z" /><path d="M12 10v4M12 17h.01" /></>,
  check: <><path d="M5 12l5 5L20 6" /></>,
  megaphone: <><path d="M3 11v2a1 1 0 001 1h2l9 4V6L6 10H4a1 1 0 00-1 1zM18 8a4 4 0 010 8" /></>,
  cap: <><path d="M3 9l9-4 9 4-9 4-9-4zM7 11v4c0 1 2.5 2 5 2s5-1 5-2v-4" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M3 12h18" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4m8-4v4" /></>,
  link: <><path d="M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1" /></>,
  sparkle: <><path d="M12 3l1.8 4.9L18.5 9.5 13.8 11 12 16l-1.8-5L5.5 9.5l4.7-1.6L12 3z" /></>,
  flag: <><path d="M5 21V4m0 0h11l-2 4 2 4H5" /></>,
  layers: <><path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5" /></>,
  x: <><path d="M6 6l12 12M18 6L6 18" /></>,
};

export default function Icon({
  name,
  size = 20,
  className,
  ...rest
}: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {P[name]}
    </svg>
  );
}
