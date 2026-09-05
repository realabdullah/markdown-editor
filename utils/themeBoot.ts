import { BUILT_IN_THEMES, DEFAULT_DARK_ID, DEFAULT_LIGHT_ID, THEME_STORAGE_KEY } from "../themes/registry";

/**
 * Inlined in <head> and run before Nuxt boots. The app is a SPA, so the browser
 * paints the shell before any application code exists: without this the first
 * paint has no theme at all. It necessarily restates `resolveThemeId`, which
 * `tests/themeBoot.test.ts` holds it to, and it reads localStorage because
 * IndexedDB is async and so unreadable before the first paint.
 */
export const themeBootScript = (): string => {
  const ids = BUILT_IN_THEMES.map((theme) => theme.id);
  const dark = BUILT_IN_THEMES.filter((t) => t.appearance === "dark").map((t) => t.id);

  return `(function(){try{
var K=${JSON.stringify(THEME_STORAGE_KEY)},I=${JSON.stringify(ids)},D=${JSON.stringify(dark)};
var s=null;try{s=localStorage.getItem(K)}catch(e){}
if(s==="light")s=${JSON.stringify(DEFAULT_LIGHT_ID)};else if(s==="dark")s=${JSON.stringify(DEFAULT_DARK_ID)};
if(I.indexOf(s)<0)s=matchMedia("(prefers-color-scheme: dark)").matches?${JSON.stringify(DEFAULT_DARK_ID)}:${JSON.stringify(DEFAULT_LIGHT_ID)};
var a=D.indexOf(s)<0?"light":"dark",r=document.documentElement;
r.dataset.theme=s;r.dataset.appearance=a;r.classList.toggle("dark",a==="dark");r.style.colorScheme=a;
}catch(e){}})();`;
};
