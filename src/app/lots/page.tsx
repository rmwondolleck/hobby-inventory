'use client';

import { useEffect, useState } from 'react';

interface LotData {
  id: string;
  quantity: number | null;
  quantityMode: string;
  qualitativeStatus: string | null;
  unit: string | null;
  status: string;
  part: { id: string; name: string; category: string | null };
  location: { id: string; name: string; path: string } | null;
}

export default function LotsPage() {
  const [lots, setLots] = useState<LotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/lots?limit=500')
      .then((r) => r.json())
      .then((data) => {
        setLots(data.data ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load lots');
        setLoading(false);
      });
  }, []);

  const openPrintLabel = (ids: string[], size = 'medium') => {
    window.open(
      `/print/labels?type=lot&ids=${encodeURIComponent(ids.join(','))}&size=${encodeURIComponent(size)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  if (loading) {
    return <div style={{ padding: 32, color: '#9ca3af' }}>Loading lots…</div>;
  }
  if (error) {
    return <div style={{ padding: 32, color: '#dc2626' }}>{error}</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Lots</h1>
        <button
          onClick={() => openPrintLabel(lots.map((l) => l.id))}
          disabled={lots.length === 0}
          style={{
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '8px 16px',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            opacity: lots.length === 0 ? 0.5 : 1,
          }}
        >
          🖨️ Print All Labels
        </button>
      </div>

      {lots.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#9ca3af', padding: '48px 0' }}>
          No lots found.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                <th style={{ border: '1px solid #e5e7eb', padding: '8px 12px', fontWeight: 600 }}>Part</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '8px 12px', fontWeight: 600 }}>Quantity</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '8px 12px', fontWeight: 600 }}>Status</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '8px 12px', fontWeight: 600 }}>Location</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '8px 12px', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {lots.map((lot) => {
                const qtyDisplay =
                  lot.quantityMode === 'qualitative'
                    ? (lot.qualitativeStatus ?? 'unknown')
                    : `${lot.quantity ?? '?'}${lot.unit ? ` ${lot.unit}` : ''}`;

                return (
                  <tr key={lot.id}>
                    <td style={{ border: '1px solid #e5e7eb', padding: '8px 12px', fontWeight: 500 }}>
                      {lot.part.name}
                    </td>
                    <td style={{ border: '1px solid #e5e7eb', padding: '8px 12px' }}>
                      {qtyDisplay}
                    </td>
                    <td style={{ border: '1px solid #e5e7eb', padding: '8px 12px' }}>
                      <span style={{ background: '#f3f4f6', borderRadius: 4, padding: '2px 6px', fontSize: 12 }}>
                        {lot.status}
                      </span>
                    </td>
                    <td style={{ border: '1px solid #e5e7eb', padding: '8px 12px', color: '#6b7280', fontSize: 12 }}>
                      {lot.location?.path ?? '—'}
                    </td>
                    <td style={{ border: '1px solid #e5e7eb', padding: '8px 12px' }}>
                      <button
                        onClick={() => openPrintLabel([lot.id])}
                        title="Print label for this lot"
                        style={{ fontSize: 12, background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, padding: '3px 8px', cursor: 'pointer' }}
                      >
                        🏷️ Label
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
