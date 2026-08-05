const GROUP_WINDOW_MS = 5 * 60 * 1000;

type Groupable = { authorRole: string; createdAt: string };

export type GroupedChatMessage<T> = {
  message: T;
  /** True when the previous message is from the same author within the
   *  grouping window — collapses the gap and hides the timestamp. */
  grouped: boolean;
  /** True when the next message breaks the group (or is the final
   *  message) — the timestamp renders here instead of on every bubble. */
  last: boolean;
};

/**
 * Consecutive-run grouping for chat bubbles: same author within 5 minutes
 * collapses spacing and only shows a timestamp on the last bubble of the
 * run, matching common chat-app conventions (iMessage, Slack threads).
 *
 * `keyOf` decides what counts as "the same author". The default (author role)
 * is right for two-party threads. A thread where one side has several people —
 * the doctor↔support chat, where any admin can reply — must pass an identity
 * that includes the user, or two admins replying back to back collapse into one
 * run and the second admin's name never renders.
 */
export function groupChatMessages<T extends Groupable>(
  items: T[],
  keyOf: (message: T) => string = (message) => message.authorRole,
): GroupedChatMessage<T>[] {
  return items.map((message, i) => {
    const prev = items[i - 1];
    const next = items[i + 1];
    const key = keyOf(message);
    const grouped = Boolean(
      prev &&
        keyOf(prev) === key &&
        Date.parse(message.createdAt) - Date.parse(prev.createdAt) < GROUP_WINDOW_MS,
    );
    const last = !(
      next &&
      keyOf(next) === key &&
      Date.parse(next.createdAt) - Date.parse(message.createdAt) < GROUP_WINDOW_MS
    );
    return { message, grouped, last };
  });
}
