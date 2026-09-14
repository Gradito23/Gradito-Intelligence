import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import GraditoLogo from '@/components/brand/GraditoLogo';
import CheckboxGroup from '@/components/intake/CheckboxGroup';
import CategorizedPortfolioUpload from '@/components/intake/CategorizedPortfolioUpload';
import MultiFileUpload from '@/components/intake/MultiFileUpload';
import {
  FEE_FLEXIBLE_OPTIONS,
  FOLLOWER_BAND_OPTIONS,
  INTAKE_CUISINES,
  INTAKE_DIETARY,
  KITCHEN_ACCESS_OPTIONS,
  LEAD_TIME_OPTIONS,
  OPPORTUNITY_EDUCATION_MEDIA,
  OPPORTUNITY_EVENTS,
  OPPORTUNITY_PRIVATE_DINING,
  PREFERRED_EVENT_DAYS,
  TRAVEL_DISTANCE_OPTIONS,
  YES_NO_OPTIONS,
} from '@/lib/chefIntakeOptions';
import {
  buildIntakePayload,
  createEmptyIntakeForm,
  validateIntakeForm,
} from '@/lib/chefIntakeForm';
import { useOnboardingGuide } from '@/hooks/useOnboardingGuide';
import { CheckCircle, ExternalLink, Loader2 } from 'lucide-react';

function Section({ title, description, children }) {
  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="font-heading text-lg font-semibold">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {children}
    </Card>
  );
}

function Subsection({ title, children }) {
  return (
    <div className="space-y-3 pt-2 first:pt-0">
      <h4 className="text-sm font-semibold tracking-wide text-foreground border-b border-border pb-1.5">
        {title}
      </h4>
      {children}
    </div>
  );
}

function Field({ label, required, children, hint }) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required ? <span className="text-destructive"> *</span> : ''}
      </Label>
      {hint && (
        typeof hint === 'string'
          ? <p className="text-xs text-muted-foreground">{hint}</p>
          : <div className="text-xs text-muted-foreground">{hint}</div>
      )}
      {children}
    </div>
  );
}

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
const ADDITIONAL_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';

const PORTFOLIO_CATEGORIES = [
  {
    key: 'headshots',
    label: 'Professional Headshots (Optional)',
    accept: IMAGE_ACCEPT,
    description: 'Upload one or more professional headshots. First headshot is used as your profile photo.',
  },
  {
    key: 'food_portfolio',
    label: 'Food Portfolio (Optional)',
    accept: IMAGE_ACCEPT,
    description: "Upload as many food images as you'd like.",
    examples: [
      'Signature Dishes',
      'Plated Courses',
      'Tasting Menus',
      'Family-Style Meals',
      'Desserts',
      'Live Fire Cooking',
      'Restaurant Dishes',
      'Catering Presentations',
      'Behind-the-Scenes Food Preparation',
    ],
  },
  {
    key: 'event_photos',
    label: 'Chef & Event Photos (Optional)',
    accept: IMAGE_ACCEPT,
    description: 'Upload images of yourself and your work.',
    examples: [
      'You Cooking',
      "Chef's Table Experiences",
      'Private Dinners',
      'Brand Activations',
      'Cooking Classes',
      'Demonstrations',
      'Behind the Scenes',
      'Team Photos',
      'Guest Experiences',
    ],
  },
  {
    key: 'additional_files',
    label: 'Additional Files (Optional)',
    accept: ADDITIONAL_ACCEPT,
    examples: [
      'Press Features',
      'Magazine Articles',
      'Menus',
      'Awards',
      'Event Concepts',
      'Media Kits',
      'Brand Decks',
      'Presentations',
      'PDFs',
    ],
  },
];

function publishedGuide(guide) {
  const url = guide?.enabled && typeof guide.url === 'string' ? guide.url.trim() : '';
  if (!url) return null;
  return {
    url,
    title: (guide.title && String(guide.title).trim()) || 'Chef & FOH Onboarding Guide',
  };
}

export default function ChefIntake() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [form, setForm] = useState(createEmptyIntakeForm);
  const { data: guideSettings } = useOnboardingGuide();
  const guide = publishedGuide(guideSettings);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateIntakeForm(form);
    if (errors.length) {
      const message = errors[0];
      setSubmitError(message);
      toast({ title: 'Please complete required fields', description: message, variant: 'destructive' });
      return;
    }

    setLoading(true);
    setSubmitError('');
    const payload = buildIntakePayload(form);

    try {
      await base44.entities.ChefIntakeRequest.create({
        first_name: payload.first_name,
        last_name: payload.last_name,
        email: payload.email,
        mobile: payload.mobile,
        photo_url: payload.photo_url,
        status: 'pending',
        payload,
      });
      try {
        await base44.entities.ActivityLog.create({
          actor: 'Intake Form',
          action: 'Created',
          entity_type: 'Intake',
          entity_label: `${payload.first_name} ${payload.last_name}`,
          summary: `Chef ${payload.first_name} ${payload.last_name} submitted intake form (pending review)`,
        });
      } catch {
        // Activity log requires auth
      }
      setSubmitted(true);
    } catch (err) {
      const message = err.message || 'Something went wrong. Please try again.';
      setSubmitError(message);
      toast({ title: 'Submission failed', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-lg w-full p-8 text-center space-y-4">
          <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
          <h2 className="font-heading text-2xl font-semibold">Thank you, Chef!</h2>
          <p className="text-muted-foreground">
            Your profile has been submitted to the Gradito team for review. We&apos;ll be in touch soon.
          </p>
          {guide && (
            <>
              <p className="text-sm text-muted-foreground">
                Next, review the {guide.title} before your first Gradito event.
              </p>
              <Button asChild className="bg-navy hover:bg-navy/90 text-white">
                <a href={guide.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1.5" />
                  Open the Onboarding Guide
                </a>
              </Button>
              <p className="text-xs text-muted-foreground">
                Bookmark this guide — this page will not stay available after you leave.
              </p>
            </>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-navy py-8 px-4 text-center">
        <div className="flex justify-center text-white">
          <GraditoLogo className="h-9 w-auto" title="Gradito" />
        </div>
        <p className="text-gold text-sm mt-2 tracking-widest uppercase">Chef Intake Form</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto p-6 space-y-6">
        <Card className="p-6 space-y-3">
          <h2 className="font-heading text-xl font-semibold">Welcome to Gradito</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We&apos;re excited to welcome you to the Gradito chef network. This profile is the foundation
            of your Gradito chef profile and helps us understand your culinary background, specialties,
            personality, availability, and professional goals.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Gradito specializes in Michelin-grade private dining experiences and private chef placements.
            The more thoughtfully you complete your profile, the better we can represent you and connect
            you with opportunities that align with your expertise and ambitions.
          </p>
          {guide && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              After you submit, you will receive the Chef & FOH Onboarding Guide — how Gradito
              events, menus, invoicing, and service standards work.
            </p>
          )}
        </Card>

        {/* §1 Contact */}
        <Section title="Section 1: Contact Information">
          <Subsection title="Basic Information">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Full Name" required>
                <Input
                  value={form.full_name}
                  onChange={(e) => set('full_name', e.target.value)}
                  placeholder="First Last"
                  required
                />
              </Field>
              <Field label="Preferred Name (Optional)">
                <Input value={form.preferred_name} onChange={(e) => set('preferred_name', e.target.value)} />
              </Field>
              <Field label="Email Address" required>
                <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
              </Field>
              <Field label="Cell Phone Number" required>
                <Input value={form.mobile} onChange={(e) => set('mobile', e.target.value)} required />
              </Field>
            </div>
          </Subsection>

          <Subsection title="Location">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="City" required>
                <Input value={form.city} onChange={(e) => set('city', e.target.value)} required />
              </Field>
              <Field label="State" required>
                <Input value={form.state} onChange={(e) => set('state', e.target.value)} required />
              </Field>
              <Field label="Home Airport (Optional)">
                <Input value={form.home_airport} onChange={(e) => set('home_airport', e.target.value)} />
              </Field>
            </div>
          </Subsection>

          <Subsection title="Transportation">
            <Field label="Do you have access to a personal vehicle?" required>
              <Select value={form.has_vehicle} onValueChange={(v) => set('has_vehicle', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {YES_NO_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </Subsection>

          <Subsection title="Professional Links">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Instagram (Optional)">
                <Input value={form.instagram_url} onChange={(e) => set('instagram_url', e.target.value)} placeholder="https://" />
              </Field>
              <Field label="Website (Optional)">
                <Input value={form.website_url} onChange={(e) => set('website_url', e.target.value)} placeholder="https://" />
              </Field>
              <Field label="TikTok (Optional)">
                <Input value={form.tiktok_url} onChange={(e) => set('tiktok_url', e.target.value)} placeholder="https://" />
              </Field>
              <Field label="LinkedIn (Optional)">
                <Input value={form.linkedin_url} onChange={(e) => set('linkedin_url', e.target.value)} placeholder="https://" />
              </Field>
            </div>
          </Subsection>
        </Section>

        {/* §2 Professional */}
        <Section title="Section 2: Professional Background">
          <Field label="Professional Bio" hint="Copy and paste your professional biography.">
            <Textarea
              rows={5}
              value={form.professional_bio}
              onChange={(e) => set('professional_bio', e.target.value)}
            />
          </Field>
          <MultiFileUpload
            label="Resume / CV"
            required
            value={form.resume_urls}
            onChange={(urls) => set('resume_urls', urls)}
            multiple={false}
            accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          />
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Current Position" required>
              <Input value={form.current_position} onChange={(e) => set('current_position', e.target.value)} required />
            </Field>
            <Field label="Current Restaurant / Company">
              <Input value={form.current_company} onChange={(e) => set('current_company', e.target.value)} />
            </Field>
            <Field label="Years Cooking Professionally" required>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={form.years_cooking}
                onChange={(e) => set('years_cooking', e.target.value)}
                required
              />
            </Field>
            <Field label="Languages Spoken (Comma-Separated)">
              <Input
                value={form.languages}
                onChange={(e) => set('languages', e.target.value)}
                placeholder="English, Spanish"
              />
            </Field>
          </div>
          <Field label="Awards, Recognitions, Or Notable Accomplishments">
            <Textarea rows={3} value={form.awards} onChange={(e) => set('awards', e.target.value)} />
          </Field>
        </Section>

        {/* §3 Culinary */}
        <Section title="Section 3: Culinary Expertise">
          <Field label="Primary Cuisine Specialties" required hint="Which cuisines best represent your expertise?">
            <CheckboxGroup
              options={INTAKE_CUISINES}
              value={form.cuisines}
              onChange={(v) => set('cuisines', v)}
              otherValue={form.cuisine_other}
              onOtherChange={(v) => set('cuisine_other', v)}
              columns={3}
            />
          </Field>
          <Field label="Dietary Expertise" hint="Which dietary preferences are you comfortable accommodating?">
            <CheckboxGroup
              options={INTAKE_DIETARY}
              value={form.dietary_specialties}
              onChange={(v) => set('dietary_specialties', v)}
              otherValue={form.dietary_other}
              onOtherChange={(v) => set('dietary_other', v)}
            />
          </Field>
          <Field label="Which cuisines do you feel most confident preparing for clients?">
            <Textarea rows={3} value={form.confident_cuisines} onChange={(e) => set('confident_cuisines', e.target.value)} />
          </Field>
          <Field label="Are there any cuisines, ingredients, or techniques you're currently exploring or excited about?">
            <Textarea rows={3} value={form.exploring_cuisines} onChange={(e) => set('exploring_cuisines', e.target.value)} />
          </Field>
        </Section>

        {/* §4 Story */}
        <Section
          title="Section 4: Your Story"
          description="Help us better understand you as a chef. These responses may be incorporated into your Gradito profile and help us introduce you to prospective clients and partners."
        >
          <Field label="Tell us about your culinary journey">
            <Textarea rows={4} value={form.culinary_journey} onChange={(e) => set('culinary_journey', e.target.value)} />
          </Field>
          <Field label="What makes dining with you unique?">
            <Textarea rows={3} value={form.what_makes_unique} onChange={(e) => set('what_makes_unique', e.target.value)} />
          </Field>
          <Field label="Is there anything else you'd like prospective clients to know about you?">
            <Textarea rows={3} value={form.clients_should_know} onChange={(e) => set('clients_should_know', e.target.value)} />
          </Field>
        </Section>

        {/* §5 Career */}
        <Section
          title="Section 5: Career Goals"
          description="These questions help us understand your long-term ambitions so we can keep you in mind for future opportunities."
        >
          <Field label="If budget weren't a factor, what dinner or culinary experience would you love to create?">
            <Textarea rows={3} value={form.dream_dinner} onChange={(e) => set('dream_dinner', e.target.value)} />
          </Field>
          <Field label="Is there a brand, hotel, restaurant, winery, resort, or company you'd love to collaborate with?">
            <Textarea rows={3} value={form.dream_collaboration} onChange={(e) => set('dream_collaboration', e.target.value)} />
          </Field>
          <Field label="Is there a destination you've always wanted to cook in?">
            <Textarea rows={2} value={form.dream_destination} onChange={(e) => set('dream_destination', e.target.value)} />
          </Field>
          <Field
            label="What are you hoping to grow over the next few years?"
            hint="e.g. Private Dining, Brand Partnerships, Television, Restaurants, Teaching, Cookbook, Media"
          >
            <Textarea rows={3} value={form.growth_goals} onChange={(e) => set('growth_goals', e.target.value)} />
          </Field>
          <Field label="What's one opportunity you hope Gradito helps create?">
            <Textarea rows={3} value={form.gradito_opportunity_hope} onChange={(e) => set('gradito_opportunity_hope', e.target.value)} />
          </Field>
        </Section>

        {/* §6 Opportunities */}
        <Section title="Section 6: Opportunity Preferences">
          <Field label="Private Dining & Placements" required>
            <CheckboxGroup
              options={OPPORTUNITY_PRIVATE_DINING}
              value={form.opp_private_dining}
              onChange={(v) => set('opp_private_dining', v)}
            />
          </Field>
          <Field label="Events & Experiences" required>
            <CheckboxGroup
              options={OPPORTUNITY_EVENTS}
              value={form.opp_events}
              onChange={(v) => set('opp_events', v)}
              otherValue={form.opp_events_other}
              onOtherChange={(v) => set('opp_events_other', v)}
            />
          </Field>
          <Field label="Education & Media" required>
            <CheckboxGroup
              options={OPPORTUNITY_EDUCATION_MEDIA}
              value={form.opp_education_media}
              onChange={(v) => set('opp_education_media', v)}
            />
          </Field>
          <Field
            label="Is there a type of opportunity you are not interested in?"
            hint="e.g. Meal Prep, Corporate Events, Television, Travel, Festivals, Cooking Classes"
          >
            <Textarea rows={2} value={form.opportunities_not_interested} onChange={(e) => set('opportunities_not_interested', e.target.value)} />
          </Field>
        </Section>

        {/* §7 Availability & pricing */}
        <Section title="Section 7: Availability & Pricing">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="How far are you typically willing to travel for an event?">
              <Select value={form.travel_distance} onValueChange={(v) => set('travel_distance', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {TRAVEL_DISTANCE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Do you have a valid passport?">
              <Select value={form.has_passport} onValueChange={(v) => set('has_passport', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {YES_NO_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Ideal Gradito events per month/year" hint="Approximate Number">
              <Input
                type="number"
                min="0"
                value={form.ideal_events_per_period}
                onChange={(e) => set('ideal_events_per_period', e.target.value)}
              />
            </Field>
            <Field label="Typical lead time before accepting an event">
              <Select value={form.lead_time} onValueChange={(v) => set('lead_time', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {LEAD_TIME_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Preferred event days">
            <CheckboxGroup
              options={PREFERRED_EVENT_DAYS}
              value={form.preferred_event_days}
              onChange={(v) => set('preferred_event_days', v)}
              columns={3}
            />
          </Field>

          <Field
            label="What is the largest event you would feel comfortable leading with appropriate support staff?"
            required
            hint="Gradito provides additional culinary and service staff as guest counts increase (e.g., sous chefs, servers, bartenders, captains, etc.). We're looking to understand the largest event you'd feel confident overseeing as the lead chef."
          >
            <Input
              type="number"
              min="1"
              value={form.max_guest_count}
              onChange={(e) => set('max_guest_count', e.target.value)}
              required
              placeholder="Maximum Guest Count"
            />
          </Field>

          <Field
            label="Commercial kitchen access"
            hint="Do you have access to a commercial kitchen for prep work (especially for larger events)?"
          >
            <Select value={form.commercial_kitchen_access} onValueChange={(v) => set('commercial_kitchen_access', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {KITCHEN_ACCESS_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Own kitchen guest limit"
            hint="Up to how many guests can you cook from your own kitchen? Above this count, you’d need a commercial kitchen rental. Example: 40 — home kitchen OK up to 40 guests; commercial kitchen required after that."
          >
            <Input
              type="number"
              min="1"
              value={form.own_kitchen_max_guests}
              onChange={(e) => set('own_kitchen_max_guests', e.target.value)}
              placeholder="e.g. 40"
            />
          </Field>

          <Field
            label="What is your typical starting event fee for a standard private dinner (up to 12 guests)?"
            required
            hint="Private events can range from intimate dinners for two guests to 100+ guest receptions. This starting fee helps us understand the types of opportunities that are likely to be a good fit for you. Final pricing is always determined on a case-by-case basis based on guest count, staffing, travel, and event complexity."
          >
            <Input
              type="number"
              min="0"
              step="1"
              value={form.starting_event_fee_usd}
              onChange={(e) => set('starting_event_fee_usd', e.target.value)}
              placeholder="Starting Event Fee (USD)"
              required
            />
          </Field>

          <Field
            label="Is your starting event fee flexible for the right opportunity?"
            hint={(
              <>
                <p>Examples may include:</p>
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  <li>A dream client or brand</li>
                  <li>Editorial or press opportunities</li>
                  <li>Television or media appearances</li>
                  <li>High-profile collaborations</li>
                  <li>Repeat business</li>
                </ul>
              </>
            )}
          >
            <Select value={form.starting_fee_flexible} onValueChange={(v) => set('starting_fee_flexible', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {FEE_FLEXIBLE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Expected salary / compensation (USD)"
            required
            hint="For private chef placements and longer-term opportunities (distinct from event starting fee)."
          >
            <Input
              type="number"
              min="0"
              step="1"
              value={form.expected_compensation_usd}
              onChange={(e) => set('expected_compensation_usd', e.target.value)}
              required
            />
          </Field>
        </Section>

        {/* §8 Portfolio */}
        <Section title="Section 8: Portfolio & Media" description="Help us showcase your work.">
          <CategorizedPortfolioUpload
            categories={PORTFOLIO_CATEGORIES}
            values={{
              headshots: form.headshots,
              food_portfolio: form.food_portfolio,
              event_photos: form.event_photos,
              additional_files: form.additional_files,
            }}
            onChange={(key, urls) => {
              setForm((prev) => ({
                ...prev,
                [key]: urls,
                ...(key === 'headshots'
                  ? { photo_url: prev.photo_url || urls[0] || '' }
                  : {}),
              }));
            }}
          />
          <Field
            label="Share Links (Optional)"
            hint={(
              <>
                <p>Examples:</p>
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  <li>Google Drive</li>
                  <li>Dropbox</li>
                  <li>Website</li>
                  <li>Press Articles</li>
                  <li>YouTube</li>
                  <li>Vimeo</li>
                  <li>Podcast Appearances</li>
                  <li>Media Coverage</li>
                  <li>Recipe Portfolios</li>
                </ul>
              </>
            )}
          >
            <Textarea rows={3} value={form.share_links} onChange={(e) => set('share_links', e.target.value)} />
          </Field>
        </Section>

        {/* §9 Social */}
        <Section title="Section 9: Social & Media">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="YouTube (Optional)">
              <Input value={form.youtube_url} onChange={(e) => set('youtube_url', e.target.value)} placeholder="https://" />
            </Field>
            <Field label="Newsletter (Optional)">
              <Input value={form.newsletter_url} onChange={(e) => set('newsletter_url', e.target.value)} placeholder="https://" />
            </Field>
            <Field label="Approximate Followers Across Platforms">
              <Select value={form.social_follower_band} onValueChange={(v) => set('social_follower_band', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {FOLLOWER_BAND_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Brand Partnerships, Media Appearances, Television, Podcasts, Or Press Coverage">
            <Textarea rows={4} value={form.media_history} onChange={(e) => set('media_history', e.target.value)} />
          </Field>
        </Section>

        {/* §10 Final */}
        <Section title="Section 10: Final Thoughts">
          <Field label="Is there anything else you'd like the Gradito team to know?">
            <Textarea rows={3} value={form.anything_else} onChange={(e) => set('anything_else', e.target.value)} />
          </Field>
          <Field label="What would make partnering with Gradito a great experience for you?">
            <Textarea rows={3} value={form.partnering_experience} onChange={(e) => set('partnering_experience', e.target.value)} />
          </Field>
        </Section>

        {submitError && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{submitError}</div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-navy hover:bg-navy/90 text-white"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting…
            </>
          ) : (
            'Submit Profile'
          )}
        </Button>
      </form>
    </div>
  );
}
