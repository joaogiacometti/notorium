export const themeStorageKey = "theme";

type CookieStoreLike = {
  delete: (name: string) => Promise<void>;
};

function getCookieStore() {
  if (!("cookieStore" in window)) {
    return null;
  }

  return window.cookieStore as CookieStoreLike;
}

export function clearPersistedThemePreference() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(themeStorageKey);
  void getCookieStore()?.delete(themeStorageKey);
}
