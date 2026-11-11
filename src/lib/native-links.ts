import { deepLinkPath } from "./deep-links";

/**
 * Inside the iOS/Android app only: when the app is opened by one of our links, open that page. Anything that is not
 * one of our links is ignored (see deep-links.ts). On the website this does nothing and the plugin is never loaded.
 * Returns a function that removes the listener.
 */
export function startNativeLinks(): () => void {
  if (typeof navigator === "undefined" || !navigator.userAgent.includes("FamilyWalletApp")) return () => {};
  const open = (url: string | undefined) => {
    const path = deepLinkPath(url);
    if (path && path !== window.location.pathname + window.location.search) window.location.assign(path);
  };
  let remove: (() => void) | undefined;
  let stopped = false;
  void import("@capacitor/app")
    .then(async ({ App }) => {
      const launch = await App.getLaunchUrl();
      open(launch?.url);
      const handle = await App.addListener("appUrlOpen", (event) => open(event.url));
      if (stopped) void handle.remove();
      else remove = () => void handle.remove();
    })
    .catch(() => {});
  return () => {
    stopped = true;
    remove?.();
  };
}
