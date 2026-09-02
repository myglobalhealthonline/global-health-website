"use client";

import { useEffect, useState } from "react";

/** A distinct existing customer matching the typed email. */
export type PatientOption = {
  email: string;
  fullName: string;
  appointmentCount: number;
};

/**
 * Debounced existing-customer lookup, shared by the personal-coupon email field
 * and the general-coupon recipient picker.
 *
 * Same endpoint and same shape as the manual-booking form: 250 ms debounce, at
 * least two characters, and an AbortController so the last keystroke wins
 * rather than whichever response happens to land last.
 */
export function usePatientLookup(query: string): {
  options: PatientOption[];
  loading: boolean;
} {
  const [options, setOptions] = useState<PatientOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const value = query.trim();
    const controller = new AbortController();
    const timer = setTimeout(() => {
      // A one-character substring matches almost every customer, so the
      // backend refuses it anyway — don't spend the round trip.
      if (value.length < 2) {
        setOptions([]);
        setLoading(false);
        return;
      }
      void (async () => {
        setLoading(true);
        try {
          const res = await fetch(
            `/api/admin/patients/by-email?email=${encodeURIComponent(value)}`,
            { signal: controller.signal },
          );
          const json = (await res.json()) as {
            ok?: boolean;
            data?: { patients?: PatientOption[] };
          };
          if (controller.signal.aborted) return;
          setOptions(
            res.ok && json.ok && Array.isArray(json.data?.patients) ? json.data!.patients! : [],
          );
        } catch {
          if (!controller.signal.aborted) setOptions([]);
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      })();
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return { options, loading };
}
