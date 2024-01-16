"use client";

import * as React from "react";

export type LocationState =
	| {
			state: "idle";
			url: URL;
	  }
	| {
			state: "transitioning";
			to: URL;
			url: URL;
	  };

const INTERNAL_locationContext = React.createContext<null | LocationState>(
	null,
);

export function INTERNAL_LocationContextProvider({
	value,
	children,
}: React.ProviderProps<LocationState>) {
	return (
		<INTERNAL_locationContext.Provider value={value}>
			{children}
		</INTERNAL_locationContext.Provider>
	);
}

export function useLocation() {
	const location = React.useContext(INTERNAL_locationContext);
	if (!location) throw new Error("No router context found");
	return location;
}
