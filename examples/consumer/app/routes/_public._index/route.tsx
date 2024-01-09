import * as React from "react";
import { RSCFrame } from "framework";

import { Counter } from "../../components/counter";

export function Component() {
  return (
    <>
      <h1>Hello Index</h1>
      <Counter />
      <RSCFrame url="http://localhost:3001/weather/seattle">
        <RSCFrame url="http://localhost:3001/weather/portland" />
      </RSCFrame>
    </>
  );
}
