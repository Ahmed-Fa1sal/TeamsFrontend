/**
 * Pure helpers for the channel chat view.
 * No Angular / DOM dependencies — safe to unit-test in isolation.
 */

export interface ChannelMessage {
  id: string | number;
  authorId: string | number;
  authorName: string;
  authorInitials: string;
  isOwn: boolean;
  text: string;
  sentAt: string; // ISO timestamp
  status?: 'sending' | 'sent' | 'failed';
}

export interface MessageGroup {
  dateLabel: string; // "Today", "Yesterday", "Mon, Jun 12"
  messages: ChannelMessage[];
}

/** Same-author grouping window: consecutive messages within this many ms
 *  share one avatar + meta row. */
const GROUP_WINDOW_MS = 2 * 60 * 1000;

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** "Today" / "Yesterday" / "Mon, Jun 12" for a given ISO timestamp. */
export function dateLabelFor(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const today = startOfDay(now);
  const day = startOfDay(date);
  const oneDay = 24 * 60 * 60 * 1000;

  if (day === today) return 'Today';
  if (day === today - oneDay) return 'Yesterday';

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** Short clock time, e.g. "10:05 AM". */
export function timeLabelFor(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Groups a flat, chronologically-ordered message list into day buckets. */
export function groupMessages(
  messages: readonly ChannelMessage[],
  now: Date = new Date(),
): MessageGroup[] {
  const groups: MessageGroup[] = [];

  for (const message of messages) {
    const label = dateLabelFor(message.sentAt, now);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.dateLabel === label) {
      lastGroup.messages.push(message);
    } else {
      groups.push({ dateLabel: label, messages: [message] });
    }
  }

  return groups;
}

/**
 * True when this message should render its own avatar + meta row, i.e. it
 * starts a new author-group (different author, or > GROUP_WINDOW_MS after the
 * previous message in the same day bucket).
 */
export function startsAuthorGroup(messages: readonly ChannelMessage[], index: number): boolean {
  if (index <= 0) return true;
  const current = messages[index];
  const previous = messages[index - 1];
  if (current.authorId !== previous.authorId) return true;
  const gap = new Date(current.sentAt).getTime() - new Date(previous.sentAt).getTime();
  return gap > GROUP_WINDOW_MS;
}

/** True when this is the last message of its author-group (controls bubble tail radius). */
export function endsAuthorGroup(messages: readonly ChannelMessage[], index: number): boolean {
  if (index >= messages.length - 1) return true;
  return startsAuthorGroup(messages, index + 1);
}
