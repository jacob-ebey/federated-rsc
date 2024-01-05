"use client";

import * as React from "react";

export interface OutletContext {
  routes: Record<string, React.ReactElement>;
}

const outletContext = React.createContext<OutletContext | null>(null);

export function Outlet({ id }: { id: string }) {
  const context = React.useContext(outletContext);
  if (!context) {
    throw new Error("Missing outlet context");
  }
  return context.routes[id];
}

export function OutletProvider({
  children,
  routes,
}: OutletContext & { children: React.ReactNode }) {
  return (
    <outletContext.Provider value={{ routes }}>
      {children}
    </outletContext.Provider>
  );
}
