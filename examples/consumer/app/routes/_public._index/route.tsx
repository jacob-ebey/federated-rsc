import { ServerComponent } from "framework/server";

import { Counter } from "../../components/counter";

export function Component() {
  return (
    <>
      <h1>Hello Index</h1>
      <Counter />
      <ServerComponent url="http://localhost:3001/weather/seattle" />
    </>
  );
}
