-- One-shot operational wipe for a clean production-ready dataset.
-- Does NOT touch: users/profiles/roles/permissions/provisioned_emails,
-- reference picklists, or integration/email settings.
--
-- Cleared: chefs, events (+ children), clients, team_members, match_runs,
-- activity_logs, chef_intake_requests, email_logs, commission_lines.

TRUNCATE TABLE
  public.activity_logs,
  public.match_runs,
  public.email_logs,
  public.commission_lines,
  public.event_vendors,
  public.event_chefs,
  public.chef_intake_requests,
  public.events,
  public.clients,
  public.chefs,
  public.team_members
RESTART IDENTITY CASCADE;
