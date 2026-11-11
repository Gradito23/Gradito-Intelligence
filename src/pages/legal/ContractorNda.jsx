import React from 'react';
import LegalDocumentLayout from '@/components/legal/LegalDocumentLayout';
import { CONTRACTOR_NDA } from '@/lib/contractorLegal';

export default function ContractorNda() {
  return (
    <LegalDocumentLayout title={CONTRACTOR_NDA.title}>
      <p>{CONTRACTOR_NDA.intro}</p>
      <ul className="list-disc pl-5 space-y-2">
        {CONTRACTOR_NDA.bullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>{CONTRACTOR_NDA.closing}</p>
    </LegalDocumentLayout>
  );
}
