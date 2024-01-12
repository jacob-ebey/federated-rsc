"use client";

import * as React from "react";

function CounterBasic() {
  const [count, setCount] = React.useState(0);
  return (
    <div>
      <p>Basic count: {count}</p>
      <button onClick={() => setCount(count - 1)}>Decrement</button>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

export { CounterBasic as Counter };
