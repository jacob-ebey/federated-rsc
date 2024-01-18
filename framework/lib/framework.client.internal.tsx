"use client";

import {
	type PromiseStream,
	type PromiseStreamItem,
	INTERNAL_Outlet,
	INTERNAL_OutletProvider,
	INTERNAL_StreamReader,
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
