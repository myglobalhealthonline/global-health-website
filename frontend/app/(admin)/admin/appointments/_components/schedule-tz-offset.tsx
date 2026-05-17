"use client";

import { useEffect, useRef } from "react";

/**
 * Hidden form input that ships the browser's current timezone offset
 * (minutes WEST of UTC, per `Date.prototype.getTimezoneOffset()`) along
 * with the rest of the schedule form. The server uses this value to
 * convert the `<input type="datetime-local">` string into a correct UTC
 * ISO without depending on the Node server's own timezone.
 *
 * Why a separate component:
 *   The schedule form is a Next.js server action (no client onSubmit
 *   handler). We can't compute the offset in the action itself because
 *   that runs on the server. Instead, set the offset once on mount and
 *   the form picks it up at submit time.
 *
 * Note: the offset can flip across DST during a long admin session
 * (e.g. open the page at 23:59 GMT, save at 01:01 BST after the clocks
 * change). We refresh on every focus to catch that edge.
 */
export function ScheduleTzOffsetInput({ formId }: { formId?: string }) {
  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function refresh() {
      if (ref.current) {
        ref.current.value = String(new Date().getTimezoneOffset());
      }
    }
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  return (
    <input
      ref={ref}
      type="hidden"
      name="scheduledAtTzOffset"
      defaultValue="0"
      {...(formId ? { form: formId } : {})}
    />
  );
}
