import React from 'react';
import LegalDocumentLayout from '@/components/legal/LegalDocumentLayout';
import { CONTRACTOR_TERMS } from '@/lib/contractorLegal';

export default function ContractorTerms() {
  return (
    <LegalDocumentLayout title={CONTRACTOR_TERMS.title}>
      <p>{CONTRACTOR_TERMS.intro}</p>

      {CONTRACTOR_TERMS.sections.map((section) => (
        <section key={section.heading} className="space-y-3">
          <h2 className="font-heading text-lg font-semibold text-foreground !mt-0">
            {section.heading}
          </h2>
          {(section.paragraphs || []).map((text) => (
            <p key={text}>{text}</p>
          ))}
          {section.bullets?.length > 0 && (
            <ul className="list-disc pl-5 space-y-2">
              {section.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </LegalDocumentLayout>
  );
}
