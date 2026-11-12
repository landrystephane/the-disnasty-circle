'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="btn btn-outline btn-sm"
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
    >
      🖨️ Imprimer / PDF
    </button>
  )
}