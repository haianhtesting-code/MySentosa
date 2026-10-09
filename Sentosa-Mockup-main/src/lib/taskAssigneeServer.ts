// Server-side (Mongo-backed) counterpart to the assignee helpers in
// taskHelpers.ts. API routes run server-side and must not trust the client's
// localStorage mirror of Task Distribution Groups (lib/groups.ts's
// getActiveGroups() returns only DEFAULT_GROUPS when called server-side, since
// there's no window/localStorage there) — they read the real, persisted store
// in broadcastStore.ts instead (same collection the /api/admin/distribution-groups
// route reads/writes).
//
// Also fixes a pre-existing gap: the old group-assignee permission check was
// role-based ("any Responder (Ranger) counts as the assignee of a group task")
// rather than actual group-membership-based. This checks real membership.

import clientPromise from './mongodb';
import type { TaskAssignee } from './db';
import type { DistributionGroup } from './groups';

export async function isTaskAssigneeServer(assignees: TaskAssignee[] | undefined, username: string): Promise<boolean> {
  if (!assignees || assignees.length === 0 || !username) return false;
  const needsGroups = assignees.some(a => a.type === 'group');
  let groups: DistributionGroup[] = [];
  if (needsGroups) {
    try {
      const client = await clientPromise;
      const db = client.db('sentosa-cms');
      groups = await db.collection('task_groups').find({}).toArray() as any;
    } catch (e) {
      console.error('Error fetching task groups for assignee check:', e);
    }
  }
  return assignees.some(a => {
    if (a.type === 'user') return a.name === username;
    const grp = groups.find(g => g.id === a.id || g.name === a.name);
    if (!grp) return false;
    return grp.members.some(m => m.type === 'Internal' && m.name === username);
  });
}
