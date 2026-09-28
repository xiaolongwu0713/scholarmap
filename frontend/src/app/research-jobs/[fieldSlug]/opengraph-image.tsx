import { ImageResponse } from 'next/og';
import { getReadyFieldConfig } from '@/lib/seoFieldConfig';
import { fetchFieldWorldData } from '@/lib/seoFieldApi';
import { SITE_URL } from '@/lib/site';

// Share preview for a field and its country/city pages: name, headline numbers, top countries.
export const alt = 'LabScout map of the labs and researchers in this field';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 86400;

type Country = { country: string; scholar_count: number };

export default async function Image({ params }: { params: { fieldSlug: string } }) {
  const field = await getReadyFieldConfig(params.fieldSlug);
  const name = field?.name ?? 'Research field';

  let countries: Country[] = [];
  try {
    countries = ((await fetchFieldWorldData(params.fieldSlug)) as Country[])
      .slice()
      .sort((a, b) => b.scholar_count - a.scholar_count);
  } catch {
    // Backend unreachable: still render the field name
  }
  const total = countries.reduce((sum, c) => sum + c.scholar_count, 0);
  const top = countries.slice(0, 5);
  const max = top[0]?.scholar_count || 1;
  const host = SITE_URL.replace(/^https?:\/\//, '');
  // Keep long names ("Protein Design & Structure Prediction") on one line
  const titleSize = name.length > 26 ? 50 : 66;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '56px 72px',
          background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 55%, #f5f3ff 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: '#2563eb', display: 'flex' }} />
            <div style={{ fontSize: 34, fontWeight: 700, color: '#0f172a' }}>LabScout</div>
          </div>
          <div style={{ fontSize: 26, color: '#64748b' }}>Research field map</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 36 }}>
          <div style={{ fontSize: titleSize, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{name}</div>
          {total > 0 && (
            <div style={{ fontSize: 34, color: '#2563eb', marginTop: 16, fontWeight: 600 }}>
              {`${total.toLocaleString('en-US')} researchers · ${countries.length} countries`}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 28 }}>
          {top.map((c) => (
            <div key={c.country} style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ width: 240, fontSize: 24, color: '#334155', display: 'flex' }}>{c.country}</div>
              <div
                style={{
                  width: Math.max(12, Math.round((c.scholar_count / max) * 600)),
                  height: 22,
                  borderRadius: 11,
                  background: '#3b82f6',
                  display: 'flex',
                }}
              />
              <div style={{ fontSize: 22, color: '#64748b', display: 'flex' }}>
                {c.scholar_count.toLocaleString('en-US')}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', marginTop: 'auto', paddingTop: 16, fontSize: 24, color: '#64748b' }}>
          {`${host}/research-jobs/${params.fieldSlug}`}
        </div>
      </div>
    ),
    size
  );
}
