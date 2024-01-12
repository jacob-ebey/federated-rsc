"use client";

import * as React from "react";

const temperatureContext = React.createContext<null | {
  state: "c" | "f";
  toggleTemperature(): void;
}>(null);

export function TemperatureSwitch({ children }: { children: React.ReactNode }) {
  const [temperature, setTemperature] = React.useState<"c" | "f">("c");
  const toggleTemperature = React.useCallback(() => {
    setTemperature((temperature) => (temperature === "c" ? "f" : "c"));
  }, [setTemperature]);

  return (
    <temperatureContext.Provider
      value={{ state: temperature, toggleTemperature }}
    >
      {children}
    </temperatureContext.Provider>
  );
}

export function TemperatureToggle() {
  const context = React.useContext(temperatureContext);
  if (!context) throw new Error("No temperature context found");

  const { state, toggleTemperature } = context;

  return (
    <button onClick={toggleTemperature}>
      Switch to {state === "c" ? "Fahrenheit" : "Celsius"}
    </button>
  );
}

export function TemperatureDisplay({ c, f }: { c: number; f: number }) {
  const context = React.useContext(temperatureContext);
  if (!context) throw new Error("No temperature context found");

  const { state } = context;

  return (
    <span>
      {state === "c" ? c : f}
      {state === "c" ? "°C" : "°F"}
    </span>
  );
}
