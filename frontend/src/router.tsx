import { createRootRoute, createRoute, createRouter, Outlet, redirect, type RouterHistory } from '@tanstack/react-router';
import { AppShell } from './components/AppShell';
import { parseBaseSearch, parseCategorySearch, parseLoginSearch } from './drill/search';
import { CategoryPage } from './pages/CategoryPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OverviewPage } from './pages/OverviewPage';
import { getSession } from './session/store';

const rootRoute = createRootRoute({ component: Outlet, notFoundComponent: NotFoundPage });

const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: '/login', validateSearch: parseLoginSearch, component: LoginPage });

/** Всё, что за входом: без живой сессии — на вход, с возвратом туда, куда шли. */
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  component: AppShell,
  beforeLoad: ({ location }) => {
    if (!getSession()) throw redirect({ to: '/login', search: { redirect: location.href } });
  },
});

const overviewRoute = createRoute({ getParentRoute: () => appRoute, path: '/', validateSearch: parseBaseSearch, component: OverviewPage });
const categoryRoute = createRoute({ getParentRoute: () => appRoute, path: '/category', validateSearch: parseCategorySearch, component: CategoryPage });

const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([overviewRoute, categoryRoute]),
]);

export function createAppRouter(history?: RouterHistory) {
  return createRouter({ routeTree, history, scrollRestoration: true, defaultPreload: false });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
export const router = createAppRouter();

declare module '@tanstack/react-router' {
  interface Register {
    router: AppRouter;
  }
}
