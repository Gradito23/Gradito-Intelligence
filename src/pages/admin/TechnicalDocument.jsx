import React from 'react';
import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TECHNICAL_DOC_SECTIONS } from '@/lib/technicalDocumentContent';

export default function TechnicalDocument() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h2 className="font-heading text-xl font-semibold text-navy flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Technical Document
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Architecture and operations reference for Gradito Intelligence.
        </p>
      </div>

      {TECHNICAL_DOC_SECTIONS.map((section) => (
        <Card key={section.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">{section.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            {section.paragraphs?.map((paragraph, i) => (
              <p key={`${section.id}-p-${i}`}>{paragraph}</p>
            ))}
            {section.bullets?.length > 0 && (
              <ul className="list-disc pl-5 space-y-1.5">
                {section.bullets.map((item, i) => (
                  <li key={`${section.id}-b-${i}`}>{item}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
