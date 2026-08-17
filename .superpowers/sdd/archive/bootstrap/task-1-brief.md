### Task 1: Hover morph and glyph removal

**Files:**
- Modify: `packages/ui-kit/tests/composites/titlebar.test.tsx`
- Modify: `packages/ui-kit/src/composites/titlebar/titlebar.component.tsx`
- Modify: `packages/ui-kit/src/composites/titlebar/titlebar.variants.ts`

**Interfaces:**
- Consumes: existing `Titlebar` / `TrafficLights` / `trafficLightVariants({ light, active })`. `TrafficLightKind` stays `"close" | "minimize" | "maximize"`.
- Produces: same public exports. Buttons have no text children. Enabled lights include classes `rounded-full`, `enabled:hover:rounded-[2px]`, and `enabled:focus-visible:rounded-[2px]`.

- [ ] **Step 1: Write the failing tests**

Append these two cases inside the existing `describe("Titlebar", …)` in `packages/ui-kit/tests/composites/titlebar.test.tsx`. Do not change the six existing tests.

```tsx
  it("renders traffic lights without glyphs", () => {
    render(<Titlebar onClose={vi.fn()} onMinimize={vi.fn()} onToggleMaximize={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Close window" })).toHaveTextContent("");
    expect(screen.getByRole("button", { name: "Minimize window" })).toHaveTextContent("");
    expect(screen.getByRole("button", { name: "Toggle maximize window" })).toHaveTextContent("");
    expect(screen.queryByText("\u00D7")).not.toBeInTheDocument();
    expect(screen.queryByText("\u2212")).not.toBeInTheDocument();
    expect(screen.queryByText("\u002B")).not.toBeInTheDocument();
  });

  it("morphs enabled lights to a 2px rounded square on hover via class", () => {
    render(<Titlebar onClose={vi.fn()} onMinimize={vi.fn()} onToggleMaximize={vi.fn()} />);

    for (const name of [
      "Close window",
      "Minimize window",
      "Toggle maximize window",
    ] as const) {
      const light = screen.getByRole("button", { name });
      expect(light).toHaveClass("rounded-full");
      expect(light).toHaveClass("enabled:hover:rounded-[2px]");
      expect(light).toHaveClass("enabled:focus-visible:rounded-[2px]");
    }
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @gencore/ui-kit test -- tests/composites/titlebar.test.tsx`

Expected: FAIL. `renders traffic lights without glyphs` fails because × / − / + are in the document. `morphs enabled lights…` fails because `enabled:hover:rounded-[2px]` is not on the buttons. The six existing tests still pass.

- [ ] **Step 3: Write minimal implementation**

In `packages/ui-kit/src/composites/titlebar/titlebar.component.tsx`, delete `trafficLightGlyph` and the inner `<span>`. Drop `group/traffic` from the wrapper (it exists only for cluster glyph reveal). Keep `trafficLightLabel` and the three `aria-label`s. `TrafficLights` becomes:

```tsx
export function TrafficLights({
  className,
  onClose,
  onMinimize,
  onToggleMaximize,
  ...props
}: TrafficLightsProps) {
  const lights: { kind: TrafficLightKind; onClick: (() => void) | undefined }[] = [
    { kind: "close", onClick: onClose },
    { kind: "minimize", onClick: onMinimize },
    { kind: "maximize", onClick: onToggleMaximize },
  ];

  return (
    <div
      data-slot="traffic-lights"
      className={cn("flex items-center gap-2", className)}
      {...props}
    >
      {lights.map(({ kind, onClick }) => (
        <button
          key={kind}
          type="button"
          data-slot={`traffic-light-${kind}`}
          aria-label={trafficLightLabel[kind]}
          disabled={!onClick}
          onClick={onClick}
          className={trafficLightVariants({ light: kind, active: Boolean(onClick) })}
        />
      ))}
    </div>
  );
}
```

Leave `Titlebar` unchanged.

In `packages/ui-kit/src/composites/titlebar/titlebar.variants.ts`, replace `trafficLightVariants` with:

```ts
export const trafficLightVariants = cva(
  [
    "size-3 rounded-full",
    "transition-[border-radius,colors] duration-150 outline-none",
    "enabled:hover:rounded-[2px] enabled:focus-visible:rounded-[2px]",
    "motion-reduce:transition-none",
    "focus-visible:ring-2 focus-visible:ring-ring/60",
  ],
  {
    variants: {
      light: {
        close: "bg-traffic-close",
        minimize: "bg-traffic-minimize",
        maximize: "bg-traffic-maximize",
      },
      active: {
        true: "",
        false: "bg-traffic-inactive",
      },
    },
    defaultVariants: { active: true },
  },
);
```

Do not add scale, hover color, or glyph classes. Do not change `titlebarVariants` or `titlebarTitleVariants`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @gencore/ui-kit test -- tests/composites/titlebar.test.tsx`

Expected: PASS (8 tests). Then run: `pnpm --filter @gencore/ui-kit test`

Expected: all ui-kit tests pass.

- [ ] **Step 5: Commit**

Stage only these three files:

```bash
git add packages/ui-kit/tests/composites/titlebar.test.tsx packages/ui-kit/src/composites/titlebar/titlebar.component.tsx packages/ui-kit/src/composites/titlebar/titlebar.variants.ts
git commit -m "feat(ui-kit): morph traffic lights to rounded squares on hover"
```

---

