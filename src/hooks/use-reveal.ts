import { useEffect } from "react";

/**
 * Raises each [data-reveal] element into place the first time it scrolls into view.
 * Content stays visible without script: the hidden start state only applies once
 * `reveal-ready` is on <html>, which this hook adds.
 */
export function useReveal() {
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    // Stagger siblings that enter together.
    nodes.forEach((node) => {
      const siblings = node.parentElement
        ? Array.from(node.parentElement.children).filter((el) => el.hasAttribute("data-reveal"))
        : [];
      node.style.setProperty("--reveal-delay", `${Math.max(siblings.indexOf(node), 0) * 80}ms`);
    });
    root.classList.add("reveal-ready");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => {
      observer.disconnect();
      root.classList.remove("reveal-ready");
    };
  }, []);
}
