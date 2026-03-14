'use client';

import { useEffect, useState, useCallback } from 'react';

export type LabelSize = 'small' | 'medium' | 'large';

export interface LocationLabelData {
  id: string;
  name: string;
  path: string;
}

export interface LotLabelData {
  id: string;
  partName: string;
  quantity: number | null;
  quantityMode: string;
  qualitativeStatus: string | null;
  unit: string | null;
  locationPath?: string;
}

export type LabelItem =
  | { type: 'location'; data: LocationLabelData }
  | { type: 'lot'; data: LotLabelData };

const LABEL_DIMENSIONS: Record<LabelSize, {
  widthPx: number;
  heightPx: number;
  qrSize: number;
  nameFontSize: string;
  metaFontSize: string;
}> = {
  small: { widthPx: 96, heightPx: 48, qrSize: 40, nameFontSize: '6px', metaFontSize: '5px' },
  medium: { widthPx: 192, heightPx: 96, qrSize: 72, nameFontSize: '9px', metaFontSize: '7px' },
  large: { widthPx: 384, heightPx: 192, qrSize: 144, nameFontSize: '14px', metaFontSize: '11px' },
};

function QRImage({ url, size }: { url: string; size: number }) {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    import('qrcode').then((QRCode) => {
      QRCode.default.toDataURL(url, { width: size, margin: 1, errorCorrectionLevel: 'M' })
        .then((du) => { if (!cancelled) setDataUrl(du); });
    });
    return () => { cancelled = true; };
  }, [url, size]);

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-gray-100 flex items-center justify-center text-gray-400 text-xs"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={dataUrl} alt="QR code" width={size} height={size} style={{ display: 'block' }} />
  );
}

function LocationCard({
  label,
  size,
  appUrl,
}: {
  label: LocationLabelData;
  size: LabelSize;
  appUrl: string;
}) {
  const dims = LABEL_DIMENSIONS[size];
  const url = `${appUrl}/locations/${label.id}`;
  const shortId = label.id.slice(-6).toUpperCase();

  return (
    <div
      className="label-card inline-flex items-center overflow-hidden bg-white border border-black"
      style={{ width: dims.widthPx, height: dims.heightPx, flexShrink: 0 }}
    >
      <div style={{ flexShrink: 0, padding: 2 }}>
        <QRImage url={url} size={dims.qrSize} />
      </div>
      <div style={{ flex: 1, padding: '2px 4px', overflow: 'hidden', minWidth: 0 }}>
        <div style={{ fontSize: dims.metaFontSize, color: '#888', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          LOC-{shortId}
        </div>
        <div style={{ fontSize: dims.nameFontSize, fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
          {label.name}
        </div>
        {size !== 'small' && (
          <div style={{ fontSize: dims.metaFontSize, color: '#555', lineHeight: 1.3, wordBreak: 'break-all' }}>
            {label.path}
          </div>
        )}
      </div>
    </div>
  );
}

function LotCard({
  label,
  size,
  appUrl,
}: {
  label: LotLabelData;
  size: LabelSize;
  appUrl: string;
}) {
  const dims = LABEL_DIMENSIONS[size];
  const url = `${appUrl}/lots/${label.id}`;
  const shortId = label.id.slice(-6).toUpperCase();
  const qtyDisplay =
    label.quantityMode === 'qualitative'
      ? (label.qualitativeStatus ?? 'unknown')
      : `${label.quantity ?? '?'}${label.unit ? ` ${label.unit}` : ''}`;

  return (
    <div
      className="label-card inline-flex items-center overflow-hidden bg-white border border-black"
      style={{ width: dims.widthPx, height: dims.heightPx, flexShrink: 0 }}
    >
      <div style={{ flexShrink: 0, padding: 2 }}>
        <QRImage url={url} size={dims.qrSize} />
      </div>
      <div style={{ flex: 1, padding: '2px 4px', overflow: 'hidden', minWidth: 0 }}>
        <div style={{ fontSize: dims.metaFontSize, color: '#888', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          LOT-{shortId}
        </div>
        <div style={{ fontSize: dims.nameFontSize, fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
          {label.partName}
        </div>
        <div style={{ fontSize: dims.metaFontSize, color: '#333', lineHeight: 1.3 }}>
          Qty: {qtyDisplay}
        </div>
        {size !== 'small' && label.locationPath && (
          <div style={{ fontSize: dims.metaFontSize, color: '#777', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {label.locationPath}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LabelsView({
  labels,
  initialSize,
}: {
  labels: LabelItem[];
  initialSize: LabelSize;
}) {
  const [size, setSize] = useState<LabelSize>(initialSize);
  const [appUrl, setAppUrl] = useState('');

  useEffect(() => {
    setAppUrl(window.location.origin);
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div>
      {/* Controls bar — hidden when printing */}
      <div className="no-print" style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
          Print Labels ({labels.length})
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 14, color: '#555' }}>Size:</label>
          <select
            value={size}
            onChange={(e) => setSize(e.target.value as LabelSize)}
            style={{ fontSize: 13, border: '1px solid #d1d5db', borderRadius: 4, padding: '3px 8px' }}
          >
            <option value="small">Small (1″ × ½″)</option>
            <option value="medium">Medium (2″ × 1″)</option>
            <option value="large">Large (4″ × 2″)</option>
          </select>
        </div>
        <button
          onClick={handlePrint}
          style={{ marginLeft: 'auto', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
        >
          🖨️ Print
        </button>
      </div>

      {/* Label sheet */}
      <div className="label-sheet" style={{ padding: 16 }}>
        {labels.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: '48px 0', fontSize: 16 }}>
            No labels to print.
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {labels.map((label, i) =>
              label.type === 'location' ? (
                <LocationCard
                  key={`loc-${label.data.id}-${i}`}
                  label={label.data}
                  size={size}
                  appUrl={appUrl}
                />
              ) : (
                <LotCard
                  key={`lot-${label.data.id}-${i}`}
                  label={label.data}
                  size={size}
                  appUrl={appUrl}
                />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
