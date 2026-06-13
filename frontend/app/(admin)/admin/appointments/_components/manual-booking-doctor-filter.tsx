"use client";

import { useEffect } from "react";

/** Filters doctor options when the service picklist changes (manual booking form). */
export function ManualBookingDoctorFilter() {
  useEffect(() => {
    const serviceSelect = document.getElementById("gh-service-select") as HTMLSelectElement | null;
    const doctorSelect = document.getElementById("gh-doctor-select") as HTMLSelectElement | null;
    if (!serviceSelect || !doctorSelect) return;

    function filterDoctors() {
      const serviceId = serviceSelect!.value;
      const options = doctorSelect!.querySelectorAll("option[data-service-ids]");
      options.forEach((option) => {
        const ids = option.getAttribute("data-service-ids");
        option.hidden =
          serviceId !== "" &&
          ids !== "" &&
          !(`,` + ids + `,`).includes(`,` + serviceId + `,`);
      });
      if (doctorSelect!.options[doctorSelect!.selectedIndex]?.hidden) {
        doctorSelect!.value = "";
      }
    }

    filterDoctors();
    serviceSelect.addEventListener("change", filterDoctors);
    return () => serviceSelect.removeEventListener("change", filterDoctors);
  }, []);

  return null;
}
