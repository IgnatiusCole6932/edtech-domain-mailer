import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEducatorReport, buildReminderOutbox } from '../src/deadline_policy.js';

test('overdue learners get reminders and educator report counts statuses', () => {
  const learners = [
    {
      email: 'sam@school.test',
      fullName: 'Sam Carter',
      dueOn: '2024-01-10',
      courseStatus: 'active' as const
    },
    {
      email: 'lee@school.test',
      fullName: 'Lee Ortiz',
      dueOn: '2024-01-20',
      courseStatus: 'active' as const
    },
    {
      email: 'ana@school.test',
      fullName: 'Ana Doyle',
      dueOn: '2024-01-12',
      courseStatus: 'completed' as const
    }
  ];

  const outbox = buildReminderOutbox('Algebra I', '2024-01-15', learners);
  const report = buildEducatorReport('2024-01-15', learners);

  assert.equal(outbox.length, 1);
  assert.deepEqual(outbox[0], {
    to: 'sam@school.test',
    subject: 'Course deadline: Algebra I',
    text: 'Hi Sam Carter, your deadline for Algebra I is 2024-01-10. Please finish your work today.',
    status: 'due_now'
  });

  assert.deepEqual(report, {
    totalLearners: 3,
    dueNow: 1,
    scheduledLater: 1,
    completed: 1
  });
});
