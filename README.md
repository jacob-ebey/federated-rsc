# Federated RSC Reference Architecture

THIS IS SUPERSEDED BY https://github.com/jacob-ebey/fuckin-around

This repository contains the reference architecture for a federated RSC organization architecture. The architecture is based on a few principles:

- HTTP is the API for the "server" layer.
- The "server" layer exposes assets for the "client" layer to consume.
- If you are a "client" and know how to load the assets, you can consume any "server" payload.
- "Server" responses should be composable with "client" components and other "server" responses.
- "Client references" are global.
- How to load a "client reference" is a "client" concern.

## Let's get on the same page

### What is RSC?

RSC is a response format that, among other things, encodes a JSX tree. In that JSX tree there can be "client references". These "references" are boundaries that encode properties for a component, and an ID for "how to load" the component. In this architecture, client reference IDs are global to the application and refer to an export from an exposed module of a remote container.

..."refer to an export from an exposed module of a remote container", hahahah I know.... I'll explain.

### What is a container?

A container is a collection of javascript modules. Imagine an object with keys that point to dynamic imports:

```js
// I'm kinda a remote container...
export const moduleA = () => import("./moduleA.js");
// I'm another exposed module
export const moduleB = () => import("./moduleB.js");
// ...etc...
```

Beyond this, it's a a collection of dynamic imports that can be provided already loaded versions of the dependencies they need to run. To me, this is the **most important** part of module federation. It's globals with guarantees based on semantic versioning at the minimum, and whatever you want it to be at it's best.

The above over simplificated example of a container would fail if a library like React came into the picture that needed to have a single copy of itsself on the page.

If we could express the "sharing" of module federation as a javascript syntax, I'd probably pick import attributes:

```js
// http://other-domain.com/moduleA.js
import * as React from "./react.js";

export function Component() {
  return React.createElement("h1", null, "Hello World");
}
```

```js
// http://other-domain.com/container.js

import * as React from "./react.js";

export const moduleA = () =>
  import("./moduleA.js", {
    with: { shared: { react: React } },
  });
export const moduleB = () =>
  import("./moduleB.js", {
    with: { shared: { react: React } },
  });
```

The `with: { shared: { react: React } }` above means "when moduleB.js imports "react", use this instead.

And if we expand this into a runtime syntax for consuming a module from a container from another domain with it's own copy of React, it might look like this:

```js
import * as React from "./react.js";

const { Component } = await import("http://other-domain.com/container.js", {
  with: {
    shared: { react: React },
    exposed: "moduleA",
  },
});
```

Module federation explained in a nutshell, and the type of runtime syntax I'd love to see in JS runtimes. You can already cross pollute globals, and that's mainly how federaiton is accomplised in the browser for legacy support, so why not make it explicit and predictable for the use-cases where it makes sense in modern browsers and runtimes?

## What is a "Server"?

A "server" (unquoted) from here on out will refer to an HTTP server that responds with a RSC payload. The RSC payload is essentially enahnced JSON with support for JSX trees and "client references".

## What is a "Client"?

A "client" consumes a server response and renders it for display to the user. There are two types of clients we will be talking about; an "ssr client" and a "browser client". These may be refered to as "the browser", "the ssr server", "the ssr client", "the browser client", etc.

Note - if you are not familiar with RSC, SSR and "ssr client" / "client that run on the server" are on in the same. It's "the way you server render a react app before RSC".

## What is a "Client Reference"?

A "client reference" is a boundary in a JSX tree that encodes a "client reference ID" and "client reference properties". The "client reference ID" is a string that is globally unique for that specific component. The "client reference properties" are a set of properties that are passed to the "client reference ID" when it is loaded and rendered in a client, these properties are encoded in the RSC payload.

## The Architecture

### The Server Layer

The server layer is a collection of HTTP endpoints that respond with the RSC format. The RSC format encodes "client references", and also exposes the references for clients to load.

This is the layer in which you would acccess your data sources and render any markup that is not dynamic. This is also the layer in which you would expose your "client references" for clients to consume by simply by importing from a module marked `use client`.

### The Client Layer

React as today but instead of having a single entry point that looks like this:

```jsx
import * as React from "./react.js";
import * as ReactDOM from "./react-dom.js";

// A component that dynamically imports components to render the data based on the URL
import { App } from "./entry.browser.js";

ReactDOM.render(
  React.createElement(App, {
    // Get the data dependencies from the server
    data: fetch(window.location.url, {
      headers: {
        Accept: "application/json",
      },
    }),
    location: window.location.url,
  }),
  document.getElementById("root")
);
```

You have an entrypoint that, in concept, is more like this:

```jsx
import * as React from "./react.js";
import * as ReactDOM from "./react-dom.js";

// A dynamically generated entrypoint based on the URL that considers any data dependencies
const { App } = await import(window.location.url, {
  with: {
    shared: { react: React },
    exposed: "entry.browser.js",
  },
});

ReactDOM.render(React.createElement(App), document.getElementById("root"));
```

### The "Client Reference" Layer

The client references (`use client` modules) are chunked off and given a global ID per application. For example if you had a source module in an app called "test" at `app/components/MyComponents.js` that had a `Counter` component that was refereced by a server module, you'd end up with a container equivilant to this:

```js
//test_container.js
import * as React from "./react.js";

export const MyComponent = () =>
  import("./app/components/MyComponent.js", {
    with: {
      shared: { react: React },
    },
  });
```

And the ID for the bookend encoded into the RSC stream for loading this component would be: `rsc/remote/client/test/MyComponents#Counter`. At build, remote container modules are aliased, both module and chunk IDs to the global ID of the module. So our previous remote container reference module and chunk ID would be avaliable for load at RSC payload decode through: `rsc/remote/client/test/MyComponents`. Where that module is loaded from is a "client" concern and this openes up all sorts of opertunities.

### Composing servers

Composing servers is dooable at both the ingress (SSR client) and data (RSC server) layers. The ingress layer is composable just by knowing how to load the remote containers for the servers you are consuming. The data layer is composable by encoding RSC payloads as properties to a "client references" and decoding the them in the client to a JSX tree.
