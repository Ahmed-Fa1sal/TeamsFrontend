import { ChatMessage, ChatMessageGroup } from '../models/chat.models';

const GROUP_WINDOW_MS = 2 * 60 * 1000;

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function dateLabelFor(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const today = startOfDay(now);
  const day = startOfDay(date);
  const oneDay = 24 * 60 * 60 * 1000;
  if (day === today) return 'Today';
  if (day === today - oneDay) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function timeLabelFor(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function groupMessages(
  messages: readonly ChatMessage[],
  now: Date = new Date(),
): ChatMessageGroup[] {
  const groups: ChatMessageGroup[] = [];
  for (const msg of messages) {
    const label = dateLabelFor(msg.sentAt, now);
    const last = groups[groups.length - 1];
    if (last && last.dateLabel === label) {
      last.messages.push(msg);
    } else {
      groups.push({ dateLabel: label, messages: [msg] });
    }
  }
  return groups;
}

export function startsAuthorGroup(messages: readonly ChatMessage[], index: number): boolean {
  if (index <= 0) return true;
  const curr = messages[index];
  const prev = messages[index - 1];
  if (curr.authorId !== prev.authorId) return true;
  return new Date(curr.sentAt).getTime() - new Date(prev.sentAt).getTime() > GROUP_WINDOW_MS;
}

export function endsAuthorGroup(messages: readonly ChatMessage[], index: number): boolean {
  if (index >= messages.length - 1) return true;
  return startsAuthorGroup(messages, index + 1);
}
