import * as React from "react";

import { createFromReadableStream } from "framework/react.client";

export type LocationState =
	| {
			state: "idle";
			url: URL;
	  }
	| {
			state: "transitioning";
			to: URL;
			url: URL;
	  };

const INTERNAL_locationContext = React.createContext<null | LocationState>(
	null,
);

function INTERNAL_LocationContextProvider({
	value,
	children,
}: React.ProviderProps<LocationState>) {
	return (
		<INTERNAL_locationContext.Provider value={value}>
			{children}
		</INTERNAL_locationContext.Provider>
	);
}

export interface INTERNAL_LocationState {
	root: React.Usable<React.ReactElement>;
	url: URL;
}

export function INTERNAL_Location({
	getSetLocation,
	initialRoot,
	initialURL,
}: {
	getSetLocation?: (
		setLocation: (location: INTERNAL_LocationState) => void,
	) => void;
	initialRoot: React.Usable<React.ReactElement>;
	initialURL: URL;
}) {
	// TODO: propagate state
	const [transitioning, startTransition] = React.useTransition();
	const [to, setTo] = React.useState<null | URL>(null);
	const [location, _setLocation] = React.useState<INTERNAL_LocationState>({
		root: initialRoot,
		url: initialURL,
	});
	if (getSetLocation) {
		getSetLocation((location) => {
			setTo(location.url);
			startTransition(() => _setLocation(location));
		});
	}

	const locationState = React.useMemo<LocationState>(
		() =>
			transitioning && to
				? {
						state: "transitioning",
						to,
						url: location.url,
				  }
				: {
						state: "idle",
						url: location.url,
				  },
		[location.url, transitioning, to],
	);

	// return React.use(location.root);
	return (
		<INTERNAL_LocationContextProvider value={locationState}>
			{React.use(location.root) as React.JSX.Element}
		</INTERNAL_LocationContextProvider>
	);
}

const outletContext = React.createContext<null | Record<
	string,
	React.ReactNode
>>(null);

export function INTERNAL_Outlet({ id }: { id: string }) {
	const context = React.useContext(outletContext);
	if (!context) throw new Error("No router context found");
	return context[id] ?? null;
}

export interface INTERNAL_OutletProviderProps {
	children: React.ReactNode;
	outlets: Record<string, React.ReactNode>;
}

export function INTERNAL_OutletProvider({
	children,
	outlets,
}: INTERNAL_OutletProviderProps) {
	const parentOutlets = React.useContext(outletContext);
	return (
		<outletContext.Provider value={{ ...parentOutlets, ...outlets }}>
			{children}
		</outletContext.Provider>
	);
}

export type PromiseStreamItem<T> = null | { head: T; tail: PromiseStream<T> };
export type PromiseStream<T> = Promise<PromiseStreamItem<T>>;

export function INTERNAL_StreamReader({
	cache,
	children,
	promiseStream,
}: {
	cache: { current: null | Promise<React.JSX.Element> };
	children?: React.ReactNode;
	promiseStream: PromiseStream<string>;
}) {
	let current: Promise<React.JSX.Element>;
	if (cache.current) {
		current = cache.current;
	} else {
		current = cache.current = createFromReadableStream(
			fromPromiseStream(promiseStream).pipeThrough(
				new TransformStream({
					transform(chunk, controller) {
						// base64 string -> Uint8Array
						controller.enqueue(
							new Uint8Array(
								atob(chunk as string)
									.split("")
									.map((c) => c.charCodeAt(0)),
							),
						);
					},
				}),
			),
		);
	}

	const element =
		React.use<
			React.ReactElement<
				INTERNAL_OutletProviderProps,
				typeof INTERNAL_OutletProvider
			>
		>(current);

	if (!element?.props?.outlets) throw new Error("No outlets found");

	return React.useMemo(() => {
		return (
			<INTERNAL_OutletProvider
				{...element.props}
				outlets={{
					...element.props.outlets,
					"!": children,
				}}
			/>
		);
	}, [element, children]);
}

function fromPromiseStream<T = unknown>(initialPromise: PromiseStream<T>) {
	let promise = initialPromise;
	return new ReadableStream<T>({
		async pull(controller) {
			const item = await promise;
			if (item) {
				controller.enqueue(item.head);
				promise = item.tail;
			} else {
				controller.close();
			}
		},
	});
}

export function useLocation() {
	const location = React.useContext(INTERNAL_locationContext);
	if (!location) throw new Error("No router context found");
	return location;
}
