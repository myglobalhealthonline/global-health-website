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
};

export type DoctorAvailabilityResponse = {
  windows: AvailabilityWindow[];
  slots: DoctorTimeSlotView[];
  /** Clinic timezone (Country.bookingSetting.timezone) the windows + slots
   *  are expressed in. The portal renders slot times in this zone so the
   *  doctor sees their own local working hours. */
  clinicTimezone: string;
};
