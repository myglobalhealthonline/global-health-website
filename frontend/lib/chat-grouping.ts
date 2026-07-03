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
 */
export function groupChatMessages<T extends Groupable>(items: T[]): GroupedChatMessage<T>[] {
  return items.map((message, i) => {
    const prev = items[i - 1];
    const next = items[i + 1];
    const grouped = Boolean(
      prev &&
        prev.authorRole === message.authorRole &&
        Date.parse(message.createdAt) - Date.parse(prev.createdAt) < GROUP_WINDOW_MS,
    );
    const last = !(
      next &&
      next.authorRole === message.authorRole &&
      Date.parse(next.createdAt) - Date.parse(message.createdAt) < GROUP_WINDOW_MS
    );
    return { message, grouped, last };
  });
}
