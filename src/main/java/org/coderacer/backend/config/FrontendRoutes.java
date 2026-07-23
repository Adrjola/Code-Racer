package org.coderacer.backend.config;

/**
 * The client-side routes the single page app owns.
 *
 * <p>The app and the API are served from one container, so a refresh or a pasted link on one of
 * these paths reaches Spring rather than the router. Each one has to be forwarded to index.html and
 * left unauthenticated, or the browser gets an API error instead of the page.
 *
 * <p>These mirror the paths handled in {@code frontend/src/app/App.tsx}. Adding a route there means
 * adding it here.
 */
public final class FrontendRoutes {

  private FrontendRoutes() {}

  public static final String[] ROUTES = {
    "/admin",
    "/forgot-password",
    "/home",
    "/login",
    "/not-found",
    "/play/solo",
    "/register",
    "/reset-password",
    "/solo",
    "/solo/preview",
    "/statistics",
    "/verify-email",
    "/verify-email-pending"
  };

  /** The routes plus the static entry points the browser asks for directly. */
  public static String[] withStaticAssets() {
    String[] all = new String[ROUTES.length + 3];
    System.arraycopy(ROUTES, 0, all, 0, ROUTES.length);
    all[ROUTES.length] = "/";
    all[ROUTES.length + 1] = "/index.html";
    all[ROUTES.length + 2] = "/assets/**";
    return all;
  }
}
