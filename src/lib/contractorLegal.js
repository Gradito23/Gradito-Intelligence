/** Gradito contractor legal documents for intake consent. */

export const CONTRACTOR_LEGAL_VERSION = '2026-11-04';
export const CONTRACTOR_LEGAL_EFFECTIVE_LABEL = 'Effective Nov 4, 2026';

export const CONTRACTOR_TERMS_PATH = '/legal/contractor-terms';
export const CONTRACTOR_NDA_PATH = '/legal/contractor-nda';

export const CONTRACTOR_TERMS = {
  title: 'Gradito Contractor Terms & Conditions',
  intro:
    'Thanks for joining Gradito\'s network. These terms apply to every independent contractor who works events through Gradito LLC ("Gradito"), including chefs, sous chefs, cooks, servers, bartenders, event leads and other hospitality staff ("you"). They keep things clear for you, for us and for our clients, and apply to every booking you accept.',
  sections: [
    {
      heading: '1. Working together',
      paragraphs: [
        'You work with Gradito as an independent contractor, not an employee. You choose which bookings to accept, you decide how to do your work, and you\'re free to work with others. You handle your own taxes; we\'ll ask for a W-9 and send a 1099 where required.',
      ],
    },
    {
      heading: '2. At events',
      bullets: [
        'Follow the booking details, including your role, call time, dress code and any client instructions.',
        'If you handle food or drinks, follow safe food and alcohol service practices, including every allergy and dietary request.',
        'Arrive on time, stay through breakdown and leave the space as you found it.',
        'Be professional and discreet, and no drinking during service.',
        'Your Gradito event lead is your main contact on site.',
      ],
    },
    {
      heading: '3. Pay',
      bullets: [
        'Your rate for each booking is confirmed before you accept, and we pay you within [7] days after the event.',
        'Approved purchases (such as groceries or supplies) are reimbursed with receipts.',
        'Any gratuities collected for the event are shared as described in the booking details.',
      ],
    },
    {
      heading: '4. Cancellations',
      paragraphs: [
        'If we cancel within one week (7 days) of the event, we\'ll pay 50% of your confirmed rate plus any approved purchases. If you need to cancel, please give us at least 7 days\' notice. If you cancel with less notice, you\'ll need to provide a qualified substitute approved by Gradito. If a qualified substitute isn\'t provided, it will affect your future bookings with Gradito.',
      ],
    },
    {
      heading: '5. Our clients',
      paragraphs: [
        'Clients you meet through Gradito stay Gradito clients. For one (1) year after your last event with a Gradito client, please book any work with that client through us and send direct inquiries our way. Please don\'t hand out your own cards or promote your business at Gradito events.',
      ],
    },
    {
      heading: '6. Photos',
      paragraphs: [
        'Please ask us before posting anything from an event. Once approved, you\'re welcome to share photos of your work (no guests, clients or identifying details) and tag @gradito_nyc.',
      ],
    },
    {
      heading: '7. General',
      paragraphs: [
        'We recommend carrying your own liability insurance. Each of us is responsible for our own mistakes. Either of us can stop working together at any time. We may update these terms with notice, and they\'re governed by New York law.',
      ],
    },
  ],
};

export const CONTRACTOR_NDA = {
  title: 'Gradito Contractor Confidentiality Agreement (NDA)',
  intro:
    'Our clients trust us with their homes, families and privacy. By checking the box, you agree to:',
  bullets: [
    'keep private anything you learn about our clients and their guests, including names, addresses, homes, family details and conversations;',
    'not share or post about any client or event without Gradito\'s approval;',
    'sign a client\'s own NDA if we ask you to; and',
    'delete any client information when you stop working with us.',
  ],
  closing:
    'This agreement continues after you stop working with Gradito. It doesn\'t stop you from sharing information when required by law or reporting a concern to a government agency.',
};
