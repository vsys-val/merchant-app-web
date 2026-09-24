import { useEffect, useState } from "react";

export type Route =
  | { name: "home" }
  | { name: "search" }
  | { name: "account" }
  | { name: "create-product" }
  | { name: "product"; productId: number }
  | { name: "edit-product"; productId: number }
  | { name: "admin" };

export function parsePath(path: string): Route {
  const pathname = path.split(/[?#]/, 1)[0] || "/";
  const normalized = pathname !== "/" ? pathname.replace(/\/+$/, "") : pathname;
  if (normalized === "/search") return { name: "search" };
  if (normalized === "/account") return { name: "account" };
  if (normalized === "/admin") return { name: "admin" };
  if (normalized === "/products/new") return { name: "create-product" };

  const editMatch = normalized.match(/^\/products\/(\d+)\/edit$/);
  if (editMatch) return { name: "edit-product", productId: Number(editMatch[1]) };
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
