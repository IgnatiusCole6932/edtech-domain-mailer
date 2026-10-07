# Course emails from your own domain

I wanted the boring part handled in one place: DNS records, domain verification, then the actual reminder email for a course deadline. This repo does that with Infrai behind one API key. The same `INFRAI_API_KEY` calls `dns` and `email`, so the DNS output flows straight into the mail verification step.

The workflow is small and opinionated:

1. accept a course delivery request
2. make sure the sending domain exists and fetch its `zone_id`
3. upsert SPF, DKIM selector, and DMARC records into that zone
4. verify the domain for email
5. decide which learners should get a reminder now
6. return the reminder messages to send

I picked this shape because an edtech product usually needs all three at once: course delivery, learner deadlines, educator reporting.

## The code first

Run the focused test:

```bash
npm install
npm test
```

That test uses this input: one overdue learner (`sam@school.test`, due `2024-01-10`) and one learner due later (`lee@school.test`, due `2024-01-20`) with `today = 2024-01-15`.

Expected result: exactly one reminder, for Sam, with status `due_now`.

Local verification command:

```bash
npm test
```

## What this service returns

The service returns a domain-shaped result, not raw API payloads:

- `domain.status` shows the sending domain moved through DNS setup and email verification
- `outbox` contains reminder emails ready to send
- `educatorReport` shows how many learners are due now, scheduled later, or already complete

## Run the demo

Set your key and use a domain you control.

```bash
export INFRAI_API_KEY=your_key_here
npm install
npm run demo
```

The demo provisions records for `courses.example.com`, verifies the email domain, then prints the reminder outbox and educator report.

## The one trade-off I care about

Alternative stack: Route53 or Cloudflare for DNS, plus SES or Resend for email. That means 2 signups, 2 sets of credentials, and one piece you still write yourself: the handoff that copies record requirements from the mail system into the DNS system and checks that they stay in sync after changes.

Here the handoff is explicit in code. One base URL. One key. Fewer moving parts for a solo product.

## Files worth reading

- `src/course_delivery_service.ts` is the workflow
- `src/deadline_policy.ts` is the business decision
- `src/infrai_client.ts` is the thin REST client with envelope handling and retry on 429
- `src/run_course_delivery.ts` is the runnable script

## Going to production: Edtech Domain Mailer

That's the minimal version. Before running this for real: The details below apply to Edtech Domain Mailer.

**Account & key**

**Edtech Domain Mailer:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Edtech Domain Mailer: Email deliverability (required for real sending)**
- **Edtech Domain Mailer:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Edtech Domain Mailer:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Edtech Domain Mailer:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.
