import * as React from "react";
import { ServerComponent } from "framework";

import { Counter } from "../../components/counter";

export function Component() {
  return (
    <>
      <h1>Hello Index</h1>
      <Counter />
        <ServerComponent url="http://localhost:3001/weather/seattle" />
      <React.Suspense fallback="Loading weather...">
        <ServerComponent url="http://localhost:3001/weather/portland" />
      </React.Suspense>
    </>
  );
}
