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
  /** True when the slot was added for one specific date rather than derived
   *  from a recurring window — no weekly window explains it. */
  isAdHoc?: boolean;
  /** Booked slots carry their claiming appointment so the doctor can open the
   *  slot and see who booked it — parity with the admin calendar. Null on
   *  open / blocked / held slots. */
  appointmentId?: string | null;
  patientName?: string | null;
  consultationType?: string | null;
  meetingUrl?: string | null;
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
