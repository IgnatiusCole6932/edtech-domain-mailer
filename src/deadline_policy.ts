import type { EducatorReport, Learner, ReminderDraft } from './domain_types.js';

function compareIsoDate(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function buildReminderOutbox(courseTitle: string, today: string, learners: Learner[]): ReminderDraft[] {
  const outbox: ReminderDraft[] = [];

  for (const learner of learners) {
    if (learner.courseStatus === 'completed') {
      continue;
    }

    if (compareIsoDate(learner.dueOn, today) <= 0) {
      outbox.push({
        to: learner.email,
        subject: `Course deadline: ${courseTitle}`,
        text: `Hi ${learner.fullName}, your deadline for ${courseTitle} is ${learner.dueOn}. Please finish your work today.`,
        status: 'due_now'
      });
    }
  }

  return outbox;
}

export function buildEducatorReport(today: string, learners: Learner[]): EducatorReport {
  let dueNow = 0;
  let scheduledLater = 0;
  let completed = 0;

  for (const learner of learners) {
    if (learner.courseStatus === 'completed') {
      completed += 1;
      continue;
    }

    if (compareIsoDate(learner.dueOn, today) <= 0) {
      dueNow += 1;
    } else {
      scheduledLater += 1;
    }
  }

  return {
    totalLearners: learners.length,
    dueNow,
    scheduledLater,
    completed
  };
}
