import { useState } from "react";
import { Plus } from "lucide-react";
import type { FormEvent } from "react";
import type { CreateDocumentPayload, SourceDocument } from "../types";

interface DocumentPanelProps {
  documents: SourceDocument[];
  loading: boolean;
  onCreate: (payload: CreateDocumentPayload) => Promise<void>;
}

const defaultDraft: CreateDocumentPayload = {
  title: "Supplier recovery plan addendum",
  owner: "Supply Chain Operations",
  sensitivity: "internal",
  tags: ["supplier-risk", "recovery", "operations"],
  content: "Recovery-plan changes for critical suppliers require owner confirmation, cited source snippets and a manual review action before the answer is available to external applications."
};

export function DocumentPanel({ documents, loading, onCreate }: DocumentPanelProps) {
  const [draft, setDraft] = useState<CreateDocumentPayload>(defaultDraft);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onCreate({
      ...draft,
      tags: draft.tags.map((tag) => tag.trim()).filter(Boolean)
    });
    setDraft(defaultDraft);
  }

  return (
    <section className="panel source-panel" id="sources">
      <div className="panel-header">
        <div>
          <h2>Source registry</h2>
          <p>Documents connected to the selected space.</p>
        </div>
      </div>

      <form className="source-form" onSubmit={submit}>
        <div className="field-grid">
          <label>
            Title
            <input
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              required
            />
          </label>
          <label>
            Owner
            <input
              value={draft.owner}
              onChange={(event) => setDraft((current) => ({ ...current, owner: event.target.value }))}
              required
            />
          </label>
          <label>
            Sensitivity
            <select
              value={draft.sensitivity}
              onChange={(event) => setDraft((current) => ({ ...current, sensitivity: event.target.value }))}
            >
              <option value="internal">internal</option>
              <option value="restricted">restricted</option>
              <option value="confidential">confidential</option>
            </select>
          </label>
          <label>
            Tags
            <input
              value={draft.tags.join(", ")}
              onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value.split(",") }))}
              required
            />
          </label>
        </div>
        <label>
          Source excerpt
          <textarea
            value={draft.content}
            onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
            required
          />
        </label>
        <button type="submit" disabled={loading}>
          <Plus size={16} />
          {loading ? "Adding source..." : "Add source to space"}
        </button>
      </form>

      <div className="document-list">
        {documents.map((document) => (
          <article key={document.id}>
            <div>
              <strong>{document.title}</strong>
              <span>{document.owner} · {document.sensitivity}</span>
            </div>
            <p>{document.content}</p>
            <div className="tag-row">
              {document.tags.map((tag) => <small key={tag}>{tag}</small>)}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
