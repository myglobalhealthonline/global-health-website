import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";
import { ContactForm } from "@/components/forms/ContactForm";
import { Mail, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: `Contact us | ${SITE_NAME}`,
  description:
    "Get in touch with the Global Health team. We typically respond within 24 hours on working days.",
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr]">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Contact us</h1>
          <p className="mt-4 leading-relaxed text-slate-600">
            Have a question about your booking, a consultation, or our services?
            Fill in the form and our team will get back to you.
          </p>

          <div className="mt-8 space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 size-5 shrink-0 text-emerald-700" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-slate-800">Email</p>
                <a
                  href="mailto:info@myglobalhealth.online"
                  className="text-sm text-emerald-700 hover:underline"
                >
                  info@myglobalhealth.online
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 size-5 shrink-0 text-emerald-700" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-slate-800">Response time</p>
                <p className="text-sm text-slate-600">Within 24 hours on working days</p>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">Medical emergencies</p>
            <p className="mt-1">
              If you are experiencing a medical emergency, call your local emergency
              services (112 in the EU) — do not use this form.
            </p>
          </div>
        </div>

        <div>
          <ContactForm />
        </div>
      </div>
    </main>
  );
}
