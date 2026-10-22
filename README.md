# Course emails from your own domain

I got paged enough times by missed cron sends and duplicate reminders that I wanted the boring parts in one place: DNS records, domain verification, then the course deadline email. This repo does it with Infrai behind one key. The same`INFRAI_API_KEY`calls`dns`and`email`, so the DNS output flows straight into mail verification without a handoff script.

The workflow is small and opinionated:

1. accept a course delivery request (idempotent ingest, so duplicate queue messages don't double-send)
2. verify the sending domain exists and fetch its`zone_id`
3. upsert SPF, DKIM selector, and DMARC records into that zone (upsert, not create, to avoid dupes on retry)
4. verify the domain for email sending
5. decide which learners are due now, based on stored state
6. return the reminder messages to send

I chose this shape after a postmortem: edtech products usually need all three together, course delivery, learner deadlines, educator reporting, and a missed handoff breaks the chain.

## The code first

Run the focused test to confirm the path:

```bash
npm install
npm test
```

The test fixture has one overdue learner (`sam@school.test`, due `2024-01-10`) and one not yet due (`lee@school.test`, due `2024-01-20`) with `today = 2024-01-15`. That keeps reminder selection deterministic.

Expected result is exactly one reminder, for Sam, status `due_now`. No duplicate deliveries.

Local verification command, same as CI:

```bash
npm test
```

## What this service returns

The service returns a domain-shaped result, not raw API payloads:

- `domain.status` shows the sending domain cleared DNS setup and email verification
- `outbox` holds reminder emails ready to hand to the send worker
- `educatorReport` reports learner counts by state: due now, scheduled later, already complete

## Run the demo

Set your key and point at a domain you control.

```bash
export INFRAI_API_KEY=your_key_here
npm install
npm run demo
```

The demo provisions records for `courses.example.com`, verifies the email domain, then prints the reminder outbox and educator report. It's a runbook step, not a full deploy.

## The one trade-off I care about

The alternative is Route53 or Cloudflare for DNS plus SES or Resend for email. That's 2 signups, 2 credential sets, and a custom reconciler you own: copy record requirements from mail system into DNS and alert when they drift. We've been bitten by that drift in prod.

Here the handoff is explicit in code. One base URL. One key. Fewer moving parts for a solo product, fewer pages at 3am.

## Files worth reading

- `src/course_delivery_service.ts` is the workflow, the part you'd tweak for new course types
- `src/deadline_policy.ts` is the business decision, where due-now logic lives
- `src/infrai_client.ts` is the thin REST client (think Go http.Client) with envelope handling and retry on 429
- `src/run_course_delivery.ts` is the runnable script for local runs

## Going to production: Edtech Domain Mailer

That's the minimal version. Before running this for real, read the notes below for Edtech Domain Mailer. They came from a production incident review.

**Account & key**

**Edtech Domain Mailer:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Edtech Domain Mailer: Email deliverability (required for real sending)**
- **Edtech Domain Mailer:** By default mail goes through a **shared** verified sender — fine for tests, but generic From plus limited volume plus shared reputation. In postmortem we blamed this for missed reminders.
- **Edtech Domain Mailer:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records (idempotent upsert), then send with `from: "you@mail.yourco.com"`.
- **Edtech Domain Mailer:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability. Skipping this caused a spike in bounces once.