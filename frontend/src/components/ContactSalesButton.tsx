"use client";

import { useState } from "react";
import { CONTACT_EMAIL } from "@/lib/site";
import { trackConversion } from "@/lib/analytics";
import { sendContact } from "@/lib/api";

const EMPTY = { name: "", email: "", company: "", message: "", website: "" };

/** Opens the team contact form; a sent form is emailed to the team inbox and counted as an industry lead. */
export function ContactSalesButton({ source, className, children }: {
  source: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  const field = (key: keyof typeof EMPTY) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [key]: e.target.value }),
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      await sendContact({ ...form, source });
      setStatus("sent");
      trackConversion("industry_contact_submit", { source });
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error && err.message ? err.message : `Could not send. Please email ${CONTACT_EMAIL}.`);
    }
  }

  function close() {
    setOpen(false);
    if (status === "sent") {
      setForm(EMPTY);
      setStatus("idle");
    }
  }

  const input = "w-full rounded-lg border border-gray-300 px-3 py-2 font-sans text-gray-900 focus:border-blue-500 focus:outline-none";

  return (
    <>
      <button
        type="button"
        className={className}
        // Undo the global button look (gradient, 14px text) so callers' link-style classes apply
        style={{ backgroundImage: "none", fontSize: "inherit", lineHeight: "inherit" }}
        onClick={() => {
          setOpen(true);
          trackConversion("industry_contact_click", { source });
        }}
      >
        {children}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-title"
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div className="w-full max-w-lg rounded-xl bg-white p-6 text-left shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 id="contact-title" className="text-xl font-bold text-gray-900">Tell us what your team needs</h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                style={{ background: "transparent", border: "none", padding: 0, color: "#9ca3af", fontSize: 24, lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {status === "sent" ? (
              <div className="py-6 text-center">
                <p className="mb-2 text-lg font-semibold text-gray-900">Thanks, we got your message.</p>
                <p className="mb-6 text-gray-600">We will reply to {form.email} within one business day.</p>
                <button type="button" onClick={close} className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700">
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Name
                    <input required maxLength={120} autoComplete="name" className={`${input} mt-1`} {...field("name")} />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">
                    Work email
                    <input required type="email" maxLength={255} autoComplete="email" className={`${input} mt-1`} {...field("email")} />
                  </label>
                </div>
                <label className="block text-sm font-medium text-gray-700">
                  Company / team
                  <input maxLength={200} autoComplete="organization" className={`${input} mt-1`} {...field("company")} />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  What would you like mapped, and what for?
                  <textarea
                    required
                    rows={4}
                    maxLength={5000}
                    placeholder="e.g. CAR-T investigators in Europe for site selection"
                    className={`${input} mt-1`}
                    {...field("message")}
                  />
                </label>
                {/* Honeypot: hidden from people, filled in by bots */}
                <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" {...field("website")} />

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-gray-500">
                    Or email <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>
                  </p>
                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {status === "sending" ? "Sending…" : "Send"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
