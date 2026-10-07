import { z } from 'zod';

export const learnerSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  courseStatus: z.enum(['active', 'completed'])
});

export const courseDeliveryRequestSchema = z.object({
  domain: z.string().min(1),
  dkimSelector: z.string().min(1),
  dkimValue: z.string().min(1),
  educatorEmail: z.string().email(),
  courseTitle: z.string().min(1),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  learners: z.array(learnerSchema).min(1)
});

export type Learner = z.infer<typeof learnerSchema>;
export type CourseDeliveryRequest = z.infer<typeof courseDeliveryRequestSchema>;

export type ReminderStatus = 'due_now' | 'scheduled_later' | 'completed';

export type ReminderDraft = {
  to: string;
  subject: string;
  text: string;
  status: ReminderStatus;
};

export type EducatorReport = {
  totalLearners: number;
  dueNow: number;
  scheduledLater: number;
  completed: number;
};

export type CourseDeliveryResult = {
  domain: {
    domain: string;
    zoneId: string;
    status: string;
  };
  outbox: ReminderDraft[];
  educatorReport: EducatorReport;
};
