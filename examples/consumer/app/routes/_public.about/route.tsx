import { Counter } from "../../components/counter";

export function Component({ children }: { children: React.ReactNode }) {
	return (
		<>
			<h1>Hello About</h1>
			<Counter />
			{children}
		</>
	);
}
