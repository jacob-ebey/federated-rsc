import { RSCFrame } from "framework";

export function Component({ children }: { children: React.ReactNode }) {
	return (
		<RSCFrame url="http://localhost:3001/layout">
			<div style={{ backgroundColor: "yellow", padding: "1rem" }}>
				<ul>
					<li>Pink = Remote</li>
					<li>Yellow = Host</li>
				</ul>
				{children}
			</div>
		</RSCFrame>
	);
}
