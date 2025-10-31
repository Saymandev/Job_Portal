'use client';

import api from '@/lib/api';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PublicResumePage() {
  const params = useParams();
  const versionId = (params as any)?.id as string;
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!versionId) return;
      try {
        const resp = await api.get(`/public/resume/${versionId}`, { responseType: 'text' as any });
        if (!mounted) return;
        setHtml((resp as any).data as string);
      } catch (e) {
        console.error('Failed to load public resume', e);
        setHtml('<p style="padding:16px;color:#b91c1c;">Failed to load resume.</p>');
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [versionId]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="min-h-screen bg-background">
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}


