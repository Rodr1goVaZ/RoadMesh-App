// @ts-nocheck
import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-PT" style={{ height: "100%" }}>
      <head>
        <meta charSet="utf-8" />
        <script dangerouslySetInnerHTML={{ __html: `try { var dark = localStorage.getItem("roadmesh:appearance") === "dark"; var root = document.documentElement; root.style.colorScheme = dark ? "dark" : "light"; root.style.backgroundColor = dark ? "#0D0D0D" : "#F8F9FD"; } catch (_) {}` }} />
        <meta name="referrer" content="no-referrer" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#650D0D" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/roadmesh-icon-v2.png" />
        <title>RoadMesh · Gestão de oficinas</title>
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        {/*
          Disable body scrolling on web to make ScrollView components work correctly.
          If you want to enable scrolling, remove `ScrollViewStyleReset` and
          set `overflow: auto` on the body style below.
        */}
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              body { background: inherit; }
              input:-webkit-autofill { -webkit-text-fill-color: var(--roadmesh-ink) !important; box-shadow: 0 0 0 1000px var(--roadmesh-card) inset !important; }
              [role="radio"]:focus-visible { outline: 2px solid var(--roadmesh-accent); outline-offset: 2px; }
              body > div:first-child { position: fixed !important; top: 0; left: 0; right: 0; bottom: 0; }
              [role="tablist"] [role="tab"] * { overflow: visible !important; }
              [role="heading"], [role="heading"] * { overflow: visible !important; }
            `,
          }}
        />
      </head>
      <body
        style={{
          margin: 0,
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </body>
    </html>
  );
}
