import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("app shell", () => {
  it("renders the localized welcome and offline-first status", () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Aapka stock saathi taiyaar hai." })).toBeVisible();
    expect(screen.getByText("Offline-first")).toBeVisible();
  });
});
