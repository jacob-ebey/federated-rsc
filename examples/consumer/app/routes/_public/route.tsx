import { Counter } from "../../components/counter";

export function Component({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <title>My App</title>
      </head>
      <body>
        <header>
          <nav>
            <ul>
              <li>
                <a href="/">Home</a>
              </li>
              <li>
                <a href="/about">About</a>
              </li>
              <li>
                <a href="/about/sub">About Sub</a>
              </li>
            </ul>
          </nav>
        </header>
        <Counter />
        {children}
      </body>
    </html>
  );
}
