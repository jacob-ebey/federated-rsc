import * as React from "react";
import { type Params } from "framework";

import {
  TemperatureDisplay,
  TemperatureSwitch,
  TemperatureToggle,
} from "./temperature-switch";

async function ArtificialDelayExample() {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return <div>Delayed for 1 second</div>;
}

export async function Component({
  children,
  params,
}: {
  children?: React.ReactNode;
  params: Params<"*">;
}) {
  const query = params["*"];

  if (!query) throw new Error("No query provided");

  const url = new URL(
    "http://api.weatherapi.com/v1/current.json?key=af6582e99cc74f78972230710240501"
  );
  url.searchParams.append("q", query);

  if (query !== "seattle") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const weather = await fetch(url.href).then((response) => response.json());

  return (
    <>
      <React.Suspense fallback={<div>Artificial delay...</div>}>
        <ArtificialDelayExample />
      </React.Suspense>
      <TemperatureSwitch>
        <div
          style={{
            padding: "1.5rem",
            borderRadius: "0.5rem",
            border: "2px solid #f3f4f6",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "1.5rem",
                  color: "#374151",
                }}
              >
                {weather.location.name}, {weather.location.region}
              </h2>
            </div>
            <TemperatureToggle />
            <div
              style={{
                margin: "1rem 0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                <div>
                  <span>
                    <img
                      height="64"
                      width="64"
                      alt={weather.current.condition.text}
                      src={weather.current.condition.icon}
                    />
                  </span>
                </div>
                <div>
                  <h4
                    style={{
                      fontSize: "2rem",
                      color: "#374151",
                    }}
                  >
                    <TemperatureDisplay
                      c={weather.current.temp_c}
                      f={weather.current.temp_f}
                    />
                  </h4>
                  <p
                    style={{
                      fontSize: "1rem",
                      color: "#374151",
                    }}
                  >
                    Feels like{" "}
                    <TemperatureDisplay
                      c={weather.current.feelslike_c}
                      f={weather.current.feelslike_f}
                    />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TemperatureSwitch>
      <React.Suspense fallback={<div>Children loading...</div>}>
        {children}
      </React.Suspense>
    </>
  );
}

Component.api = true;
