import { ReactNode, SVGProps } from 'react';

// Sistema de íconos SVG (estilo Lucide). Heredan color con currentColor.
// Sin emojis en la UI: siempre usar estos íconos.
const P = {
  fill: 'none', stroke: 'currentColor', strokeWidth: 1.75,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
};

const ICONS: Record<string, ReactNode> = {
  cart: <><circle cx="9" cy="20" r="1.5" {...P} /><circle cx="18" cy="20" r="1.5" {...P} /><path d="M2 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L22 7H6" {...P} /></>,
  file: <><path d="M14 3v5h5" {...P} /><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-5z" {...P} /></>,
  cash: <><rect x="2" y="6" width="20" height="12" rx="2" {...P} /><circle cx="12" cy="12" r="2.5" {...P} /><path d="M6 12h.01M18 12h.01" {...P} /></>,
  card: <><rect x="2" y="5" width="20" height="14" rx="2" {...P} /><path d="M2 10h20" {...P} /></>,
  settings: <><circle cx="12" cy="12" r="3" {...P} /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" {...P} /></>,
  clipboard: <><rect x="8" y="2" width="8" height="4" rx="1" {...P} /><path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3" {...P} /><path d="m9 14 2 2 4-4" {...P} /></>,
  box: <><path d="M12 3 3 7.5v9L12 21l9-4.5v-9L12 3z" {...P} /><path d="M3 7.5 12 12l9-4.5" {...P} /><path d="M12 12v9" {...P} /></>,
  layers: <><path d="m12 2 9 5-9 5-9-5 9-5z" {...P} /><path d="m3 12 9 5 9-5" {...P} /><path d="m3 17 9 5 9-5" {...P} /></>,
  user: <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" {...P} /><circle cx="12" cy="7" r="4" {...P} /></>,
  users: <><path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" {...P} /><circle cx="9.5" cy="7" r="4" {...P} /><path d="M22 21v-2a4 4 0 0 0-3-3.87" {...P} /><path d="M16 3.13a4 4 0 0 1 0 7.75" {...P} /></>,
  tag: <><path d="M12 2H2v10l9.29 9.29a1 1 0 0 0 1.42 0l8.58-8.58a1 1 0 0 0 0-1.42L12 2z" {...P} /><path d="M7 7h.01" {...P} /></>,
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" {...P} />,
  truck: <><path d="M3 6h11v9H3z" {...P} /><path d="M14 9h4l3 3v3h-7z" {...P} /><circle cx="7" cy="18" r="1.5" {...P} /><circle cx="17.5" cy="18" r="1.5" {...P} /></>,
  building: <><rect x="4" y="3" width="16" height="18" rx="1.5" {...P} /><path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M10 21v-3a2 2 0 0 1 4 0v3" {...P} /></>,
  chart: <><path d="M3 3v18h18" {...P} /><path d="M7 15v3M12 9v9M17 5v13" {...P} /></>,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" {...P} />,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" {...P} /><circle cx="12" cy="12" r="3" {...P} /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" {...P} /><path d="m16 17 5-5-5-5M21 12H9" {...P} /></>,
  plus: <path d="M12 5v14M5 12h14" {...P} />,
  edit: <><path d="M12 20h9" {...P} /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" {...P} /></>,
  trash: <><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" {...P} /><path d="M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" {...P} /></>,
  search: <><circle cx="11" cy="11" r="7" {...P} /><path d="m21 21-4.3-4.3" {...P} /></>,
  close: <path d="M18 6 6 18M6 6l12 12" {...P} />,
  chevronDown: <path d="m6 9 6 6 6-6" {...P} />,
};

interface IconProps extends SVGProps<SVGSVGElement> {
  name: string;
  size?: number;
}

export function Icon({ name, size = 20, ...rest }: IconProps) {
  const inner = ICONS[name];
  if (!inner) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...rest}>
      {inner}
    </svg>
  );
}
