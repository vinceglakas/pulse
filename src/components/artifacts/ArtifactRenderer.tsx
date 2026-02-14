'use client';

import { Artifact, ArtifactRow } from '@/lib/artifacts';
import ArtifactTable from './ArtifactTable';
import ArtifactKanban from './ArtifactKanban';
import ArtifactList from './ArtifactList';
import ArtifactDocument from './ArtifactDocument';

const TYPE_LABELS: Record<string, { label: string; background: string; color: string }> = {
  table: { label: 'Table', background: 'rgba(96,165,250,0.15)', color: '#60a5fa' },
  kanban: { label: 'Board', background: 'rgba(167,139,250,0.15)', color: '#a78bfa' },
  list: { label: 'List', background: 'rgba(52,211,153,0.15)', color: '#34d399' },
  document: { label: 'Document', background: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
  chart: { label: 'Chart', background: 'rgba(251,113,133,0.15)', color: '#fb7185' },
};

interface Props {
  artifact: Artifact;
  onUpdateRows: (rows: ArtifactRow[]) => void;
  onUpdateContent: (content: string) => void;
  onDelete: () => void;
}

export default function ArtifactRenderer({ artifact, onUpdateRows, onUpdateContent, onDelete }: Props) {
  const typeInfo = TYPE_LABELS[artifact.type] || TYPE_LABELS.table;

  const renderBody = () => {
    switch (artifact.type) {
      case 'table':
        return <ArtifactTable artifact={artifact} onUpdate={onUpdateRows} />;
      case 'kanban':
        return <ArtifactKanban artifact={artifact} onUpdate={onUpdateRows} />;
      case 'list':
        return <ArtifactList artifact={artifact} onUpdate={onUpdateRows} />;
      case 'document':
        return <ArtifactDocument content={artifact.content || ''} onUpdate={onUpdateContent} />;
      default:
        return <div className="text-sm p-8 text-center" style={{ color: '#8b8b9e' }}>Unsupported artifact type: {artifact.type}</div>;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {artifact.icon && <span className="text-2xl">{artifact.icon}</span>}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold" style={{ color: '#f0f0f5' }}>{artifact.name}</h2>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: typeInfo.background, color: typeInfo.color }}>{typeInfo.label}</span>
            </div>
            {artifact.description && <p className="text-sm mt-0.5" style={{ color: '#8b8b9e' }}>{artifact.description}</p>}
          </div>
        </div>
        <button
          onClick={onDelete}
          className="text-sm px-3 py-1.5 rounded-lg transition-colors"
          style={{ color: '#6b6b80' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#6b6b80'; e.currentTarget.style.background = 'transparent'; }}
        >
          Delete
        </button>
      </div>

      {/* Body */}
      {renderBody()}
    </div>
  );
}
