import { execFile } from 'node:child_process';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import type { DevStateObservation } from '../convex/devState/contract';

export type LocationGit = Extract<DevStateObservation, { kind: 'location' }>['git'];

export type Checkout = {
   path: string;
   isMainCheckout: boolean;
   // Changes when the path is removed and recreated, not when the branch changes.
   fsIdentity: string;
   state: { ok: true; git: LocationGit } | { ok: false; error: string };
};

export type CheckoutInventory =
   | { complete: true; checkouts: Checkout[] }
   // A failed listing is never an empty inventory: callers would read it as "no checkouts".
   | { complete: false; error: string };

const execFileAsync = promisify(execFile);

// Status output of a large repository can exceed execFile's 1 MB default.
const MAX_GIT_OUTPUT_BYTES = 64 * 1024 * 1024;

// Both forms are set: the flag for this command, the variable for git processes it spawns.
async function runGit(cwd: string, args: string[]): Promise<string> {
   const { stdout } = await execFileAsync('git', ['--no-optional-locks', '-C', cwd, ...args], {
      encoding: 'utf8',
      maxBuffer: MAX_GIT_OUTPUT_BYTES,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
   });
   return stdout;
}

type WorktreeRecord = { path: string; bare: boolean; prunable: boolean };

// With `-z` every attribute ends in NUL and each record ends with an extra empty field.
function parseWorktreeList(output: string): WorktreeRecord[] {
   const records: WorktreeRecord[] = [];
   let current: WorktreeRecord | undefined;
   for (const field of output.split('\0')) {
      if (field === '') {
         if (current) records.push(current);
         current = undefined;
      } else if (field.startsWith('worktree ')) {
         current = { path: field.slice('worktree '.length), bare: false, prunable: false };
      } else if (current && field === 'bare') {
         current.bare = true;
      } else if (current && field.startsWith('prunable')) {
         current.prunable = true;
      }
   }
   return records;
}

// A checkout listed as prunable no longer has a directory, so it is not inventoried.
// The first record is always the main checkout, even when it is filtered out later.
export async function readCheckoutInventory(projectRoot: string): Promise<CheckoutInventory> {
   try {
      const output = await runGit(projectRoot, ['worktree', 'list', '--porcelain', '-z']);
      const checkouts = await Promise.all(
         parseWorktreeList(output)
            .map((record, index) => ({ ...record, isMainCheckout: index === 0 }))
            .filter((record) => !record.bare && !record.prunable)
            .map(readCheckout)
      );
      return { complete: true, checkouts };
   } catch (error) {
      return { complete: false, error: errorMessage(error) };
   }
}

async function readCheckout(entry: { path: string; isMainCheckout: boolean }): Promise<Checkout> {
   const [fsIdentity, state] = await Promise.all([
      readFsIdentity(entry.path),
      readState(entry.path),
   ]);
   return { path: entry.path, isMainCheckout: entry.isMainCheckout, fsIdentity, state };
}

// Inode plus birth time: a recreated directory gets new values, a branch switch keeps them.
async function readFsIdentity(checkoutPath: string): Promise<string> {
   const { ino, birthtimeMs } = await stat(checkoutPath);
   return `${ino}:${birthtimeMs}`;
}

// A failing checkout is reported on its own so the other checkouts of the project still sync.
async function readState(checkoutPath: string): Promise<Checkout['state']> {
   try {
      const [status, remoteCheckedAt] = await Promise.all([
         runGit(checkoutPath, ['status', '--porcelain=v2', '--branch', '-z']),
         readRemoteCheckedAt(checkoutPath),
      ]);
      return { ok: true, git: { ...parseStatus(status), remoteCheckedAt } };
   } catch (error) {
      return { ok: false, error: errorMessage(error) };
   }
}

// FETCH_HEAD lives in the common dir, shared by every worktree of the repository.
async function readRemoteCheckedAt(checkoutPath: string): Promise<string | null> {
   const commonDir = (await runGit(checkoutPath, ['rev-parse', '--git-common-dir'])).trim();
   try {
      const fetchHead = await stat(path.resolve(checkoutPath, commonDir, 'FETCH_HEAD'));
      return fetchHead.mtime.toISOString();
   } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
      throw error;
   }
}

type StatusReport = Omit<LocationGit, 'remoteCheckedAt'>;
type Changes = LocationGit['changes'];

// Porcelain v2 with `-z`: renames and copies are followed by their original path as a separate
// field, which must be skipped or it would be read as an entry of its own.
function parseStatus(output: string): StatusReport {
   const fields = output.split('\0');
   const changes: Changes = { staged: 0, unstaged: 0, untracked: 0, conflicted: 0 };
   let headOid: string | null = null;
   let branch: string | null = null;
   let upstreamRef: string | null = null;
   let counts: { ahead: number; behind: number } | null = null;

   for (let index = 0; index < fields.length; index++) {
      const field = fields[index];
      if (field.startsWith('# ')) {
         const [, key, ...values] = field.split(' ');
         switch (key) {
            case 'branch.oid':
               headOid = values[0] === '(initial)' ? null : values[0];
               break;
            case 'branch.head':
               branch = values[0] === '(detached)' ? null : values[0];
               break;
            case 'branch.upstream':
               upstreamRef = values[0];
               break;
            case 'branch.ab':
               counts = { ahead: Number(values[0].slice(1)), behind: Number(values[1].slice(1)) };
               break;
         }
      } else if (field.startsWith('1 ')) {
         countTrackedEntry(field.slice(2, 4), changes);
      } else if (field.startsWith('2 ')) {
         countTrackedEntry(field.slice(2, 4), changes);
         index++;
      } else if (field.startsWith('u ')) {
         changes.conflicted++;
      } else if (field.startsWith('? ')) {
         changes.untracked++;
      }
   }

   // Git omits branch.ab when the configured upstream ref is missing; that state is unknown.
   const upstream =
      branch !== null && upstreamRef !== null && counts !== null
         ? { ref: upstreamRef, ahead: counts.ahead, behind: counts.behind }
         : null;
   return { branch, headOid, changes, upstream };
}

// `xy` is the two-character status: index column first, worktree column second.
function countTrackedEntry(xy: string, changes: Changes): void {
   if (xy[0] !== '.') changes.staged++;
   if (xy[1] !== '.') changes.unstaged++;
}

function errorMessage(error: unknown): string {
   return error instanceof Error ? error.message : String(error);
}
