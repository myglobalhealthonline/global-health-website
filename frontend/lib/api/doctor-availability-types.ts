export type AvailabilityWindow = {
  id: string;
  weekday: number; // 0=Sun, 6=Sat
  startMinute: number;
  endMinute: number;
  slotDurationMinutes: number;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  isActive: boolean;
};

export type DoctorTimeSlotView = {
  id: string;
  startAt: string;
  endAt: string;
  status: "OPEN" | "HELD" | "BOOKED" | "BLOCKED";
  /** Reason recorded when the slot was bulk-blocked (vacation / time-off). */
  blockReason?: string | null;
};

export type DoctorAvailabilityResponse = {
  windows: AvailabilityWindow[];
  slots: DoctorTimeSlotView[];
  /** Clinic timezone (Country.bookingSetting.timezone) the windows + slots
   *  are expressed in. The portal renders slot times in this zone so the
   *  doctor sees their own local working hours. */
  clinicTimezone: string;
  /** Every clinic timezone the doctor can *view* their calendar in — primary
   *  country first, then each additional country. Display-only; availability
   *  is still authored in `clinicTimezone`. */
  availableTimezones?: string[];
};
