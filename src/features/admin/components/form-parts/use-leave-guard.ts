import { useEffect } from "react";

/**
 * Asks before leaving a form with unsaved changes. While `active`:
 * - reload, closing the tab or typing a new address get the browser's own
 *   "leave site?" prompt (its text cannot be customised);
 * - a plain click on a link to another page in the app (the back link, the
 *   admin sidebar, the mobile menu) asks `message` first. The listener runs in
 *   the capture phase on `document`, before next/link, which skips navigation
 *   when the click was cancelled.
 * Links that open elsewhere (new tab, download, modifier keys) and in-page
 * `#section` links are left alone. The browser Back button is not covered.
 */
export function useLeaveGuard(active: boolean, message: string) {
  useEffect(() => {
    if (!active) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Older browsers need returnValue set to show the prompt.
      event.returnValue = "";
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.hasAttribute("download")) return;
      if (link.target && link.target !== "_self") return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [active, message]);
}
