import { FileText, Home, Image as ImageIcon, LayoutGrid, MessageCircle, PenLine } from "lucide-react";

/** One icon per exhibitor sidebar nav item, keyed by route segment. */
export const NAV_ICONS = {
  titles: LayoutGrid,
  dashboard: Home,
  "lineup-trailers": FileText,
  bookings: PenLine,
  "title-requests": MessageCircle,
  "marketing-assets": ImageIcon,
} as const;

export type NavKey = keyof typeof NAV_ICONS;
