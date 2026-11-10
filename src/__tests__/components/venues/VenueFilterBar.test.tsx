import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import DefaultVenueFilterBar, {
  VenueFilterBar,
  DEFAULT_VENUE_FILTERS,
  DEFAULT_VENUE_CATEGORIES,
} from "@/components/venues/VenueFilterBar";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

// Ambient declarations to avoid Jest / TS global resolution issues in test env
declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void) => void;
declare const expect: (actual: unknown) => any;
declare const beforeEach: (fn: () => void) => void;
declare const jest: any;

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
}));

jest.mock("framer-motion", () => {
  const React = require("react");
  return {
    LayoutGroup: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      div: React.forwardRef(
        (
          {
            layoutId,
            transition,
            children,
            ...props
          }: {
            layoutId?: string;
            transition?: { type?: string; stiffness?: number; damping?: number };
            children?: React.ReactNode;
            [key: string]: any;
          },
          ref: any,
        ) => (
          <div
            ref={ref}
            data-layoutid={layoutId}
            data-spring-stiffness={transition?.stiffness}
            data-spring-damping={transition?.damping}
            data-spring-type={transition?.type}
            {...props}
          >
            {children}
          </div>
        ),
      ),
    },
  };
});

describe("VenueFilterBar Component", () => {
  const mockReplace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ replace: mockReplace });
    (usePathname as jest.Mock).mockReturnValue("/venues");
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
  });

  describe("Exports", () => {
    it("exports VenueFilterBar as both named and default export", () => {
      expect(DefaultVenueFilterBar).toBe(VenueFilterBar);
    });
  });

  describe("Rendering Default State", () => {
    it("renders default filters with icons, labels, and touch targets", () => {
      render(<VenueFilterBar />);

      expect(screen.getByTestId("venue-filter-bar")).toBeInTheDocument();
      expect(screen.getByTestId("venue-filter-bar-scroll")).toBeInTheDocument();

      DEFAULT_VENUE_FILTERS.forEach((item) => {
        const pill = screen.getByTestId(`venue-filter-pill-${item.id}`);
        expect(pill).toBeInTheDocument();
        expect(pill).toHaveTextContent(item.label);
        expect(pill).toHaveAttribute("aria-checked", "false");
        // Verify minimum 44px height class for Apple HIG touch target
        expect(pill.className).toContain("min-h-[44px]");
      });
    });

    it("renders category tabs by default", () => {
      render(<VenueFilterBar />);

      expect(screen.getByTestId("venue-category-tabs")).toBeInTheDocument();
      expect(screen.getByRole("tablist", { name: "Venue categories" })).toBeInTheDocument();

      DEFAULT_VENUE_CATEGORIES.forEach((cat) => {
        const tab = screen.getByTestId(`venue-category-tab-${cat.id}`);
        expect(tab).toBeInTheDocument();
        expect(tab).toHaveTextContent(cat.label);
        expect(tab).toHaveAttribute("role", "tab");
      });
    });
  });

  describe("Framer Motion Sliding Pill Indicator", () => {
    it("renders layoutId='activeFilterPill' on the selected category tab with spring transition", () => {
      render(<VenueFilterBar />);

      const allTab = screen.getByTestId("venue-category-tab-all");
      expect(allTab).toHaveAttribute("aria-selected", "true");

      const indicator = screen.getByTestId("active-filter-pill-indicator");
      expect(indicator).toBeInTheDocument();
      expect(allTab).toContainElement(indicator);

      // Verify layoutId and spring physics
      expect(indicator).toHaveAttribute("data-layoutid", "activeFilterPill");
      expect(indicator).toHaveAttribute("data-spring-type", "spring");
      expect(indicator).toHaveAttribute("data-spring-stiffness", "450");
      expect(indicator).toHaveAttribute("data-spring-damping", "30");
    });

    it("moves the active indicator when a different category tab is clicked", () => {
      const onSelect = jest.fn();
      render(<VenueFilterBar onSelectCategory={onSelect} />);

      const cafeTab = screen.getByTestId("venue-category-tab-cafe");
      fireEvent.click(cafeTab);

      expect(onSelect).toHaveBeenCalledWith("cafe");
      expect(cafeTab).toHaveAttribute("aria-selected", "true");

      const indicator = screen.getByTestId("active-filter-pill-indicator");
      expect(cafeTab).toContainElement(indicator);
      expect(mockReplace).toHaveBeenCalledWith("/venues?category=cafe", { scroll: false });
    });

    it("removes category query param when 'all' tab is selected", () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("category=coworking"),
      );
      render(<VenueFilterBar />);

      const allTab = screen.getByTestId("venue-category-tab-all");
      fireEvent.click(allTab);

      expect(mockReplace).toHaveBeenCalledWith("/venues", { scroll: false });
    });
  });

  describe("Keyboard Navigation on Category Tabs", () => {
    it("cycles through category tabs with ArrowRight and wraps around", () => {
      render(<VenueFilterBar />);

      const allTab = screen.getByTestId("venue-category-tab-all");
      const cafeTab = screen.getByTestId("venue-category-tab-cafe");
      const coworkingTab = screen.getByTestId("venue-category-tab-coworking");
      const libraryTab = screen.getByTestId("venue-category-tab-library");

      allTab.focus();
      expect(allTab).toHaveAttribute("aria-selected", "true");

      // Press ArrowRight -> moves to cafe
      fireEvent.keyDown(allTab, { key: "ArrowRight" });
      expect(cafeTab).toHaveAttribute("aria-selected", "true");

      // Press ArrowRight -> moves to coworking
      fireEvent.keyDown(cafeTab, { key: "ArrowRight" });
      expect(coworkingTab).toHaveAttribute("aria-selected", "true");

      // Press ArrowRight -> moves to library
      fireEvent.keyDown(coworkingTab, { key: "ArrowRight" });
      expect(libraryTab).toHaveAttribute("aria-selected", "true");

      // Press ArrowRight on last tab -> wraps to all
      fireEvent.keyDown(libraryTab, { key: "ArrowRight" });
      expect(allTab).toHaveAttribute("aria-selected", "true");
    });

    it("cycles backward through category tabs with ArrowLeft and wraps around", () => {
      render(<VenueFilterBar />);

      const allTab = screen.getByTestId("venue-category-tab-all");
      const libraryTab = screen.getByTestId("venue-category-tab-library");
      const coworkingTab = screen.getByTestId("venue-category-tab-coworking");

      allTab.focus();
      expect(allTab).toHaveAttribute("aria-selected", "true");

      // Press ArrowLeft on first tab -> wraps to last tab (library)
      fireEvent.keyDown(allTab, { key: "ArrowLeft" });
      expect(libraryTab).toHaveAttribute("aria-selected", "true");

      // Press ArrowLeft on library -> moves to coworking
      fireEvent.keyDown(libraryTab, { key: "ArrowLeft" });
      expect(coworkingTab).toHaveAttribute("aria-selected", "true");
    });

    it("jumps to first tab with Home and last tab with End", () => {
      render(<VenueFilterBar />);

      const allTab = screen.getByTestId("venue-category-tab-all");
      const cafeTab = screen.getByTestId("venue-category-tab-cafe");
      const libraryTab = screen.getByTestId("venue-category-tab-library");

      // Select cafe first
      fireEvent.click(cafeTab);
      expect(cafeTab).toHaveAttribute("aria-selected", "true");

      // Press End -> jumps to library
      fireEvent.keyDown(cafeTab, { key: "End" });
      expect(libraryTab).toHaveAttribute("aria-selected", "true");

      // Press Home -> jumps to all
      fireEvent.keyDown(libraryTab, { key: "Home" });
      expect(allTab).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("Keyboard Navigation on Filter Pills", () => {
    it("moves focus between amenity filter pills using ArrowRight and ArrowLeft", () => {
      render(<VenueFilterBar />);

      const wifiPill = screen.getByTestId("venue-filter-pill-wifi");
      const outletsPill = screen.getByTestId("venue-filter-pill-outlets");

      wifiPill.focus();
      fireEvent.keyDown(wifiPill, { key: "ArrowRight" });
      expect(document.activeElement).toBe(outletsPill);

      fireEvent.keyDown(outletsPill, { key: "ArrowLeft" });
      expect(document.activeElement).toBe(wifiPill);
    });
  });

  describe("Controlled State & Customization", () => {
    it("respects controlled selectedCategory / activeCategory prop", () => {
      render(<VenueFilterBar selectedCategory="library" />);

      const libraryTab = screen.getByTestId("venue-category-tab-library");
      expect(libraryTab).toHaveAttribute("aria-selected", "true");

      const indicator = screen.getByTestId("active-filter-pill-indicator");
      expect(libraryTab).toContainElement(indicator);
    });

    it("hides category tabs when showCategoryTabs is false", () => {
      render(<VenueFilterBar showCategoryTabs={false} />);

      expect(screen.queryByTestId("venue-category-tabs")).not.toBeInTheDocument();
      expect(screen.getByTestId("venue-filter-bar-scroll")).toBeInTheDocument();
    });
  });

  describe("Empty Filters Handling", () => {
    it("returns null when filters list is empty", () => {
      const { container } = render(<VenueFilterBar filters={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("Toggling Filters & Callbacks", () => {
    it("calls onToggleFilter and onFilterChange and updates URL when a pill is clicked", () => {
      const onToggle = jest.fn();
      const onChange = jest.fn();
      render(<VenueFilterBar onToggleFilter={onToggle} onFilterChange={onChange} />);

      const wifiPill = screen.getByTestId("venue-filter-pill-wifi");
      fireEvent.click(wifiPill);

      expect(onToggle).toHaveBeenCalledWith("wifi", true);
      expect(onChange).toHaveBeenCalledWith(["wifi"]);
      expect(mockReplace).toHaveBeenCalledWith("/venues?wifi=true", {
        scroll: false,
      });
    });

    it("removes amenity and updates callbacks when an active pill is clicked", () => {
      const onToggle = jest.fn();
      const onChange = jest.fn();
      render(
        <VenueFilterBar
          selectedAmenities={["wifi", "coffee"]}
          onToggleFilter={onToggle}
          onFilterChange={onChange}
        />,
      );

      const wifiPill = screen.getByTestId("venue-filter-pill-wifi");
      fireEvent.click(wifiPill);

      expect(onToggle).toHaveBeenCalledWith("wifi", false);
      expect(onChange).toHaveBeenCalledWith(["coffee"]);
    });

    it("respects controlled selectedFilters", () => {
      render(<VenueFilterBar selectedFilters={["wifi"]} />);

      const wifiPill = screen.getByTestId("venue-filter-pill-wifi");
      expect(wifiPill).toHaveAttribute("aria-checked", "true");
      expect(wifiPill).toHaveAttribute("data-selected", "true");

      const outletsPill = screen.getByTestId("venue-filter-pill-outlets");
      expect(outletsPill).toHaveAttribute("aria-checked", "false");
    });

    it("respects controlled selectedAmenities prop", () => {
      render(<VenueFilterBar selectedAmenities={["quiet", "outdoor"]} />);

      const quietPill = screen.getByTestId("venue-filter-pill-quiet");
      const outdoorPill = screen.getByTestId("venue-filter-pill-outdoor");
      const wifiPill = screen.getByTestId("venue-filter-pill-wifi");

      expect(quietPill).toHaveAttribute("aria-checked", "true");
      expect(outdoorPill).toHaveAttribute("aria-checked", "true");
      expect(wifiPill).toHaveAttribute("aria-checked", "false");
    });

    it("prioritizes selectedAmenities over selectedFilters when both are provided", () => {
      render(
        <VenueFilterBar
          selectedAmenities={["coffee"]}
          selectedFilters={["wifi", "outlets"]}
        />,
      );

      const coffeePill = screen.getByTestId("venue-filter-pill-coffee");
      const wifiPill = screen.getByTestId("venue-filter-pill-wifi");

      expect(coffeePill).toHaveAttribute("aria-checked", "true");
      expect(wifiPill).toHaveAttribute("aria-checked", "false");
    });

    it("handles empty array selectedAmenities={[]} taking precedence over selectedFilters", () => {
      render(
        <VenueFilterBar
          selectedAmenities={[]}
          selectedFilters={["wifi", "outlets"]}
        />,
      );

      const wifiPill = screen.getByTestId("venue-filter-pill-wifi");
      const outletsPill = screen.getByTestId("venue-filter-pill-outlets");

      expect(wifiPill).toHaveAttribute("aria-checked", "false");
      expect(outletsPill).toHaveAttribute("aria-checked", "false");
      expect(screen.queryByTestId("reset-filters-button")).not.toBeInTheDocument();
    });
  });

  describe("Reset Filters Button (#7375)", () => {
    it("is not rendered when no amenities are selected", () => {
      render(<VenueFilterBar selectedAmenities={[]} />);
      expect(screen.queryByTestId("reset-filters-button")).not.toBeInTheDocument();
    });

    it("renders with correct count label when 1 amenity is selected", () => {
      render(<VenueFilterBar selectedAmenities={["wifi"]} />);

      const resetBtn = screen.getByTestId("reset-filters-button");
      expect(resetBtn).toBeInTheDocument();
      expect(resetBtn).toHaveTextContent("Reset filters (1)");
      expect(resetBtn).toHaveAttribute("aria-label", "Reset filters (1)");
      expect(resetBtn).toHaveAttribute("type", "button");
      expect(resetBtn.className).toContain("min-h-[44px]");
    });

    it("renders with correct count label when 3 amenities are selected", () => {
      render(<VenueFilterBar selectedAmenities={["wifi", "outlets", "quiet"]} />);

      const resetBtn = screen.getByTestId("reset-filters-button");
      expect(resetBtn).toBeInTheDocument();
      expect(resetBtn).toHaveTextContent("Reset filters (3)");
      expect(resetBtn).toHaveAttribute("aria-label", "Reset filters (3)");
    });

    it("renders from URL params when uncontrolled", () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("wifi=true&coffee=true"),
      );
      render(<VenueFilterBar />);

      const resetBtn = screen.getByTestId("reset-filters-button");
      expect(resetBtn).toBeInTheDocument();
      expect(resetBtn).toHaveTextContent("Reset filters (2)");
    });

    it("calls onFilterChange atomically with [] on click", () => {
      const onFilterChange = jest.fn();
      render(
        <VenueFilterBar
          selectedAmenities={["wifi", "quiet"]}
          onFilterChange={onFilterChange}
        />,
      );

      const resetBtn = screen.getByTestId("reset-filters-button");
      fireEvent.click(resetBtn);

      expect(onFilterChange).toHaveBeenCalledTimes(1);
      expect(onFilterChange).toHaveBeenCalledWith([]);
    });

    it("does not call onToggleFilter repeatedly when onFilterChange is provided to avoid duplicate updates", () => {
      const onFilterChange = jest.fn();
      const onToggleFilter = jest.fn();
      render(
        <VenueFilterBar
          selectedAmenities={["wifi", "quiet", "coffee"]}
          onFilterChange={onFilterChange}
          onToggleFilter={onToggleFilter}
        />,
      );

      const resetBtn = screen.getByTestId("reset-filters-button");
      fireEvent.click(resetBtn);

      expect(onFilterChange).toHaveBeenCalledTimes(1);
      expect(onFilterChange).toHaveBeenCalledWith([]);
      // onToggleFilter should NOT be called to avoid N duplicate / conflicting parent updates
      expect(onToggleFilter).not.toHaveBeenCalled();
    });

    it("falls back to calling onToggleFilter(id, false) for each filter when onFilterChange is not provided", () => {
      const onToggleFilter = jest.fn();
      render(
        <VenueFilterBar
          selectedAmenities={["wifi", "quiet"]}
          onToggleFilter={onToggleFilter}
        />,
      );

      const resetBtn = screen.getByTestId("reset-filters-button");
      fireEvent.click(resetBtn);

      expect(onToggleFilter).toHaveBeenCalledTimes(2);
      expect(onToggleFilter).toHaveBeenCalledWith("wifi", false);
      expect(onToggleFilter).toHaveBeenCalledWith("quiet", false);
    });

    it("clears amenity query parameters while preserving unrelated parameters in URL", () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("wifi=true&quiet=true&category=cafe&minDb=40&maxDb=70&q=central"),
      );
      render(<VenueFilterBar />);

      const resetBtn = screen.getByTestId("reset-filters-button");
      fireEvent.click(resetBtn);

      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining("category=cafe"),
        { scroll: false },
      );
      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining("minDb=40"),
        { scroll: false },
      );
      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining("maxDb=70"),
        { scroll: false },
      );
      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining("q=central"),
        { scroll: false },
      );
      expect(mockReplace).not.toHaveBeenCalledWith(
        expect.stringContaining("wifi="),
        expect.anything(),
      );
      expect(mockReplace).not.toHaveBeenCalledWith(
        expect.stringContaining("quiet="),
        expect.anything(),
      );
    });

    it("clears comma-separated amenities query parameter", () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("amenities=wifi,coffee&category=coworking"),
      );
      render(<VenueFilterBar />);

      const resetBtn = screen.getByTestId("reset-filters-button");
      expect(resetBtn).toHaveTextContent("Reset filters (2)");

      fireEvent.click(resetBtn);

      expect(mockReplace).toHaveBeenCalledWith("/venues?category=coworking", {
        scroll: false,
      });
    });

    it("works correctly with syncWithUrl=false in uncontrolled mode", () => {
      const onChange = jest.fn();
      render(<VenueFilterBar syncWithUrl={false} onFilterChange={onChange} />);

      // Initially no filters and no reset button
      expect(screen.queryByTestId("reset-filters-button")).not.toBeInTheDocument();

      // Click to toggle wifi
      const wifiPill = screen.getByTestId("venue-filter-pill-wifi");
      fireEvent.click(wifiPill);

      expect(wifiPill).toHaveAttribute("aria-checked", "true");
      expect(onChange).toHaveBeenCalledWith(["wifi"]);
      expect(mockReplace).not.toHaveBeenCalled();

      // Reset button should now be visible
      const resetBtn = screen.getByTestId("reset-filters-button");
      expect(resetBtn).toBeInTheDocument();
      expect(resetBtn).toHaveTextContent("Reset filters (1)");

      // Click Reset Filters
      fireEvent.click(resetBtn);

      expect(onChange).toHaveBeenCalledWith([]);
      expect(wifiPill).toHaveAttribute("aria-checked", "false");
      expect(screen.queryByTestId("reset-filters-button")).not.toBeInTheDocument();
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe("Custom Range Filters Popover Integration", () => {
    it("renders the popover trigger button and opens the filter popover on click", () => {
      render(<VenueFilterBar />);

      const triggerBtn = screen.getByTestId("venue-filter-popover-trigger");
      expect(triggerBtn).toBeInTheDocument();
      expect(triggerBtn).toHaveTextContent("Noise & Wi-Fi");

      // Popover should initially be closed
      expect(screen.queryByTestId("venue-filter-popover")).not.toBeInTheDocument();

      // Open popover
      fireEvent.click(triggerBtn);
      expect(screen.getByTestId("venue-filter-popover")).toBeInTheDocument();
      expect(screen.getByTestId("decibel-range-slider")).toBeInTheDocument();
      expect(screen.getByTestId("wifi-range-slider")).toBeInTheDocument();
    });

    it("applies custom range filters to URL and calls callbacks when Apply is clicked", () => {
      const onDecibelChange = jest.fn();
      const onWifiChange = jest.fn();
      render(
        <VenueFilterBar
          onDecibelRangeChange={onDecibelChange}
          onWifiSpeedRangeChange={onWifiChange}
        />,
      );

      // Open popover
      fireEvent.click(screen.getByTestId("venue-filter-popover-trigger"));

      // Click Apply Filters
      const applyBtn = screen.getByTestId("apply-range-filters-button");
      fireEvent.click(applyBtn);

      expect(onDecibelChange).toHaveBeenCalled();
      expect(onWifiChange).toHaveBeenCalled();
      // Popover closes after apply
      expect(screen.queryByTestId("venue-filter-popover")).not.toBeInTheDocument();
    });

    it("resets range filters to defaults when Reset Defaults is clicked", () => {
      const onDecibelChange = jest.fn();
      const onWifiChange = jest.fn();
      render(
        <VenueFilterBar
          decibelRange={[40, 60]}
          wifiSpeedRange={[50, 200]}
          onDecibelRangeChange={onDecibelChange}
          onWifiSpeedRangeChange={onWifiChange}
        />,
      );

      // Open popover
      fireEvent.click(screen.getByTestId("venue-filter-popover-trigger"));

      // Click Reset Defaults
      const resetBtn = screen.getByTestId("reset-range-filters-button");
      fireEvent.click(resetBtn);

      expect(onDecibelChange).toHaveBeenCalledWith([30, 85]);
      expect(onWifiChange).toHaveBeenCalledWith([10, 300]);
    });

    it("closes popover when close button or Escape key is pressed", () => {
      render(<VenueFilterBar />);

      const triggerBtn = screen.getByTestId("venue-filter-popover-trigger");
      fireEvent.click(triggerBtn);
      expect(screen.getByTestId("venue-filter-popover")).toBeInTheDocument();

      // Close via close button
      const closeBtn = screen.getByTestId("close-filter-popover-button");
      fireEvent.click(closeBtn);
      expect(screen.queryByTestId("venue-filter-popover")).not.toBeInTheDocument();

      // Open again and close via Escape key
      fireEvent.click(triggerBtn);
      expect(screen.getByTestId("venue-filter-popover")).toBeInTheDocument();
      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByTestId("venue-filter-popover")).not.toBeInTheDocument();
    });
  });
});
