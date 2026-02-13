'use client';

import { Artifact, ArtifactRow } from '@/lib/artifacts';
import ArtifactTable from './ArtifactTable';
import ArtifactKanban from './ArtifactKanban';
import ArtifactList from './ArtifactList';
import ArtifactDocument from './ArtifactDocument';

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  table: { label: 'Table', color: 'bg-blue-100 text-blue-700' },
  kanban: { label: 'Board', color: 'bg-violet-100 text-violet-700' },
  list: { label: 'List', color: 'bg-emerald-100 text-emerald-700' },
  document: { label: 'Document', color: 'bg-amber-100 text-amber-700' },
  chart: { label: 'Chart', color: 'bg-rose-100 text-rose-700' },
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
        return <div className="text-sm text-gray-500 p-8 text-center">Unsupported artifact type: {artifact.type}</div>;
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
              <h2 className="text-xl font-bold text-gray-900">{artifact.name}</h2>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${typeInfo.color}`}>{typeInfo.label}</span>
            </div>
            {artifact.description && <p className="text-sm text-gray-500 mt-0.5">{artifact.description}</p>}
          </div>
        </div>
        <button
          onClick={onDelete}
          className="text-sm text-gray-400 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
        >
          Delete
        </button>
      </div>

      {/* Body */}
      {renderBody()}
    </div>
  );
}
