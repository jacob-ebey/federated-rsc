export function Component({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <title>My App</title>
      </head>
      <body style={{ backgroundColor: "pink", padding: "1rem" }}>
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
              <li>
                <a href="/not-found">Not Found</a>
              </li>
            </ul>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
