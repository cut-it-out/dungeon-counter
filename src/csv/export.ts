import { CSV_COLUMNS, toRow, type RunLog } from '../log/eventLog';

// Local, user-initiated CSV export (GDD §9). Every field is a controlled value (ids, event
// names, numbers), so no quoting is needed; sanitize if free text is ever added.

export function toCsv(run: RunLog): string {
  const lines = [CSV_COLUMNS.join(','), ...run.events.map((e) => toRow(run, e).join(','))];
  return lines.join('\n') + '\n';
}

// Local time, for organising exports only; not an event-level timestamp.
export function csvFilename(run: RunLog, now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}`;
  return `dungeon-counter_${run.configId}_${run.runType}_${stamp}.csv`;
}

// Anchor download by default (desktop). On touch devices that can share files (iOS Safari,
// Android Chrome) open the share sheet instead, so the file can go to Files, Drive or mail.
export async function exportCsv(run: RunLog): Promise<void> {
  const name = csvFilename(run, new Date());
  const csv = toCsv(run);
  const file = new File([csv], name, { type: 'text/csv' });
  const touch = window.matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return; // player closed the sheet
      // Any other share failure: fall through to a plain download.
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
