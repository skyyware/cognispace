import type { KnowledgeSpace, SourceDocument } from "../types";

interface SpacePanelProps {
  spaces: KnowledgeSpace[];
  documents: SourceDocument[];
  selectedSpaceId: string;
  onSelect: (id: string) => void;
}

export function SpacePanel({ spaces, documents, selectedSpaceId, onSelect }: SpacePanelProps) {
  return (
    <section className="panel space-panel">
      <div className="panel-header">
        <div>
          <h2>Knowledge spaces</h2>
          <p>Scoped context and application scope.</p>
        </div>
      </div>
      <div className="space-list">
        {spaces.map((space) => (
          <button type="button" key={space.id} className={space.id === selectedSpaceId ? "selected" : ""} onClick={() => onSelect(space.id)}>
            <strong>{space.name}</strong>
            <span>{space.purpose}</span>
            <small>{space.documentIds.length} sources</small>
            <small>{space.allowedApplications.join(", ")}</small>
            <em>
              {space.documentIds
                .map((id) => documents.find((document) => document.id === id)?.title)
                .filter(Boolean)
                .join(" · ")}
            </em>
          </button>
        ))}
      </div>
    </section>
  );
}
