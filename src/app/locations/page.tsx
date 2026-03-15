'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface LocationData {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  notes: string | null;
  children?: { id: string; name: string; path: string }[];
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/locations?withChildren=true&limit=500')
      .then((r) => r.json())
      .then((data) => {
        setLocations(data.data ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load locations');
        setLoading(false);
      });
  }, []);

  const openPrintLabel = (ids: string[], size = 'medium') => {
    window.open(
      `/print/labels?type=location&ids=${encodeURIComponent(ids.join(','))}&size=${encodeURIComponent(size)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  if (loading) {
    return <div style={{ padding: 32, color: '#9ca3af' }}>Loading locations…</div>;
  }
  if (error) {
    return <div style={{ padding: 32, color: '#dc2626' }}>{error}</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Locations</h1>
        <button
          onClick={() => openPrintLabel(locations.map((l) => l.id))}
          disabled={locations.length === 0}
          style={{
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '8px 16px',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            opacity: locations.length === 0 ? 0.5 : 1,
          }}
        >
          🖨️ Print All Labels
        </button>
      </div>

      {locations.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#9ca3af', padding: '48px 0' }}>
          No locations found.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                <th style={{ border: '1px solid #e5e7eb', padding: '8px 12px', fontWeight: 600 }}>Name</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '8px 12px', fontWeight: 600 }}>Path</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '8px 12px', fontWeight: 600 }}>Notes</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '8px 12px', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((location) => (
                <tr key={location.id} style={{ verticalAlign: 'middle' }}>
                  <td style={{ border: '1px solid #e5e7eb', padding: '8px 12px', fontWeight: 500 }}>
                    {location.name}
                  </td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '8px 12px', color: '#6b7280', fontFamily: 'monospace', fontSize: 12 }}>
                    {location.path}
                  </td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '8px 12px', color: '#6b7280' }}>
                    {location.notes ?? '—'}
                  </td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '8px 12px' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => openPrintLabel([location.id])}
                        title="Print label for this location"
                        style={{ fontSize: 12, background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, padding: '3px 8px', cursor: 'pointer' }}
                      >
                        🏷️ Label
                      </button>
                      {(location.children?.length ?? 0) > 0 && (
                        <button
                          onClick={() => openPrintLabel((location.children ?? []).map((c) => c.id))}
                          title="Print labels for all child locations"
                          style={{ fontSize: 12, background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, padding: '3px 8px', cursor: 'pointer' }}
                        >
                          🏷️ Children
                        </button>
                      )}
                      <Link
                        href={`/print/labels?type=lot&locationId=${encodeURIComponent(location.id)}&size=medium`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Print labels for all lots at this location"
                        style={{ fontSize: 12, background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
                      >
                        🏷️ Lots
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
