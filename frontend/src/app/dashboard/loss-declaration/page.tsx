"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

export default function LossDeclarationPage() {
  const { authFetch } = useAuth();
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "not_available" | "done">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      await authFetch("/loss-declarations", {
        method: "POST",
        body: JSON.stringify({ description })
      });
      setStatus("done");
    } catch (err) {
      if (err instanceof ApiError && err.status === 501) {
        setMessage("Loss declarations aren't live yet - the requests module is still being built.");
      } else {
        setStatus("error");
       setMessage(err instanceof ApiError ? `${err.message}${err.details ? ": " + JSON.stringify(err.details) : ""}`
            : "Something went wrong."
      );
      }
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-ink">Report a lost certificate</h1>
      <p className="mt-1 text-muted">Tell us what happened. This starts the reissue process.</p>

      <Card withFlagBar={false} className="mt-6">
        {status === "done" ? (
          <p className="text-ink">Your declaration has been submitted for review.</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink">What happened?</span>
              <textarea
                required
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-sm border border-border px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none"
                placeholder="Describe the circumstances (e.g. house fire, theft, misplaced during relocation)"
              />
            </label>

            {message && (
              <p className={`rounded-sm px-3 py-2 text-sm ${status === "not_available" ? "bg-gold-light text-ink" : "bg-danger-light text-danger"}`}>
                {message}
              </p>
            )}

            <Button type="submit" loading={status === "loading"} className="w-full">
              Submit declaration
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
