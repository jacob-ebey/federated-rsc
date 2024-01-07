
export const routes = [
  {
    id: "$",
    path: "*",
    lazy: () => import("./app/routes/$/route.tsx"),
  },
  {
    id: "_public",
    lazy: () => import("./app/routes/_public/route.tsx"),
    children: [
      {
        id: "_public._index",
        index: true,
        lazy: () => import("./app/routes/_public._index/route.tsx"),
      },
    ]
  },
];
