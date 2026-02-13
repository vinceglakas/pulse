export type ArtifactType = 'table' | 'kanban' | 'list' | 'document' | 'chart';

export interface ArtifactColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'url' | 'email' | 'phone' | 'currency' | 'badge';
  options?: string[];
  width?: string;
}

export interface ArtifactRow {
  id: string;
  [key: string]: any;
}

export interface Artifact {
  id: string;
  name: string;
  type: ArtifactType;
  icon?: string;
  description?: string;
  columns?: ArtifactColumn[];
  rows?: ArtifactRow[];
  groupBy?: string;
  content?: string;
  createdAt: string;
  updatedAt: string;
}

export function dbToArtifact(row: any): Artifact {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    icon: row.icon,
    description: row.description,
    columns: row.schema?.columns || [],
    rows: row.data || [],
    groupBy: row.group_by,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function artifactToDb(artifact: Partial<Artifact>) {
  const db: any = {};
  if (artifact.name !== undefined) db.name = artifact.name;
  if (artifact.type !== undefined) db.type = artifact.type;
  if (artifact.icon !== undefined) db.icon = artifact.icon;
  if (artifact.description !== undefined) db.description = artifact.description;
  if (artifact.columns !== undefined) db.schema = { columns: artifact.columns };
  if (artifact.rows !== undefined) db.data = artifact.rows;
  if (artifact.groupBy !== undefined) db.group_by = artifact.groupBy;
  if (artifact.content !== undefined) db.content = artifact.content;
  db.updated_at = new Date().toISOString();
  return db;
}

const BADGE_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-gray-100 text-gray-600',
  lead: 'bg-blue-100 text-blue-700',
  customer: 'bg-indigo-100 text-indigo-700',
  churned: 'bg-red-100 text-red-700',
  prospect: 'bg-amber-100 text-amber-700',
  won: 'bg-emerald-100 text-emerald-700',
  lost: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700',
  'in progress': 'bg-blue-100 text-blue-700',
  done: 'bg-emerald-100 text-emerald-700',
  todo: 'bg-gray-100 text-gray-600',
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
};

export function getBadgeColor(value: string): string {
  return BADGE_COLORS[value?.toLowerCase()] || 'bg-indigo-100 text-indigo-700';
}

export function formatCurrency(value: any): string {
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return String(value ?? '');
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}
