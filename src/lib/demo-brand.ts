const KEY = "demo-brand";
export const setDemoBrand = (name: string | null) => {
  if (name) window.sessionStorage.setItem(KEY, name);
  else window.sessionStorage.removeItem(KEY);
};
export const readDemoBrand = () => window.sessionStorage.getItem(KEY);
