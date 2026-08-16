# @gencore/ui-kit

GenCore's shared design system: modern flat UI, macOS-inspired window chrome,
and the official [Nord](https://www.nordtheme.com/docs/colors-and-palettes)
palette. Default theme is Polar Night (dark).

## Usage

Import the stylesheet once, at the app entry point. It pulls in Tailwind, both
themes, and registers every semantic token as a Tailwind utility:

```ts
import "@gencore/ui-kit/styles/globals.css";
```

Then wrap the app and render the shell:

```tsx
import { AppShell, ThemeProvider } from "@gencore/ui-kit";

export function App() {
  return (
    <ThemeProvider defaultTheme="polar-night">
      <AppShell
        title="GenCore Terminal"
        version="0.1.0"
        density="comfortable"
        onClose={() => getCurrentWindow().close()}
        onMinimize={() => getCurrentWindow().minimize()}
        onToggleMaximize={() => getCurrentWindow().toggleMaximize()}
      >
        <Workbench />
      </AppShell>
    </ThemeProvider>
  );
}
```

The kit never imports `@tauri-apps/api`. Window controls are plain callbacks so
the host app owns the Tauri dependency and the kit stays testable in jsdom.

## Entry points

| Specifier                                    | Contents                              |
| -------------------------------------------- | ------------------------------------- |
| `@gencore/ui-kit`                            | Everything                            |
| `@gencore/ui-kit/tokens`                     | Nord palette and token scales as TS   |
| `@gencore/ui-kit/primitives/button`          | One primitive (also `separator`, `tooltip`, `badge`, `dropdown-menu`) |
| `@gencore/ui-kit/composites/app-shell`       | One composite (also `titlebar`, `statusbar`, `content-area`) |
| `@gencore/ui-kit/styles/theme.polar-night.css` | Dark theme only                     |
| `@gencore/ui-kit/styles/theme.snow-storm.css`  | Light theme only                    |

## Theming

Themes are plain CSS custom properties. `ThemeProvider` puts the theme class on
its wrapper and writes any `tokens` overrides as inline custom properties, so an
app can retint the kit without forking CSS:

```tsx
<ThemeProvider theme="snow-storm" tokens={{ primary: "#8FBCBB" }}>
```

## Design rules

- Colours come from the 16 official Nord hex values and nothing else.
- Flat: no panel gradients, no shadow stacks, no glassmorphism. Separators are
  1px hairlines. The only blur is a 10px backdrop on the titlebar and statusbar.
- Spacing on a 4/8/12/16 grid; radii 6–8px.
- System font stack only, never a remote font. Version strings use tabular figures.
