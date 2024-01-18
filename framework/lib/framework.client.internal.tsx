"use client";

import * as React from "react";

import {
	INTERNAL_Outlet,
	INTERNAL_OutletProvider,
	INTERNAL_StreamReader,
	Link as INTERNAL_Link,
	type PromiseStream,
	type PromiseStreamItem,
} from "framework/client";

const Outlet = INTERNAL_Outlet;
const OutletProvider = INTERNAL_OutletProvider;
const StreamReader = INTERNAL_StreamReader;
const Link = INTERNAL_Link;

export type { PromiseStream, PromiseStreamItem };
export {
	Outlet as INTERNAL_Outlet,
	OutletProvider as INTERNAL_OutletProvider,
	StreamReader as INTERNAL_StreamReader,
	Link,
};
