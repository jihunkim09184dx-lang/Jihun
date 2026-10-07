import { Home, Image as ImageIcon, MessageCircle, PenLine } from "lucide-react";

/** One icon per exhibitor sidebar nav item, keyed by route segment. */
export const NAV_ICONS = {
  titles: Home,
  bookings: PenLine,
  "title-requests": MessageCircle,
  "marketing-assets": ImageIcon,
} as const;

export type NavKey = keyof typeof NAV_ICONS;
