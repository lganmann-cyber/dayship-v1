'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { ProjectMode } from '@/lib/types';

interface ModalProps {
  mode: ProjectMode;
  onClose: () => void;
  onCreate: (data: { name: string; client: string; source: string; figmaToken: string; mode: ProjectMode }) => void;
}

export function Modal({ mode, onClose, onCreate }: ModalProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [source, setSource] = useState('');
  const [figmaToken, setFigmaToken] = useState('');
  const [nameErr, setNameErr] = useState(false);
  const [sourceErr, setSourceErr] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<HTMLInputElement>(null);

  const isFigma = mode === 'figma';
  const accentColor = isFigma ? 'var(--or)' : 'var(--tl)';
  const accentLight = isFigma ? 'var(--or-lt)' : 'var(--tl-lt)';
  const accentBdr = isFigma ? 'var(--or-bdr)' : 'var(--tl-bdr)';
  const accentDark = isFigma ? 'var(--or-d)' : 'var(--tl)';

  useEffect(() => {
    setTimeout(() => nameRef.current?.focus(), 80);
  }, []);

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const goNext = () => {
    if (!name.trim()) { setNameErr(true); nameRef.current?.focus(); return; }
    setNameErr(false);
    setStep(2);
    setTimeout(() => sourceRef.current?.focus(), 80);
  };

  const handleCreate = () => {
    if (!source.trim()) { setSourceErr(true); sourceRef.current?.focus(); return; }
    setSourceErr(false);
    onCreate({ name: name.trim(), client: client.trim(), source: source.trim(), figmaToken: figmaToken.trim(), mode });
    onClose();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#fff',
    border: '1px solid var(--border2)',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 13,
    fontFamily: "'Inter', sans-serif",
    color: 'var(--text)',
    outline: 'none',
    boxShadow: 'var(--sh)',
    transition: 'border-color .13s, box-shadow .13s',
  };

  const errStyle = (err: boolean): React.CSSProperties => err
    ? { ...inputStyle, borderColor: 'var(--rd)', boxShadow: '0 0 0 3px rgba(220,38,38,.09)' }
    : inputStyle;

  const focusStyle = isFigma
    ? `input:focus, textarea:focus { border-color: var(--or) !important; box-shadow: 0 0 0 3px rgba(249,115,22,.09) !important; }`
    : `input:focus, textarea:focus { border-color: var(--tl) !important; box-shadow: 0 0 0 3px rgba(15,118,110,.08) !important; }`;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(17,24,39,.3)',
        backdropFilter: 'blur(4px)',
        zIndex: 900,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <style>{focusStyle}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: 14,
          width: 460,
          maxWidth: '95vw',
          padding: 26,
          boxShadow: 'var(--sh3)',
          animation: 'modalIn 160ms ease forwards',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>New Project</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18, width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Mode banner */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '11px 14px', borderRadius: 8, marginBottom: 18,
          background: accentLight, border: `1px solid ${accentBdr}`,
          fontSize: 13, fontWeight: 600, color: accentDark,
        }}>
          <span>{isFigma ? '⬡' : '◎'}</span>
          <span>{isFigma ? 'Figma → WordPress' : 'URL → HTML/CSS'}</span>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 20, background: 'var(--bg3)' }}>
          {['① Name', '② Source', '③ Done'].map((label, i) => (
            <div key={i} style={{
              flex: 1, padding: '7px 10px', textAlign: 'center', fontSize: 11,
              fontWeight: i + 1 === step ? 600 : 500,
              borderRight: i < 2 ? '1px solid var(--border)' : 'none',
              color: i + 1 < step ? 'var(--gr)' : i + 1 === step ? 'var(--text)' : 'var(--muted)',
              background: i + 1 < step ? 'var(--gr-lt)' : i + 1 === step ? '#fff' : 'transparent',
            }}>
              {i + 1 < step ? label.replace('①', '✓').replace('②', '✓') : label}
            </div>
          ))}
        </div>

        {/* ── STEP 1: NAME ── */}
        {step === 1 && (
          <>
            <Field label="Project Name" required error={nameErr} errorMsg="Project name is required">
              <input
                ref={nameRef}
                value={name}
                onChange={e => { setName(e.target.value); setNameErr(false); }}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && goNext()}
                placeholder="e.g. Acme Corp Rebuild"
                style={errStyle(nameErr)}
              />
            </Field>
            <Field label="Client Name" optional>
              <input
                value={client}
                onChange={e => setClient(e.target.value)}
                placeholder="e.g. Acme Corp"
                style={inputStyle}
              />
            </Field>
            <Actions>
              <Btn onClick={onClose} outline>Cancel</Btn>
              <Btn onClick={goNext} color={accentColor}>Next →</Btn>
            </Actions>
          </>
        )}

        {/* ── STEP 2: SOURCE ── */}
        {step === 2 && (
          <>
            {isFigma ? (
              /* FIGMA mode */
              <>
                <Field label="Figma Project URL" required error={sourceErr} errorMsg="Figma URL is required">
                  <input
                    ref={sourceRef}
                    value={source}
                    onChange={e => { setSource(e.target.value); setSourceErr(false); }}
                    onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleCreate()}
                    placeholder="https://www.figma.com/design/abc123/My-Project"
                    style={errStyle(sourceErr)}
                  />
                </Field>
                <Field
                  label="Figma API Token"
                  optional
                  hint={<>Generate at <a href="https://www.figma.com/developers/api#access-tokens" target="_blank" rel="noreferrer" style={{ color: 'var(--or-d)', textDecoration: 'underline' }}>figma.com → Account → Personal tokens</a></>}
                >
                  <input
                    value={figmaToken}
                    onChange={e => setFigmaToken(e.target.value)}
                    placeholder="figd_xxxxxxxxxxxxxxxxxxxxxxxx"
                    type="password"
                    style={inputStyle}
                  />
                </Field>
                <div style={{ display: 'flex', gap: 9, borderRadius: 8, padding: '10px 13px', fontSize: 12, lineHeight: 1.6, marginBottom: 4, background: 'var(--or-lt)', border: '1px solid var(--or-bdr)', color: '#9a3412' }}>
                  ℹ️ Figma live API is stubbed in MVP — the token is stored locally and used to generate your complete WP theme files.
                </div>
              </>
            ) : (
              /* URL mode */
              <>
                <div style={{ display: 'flex', gap: 9, borderRadius: 8, padding: '10px 13px', fontSize: 12, lineHeight: 1.6, marginBottom: 16, background: 'var(--tl-lt)', border: '1px solid var(--tl-bdr)', color: '#134e4a' }}>
                  ◎ Paste any live URL — DayShip will generate a complete, clean HTML/CSS rebuild of the site.
                </div>
                <Field label="Target URL" required error={sourceErr} errorMsg="URL is required">
                  <input
                    ref={sourceRef}
                    value={source}
                    onChange={e => { setSource(e.target.value); setSourceErr(false); }}
                    onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleCreate()}
                    placeholder="https://example.com"
                    style={errStyle(sourceErr)}
                  />
                </Field>
              </>
            )}

            <Actions>
              <Btn onClick={() => setStep(1)} outline>← Back</Btn>
              <Btn onClick={handleCreate} color={accentColor}>Create &amp; Generate →</Btn>
            </Actions>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Small helpers ── */
function Field({ label, required, optional, hint, error, errorMsg, children }: {
  label: string; required?: boolean; optional?: boolean; hint?: React.ReactNode;
  error?: boolean; errorMsg?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 5 }}>
        {label}
        {required && <span style={{ color: 'var(--rd)', marginLeft: 2 }}>*</span>}
        {optional && <span style={{ fontSize: 11, color: 'var(--muted2)', fontWeight: 400, marginLeft: 4 }}>(optional)</span>}
      </label>
      {children}
      {error && errorMsg && <div style={{ fontSize: 11, color: 'var(--rd)', marginTop: 4 }}>{errorMsg}</div>}
      {hint && !error && <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 4, lineHeight: 1.5 }}>{hint}</div>}
    </div>
  );
}

function Actions({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
      {children}
    </div>
  );
}

function Btn({ children, onClick, outline, color }: {
  children: React.ReactNode; onClick: () => void; outline?: boolean; color?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        border: outline ? '1px solid var(--border2)' : 'none',
        background: outline ? '#fff' : (color || 'var(--or)'),
        color: outline ? 'var(--text2)' : '#fff',
        boxShadow: outline ? 'var(--sh)' : 'none',
      }}
    >
      {children}
    </button>
  );
}
