"use client";
import { ccQuestions, sqdQuestions, scale } from "@/lib/survey-questions";
import { formatDateKey } from "@/lib/date-time";
import { AutosaveForm } from "@/components/patients/autosave-form";

import { useState } from "react";
import { createPortal } from "react-dom";
import { MessageSquareText, X } from "lucide-react";
import { submitSatisfactionSurveyAction } from "@/app/actions/workflow";
import { CsrfField } from "@/components/security/csrf-field";
import { Button } from "@/components/ui/button";

type SurveyValues = {
  id: string;
  clientType: string;
  customerType?: string;
  agencyName?: string;
  surveyDate: string;
  officeVisited: string;
  regionOfResidence: string;
  serviceAvailed: string;
  respondentSex: string;
  respondentAge: number | null;
  cc1: string;
  cc2: string;
  cc3: string;
  sqd0: string;
  sqd1: string;
  sqd2: string;
  sqd3: string;
  sqd4: string;
  sqd5: string;
  sqd6: string;
  sqd7: string;
  sqd8: string;
  suggestions: string;
  email: string;
};

export function SatisfactionSurveyModal({ patientId, visitId, serviceAvailed, agencyName = "", survey, disabled = false, disabledReason }: { patientId: string; visitId: string; serviceAvailed: string; agencyName?: string; survey: SurveyValues | null; disabled?: boolean; disabledReason?: string }) {
  const [open, setOpen] = useState(false);
  const submitted = Boolean(survey);
  const modal = open ? (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-3"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="csm-title"
        className="flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b bg-slate-50 px-4 py-3">
          <div>
            <h2 id="csm-title" className="font-black text-slate-900">
              Client Satisfaction Measurement Survey
            </h2>
            <p className="text-sm text-slate-500">
              One survey is saved for this appointment and may be updated before
              completion.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            aria-label="Close survey"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <AutosaveForm visitId={visitId}
          draftKey="survey"
          action={submitSatisfactionSurveyAction}
          className="min-h-0 space-y-5 overflow-y-auto p-4"
        >
          <CsrfField />
          <input type="hidden" name="patientId" value={patientId} />
          <input type="hidden" name="visitId" value={visitId} />
          <section className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold">
              Customer type
              <select name="customerType" defaultValue={survey?.customerType || ""} className="h-10 rounded-xl border px-3 font-normal">
                <option value="">Did not specify</option>
                <option value="Employee">Employee</option>
                <option value="Dependent">Dependent</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Patient agency
              <input name="agencyName" defaultValue={survey ? survey.agencyName || "" : agencyName} maxLength={180} className="h-10 rounded-xl border px-3 font-normal" />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Client type
              <select
                name="clientType"
                defaultValue={survey?.clientType || "Citizen"}
                className="h-10 rounded-xl border px-3 font-normal"
              >
                <option value="Citizen">Citizen</option>
                <option value="Business">Business</option>
                <option value="Government">
                  Government employee or another agency
                </option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Date
              <input
                name="surveyDate"
                type="date"
                required
                defaultValue={
                  survey?.surveyDate || formatDateKey(new Date())
                }
                className="h-10 rounded-xl border px-3 font-normal"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Sex
              <select
                name="respondentSex"
                defaultValue={survey?.respondentSex || ""}
                className="h-10 rounded-xl border px-3 font-normal"
              >
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Age
              <input
                name="respondentAge"
                type="number"
                min="0"
                max="130"
                defaultValue={survey?.respondentAge ?? ""}
                className="h-10 rounded-xl border px-3 font-normal"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Region of residence
              <input
                name="regionOfResidence"
                defaultValue={survey?.regionOfResidence}
                className="h-10 rounded-xl border px-3 font-normal"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Office visited / transacted with
              <input
                name="officeVisited"
                required
                defaultValue={survey?.officeVisited || "The Clinic"}
                className="h-10 rounded-xl border px-3 font-normal"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold sm:col-span-2">
              Service availed
              <input
                name="serviceAvailed"
                required
                defaultValue={survey?.serviceAvailed || serviceAvailed}
                className="h-10 rounded-xl border px-3 font-normal"
              />
            </label>
          </section>
          <section className="space-y-4">
            <h3 className="border-b pb-2 font-black text-slate-900">
              Citizen's Charter questions
            </h3>
            {ccQuestions.map(([name, question, options]) => (
              <fieldset key={name} className="grid gap-2">
                <legend className="text-sm font-semibold text-slate-800">
                  {name.toUpperCase()} {question}
                </legend>
                {options.map((option, index) => (
                  <label
                    key={option}
                    className="flex items-start gap-2 text-sm text-slate-700"
                  >
                    <input
                      type="radio"
                      name={name}
                      value={option}
                      defaultChecked={survey?.[name] === option}
                      required={index === 0}
                      className="mt-1"
                    />
                    {option}
                  </label>
                ))}
              </fieldset>
            ))}
          </section>
          <section className="space-y-3">
            <div>
              <h3 className="font-black text-slate-900">SQD0-SQD8</h3>
              <p className="text-sm text-slate-500">
                Select one answer for each statement.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[820px] w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="border bg-slate-50 px-2 py-2 text-left">
                      Statement
                    </th>
                    {scale.map((option) => (
                      <th
                        key={option}
                        className="border bg-slate-50 px-2 py-2 text-center"
                      >
                        {option}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sqdQuestions.map(([name, question]) => (
                    <tr key={name}>
                      <td className="border px-2 py-2 font-semibold">
                        {name.toUpperCase()}. {question}
                      </td>
                      {scale.map((option, index) => (
                        <td
                          key={option}
                          className="border px-2 py-2 text-center"
                        >
                          <input
                            type="radio"
                            name={name}
                            value={option}
                            defaultChecked={survey?.[name] === option}
                            required={index === 0}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="grid gap-3">
            <label className="grid gap-1 text-sm font-semibold">
              Suggestions on how we can further improve our services{" "}
              <span className="font-normal text-slate-500">(optional)</span>
              <textarea
                name="suggestions"
                defaultValue={survey?.suggestions}
                className="min-h-24 rounded-xl border px-3 py-2 font-normal"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Email address{" "}
              <span className="font-normal text-slate-500">(optional)</span>
              <input
                name="email"
                type="email"
                defaultValue={survey?.email}
                className="h-10 rounded-xl border px-3 font-normal"
              />
            </label>
          </section>
          <div className="sticky bottom-0 -mx-4 -mb-4 flex justify-end border-t bg-white px-4 py-3">
            <Button type="submit">Save CSM Survey</Button>
          </div>
        </AutosaveForm>
      </div>
    </div>
  ) : null;

  return (
    <>
      <Button
        type="button"
        variant={submitted ? "outline" : "default"}
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
      >
        <MessageSquareText className="h-4 w-4" />{" "}
        {submitted ? "Review CSM Survey" : "Complete CSM Survey"}
      </Button>
      {modal ? createPortal(modal, document.body) : null}
    </>
  );
}
