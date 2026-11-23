import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("app shell", () => {
  it("renders the dashboard home screen", async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("navigation", { name: "Main navigation" })).toBeVisible();
  });
});
