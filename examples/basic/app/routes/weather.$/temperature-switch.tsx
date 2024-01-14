"use client";

import { createContext, useCallback, useContext, useState } from "react";

const temperatureContext = createContext<null | {
	state: "c" | "f";
	toggleTemperature(): void;
}>(null);

export function TemperatureSwitch({ children }: { children: React.ReactNode }) {
	const [temperature, setTemperature] = useState<"c" | "f">("c");
	const toggleTemperature = useCallback(() => {
		setTemperature((temperature) => (temperature === "c" ? "f" : "c"));
	}, []);

	return (
		<temperatureContext.Provider
			value={{ state: temperature, toggleTemperature }}
		>
			{children}
		</temperatureContext.Provider>
	);
}

export function TemperatureToggle() {
	const context = useContext(temperatureContext);
	if (!context) throw new Error("No temperature context found");

	const { state, toggleTemperature } = context;

	return (
		<button type="button" onClick={toggleTemperature}>
			Switch to {state === "c" ? "Fahrenheit" : "Celsius"}
		</button>
	);
}

export function TemperatureDisplay({ c, f }: { c: number; f: number }) {
	const context = useContext(temperatureContext);
	if (!context) throw new Error("No temperature context found");

	const { state } = context;

	return (
		<span>
			{state === "c" ? c : f}
			{state === "c" ? "°C" : "°F"}
		</span>
	);
}
