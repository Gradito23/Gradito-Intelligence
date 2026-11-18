import React, { useEffect } from 'react';
import LegalDocumentLayout from '@/components/legal/LegalDocumentLayout';
import {
  CONTRACTOR_LEGAL_PAGE_TITLE,
  CONTRACTOR_NDA,
  CONTRACTOR_TERMS,
} from '@/lib/contractorLegal';

function scrollToHash(hash) {
  if (!hash || typeof document === 'undefined') return;
  const id = hash.replace(/^#/, '');
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export default function ContractorAgreements() {
  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (hash) {
      requestAnimationFrame(() => scrollToHash(hash));
    }
  }, []);

  return (
    <LegalDocumentLayout title={CONTRACTOR_LEGAL_PAGE_TITLE}>
      <section id="terms" className="scroll-mt-6 space-y-6">
        <h2 className="font-heading text-xl font-semibold text-foreground !mt-0">
          {CONTRACTOR_TERMS.title}
        </h2>
        <p>{CONTRACTOR_TERMS.intro}</p>
        {CONTRACTOR_TERMS.sections.map((section) => (
          <div key={section.heading} className="space-y-3">
            <h3 className="font-heading text-lg font-semibold text-foreground">
              {section.heading}
            </h3>
            {(section.paragraphs || []).map((text) => (
              <p key={text}>{text}</p>
            ))}
            {(section.bullets ?? []).length > 0 && (
              <ul className="list-disc pl-5 space-y-2">
                {(section.bullets ?? []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>

      <hr className="my-10 border-border" />

      <section id="nda" className="scroll-mt-6 space-y-4">
        <h2 className="font-heading text-xl font-semibold text-foreground !mt-0">
          {CONTRACTOR_NDA.title}
        </h2>
        <p>{CONTRACTOR_NDA.intro}</p>
        <ul className="list-disc pl-5 space-y-2">
          {CONTRACTOR_NDA.bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>{CONTRACTOR_NDA.closing}</p>
      </section>
    </LegalDocumentLayout>
  );
}