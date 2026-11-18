import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";

import enLocale from "@/locales/en.json";
import esLocale from "@/locales/es.json";
import { I18nProvider, i18n } from "@/components/I18nProvider";
import { BookingModal } from "@/components/bookings/BookingModal";

jest.mock("@/hooks/useCsrfToken", () => ({
  useCsrfToken: jest.fn(),
}));

jest.mock("@/components/venues/VenueSeatWaitlistModal", () => ({
  VenueSeatWaitlistModal: () =>
    React.createElement("div", { "data-testid": "mock-waitlist" }),
}));

jest.mock("@/lib/security/offlinePasscardStore", () => ({
  storeOfflinePasscardsFromBooking: jest.fn().mockResolvedValue(undefined),
}));

function extractLeafPaths(
  obj: Record<string, unknown>,
  prefix = "",
): string[] {
  return Object.entries(obj)
    .flatMap(([key, value]) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return extractLeafPaths(value as Record<string, unknown>, fullKey);
      }
      return [fullKey];
    })
    .sort();
}

function getValueAtPath(
  obj: Record<string, unknown>,
  path: string,
): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

function extractPlaceholders(value: string): string[] {
  const matches = value.match(/\{\{[^}]+\}\}/g) ?? [];
  return [...matches].sort();
}

describe("Spanish reservation translations (#7475)", () => {
  beforeEach(async () => {
    await act(async () => {
      await i18n.changeLanguage("es");
    });
  });

  afterEach(async () => {
    await act(async () => {
      await i18n.changeLanguage("en");
    });
  });

  describe("Locale dictionary structure and parity", () => {
    it("contains all four required Spanish reservation translations", () => {
      expect(esLocale.reservations.title).toBe("Reserva confirmada");
      expect(esLocale.reservations.checkInTime).toBe("Hora de entrada");
      expect(esLocale.reservations.cancelBooking).toBe("Cancelar reserva");
      expect(esLocale.reservations.duration).toBe("Duración");
    });

    it("matches the English dictionary keys and structure exactly", () => {
      const enKeys = extractLeafPaths(enLocale as Record<string, unknown>);
      const esKeys = extractLeafPaths(esLocale as Record<string, unknown>);
      expect(esKeys).toEqual(enKeys);
    });

    it("preserves identical interpolation variables between English and Spanish", () => {
      const enReservationKeys = extractLeafPaths(
        enLocale.reservations as Record<string, unknown>,
      );

      for (const key of enReservationKeys) {
        const enValue = getValueAtPath(
          enLocale.reservations as Record<string, unknown>,
          key,
        );
        const esValue = getValueAtPath(
          esLocale.reservations as Record<string, unknown>,
          key,
        );

        expect(typeof enValue).toBe("string");
        expect(typeof esValue).toBe("string");
        expect((esValue as string).trim().length).toBeGreaterThan(0);
        expect(extractPlaceholders(esValue as string)).toEqual(
          extractPlaceholders(enValue as string),
        );
      }
    });
  });

  describe("i18next translation and interpolation", () => {
    it("resolves all four core Spanish keys via i18n.t", () => {
      expect(i18n.t("reservations.title")).toBe("Reserva confirmada");
      expect(i18n.t("reservations.checkInTime")).toBe("Hora de entrada");
      expect(i18n.t("reservations.cancelBooking")).toBe("Cancelar reserva");
      expect(i18n.t("reservations.duration")).toBe("Duración");
    });

    it("interpolates {{date}}, {{time}}, and {{venueName}} accurately in Spanish", () => {
      expect(
        i18n.t("reservations.scheduledFor", {
          date: "2026-12-01",
          time: "14:00",
        }),
      ).toBe("Programado para el 2026-12-01 a las 14:00");

      expect(
        i18n.t("reservations.checkInAt", { time: "14:00" }),
      ).toBe("Entrada a las 14:00");

      expect(
        i18n.t("reservations.onDate", { date: "2026-12-01" }),
      ).toBe("El 2026-12-01");

      expect(
        i18n.t("reservations.subtitle", { venueName: "Silicon Loft" }),
      ).toBe("Tu espacio de trabajo en Silicon Loft está reservado.");
    });
  });

  describe("BookingModal rendering in Spanish locale", () => {
    it("renders the reservation confirmation dialog entirely in Spanish with interpolation and no English fallbacks or raw keys", async () => {
      const onCancelBooking = jest.fn();

      await act(async () => {
        render(
          React.createElement(
            I18nProvider,
            { initialLanguage: "es" },
            React.createElement(BookingModal, {
              venueId: "venue-1",
              venueName: "Silicon Loft",
              confirmationId: "WS-BKG-84920",
              checkInDate: "2026-12-01",
              checkInTime: "14:00",
              duration: "2 h",
              onCancelBooking,
              onClose: jest.fn(),
              onSuccess: jest.fn(),
            }),
          ),
        );
      });

      const dialog = screen.getByRole("dialog");

      // Required Spanish strings
      expect(
        screen.getByRole("heading", { name: "Reserva confirmada" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Hora de entrada")).toBeInTheDocument();
      expect(screen.getByText("Duración")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Cancelar reserva" }),
      ).toBeInTheDocument();

      // Interpolated Spanish strings
      expect(
        screen.getByText(
          "Tu espacio de trabajo en Silicon Loft está reservado.",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("booking-confirmation-schedule"),
      ).toHaveTextContent("Programado para el 2026-12-01 a las 14:00");
      expect(
        screen.getByTestId("booking-confirmation-checkin-time"),
      ).toHaveTextContent("Entrada a las 14:00");
      expect(
        screen.getByTestId("booking-confirmation-duration"),
      ).toHaveTextContent("2 h");
      expect(screen.getByText("ID de confirmación")).toBeInTheDocument();
      expect(screen.getByTestId("booking-done-btn")).toHaveTextContent("Listo");

      // Ensure cancel callback works
      fireEvent.click(screen.getByTestId("booking-cancel-btn"));
      expect(onCancelBooking).toHaveBeenCalledTimes(1);

      // Verify no raw translation keys or English fallback strings appear
      const textContent = dialog.textContent ?? "";
      expect(textContent).not.toContain("reservations.");
      expect(textContent).not.toContain("{{");
      expect(textContent).not.toContain("Booking Confirmed");
      expect(textContent).not.toContain("Check-in Time");
      expect(textContent).not.toContain("Cancel Booking");
      expect(textContent).not.toContain("Duration");
      expect(textContent).not.toContain("Confirmation ID");
      expect(textContent).not.toContain("Your workspace at");
      expect(textContent).not.toContain("Done");
    });

    it("renders the reservation form and validation errors in Spanish when locale is es", async () => {
      await act(async () => {
        render(
          React.createElement(
            I18nProvider,
            { initialLanguage: "es" },
            React.createElement(BookingModal, {
              venueId: "venue-1",
              venueName: "Silicon Loft",
              onClose: jest.fn(),
              onSuccess: jest.fn(),
            }),
          ),
        );
      });

      expect(
        screen.getByRole("heading", { name: "Reservar espacio de trabajo" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Reserva un escritorio en Silicon Loft"),
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Fecha")).toBeInTheDocument();
      expect(screen.getByLabelText("Hora de entrada")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Cancelar" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Confirmar reserva" }),
      ).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: "Confirmar reserva" }),
        );
      });

      expect(screen.getByTestId("booking-error-alert")).toHaveTextContent(
        "Por favor, selecciona tanto la fecha como la hora",
      );
    });
  });
});
