import {
  Activity,
  BarChart3,
  Bookmark,
  CalendarDays,
  Clapperboard,
  Compass,
  Film,
  Heart,
  History,
  Home,
  LayoutDashboard,
  Library,
  Lightbulb,
  Settings,
  Sparkles,
  Target,
  Tv,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

import { ROUTES } from "./routes";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  comingSoon?: boolean;
  description?: string;
}

export const MAIN_NAV: readonly NavItem[] = [
  {
    title: "Home",
    href: ROUTES.dashboard,
    icon: LayoutDashboard,
    description: "Intelligence dashboard",
  },
  {
    title: "Discover",
    href: ROUTES.discover,
    icon: Compass,
    description: "Explore entertainment",
  },
  {
    title: "For You",
    href: ROUTES.recommendations,
    icon: Target,
    description: "Personalized recommendations",
  },
  {
    title: "Library",
    href: ROUTES.library,
    icon: Library,
    description: "Your personal library",
  },
  {
    title: "Friends",
    href: ROUTES.friends,
    icon: Users,
    description: "What friends are watching",
  },
  {
    title: "Stats",
    href: ROUTES.stats,
    icon: BarChart3,
    description: "Statistics & charts",
  },
  {
    title: "Insights",
    href: ROUTES.insights,
    icon: Lightbulb,
    description: "Personal insights",
  },
  {
    title: "Calendar",
    href: ROUTES.calendar,
    icon: CalendarDays,
    description: "Activity heatmap",
  },
  {
    title: "Timeline",
    href: ROUTES.timeline,
    icon: Sparkles,
    description: "Journal timeline",
  },
  {
    title: "Watchlist",
    href: ROUTES.watchlist,
    icon: Bookmark,
    description: "Plan to watch",
  },
  {
    title: "Favorites",
    href: ROUTES.favorites,
    icon: Heart,
    description: "Titles you love",
  },
  {
    title: "Collections",
    href: ROUTES.collections,
    icon: Clapperboard,
    description: "Custom collections",
  },
  {
    title: "Movies",
    href: ROUTES.movies,
    icon: Film,
    description: "Browse movies",
  },
  {
    title: "TV Shows",
    href: ROUTES.tv,
    icon: Tv,
    description: "Browse series",
  },
] as const;

export const SECONDARY_NAV: readonly NavItem[] = [
  {
    title: "History",
    href: ROUTES.history,
    icon: History,
    description: "Watch sessions",
  },
  {
    title: "Activity",
    href: ROUTES.activity,
    icon: Activity,
    description: "Recent activity",
  },
  {
    title: "Profile",
    href: ROUTES.profile,
    icon: User,
    description: "Your profile",
  },
  {
    title: "Settings",
    href: ROUTES.settings,
    icon: Settings,
    description: "Preferences",
  },
] as const;

export const MARKETING_NAV: readonly NavItem[] = [
  {
    title: "Home",
    href: ROUTES.home,
    icon: Home,
  },
] as const;
