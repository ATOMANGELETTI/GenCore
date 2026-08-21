import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeProvider, useTheme } from "../../src/providers/theme.provider";

function ThemeProbe() {
  const { theme } = useTheme();
  return <span>{theme}</span>;
}

afterEach(() => {
  document.documentElement.className = "";
});

describe("ThemeProvider", () => {
  it("defaults to Polar Night and marks the wrapper dark", () => {
    const { container } = render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    const wrapper = container.firstElementChild as HTMLElement;

    expect(screen.getByText("polar-night")).toBeInTheDocument();
    expect(wrapper).toHaveClass("theme-polar-night", "dark");
    expect(wrapper).toHaveAttribute("data-theme", "polar-night");
  });

  it("applies the Snow Storm theme class", () => {
    const { container } = render(
      <ThemeProvider theme="snow-storm">
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(container.firstElementChild).toHaveClass("theme-snow-storm", "light");
  });

  it("writes token overrides as CSS custom properties", () => {
    const { container } = render(
      <ThemeProvider tokens={{ primary: "#8FBCBB", primaryForeground: "#2E3440" }}>
        <ThemeProbe />
      </ThemeProvider>,
    );
    const wrapper = container.firstElementChild as HTMLElement;

    expect(wrapper.style.getPropertyValue("--primary")).toBe("#8FBCBB");
    expect(wrapper.style.getPropertyValue("--primary-foreground")).toBe("#2E3440");
  });

  it("throws when useTheme is called outside a provider", () => {
    expect(() => render(<ThemeProbe />)).toThrow(/useTheme must be used inside/);
  });

  it("syncs Polar Night classes onto documentElement", () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(document.documentElement).toHaveClass("theme-polar-night", "dark");
    expect(document.documentElement).not.toHaveClass("theme-snow-storm");
    expect(document.documentElement).not.toHaveClass("light");
  });

  it("syncs Snow Storm classes onto documentElement", () => {
    render(
      <ThemeProvider theme="snow-storm">
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(document.documentElement).toHaveClass("theme-snow-storm", "light");
    expect(document.documentElement).not.toHaveClass("theme-polar-night");
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("replaces documentElement theme classes when the theme changes", () => {
    const { rerender } = render(
      <ThemeProvider theme="polar-night">
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(document.documentElement).toHaveClass("theme-polar-night", "dark");

    rerender(
      <ThemeProvider theme="snow-storm">
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(document.documentElement).toHaveClass("theme-snow-storm", "light");
    expect(document.documentElement).not.toHaveClass("theme-polar-night");
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("removes documentElement theme classes on unmount", () => {
    const { unmount } = render(
      <ThemeProvider theme="snow-storm">
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(document.documentElement).toHaveClass("theme-snow-storm", "light");

    unmount();

    expect(document.documentElement).not.toHaveClass("theme-snow-storm");
    expect(document.documentElement).not.toHaveClass("light");
    expect(document.documentElement).not.toHaveClass("theme-polar-night");
    expect(document.documentElement).not.toHaveClass("dark");
  });
});
