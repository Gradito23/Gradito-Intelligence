import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ChefAvatar from '@/components/ui/ChefAvatar';
import GoldStars from '@/components/ui/GoldStars';
import { formatCurrency } from '@/hooks/useAppData';
import { Loader2, Mail, MapPin, MessageSquare, User } from 'lucide-react';
import { inviteChannelChipLabel } from '@/lib/jobInviteMessage';

export default function MatchResultCard({
  result,
  rank,
  onViewChef,
  selected = false,
  selectedLabel,
  onSelect,
  invitation = null,
  onSendSms,
  onSendEmail,
  inviteBusy = false,
}) {
  const { chef, score, reason, travelFee, label, isLocal, distanceKm } = result;
  const fullName = `${chef.first_name} ${chef.last_name}`;
  const selectable = typeof onSelect === 'function';

  const labelColors = {
    'Top Pick': 'bg-gold text-white',
    'Value Pick': 'bg-emerald-600 text-white',
    'Wildcard': 'bg-purple-600 text-white',
    'Repeat Favorite': 'bg-blue-600 text-white',
  };

  return (
    <Card
      className={`p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 ${
        selected ? 'border-navy ring-1 ring-navy/30 bg-navy/5' : ''
      } ${selectable ? 'cursor-pointer' : ''}`}
      role={selectable ? 'button' : undefined}
      tabIndex={selectable ? 0 : undefined}
      aria-pressed={selectable ? selected : undefined}
      onClick={selectable ? () => onSelect(result) : undefined}
      onKeyDown={
        selectable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(result);
              }
            }
          : undefined
      }
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="relative shrink-0">
            <ChefAvatar photoUrl={chef.photo_url} name={fullName} size="lg" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center">
              {rank}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-semibold text-lg">{fullName}</h3>
            <GoldStars rating={chef.quality_rating} size={14} />
            <div className="flex flex-wrap gap-1 mt-2">
              {(chef.home_areas || []).slice(0, 2).map((a) => (
                <Badge key={a} variant="secondary" className="text-xs">
                  <MapPin size={10} className="mr-1" />
                  {a}
                </Badge>
              ))}
              <Badge variant="outline" className="text-xs">{chef.roles_available}</Badge>
              {isLocal && (
                <Badge className="bg-emerald-600 text-white text-xs">Local</Badge>
              )}
              {!isLocal && distanceKm != null && distanceKm > 0 && (
                <Badge variant="secondary" className="text-xs">~{distanceKm} km</Badge>
              )}
            </div>

            {Array.isArray(result.scoreFactors) && result.scoreFactors.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {result.scoreFactors.slice(0, 4).map((f) => (
                  <Badge key={f.code + f.label} variant="outline" className="text-[10px]">
                    {f.label}
                  </Badge>
                ))}
              </div>
            )}

            {reason && (
              <p className="mt-3 text-sm text-muted-foreground italic leading-relaxed">
                "{reason}"
              </p>
            )}

            {travelFee > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
                  <MapPin size={10} className="mr-1" /> +{formatCurrency(travelFee)} travel
                </Badge>
              </div>
            )}

            {selected && selectedLabel && (
              <p className="mt-2 text-xs font-medium text-navy">{selectedLabel}</p>
            )}

            {(invitation || onSendSms || onSendEmail) && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {inviteChannelChipLabel('sms', invitation, chef) && (
                  <Badge variant="secondary" className="text-xs">
                    {inviteChannelChipLabel('sms', invitation, chef) === 'SMS sent'
                      ? 'SMS sent'
                      : inviteChannelChipLabel('sms', invitation, chef)}
                  </Badge>
                )}
                {inviteChannelChipLabel('email', invitation, chef) && (
                  <Badge variant="secondary" className="text-xs">
                    {inviteChannelChipLabel('email', invitation, chef) === 'Email sent'
                      ? 'Email sent'
                      : inviteChannelChipLabel('email', invitation, chef)}
                  </Badge>
                )}
                {invitation?.sms_status === 'failed' && (
                  <Badge variant="destructive" className="text-xs">SMS failed</Badge>
                )}
                {invitation?.email_status === 'failed' && (
                  <Badge variant="destructive" className="text-xs">Email failed</Badge>
                )}
              </div>
            )}

            {onViewChef && (
              <div
                className="mt-4 flex flex-wrap gap-2"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <Button type="button" variant="outline" size="sm" onClick={() => onViewChef(chef)}>
                  <User size={14} className="mr-1.5" />
                  View chef
                </Button>
                {onSendSms && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={inviteBusy}
                    onClick={() => onSendSms(chef)}
                  >
                    {inviteBusy ? (
                      <Loader2 size={14} className="mr-1.5 animate-spin" />
                    ) : (
                      <MessageSquare size={14} className="mr-1.5" />
                    )}
                    Send SMS
                  </Button>
                )}
                {onSendEmail && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={inviteBusy}
                    onClick={() => onSendEmail(chef)}
                  >
                    {inviteBusy ? (
                      <Loader2 size={14} className="mr-1.5 animate-spin" />
                    ) : (
                      <Mail size={14} className="mr-1.5" />
                    )}
                    Send email
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3 sm:gap-4 shrink-0 sm:ml-auto self-start">
          {label && (
            <Badge className={`${labelColors[label] || 'bg-secondary'} text-xs border-0 whitespace-nowrap`}>
              {label}
            </Badge>
          )}
          <div className="text-right min-w-[4.5rem]">
            <div className="text-2xl font-heading font-bold text-gold leading-none">{score}</div>
            <p className="text-xs text-muted-foreground mt-1">match score</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
