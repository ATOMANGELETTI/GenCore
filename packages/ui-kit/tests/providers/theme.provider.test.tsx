import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThemeProvider, useTheme } from "../../src/providers/theme.provider";

function ThemeProbe() {
  const { theme } = useTheme();
  return <span>{theme}</span>;
}

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
});
