import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Spinner from "./components/Spinner";

describe("HealthEase Frontend Core UI", () => {
  test("renders Spinner loading component without crashing", () => {
    render(<Spinner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
