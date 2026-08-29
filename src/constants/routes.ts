/**
 * Canonical application routes.
 */
export const ROUTES = {
  home: "/",
  login: "/login",
  signup: "/signup",
  dashboard: "/dashboard",
  settings: "/settings",
  profile: "/profile",
  offline: "/offline",
  authCallback: "/auth/callback",
  // Catalog
  discover: "/discover",
  movies: "/movies",
  tv: "/tv",
  genres: "/genres",
  movie: (id: string | number) => `/movie/${id}`,
  show: (id: string | number) => `/tv/${id}`,
  person: (id: string | number) => `/person/${id}`,
  collection: (id: string | number) => `/collection/${id}`,
  genre: (id: string | number) => `/genre/${id}`,
  // Personal library
  library: "/library",
  librarySearch: "/library/search",
  watchlist: "/watchlist",
  favorites: "/favorites",
  history: "/history",
  activity: "/activity",
  collections: "/collections",
  collectionDetail: (id: string) => `/collections/${id}`,
  // Social
  friends: "/friends",
  userProfile: (username: string) => `/u/${username}`,
  // Intelligence (Phase 4)
  stats: "/stats",
  insights: "/insights",
  recommendations: "/recommendations",
  calendar: "/calendar",
  timeline: "/timeline",
  wrapped: (year?: number) =>
    year ? `/wrapped?year=${year}` : "/wrapped",
  recap: (year?: number, month?: number) => {
    if (year && month) return `/recap?year=${year}&month=${month}`;
    return "/recap";
  },
} as const;

export type AppRoute = string;

export const PROTECTED_ROUTES: readonly string[] = [
  ROUTES.dashboard,
  ROUTES.settings,
  ROUTES.profile,
  ROUTES.discover,
  ROUTES.movies,
  ROUTES.tv,
  ROUTES.genres,
  ROUTES.library,
  ROUTES.watchlist,
  ROUTES.favorites,
  ROUTES.history,
  ROUTES.activity,
  ROUTES.collections,
  ROUTES.friends,
  "/u",
  ROUTES.stats,
  ROUTES.insights,
  ROUTES.recommendations,
  ROUTES.calendar,
  ROUTES.timeline,
  "/wrapped",
  "/recap",
  "/movie",
  "/tv",
  "/person",
  "/collection",
  "/genre",
];

export const AUTH_ROUTES: readonly string[] = [ROUTES.login, ROUTES.signup];
