import type { LabelInterface } from '@/lib/models';
import { IssueChip, issueChipDotClassName, issueMetaChipClassName } from './issue-chip';

export function LabelBadge({ label }: { label: LabelInterface[] }) {
   return (
      <>
         {label.map((l) => (
            <IssueChip key={l.id} className={issueMetaChipClassName}>
               <span
                  className={issueChipDotClassName}
                  style={{ backgroundColor: l.color }}
                  aria-hidden="true"
               ></span>
               <span className="truncate">{l.name}</span>
            </IssueChip>
         ))}
      </>
   );
}
