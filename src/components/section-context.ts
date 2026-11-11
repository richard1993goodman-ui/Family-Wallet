import { createContext, useContext } from "react";

/** The menu section the current page belongs to, so a page header can wear its colour. */
export const SectionContext = createContext<{ label: string; tint: "sage" | "apricot" | "sky" | "lilac" | "butter" | "rose" } | null>(null);
export const useSection = () => useContext(SectionContext);
