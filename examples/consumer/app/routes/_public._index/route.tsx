import { RSCFrame } from "framework";

import { Counter } from "../../components/counter";

export function Component() {
	return (
		<>
			<h1>Hello Index</h1>
			<Counter />
			<div style={{ backgroundColor: "yellow", padding: "1rem" }}>
				<RSCFrame url="http://localhost:3001/weather/seattle">
					<div style={{ backgroundColor: "yellow", padding: "1rem" }}>
						<RSCFrame url="http://localhost:3001/weather/portland" />
					</div>
				</RSCFrame>
			</div>
		</>
	);
}
