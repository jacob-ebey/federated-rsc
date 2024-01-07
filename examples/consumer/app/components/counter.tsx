"use client";

import * as React from "react";

export function Counter() {
  const [count, setCount] = React.useState(0);
  return (
    <div>
      <p>Consumer count: {count}</p>
      <button onClick={() => setCount(count - 1)}>Decrement</button>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
