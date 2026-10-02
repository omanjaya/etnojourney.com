/**
 * Photos fade in (with a soft blur and settle) when they finish loading,
 * instead of popping in. Global and automatic for every `next/image` with
 * `fill` (all photos on the site).
 *
 * It is an inline script so it starts with the HTML parser, before any image
 * paints, and it uses the Web Animations API rather than attributes or
 * styles, so React hydration sees exactly the server DOM.
 *
 * - No JS: images show normally (server HTML never hides anything).
 * - Reduced motion: does nothing.
 * - Images already decoded (cache) are left alone.
 * - After the first page load, high-priority heroes are skipped: on client
 *   navigation they take part in view-transition morphs and must be visible
 *   when the new state is captured.
 */
function imageFadeIn() {
  if (!("animate" in Element.prototype)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const seen = new WeakSet<HTMLImageElement>();
  let firstLoad = true;
  window.addEventListener("load", () => (firstLoad = false), { once: true });

  const track = (img: HTMLImageElement) => {
    if (seen.has(img) || img.dataset.nimg !== "fill") return;
    seen.add(img);
    if (img.complete && img.naturalWidth > 0) return;
    if (!firstLoad && img.fetchPriority === "high") return;

    const hold = img.animate({ opacity: [0, 0] }, { duration: 1, fill: "forwards" });
    const reveal = () => {
      hold.cancel();
      img.animate(
        [{ opacity: 0, filter: "blur(12px)", scale: "1.04" }, {}],
        { duration: 900, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
    };
    img.addEventListener("load", reveal, { once: true });
    img.addEventListener("error", () => hold.cancel(), { once: true });
  };

  const scan = (node: Node) => {
    if (node instanceof HTMLImageElement) track(node);
    else if (node instanceof Element) node.querySelectorAll("img").forEach(track);
  };

  new MutationObserver((records) => {
    for (const record of records) record.addedNodes.forEach(scan);
  }).observe(document.documentElement, { childList: true, subtree: true });
  scan(document.documentElement);
}

/** Render once, early in <body>, from the root layout. */
export function ImageFadeIn() {
  return <script dangerouslySetInnerHTML={{ __html: `(${imageFadeIn.toString()})()` }} />;
}
