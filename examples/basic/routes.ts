
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
      {
        id: "_public.about",
        path: "about",
        lazy: () => import("./app/routes/_public.about/route.tsx"),
        children: [
          {
            id: "_public.about.$slug",
            path: ":slug",
            lazy: () => import("./app/routes/_public.about.$slug/route.tsx"),
          },
        ]
      },
      {
        id: "_public.slug.$slug",
        path: "slug/:slug",
        lazy: () => import("./app/routes/_public.slug.$slug/route.tsx"),
      },
    ]
  },
];
