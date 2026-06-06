import { FormEvent, useState } from "react";
import { submitRegistration, type RegistrationPayload } from "../lib/api";

const initialPayload: RegistrationPayload = {
  name: "",
  email: "",
  company: "",
  useCase: "",
};

export function AccessRequestPanel() {
  const [payload, setPayload] = useState(initialPayload);
  const [state, setState] = useState<"idle" | "submitting" | "sent">("idle");
  const [error, setError] = useState("");

  function update(field: keyof RegistrationPayload, value: string) {
    setPayload((current) => ({ ...current, [field]: value }));
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setError("");

    try {
      await submitRegistration(payload);
      setState("sent");
    } catch (nextError) {
      setState("idle");
      setError(nextError instanceof Error ? nextError.message : "Access request could not be sent.");
    }
  }

  if (state === "sent") {
    return (
      <section className="panel access-panel" id="access">
        <div className="panel-header">
          <div>
            <h2>Access request received</h2>
            <p>I will follow up with the right review path for your team.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="panel access-panel" id="access">
      <div className="panel-header">
        <div>
          <h2>Request workspace access</h2>
          <p>Register a project context for a guided CogniSpace review.</p>
        </div>
      </div>
      <form className="access-form" onSubmit={submit}>
        <label>
          Name
          <input value={payload.name} onChange={(event) => update("name", event.target.value)} autoComplete="name" required />
        </label>
        <label>
          Work email
          <input type="email" value={payload.email} onChange={(event) => update("email", event.target.value)} autoComplete="email" required />
        </label>
        <label>
          Company / team
          <input value={payload.company} onChange={(event) => update("company", event.target.value)} autoComplete="organization" required />
        </label>
        <label>
          Knowledge-space context
          <textarea value={payload.useCase} onChange={(event) => update("useCase", event.target.value)} rows={4} required />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button type="submit" disabled={state === "submitting"}>
          {state === "submitting" ? "Sending..." : "Send access request"}
        </button>
      </form>
    </section>
  );
}
