import { useEffect, useState } from "react";

export type Route =
  | { name: "home" }
  | { name: "account" }
  | { name: "create-product" }
  | { name: "product"; productId: number };

export function parsePath(pathname: string): Route {
  const normalized = pathname !== "/" ? pathname.replace(/\/+$/, "") : pathname;
  if (normalized === "/account") return { name: "account" };
  if (normalized === "/products/new") return { name: "create-product" };

  const productMatch = normalized.match(/^\/products\/(\d+)$/);
  if (productMatch) return { name: "product", productId: Number(productMatch[1]) };

  return { name: "home" };
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(() => parsePath(window.location.pathname));

  useEffect(() => {
    const handlePopState = () => setRoute(parsePath(window.location.pathname));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigate(path: string, options?: { replace?: boolean }) {
    if (options?.replace) window.history.replaceState(null, "", path);
    else window.history.pushState(null, "", path);
    setRoute(parsePath(path));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return { route, navigate };
}
