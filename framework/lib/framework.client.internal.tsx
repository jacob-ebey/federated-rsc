"use client";

import {
	INTERNAL_Outlet,
	INTERNAL_OutletProvider,
	INTERNAL_StreamReader,
	type PromiseStream,
	type PromiseStreamItem,
} from "framework/client";

const Outlet = INTERNAL_Outlet;
const OutletProvider = INTERNAL_OutletProvider;
const StreamReader = INTERNAL_StreamReader;

export type { PromiseStream, PromiseStreamItem };
export {
	Outlet as INTERNAL_Outlet,
	OutletProvider as INTERNAL_OutletProvider,
	StreamReader as INTERNAL_StreamReader,
};
