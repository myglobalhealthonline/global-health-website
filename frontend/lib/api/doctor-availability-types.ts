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
};
