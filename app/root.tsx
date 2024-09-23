import { cssBundleHref } from "@remix-run/css-bundle";
import type { LinksFunction } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";

import mainStyles from "~/main.css";
import stylesheet from "~/tailwind.css";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "stylesheet", href: mainStyles },
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
];

// export const loader = async ({ request }: LoaderFunctionArgs) => {
//   return json({ user: await getUser(request) });
// };

export default function App() {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-full bg-slate-200">
        <header className="container mx-auto mb-5 rounded-b-lg bg-white p-8">
          <h1 className="text-center drop-shadow-md text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            The Official Hazel Health Pointing Poker App
          </h1>
        </header>
        <main className="container mx-auto min-h-screen rounded-t-lg bg-white p-8">
          <Outlet />
        </main>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
