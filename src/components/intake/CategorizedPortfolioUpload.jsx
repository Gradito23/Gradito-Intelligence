import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Upload, X } from 'lucide-react';

/**
 * Category-first multi-file upload for portfolio section.
 * Upload is disabled until a category is selected; files preview grouped by category.
 *
 * @param {object} props
 * @param {{ key: string, label: string, accept?: string, description?: string, examples?: string[] }[]} props.categories
 * @param {Record<string, string[]>} props.values
 * @param {(key: string, urls: string[]) => void} props.onChange
 */
export default function CategorizedPortfolioUpload({ categories = [], values = {}, onChange }) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [uploading, setUploading] = useState(false);

  const selected = useMemo(
    () => categories.find((c) => c.key === selectedCategory) || null,
    [categories, selectedCategory],
  );

  const uploadEnabled = !!selected;
  const accept = selected?.accept || 'image/jpeg,image/png,image/webp,application/pdf';

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!selected || files.length === 0) return;

    setUploading(true);
    const current = [...(values[selected.key] || [])];
    try {
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        current.push(file_url);
      }
      onChange(selected.key, current);
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

  const removeAt = (key, index) => {
    const list = values[key] || [];
    onChange(key, list.filter((_, i) => i !== index));
  };

  const hasAnyFiles = categories.some((c) => (values[c.key] || []).length > 0);
  const examples = selected?.examples || [];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>File category</Label>
        <p className="text-xs text-muted-foreground">
          Select a category first, then upload files into that category.
        </p>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected && (selected.description || examples.length > 0) && (
          <div className="text-xs text-muted-foreground space-y-1.5 pt-1">
            {selected.description && <p>{selected.description}</p>}
            {examples.length > 0 && (
              <>
                <p>Examples:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {examples.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>

      <div>
        {uploadEnabled ? (
          <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
            <label className={uploading ? 'cursor-wait' : 'cursor-pointer'}>
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {uploading ? 'Uploading…' : 'Upload files'}
              <input
                type="file"
                className="sr-only"
                accept={accept}
                multiple
                disabled={uploading}
                onChange={handleFiles}
              />
            </label>
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" disabled>
            <Upload className="h-4 w-4 mr-2" />
            Upload files
          </Button>
        )}
        {!selectedCategory && (
          <p className="text-xs text-muted-foreground mt-1.5">
            Choose a category to enable uploading.
          </p>
        )}
      </div>

      {hasAnyFiles && (
        <div className="space-y-4 pt-2 border-t">
          {categories.map((cat) => {
            const urls = values[cat.key] || [];
            if (urls.length === 0) return null;
            return (
              <div key={cat.key} className="space-y-2">
                <p className="text-sm font-medium">{cat.label}</p>
                <div className="flex flex-wrap gap-2">
                  {urls.map((url, i) => {
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
                          onClick={() => removeAt(cat.key, i)}
                          className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Remove file"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
