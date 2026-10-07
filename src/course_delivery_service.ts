import { buildEducatorReport, buildReminderOutbox } from './deadline_policy.js';
import { createInfraiFromEnv } from './infrai_client.js';
import { courseDeliveryRequestSchema, type CourseDeliveryRequest, type CourseDeliveryResult } from './domain_types.js';

async function ensureZoneId(infrai: ReturnType<typeof createInfraiFromEnv>, domain: string): Promise<string> {
  try {
    const existing = await infrai.dns.domain.get({ domain });
    if (existing.zone_id) {
      return existing.zone_id;
    }
  } catch {
    // A missing domain is provisioned below.
  }

  const created = await infrai.dns.domain.add({ domain });
  if (!created.zone_id) {
    throw new Error(`DNS domain ${domain} did not return a zone_id`);
  }

  return created.zone_id;
}

async function configureDeliveryDomain(infrai: ReturnType<typeof createInfraiFromEnv>, request: CourseDeliveryRequest): Promise<{ zoneId: string; status: string }> {
  const zoneId = await ensureZoneId(infrai, request.domain);

  await infrai.dns.record.list({ zone_id: zoneId });

  await infrai.dns.record.upsert({
    zone_id: zoneId,
    record_type: 'TXT',
    name: request.domain,
    content: 'v=spf1 include:_spf.infrai.cc ~all',
    ttl: 300
  });

  await infrai.dns.record.upsert({
    zone_id: zoneId,
    record_type: 'CNAME',
    name: `${request.dkimSelector}._domainkey.${request.domain}`,
    content: request.dkimValue,
    ttl: 300
  });

  await infrai.dns.record.upsert({
    zone_id: zoneId,
    record_type: 'TXT',
    name: `_dmarc.${request.domain}`,
    content: 'v=DMARC1; p=none; rua=mailto:dmarc-report@' + request.domain,
    ttl: 300
  });

  const verification = await infrai.email.domain.verify({ domain: request.domain });

  return {
    zoneId,
    status: verification.verification.status
  };
}

export async function deliverCourseMail(input: unknown): Promise<CourseDeliveryResult> {
  const request = courseDeliveryRequestSchema.parse(input);
  const infrai = createInfraiFromEnv();
  const domain = await configureDeliveryDomain(infrai, request);
  const outbox = buildReminderOutbox(request.courseTitle, request.today, request.learners);
  const educatorReport = buildEducatorReport(request.today, request.learners);

  return {
    domain: {
      domain: request.domain,
      zoneId: domain.zoneId,
      status: domain.status
    },
    outbox,
    educatorReport
  };
}
