import type { ProjectUpdateAreaMention } from '@/lib/models';
import { normalizeInlineToken } from '@/lib/issue-inline-tokens';

export function ProjectUpdateMentionText({
   body,
   mentions,
}: {
   body: string;
   mentions: ProjectUpdateAreaMention[];
}) {
   const sorted = mentions
      .filter((mention) => mention.start >= 0 && mention.end <= body.length)
      .toSorted((a, b) => a.start - b.start);
   const parts: React.ReactNode[] = [];
   let cursor = 0;
   for (const mention of sorted) {
      if (mention.start < cursor) continue;
      parts.push(body.slice(cursor, mention.start));
      parts.push(
         <span
            key={`${mention.areaId}-${mention.start}`}
            style={{ color: mention.color }}
            className="font-medium"
         >
            @{normalizeInlineToken(mention.name)}
         </span>
      );
      cursor = mention.end;
   }
   parts.push(body.slice(cursor));
   return <>{parts}</>;
}
