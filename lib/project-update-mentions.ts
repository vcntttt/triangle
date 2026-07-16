import type { ProjectArea } from './models';
import { normalizeInlineToken } from './issue-inline-tokens';

export function getAreaMentionContext(body: string, cursor: number, areas: ProjectArea[]) {
   const match = body.slice(0, cursor).match(/(^|\s)@([^\s@]*)$/);
   if (!match) return null;
   const query = normalizeInlineToken(match[2] ?? '');
   const items = areas
      .filter((area) => normalizeInlineToken(area.name).includes(query))
      .toSorted((a, b) => a.name.localeCompare(b.name))
      .slice(0, 6);
   if (items.length === 0) return null;
   return {
      start: (match.index ?? 0) + match[1].length,
      end: cursor,
      items,
   };
}

export function insertAreaMention(body: string, start: number, end: number, area: ProjectArea) {
   const token = `@${normalizeInlineToken(area.name)}`;
   const nextBody = `${body.slice(0, start)}${token} ${body.slice(end)}`;
   return {
      body: nextBody,
      cursor: start + token.length + 1,
      mention: { areaId: area.id, start, end: start + token.length },
   };
}

export function adjustAreaMentions(
   previous: string,
   next: string,
   mentions: Array<{ areaId: string; start: number; end: number }>
) {
   let prefix = 0;
   while (prefix < previous.length && prefix < next.length && previous[prefix] === next[prefix]) {
      prefix++;
   }
   let suffix = 0;
   while (
      suffix < previous.length - prefix &&
      suffix < next.length - prefix &&
      previous[previous.length - 1 - suffix] === next[next.length - 1 - suffix]
   ) {
      suffix++;
   }
   const oldEnd = previous.length - suffix;
   const delta = next.length - previous.length;
   return mentions.flatMap((mention) => {
      if (mention.end <= prefix) return [mention];
      if (mention.start >= oldEnd) {
         return [{ ...mention, start: mention.start + delta, end: mention.end + delta }];
      }
      return [];
   });
}

export function trimUpdateBody(
   body: string,
   mentions: Array<{ areaId: string; start: number; end: number }>
) {
   const leading = body.length - body.trimStart().length;
   const trimmed = body.trim();
   return {
      body: trimmed,
      mentions: mentions.flatMap((mention) => {
         const start = mention.start - leading;
         const end = mention.end - leading;
         return start >= 0 && end <= trimmed.length ? [{ ...mention, start, end }] : [];
      }),
   };
}
