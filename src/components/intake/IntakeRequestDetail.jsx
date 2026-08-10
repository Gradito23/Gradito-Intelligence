import React from 'react';
import { Badge } from '@/components/ui/badge';

function formatList(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr.join(', ');
}

function formatMoney(value) {
  if (value == null || value === '') return null;
  return `$${Number(value).toLocaleString()}`;
}

function formatBool(value) {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return null;
}

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-navy border-b border-border pb-1">
        {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  if (children == null || children === '' || children === false) return null;
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm whitespace-pre-wrap break-words">{children}</div>
    </div>
  );
}

function LinkList({ urls }) {
  if (!Array.isArray(urls) || urls.length === 0) return null;
  return (
    <ul className="space-y-1">
      {urls.map((url) => {
        const isImage = /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url);
        return (
          <li key={url} className="flex items-start gap-2">
            {isImage && (
              <img src={url} alt="" className="h-12 w-12 rounded object-cover border border-border shrink-0" />
            )}
            <a href={url} target="_blank" rel="noreferrer" className="text-navy underline text-xs break-all">
              {url}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function ExternalLink({ href, label }) {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-navy underline break-all">
      {label || href}
    </a>
  );
}

/**
 * Full submitted chef talent profile for intake review.
 */
export default function IntakeRequestDetail({ request }) {
  const p = request?.payload || {};
  const tp = p.talent_profile || {};

  return (
    <div className="space-y-5 text-sm">
      <Section title="1. Contact Information">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Name">
            {`${request.first_name} ${request.last_name}`}
            {p.preferred_name ? ` (preferred: ${p.preferred_name})` : ''}
          </Field>
          <Field label="Email">{request.email || p.email}</Field>
          <Field label="Mobile">{request.mobile || p.mobile}</Field>
          <Field label="Location">{[p.city, p.state].filter(Boolean).join(', ')}</Field>
          <Field label="Home airport">{p.home_airport}</Field>
          <Field label="Personal vehicle">{formatBool(p.has_vehicle)}</Field>
          <Field label="Instagram"><ExternalLink href={p.instagram_url} /></Field>
          <Field label="Website"><ExternalLink href={p.website_url} /></Field>
          <Field label="TikTok"><ExternalLink href={p.tiktok_url} /></Field>
          <Field label="LinkedIn"><ExternalLink href={p.linkedin_url} /></Field>
        </div>
      </Section>

      <Section title="2. Professional Background">
        <Field label="Professional bio">{p.professional_bio || tp.professional_bio || p.notes}</Field>
        <Field label="Resume">
          <ExternalLink href={p.resume_url} label="View resume" />
          <LinkList urls={p.resume_urls} />
        </Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Current position">{p.current_position}</Field>
          <Field label="Current company">{p.current_company}</Field>
          <Field label="Years cooking">{p.years_cooking != null ? String(p.years_cooking) : null}</Field>
          <Field label="Languages">{formatList(p.languages)}</Field>
        </div>
        <Field label="Awards / recognitions">{p.awards}</Field>
      </Section>

      <Section title="3. Culinary Expertise">
        <Field label="Cuisine specialties">{formatList(p.cuisines)}</Field>
        <Field label="Dietary expertise">{formatList(p.dietary_specialties)}</Field>
        <Field label="Most confident cuisines">{tp.confident_cuisines}</Field>
        <Field label="Exploring / excited about">{tp.exploring_cuisines}</Field>
      </Section>

      <Section title="4. Your Story">
        <Field label="Culinary journey">{tp.culinary_journey}</Field>
        <Field label="Approach to hospitality">{tp.hospitality_approach}</Field>
        <Field label="What makes dining unique">{tp.what_makes_unique}</Field>
        <Field label="What guests should remember">{tp.guests_remember}</Field>
        <Field label="Anything else for clients">{tp.clients_should_know}</Field>
      </Section>

      <Section title="5. Career Goals">
        <Field label="Dream dinner / experience">{tp.dream_dinner}</Field>
        <Field label="Dream collaboration">{tp.dream_collaboration}</Field>
        <Field label="Dream destination">{tp.dream_destination}</Field>
        <Field label="Growth goals">{tp.growth_goals}</Field>
        <Field label="Opportunity hoped from Gradito">{tp.gradito_opportunity_hope}</Field>
      </Section>

      <Section title="6. Opportunity Preferences">
        <Field label="Private dining & placements">{formatList(tp.opp_private_dining)}</Field>
        <Field label="Events & experiences">{formatList(tp.opp_events)}</Field>
        <Field label="Education & media">{formatList(tp.opp_education_media)}</Field>
        <Field label="All selected">{formatList(p.opportunity_preferences)}</Field>
        <Field label="Not interested in">{tp.opportunities_not_interested}</Field>
      </Section>

      <Section title="7. Availability & Pricing">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Travel distance">{p.travel_distance || p.travel_policy}</Field>
          <Field label="Passport">{formatBool(p.has_passport)}</Field>
          <Field label="Ideal events / period">
            {p.ideal_events_per_period != null ? String(p.ideal_events_per_period) : null}
          </Field>
          <Field label="Lead time">{p.lead_time}</Field>
          <Field label="Preferred event days">{formatList(p.preferred_event_days)}</Field>
          <Field label="Maximum guest count">
            {p.max_guest_count != null ? String(p.max_guest_count) : p.max_solo_guests != null ? String(p.max_solo_guests) : null}
          </Field>
          <Field label="Commercial kitchen">{p.commercial_kitchen_access}</Field>
          <Field label="Own kitchen guest limit">
            {p.own_kitchen_max_guests != null ? String(p.own_kitchen_max_guests) : null}
          </Field>
          <Field label="Starting Event Fee (USD)">
            {formatMoney(p.starting_event_fee_usd)}
            {p.starting_fee_flexible ? ` · Flexible: ${p.starting_fee_flexible}` : ''}
          </Field>
          <Field label="Expected compensation">{formatMoney(p.expected_compensation_usd)}</Field>
        </div>
      </Section>

      <Section title="8. Portfolio & Media">
        <Field label="Headshots"><LinkList urls={tp.headshots} /></Field>
        <Field label="Food portfolio"><LinkList urls={tp.food_portfolio} /></Field>
        <Field label="Chef & event photos"><LinkList urls={tp.event_photos} /></Field>
        <Field label="Additional files"><LinkList urls={tp.additional_files} /></Field>
        <Field label="Share links">{tp.share_links}</Field>
      </Section>

      <Section title="9. Social & Media">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="YouTube"><ExternalLink href={p.youtube_url} /></Field>
          <Field label="Newsletter"><ExternalLink href={p.newsletter_url} /></Field>
          <Field label="Follower band">{p.social_follower_band}</Field>
        </div>
        <Field label="Media / brand history">{p.media_history}</Field>
      </Section>

      <Section title="10. Final Thoughts">
        <Field label="Anything else for Gradito">{tp.anything_else}</Field>
        <Field label="What would make partnering great">{tp.partnering_experience}</Field>
      </Section>

      {/* Legacy short-form submissions */}
      {(formatList(p.home_areas) || formatList(p.experience_types) || p.signature_experiences || p.equipment_notes) && (
        <Section title="Legacy / additional fields">
          <Field label="Home areas">{formatList(p.home_areas)}</Field>
          <Field label="Experience types">{formatList(p.experience_types)}</Field>
          <Field label="Signature experiences">{p.signature_experiences}</Field>
          <Field label="Equipment notes">{p.equipment_notes}</Field>
          <Field label="Availability notes">{p.availability_notes}</Field>
        </Section>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {(p.opportunity_preferences || []).slice(0, 8).map((o) => (
          <Badge key={o} variant="secondary" className="text-xs font-normal">{o}</Badge>
        ))}
      </div>
    </div>
  );
}
