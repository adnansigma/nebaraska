import type Lenis from "lenis";
import {
  getAnchorScrollDuration,
  prefersReducedMotion,
  smoothScrollEasing,
} from "@/lib/motion";

export const HEADER_SCROLL_OFFSET = -90;

export function resolveNavHref(href: string, pathname: string) {
  if (href.startsWith("/")) return href;
  if (pathname !== "/") return `/${href}`;
  return href;
}

export function scrollToSection(hash: string, lenis?: Lenis | null) {
  if (!hash || hash === "#") return false;

  const target = document.querySelector(hash);
  if (!(target instanceof HTMLElement)) return false;

  if (lenis) {
    const current = lenis.scroll;
    const targetTop =
      target.getBoundingClientRect().top + window.scrollY + HEADER_SCROLL_OFFSET;
    const distance = targetTop - current;

    lenis.scrollTo(target, {
      offset: HEADER_SCROLL_OFFSET,
      duration: prefersReducedMotion() ? 0 : getAnchorScrollDuration(distance),
      easing: smoothScrollEasing,
    });
    return true;
  }

  const top =
    target.getBoundingClientRect().top + window.scrollY + HEADER_SCROLL_OFFSET;

  window.scrollTo({
    top,
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });

  return true;
}
