'use client';

import api from '@/lib/api';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import * as z from 'zod';

const sectionOrderSchema = z.object({
  sections: z.array(z.object({
    key: z.string(),
    label: z.string(),
    enabled: z.boolean(),
  })).min(1),
  resumeName: z.string().min(1, 'Name is required'),
});

type SectionOrderForm = z.infer<typeof sectionOrderSchema>;

const DEFAULT_SECTIONS: SectionOrderForm['sections'] = [
  { key: 'personal', label: 'Personal Info', enabled: true },
  { key: 'summary', label: 'Summary', enabled: true },
  { key: 'experience', label: 'Experience', enabled: true },
  { key: 'education', label: 'Education', enabled: true },
  { key: 'skills', label: 'Skills', enabled: true },
  { key: 'projects', label: 'Projects', enabled: false },
  { key: 'certifications', label: 'Certifications', enabled: false },
  { key: 'languages', label: 'Languages', enabled: false },
];

export default function ResumeBuilderPage() {
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<Array<{ _id: string; key: string; name: string; defaultTheme?: string; allowedThemes?: string[] }>>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedTheme, setSelectedTheme] = useState<string>('light');
  const [lastSavedVersionId, setLastSavedVersionId] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [atsDescription, setAtsDescription] = useState('');
  const [atsLoading, setAtsLoading] = useState(false);
  const [atsResult, setAtsResult] = useState<{ score: number; matched: string[]; missing: string[] } | null>(null);
  const [aiText, setAiText] = useState('');
  const [aiMode, setAiMode] = useState<'rewrite' | 'extract_skills'>('rewrite');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | string[] | null>(null);
  const [cv, setCv] = useState<any | null>(null);

  const defaultValues = useMemo<SectionOrderForm>(() => ({
    resumeName: 'General Resume',
    sections: DEFAULT_SECTIONS,
  }), []);

  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm<SectionOrderForm>({
    resolver: zodResolver(sectionOrderSchema),
    defaultValues,
  });

  const { fields: sectionFields, move: moveField } = useFieldArray({ control, name: 'sections' });
  const sections = watch('sections');

  // (Rolled back) using neutral preview styles without template-specific classes

  function move(idx: number, dir: -1 | 1) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= sectionFields.length) return;
    moveField(idx, newIdx);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp: any = await api.get('/users/cv-templates');
        const data = resp?.data;
        if (!mounted) return;
        let list = (data?.data || []) as Array<{ _id: string; key: string; name: string; defaultTheme?: string; allowedThemes?: string[] }>;
        if (!list || list.length === 0) {
          try {
            const seeded: any = await api.post('/users/cv-templates/seed');
            list = (seeded?.data?.data || []) as Array<{ _id: string; key: string; name: string; defaultTheme?: string; allowedThemes?: string[] }>;
          } catch (seedErr) {
            console.error('Seeding templates failed', seedErr);
          }
        }
        setTemplates(list);
        if (list.length > 0) {
          setSelectedTemplateId(list[0]._id);
          setSelectedTheme(list[0].defaultTheme || 'light');
        }
      } catch (e) {
        console.error('Failed to load templates', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Load current CV data for preview
  const loadCv = async () => {
    try {
      const resp: any = await api.get('/users/cv');
      setCv(resp?.data?.data || null);
    } catch (e) {
      console.error('Failed to load CV', e);
    }
  };

  useEffect(() => {
    loadCv();
  }, []);

  async function onSubmit(data: SectionOrderForm) {
    setSaving(true);
    try {
      if (!selectedTemplateId) {
        alert('Please select a template');
        return;
      }
      const sectionsConfig: Record<string, any> = {
        order: data.sections.map(s => s.key),
        enabled: Object.fromEntries(data.sections.map(s => [s.key, s.enabled])),
      };
      const payload = {
        name: data.resumeName,
        templateId: selectedTemplateId,
        theme: selectedTheme,
        sections: sectionsConfig,
      };
      const res: any = await api.post('/users/cv-versions', payload);
      const createdId = res?.data?.data?._id || res?.data?.data?.id;
      if (createdId) setLastSavedVersionId(createdId);
    } finally {
      setSaving(false);
    }
  }

  function renderPreviewSection(key: string) {
    if (!cv) return null;
    switch (key) {
      case 'personal':
        return (
          <div key="personal">
            <div className="text-base font-semibold">{cv.personalInfo?.fullName}</div>
            <div className="text-xs text-muted-foreground">{cv.personalInfo?.professionalTitle}</div>
            <div className="text-xs text-muted-foreground">{[cv.personalInfo?.email, cv.personalInfo?.phone, cv.personalInfo?.location].filter(Boolean).join(' · ')}</div>
          </div>
        );
      case 'summary':
        return cv.personalInfo?.bio ? (
          <div key="summary">
            <div className="uppercase tracking-wide text-[11px] text-muted-foreground">Summary</div>
            <div>{cv.personalInfo.bio}</div>
          </div>
        ) : null;
      case 'skills':
        return Array.isArray(cv.skills) && cv.skills.length > 0 ? (
          <div key="skills">
            <div className="uppercase tracking-wide text-[11px] text-muted-foreground mb-1">Skills</div>
            <div className="flex flex-wrap gap-2">
              {cv.skills.slice(0, 20).map((s: any, i: number) => (
                <span key={s.id || i} className="px-2 py-1 rounded-md bg-slate-200 text-slate-900 text-xs">{s.name || s}</span>
              ))}
            </div>
          </div>
        ) : null;
      case 'experience':
        return Array.isArray(cv.experience) && cv.experience.length > 0 ? (
          <div key="experience">
            <div className="uppercase tracking-wide text-[11px] text-muted-foreground mb-1">Experience</div>
            <div className="space-y-2">
              {cv.experience.slice(0, 5).map((exp: any, i: number) => (
                <div key={exp.id || i}>
                  <div className="font-medium">{exp.title} — {exp.company}</div>
                  <div className="text-xs text-muted-foreground">{[exp.startDate, exp.endDate].filter(Boolean).join(' – ')}</div>
                  {exp.description && <div className="text-sm">{exp.description}</div>}
                </div>
              ))}
            </div>
          </div>
        ) : null;
      case 'education':
        return Array.isArray(cv.education) && cv.education.length > 0 ? (
          <div key="education">
            <div className="uppercase tracking-wide text-[11px] text-muted-foreground mb-1">Education</div>
            <div className="space-y-2">
              {cv.education.slice(0, 5).map((ed: any, i: number) => (
                <div key={ed.id || i}>
                  <div className="font-medium">{ed.degree} — {ed.institution}</div>
                  <div className="text-xs text-muted-foreground">{[ed.startDate, ed.endDate].filter(Boolean).join(' – ')}</div>
                  {ed.description && <div className="text-sm">{ed.description}</div>}
                </div>
              ))}
            </div>
          </div>
        ) : null;
      default:
        return null;
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Resume Builder</h1>
        <Link href="/resume" className="text-sm text-muted-foreground hover:text-foreground">
          Back to Resume
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form className="rounded-lg border p-4" onSubmit={handleSubmit(onSubmit)}>
          <h2 className="font-semibold mb-4">Editor</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Template</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => {
                  const tpl = templates.find(t => t._id === e.target.value);
                  setSelectedTemplateId(e.target.value);
                  if (tpl) setSelectedTheme(tpl.defaultTheme || 'light');
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {templates.map(t => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Theme</label>
              <select
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {(templates.find(t => t._id === selectedTemplateId)?.allowedThemes || ['light']).map(theme => (
                  <option key={theme} value={theme}>{theme}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Import from PDF/DOCX</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const form = new FormData();
                form.append('file', file);
                setIsUploading(true);
                try {
                  const resp: any = await api.post('/users/upload-resume', form, { headers: { 'Content-Type': 'multipart/form-data' } });
                  // If parsing occurred, user profile is updated on the server; nothing to map to sections here
                  console.log('Uploaded resume', resp?.data);
                  await loadCv();
                  alert('Resume uploaded. Parsed data applied to your profile if available.');
                } catch (err) {
                  console.error('Upload failed', err);
                  alert('Failed to upload resume.');
                } finally {
                  setIsUploading(false);
                  if (e.target) e.target.value = '';
                }
              }}
              disabled={isUploading}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90"
            />
            {isUploading && <p className="text-xs text-muted-foreground mt-1">Uploading and parsing…</p>}
          </div>

          <label className="block text-sm font-medium mb-1">Resume name</label>
          <input
            {...register('resumeName')}
            className="w-full mb-2 rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="e.g., Frontend Roles v1"
          />
          {errors.resumeName && (
            <p className="text-xs text-red-600 mb-2">{errors.resumeName.message}</p>
          )}

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Sections</span>
              <span className="text-xs text-muted-foreground">Use arrows to reorder</span>
            </div>

            <ul className="space-y-2">
              {sectionFields.map((s, idx) => (
                <li key={s.id || s.key} className="flex items-center justify-between rounded-md border p-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={sections[idx]?.enabled}
                      onChange={(e) => {
                        setValue(`sections.${idx}.enabled` as const, e.target.checked, { shouldDirty: true, shouldValidate: true });
                      }}
                    />
                    <span className="text-sm">{sections[idx]?.label || s.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => move(idx, -1)}
                      className="h-8 w-8 inline-flex items-center justify-center rounded-md border text-sm"
                      aria-label="Move up"
                    >↑</button>
                    <button
                      type="button"
                      onClick={() => move(idx, 1)}
                      className="h-8 w-8 inline-flex items-center justify-center rounded-md border text-sm"
                      aria-label="Move down"
                    >↓</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Version'}
            </button>
            <button
              type="button"
              disabled={!lastSavedVersionId}
              onClick={async () => {
                if (!lastSavedVersionId) return;
                try {
                  const resp = await api.get(`/users/cv-versions/${lastSavedVersionId}/export`, { responseType: 'text' as any });
                  const html = (resp as any)?.data as string;
                  const blob = new Blob([html], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  window.open(url, '_blank');
                } catch (e) {
                  console.error('Failed to export resume', e);
                }
              }}
              className="inline-flex items-center px-4 py-2 rounded-md border disabled:opacity-60"
            >
              Open Export (HTML)
            </button>
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 rounded-md border"
              onClick={() => setValue('sections', DEFAULT_SECTIONS)}
            >Reset</button>
          </div>
        </form>

        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-4">Live Preview</h2>
          <div className="aspect-[8.5/11] w-full bg-muted/40 rounded-md p-4 overflow-auto">
            <div className="text-sm">
              <div className="mb-2 font-semibold">{watch('resumeName') || 'Untitled Resume'}</div>
              <div className="mb-3 text-xs text-muted-foreground">
                Template: {templates.find(t => t._id === selectedTemplateId)?.name || '—'} · Theme: {selectedTheme}
              </div>
              {cv ? (
                <div className="space-y-4">
                  {sections.filter(s => s.enabled).map(s => renderPreviewSection(s.key))}
                </div>
              ) : (
                <ul className="space-y-1">
                  {sections.filter(s => s.enabled).map((s) => (
                    <li key={s.key} className="text-muted-foreground">• {s.label}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-4">ATS Match Check</h2>
          <label className="block text-sm font-medium mb-1">Paste target job description</label>
          <textarea
            value={atsDescription}
            onChange={(e) => setAtsDescription(e.target.value)}
            rows={8}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mb-3"
            placeholder="Paste the JD here to get a keyword match score"
          />
          <button
            type="button"
            disabled={atsLoading || !atsDescription.trim()}
            onClick={async () => {
              setAtsLoading(true);
              setAtsResult(null);
              try {
                const resp: any = await api.post('/users/ats-score', { jobDescription: atsDescription, versionId: lastSavedVersionId || undefined });
                const data = resp?.data?.data;
                if (data) setAtsResult({ score: data.score, matched: data.matched, missing: data.missing });
              } catch (e) {
                console.error('ATS score failed', e);
              } finally {
                setAtsLoading(false);
              }
            }}
            className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {atsLoading ? 'Scoring…' : 'Get ATS Score'}
          </button>

          {atsResult && (
            <div className="mt-4 text-sm">
              <div className="font-semibold">Score: {atsResult.score}%</div>
              <div className="mt-2">
                <div className="text-muted-foreground mb-1">Matched Keywords ({atsResult.matched.length})</div>
                <div className="flex flex-wrap gap-2">{atsResult.matched.map((k) => <span key={k} className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-900 text-xs">{k}</span>)}</div>
              </div>
              <div className="mt-3">
                <div className="text-muted-foreground mb-1">Missing Keywords ({atsResult.missing.length})</div>
                <div className="flex flex-wrap gap-2">{atsResult.missing.map((k) => <span key={k} className="px-2 py-1 rounded-md bg-red-100 text-red-900 text-xs">{k}</span>)}</div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-4">AI Assist (beta)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Text</label>
              <textarea
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                rows={6}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder={aiMode === 'rewrite' ? 'Paste bullets to improve…' : 'Paste a paragraph to extract skills…'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mode</label>
              <select
                value={aiMode}
                onChange={(e) => setAiMode(e.target.value as any)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="rewrite">Rewrite bullets</option>
                <option value="extract_skills">Extract skills</option>
              </select>
              <button
                type="button"
                disabled={aiLoading || !aiText.trim()}
                onClick={async () => {
                  setAiLoading(true);
                  setAiResult(null);
                  try {
                    const resp: any = await api.post('/users/ai-assist', { mode: aiMode, text: aiText });
                    const data = resp?.data?.data;
                    if (!data) return;
                    if (aiMode === 'rewrite') setAiResult(data.suggestions as string);
                    else setAiResult((data.skills as string[]) || []);
                  } catch (e) {
                    console.error('AI assist failed', e);
                  } finally {
                    setAiLoading(false);
                  }
                }}
                className="mt-3 inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {aiLoading ? 'Working…' : 'Run Assist'}
              </button>
            </div>
          </div>
          {aiResult && (
            <div className="mt-2 text-sm">
              {aiMode === 'rewrite' ? (
                <pre className="whitespace-pre-wrap text-sm bg-muted/40 rounded-md p-3">{String(aiResult)}</pre>
              ) : (
                <div className="flex flex-wrap gap-2">{(aiResult as string[]).map((k) => <span key={k} className="px-2 py-1 rounded-md bg-sky-100 text-sky-900 text-xs">{k}</span>)}</div>
              )}
              <div className="text-xs text-muted-foreground mt-2">Feature flag: set AI_ASSIST_ENABLED=true to enable provider later.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


