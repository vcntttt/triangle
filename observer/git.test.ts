import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { promisify } from 'node:util';

import { type Checkout, type CheckoutInventory, readCheckoutInventory } from './git';

const execFileAsync = promisify(execFile);

// Fixed identity keeps commits independent of the machine running the tests.
async function git(cwd: string, args: string[]): Promise<string> {
   const { stdout } = await execFileAsync(
      'git',
      ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args],
      { cwd, encoding: 'utf8' }
   );
   return stdout;
}

async function createRepo(dir: string): Promise<string> {
   await mkdir(dir);
   await git(dir, ['init', '-b', 'main']);
   return dir;
}

async function commitFile(repo: string, name: string, content: string): Promise<void> {
   await writeFile(path.join(repo, name), content);
   await git(repo, ['add', name]);
   await git(repo, ['commit', '-m', `add ${name}`]);
}

function listCheckouts(inventory: CheckoutInventory): Checkout[] {
   if (!inventory.complete) throw new Error(inventory.error);
   return inventory.checkouts;
}

function findCheckout(checkouts: Checkout[], checkoutPath: string): Checkout {
   const found = checkouts.find((checkout) => checkout.path === checkoutPath);
   if (!found) throw new Error(`No checkout at ${checkoutPath}`);
   return found;
}

function gitStateOf(checkout: Checkout) {
   if (!checkout.state.ok) throw new Error(checkout.state.error);
   return checkout.state.git;
}

describe('readCheckoutInventory', () => {
   let root: string;

   before(async () => {
      root = await mkdtemp(path.join(os.tmpdir(), 'observer-git-'));
   });

   after(async () => {
      await rm(root, { recursive: true, force: true });
   });

   test('counts staged, unstaged and untracked changes of the main checkout', async () => {
      const repo = await createRepo(path.join(root, 'mixed'));
      await commitFile(repo, 'a.txt', 'a');
      await commitFile(repo, 'b.txt', 'b');

      // a.txt is staged and then edited again, so it counts in both columns.
      await writeFile(path.join(repo, 'a.txt'), 'a2');
      await git(repo, ['add', 'a.txt']);
      await writeFile(path.join(repo, 'a.txt'), 'a3');
      await writeFile(path.join(repo, 'b.txt'), 'b2');
      // d.txt and e.txt are new and staged; the counts differ on purpose so swapping columns fails.
      await writeFile(path.join(repo, 'd.txt'), 'd');
      await writeFile(path.join(repo, 'e.txt'), 'e');
      await git(repo, ['add', 'd.txt', 'e.txt']);
      await writeFile(path.join(repo, 'untracked.txt'), 'u');

      const checkouts = listCheckouts(await readCheckoutInventory(repo));
      assert.equal(checkouts.length, 1);
      const [main] = checkouts;
      const state = gitStateOf(main);

      assert.equal(main.isMainCheckout, true);
      assert.equal(state.branch, 'main');
      assert.equal(state.headOid, (await git(repo, ['rev-parse', 'HEAD'])).trim());
      assert.equal(state.upstream, null);
      assert.equal(state.remoteCheckedAt, null);
      assert.deepEqual(state.changes, { staged: 3, unstaged: 2, untracked: 1, conflicted: 0 });
   });

   test('lists a branch worktree and a detached worktree next to the main checkout', async () => {
      const repo = await createRepo(path.join(root, 'worktrees'));
      await commitFile(repo, 'base.txt', 'base');
      const feature = path.join(root, 'worktrees-feature');
      const detached = path.join(root, 'worktrees-detached');
      await git(repo, ['worktree', 'add', '-b', 'feature', feature]);
      await git(repo, ['worktree', 'add', '--detach', detached]);

      // git does not list worktrees in creation order, so each one is found by path.
      const checkouts = listCheckouts(await readCheckoutInventory(repo));
      assert.equal(checkouts.length, 3);
      const main = findCheckout(checkouts, repo);
      const featureCheckout = findCheckout(checkouts, feature);
      const detachedCheckout = findCheckout(checkouts, detached);

      assert.equal(main.isMainCheckout, true);
      assert.equal(featureCheckout.isMainCheckout, false);
      assert.equal(detachedCheckout.isMainCheckout, false);
      assert.equal(gitStateOf(featureCheckout).branch, 'feature');
      const detachedState = gitStateOf(detachedCheckout);
      assert.equal(detachedState.branch, null);
      assert.equal(detachedState.upstream, null);
      assert.equal(detachedState.headOid, gitStateOf(main).headOid);
   });

   test('reports ahead and behind counts against the upstream and when it was fetched', async () => {
      const origin = path.join(root, 'divergence-origin.git');
      await mkdir(origin);
      await git(origin, ['init', '--bare', '-b', 'main']);
      const repo = await createRepo(path.join(root, 'divergence'));
      await commitFile(repo, 'base.txt', 'base');
      await git(repo, ['remote', 'add', 'origin', origin]);
      await git(repo, ['push', '-u', 'origin', 'main']);

      const peer = path.join(root, 'divergence-peer');
      await git(root, ['clone', origin, peer]);
      await commitFile(peer, 'remote.txt', 'remote');
      await git(peer, ['push', 'origin', 'main']);

      await commitFile(repo, 'local.txt', 'local');
      await git(repo, ['fetch', 'origin']);

      const [main] = listCheckouts(await readCheckoutInventory(repo));
      const state = gitStateOf(main);
      assert.deepEqual(state.upstream, { ref: 'origin/main', ahead: 1, behind: 1 });
      assert.match(state.remoteCheckedAt ?? '', /^\d{4}-\d{2}-\d{2}T/);
   });

   test('keeps two clones of the same branch apart, as on two machines', async () => {
      const origin = path.join(root, 'machines-origin.git');
      await mkdir(origin);
      await git(origin, ['init', '--bare', '-b', 'main']);
      const seed = await createRepo(path.join(root, 'machines-seed'));
      await commitFile(seed, 'base.txt', 'base');
      await git(seed, ['push', origin, 'main']);

      const vrhome = path.join(root, 'machines-vrhome');
      const caburgua = path.join(root, 'machines-caburgua');
      await git(root, ['clone', origin, vrhome]);
      await git(root, ['clone', origin, caburgua]);
      await writeFile(path.join(vrhome, 'base.txt'), 'edited on vrhome');

      const [home] = listCheckouts(await readCheckoutInventory(vrhome));
      const [server] = listCheckouts(await readCheckoutInventory(caburgua));
      assert.equal(gitStateOf(home).branch, 'main');
      assert.equal(gitStateOf(server).branch, 'main');
      assert.notEqual(home.fsIdentity, server.fsIdentity);
      assert.equal(gitStateOf(home).changes.unstaged, 1);
      assert.equal(gitStateOf(server).changes.unstaged, 0);
   });

   test('reports a branch without upstream as having no remote state', async () => {
      const repo = await createRepo(path.join(root, 'no-upstream'));
      await commitFile(repo, 'base.txt', 'base');
      await git(repo, ['switch', '-c', 'local-only']);

      const [main] = listCheckouts(await readCheckoutInventory(repo));
      const state = gitStateOf(main);
      assert.equal(state.branch, 'local-only');
      assert.equal(state.upstream, null);
   });

   test('keeps the untracked count exact when a staged rename has a path that looks like an entry', async () => {
      const repo = await createRepo(path.join(root, 'rename'));
      await commitFile(repo, '? legacy.txt', 'legacy');
      await git(repo, ['mv', '? legacy.txt', 'renamed.txt']);
      await writeFile(path.join(repo, 'untracked.txt'), 'u');

      const [main] = listCheckouts(await readCheckoutInventory(repo));
      assert.deepEqual(gitStateOf(main).changes, {
         staged: 1,
         unstaged: 0,
         untracked: 1,
         conflicted: 0,
      });
   });

   test('counts unmerged files as conflicted', async () => {
      const repo = await createRepo(path.join(root, 'conflict'));
      await commitFile(repo, 'shared.txt', 'base');
      await git(repo, ['switch', '-c', 'side']);
      await commitFile(repo, 'shared.txt', 'side');
      await git(repo, ['switch', 'main']);
      await commitFile(repo, 'shared.txt', 'main');
      // The merge stops on the conflict, which makes git exit non-zero by design.
      await git(repo, ['merge', 'side']).catch(() => undefined);

      const [main] = listCheckouts(await readCheckoutInventory(repo));
      assert.ok(gitStateOf(main).changes.conflicted >= 1);
   });

   test('reports a path that is not a repository as an incomplete inventory', async () => {
      const outside = path.join(root, 'not-a-repo');
      await mkdir(outside);

      const inventory = await readCheckoutInventory(outside);
      if (inventory.complete) throw new Error('Expected an incomplete inventory');
      assert.match(inventory.error, /not a git repository/);
   });

   test('keeps fsIdentity across branch switches and changes it when the path is recreated', async () => {
      const repo = await createRepo(path.join(root, 'identity'));
      await commitFile(repo, 'base.txt', 'base');
      const worktree = path.join(root, 'identity-worktree');
      await git(repo, ['worktree', 'add', '-b', 'first', worktree]);
      const identityOf = async () =>
         findCheckout(listCheckouts(await readCheckoutInventory(repo)), worktree).fsIdentity;

      const initial = await identityOf();
      await git(worktree, ['switch', '-c', 'second']);
      assert.equal(await identityOf(), initial);

      await git(repo, ['worktree', 'remove', worktree]);
      await git(repo, ['worktree', 'add', '-b', 'recreated', worktree]);
      assert.notEqual(await identityOf(), initial);
   });

   test('reports an unborn branch with no head commit', async () => {
      const repo = await createRepo(path.join(root, 'unborn'));

      const [main] = listCheckouts(await readCheckoutInventory(repo));
      const state = gitStateOf(main);
      assert.equal(state.branch, 'main');
      assert.equal(state.headOid, null);
   });
});
