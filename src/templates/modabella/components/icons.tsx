import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function SearchIcon(props: IconProps) {
  return <svg {...iconProps} {...props}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>;
}

export function CartIcon(props: IconProps) {
  return <svg {...iconProps} {...props}><path d="M3 4h2l2.1 10.1a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L20 8H6" /><circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></svg>;
}

export function HomeIcon(props: IconProps) {
  return <svg {...iconProps} {...props}><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></svg>;
}

export function GridIcon(props: IconProps) {
  return <svg {...iconProps} {...props}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>;
}

export function MessageIcon(props: IconProps) {
  return <svg {...iconProps} {...props}><path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9.5 9.5 0 0 1-4-.9L3 21l1.6-4.3A8.7 8.7 0 1 1 21 11.5Z" /></svg>;
}

export function ArrowIcon(props: IconProps) {
  return <svg {...iconProps} {...props}><path d="m9 18 6-6-6-6" /></svg>;
}
