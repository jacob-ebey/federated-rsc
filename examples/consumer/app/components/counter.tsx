"use client";

import * as React from "react";

function CounterConsumer() {
	const [count, setCount] = React.useState(0);
	return (
		<div>
			<p>Consumer count: {count}</p>
			<button type="button" onClick={() => setCount(count - 1)}>
				Decrement
			</button>
			<button type="button" onClick={() => setCount(count + 1)}>
				Increment
			</button>
		</div>
	);
}

export { CounterConsumer as Counter };
