import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Upload, X } from 'lucide-react';

/**
 * Multi-file upload for intake portfolios / resume.
 * @param {object} props
 * @param {string} props.label
 * @param {string[]} props.value - public URLs
 * @param {(urls: string[]) => void} props.onChange
 * @param {string} [props.accept]
 * @param {boolean} [props.multiple=true]
 * @param {string} [props.hint]
 */
export default function MultiFileUpload({
  label,
  value = [],
  onChange,
  accept = 'image/jpeg,image/png,image/webp,application/pdf',
  multiple = true,
  hint,
}) {
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    setUploading(true);
    const urls = [...value];
    try {
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        if (multiple) {
          urls.push(file_url);
        } else {
          urls.splice(0, urls.length, file_url);
        }
      }
      onChange(urls);
    } catch (err) {
      toast({
        title: 'Upload failed',
        description: err.message || 'Could not upload file.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const removeAt = (index) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {value.map((url, i) => {
          const isImage = /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url);
          return (
            <div
              key={`${url}-${i}`}
              className="relative group rounded-lg border border-border overflow-hidden bg-muted/30"
            >
              {isImage ? (
                <img src={url} alt="" className="h-20 w-20 object-cover" />
              ) : (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-20 w-28 items-center justify-center px-2 text-xs text-primary underline"
                >
                  File {i + 1}
                </a>
              )}
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove file"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
      <div>
        <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
          <label className="cursor-pointer">
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {uploading ? 'Uploading…' : multiple ? 'Upload files' : 'Upload file'}
            <input
              type="file"
              className="sr-only"
              accept={accept}
              multiple={multiple}
              disabled={uploading}
              onChange={handleFiles}
            />
          </label>
        </Button>
      </div>
    </div>
  );
}
