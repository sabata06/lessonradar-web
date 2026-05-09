"use client";

import { createContext, useContext } from "react";

/**
 * Lets a parent (typically a Radix Dialog / Sheet) advertise an
 * alternate portal target for popover-style menus rendered inside it.
 *
 * Why this exists:
 *   Radix `<PopoverPortal>` defaults to `document.body`, which puts
 *   the popover OUTSIDE the dialog's modal scope. On mobile that
 *   means the dialog's pointer-event capture also swallows touch
 *   gestures inside the popover (the cmdk list won't scroll, taps
 *   close the dialog, etc.). Wrapping a `Sheet` body in
 *   `<PopoverPortalProvider value={sheetContentRef.current}>` keeps
 *   nested popovers inside the dialog tree and restores native
 *   touch scroll.
 *
 * Outside a provider the context returns `null`, which the consumer
 * must treat as "use the default portal target" (body).
 */
export const PopoverPortalContext = createContext<HTMLElement | null>(null);

export function usePopoverPortalContainer(): HTMLElement | null {
  return useContext(PopoverPortalContext);
}

export const PopoverPortalProvider = PopoverPortalContext.Provider;
