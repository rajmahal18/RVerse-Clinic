"use client";
import { FormFeedback } from "@/components/ui/form-feedback";


import { useState } from "react";
import { useFeedbackRouter as useRouter } from "@/components/navigation/use-feedback-router";
import { Pencil } from "lucide-react";
import { correctSurveyAnswerAction } from "@/app/actions/survey-corrections";
import { CsrfField } from "@/components/security/csrf-field";
import { ccQuestions, scale } from "@/lib/survey-questions";

export function SurveyAnswerCorrection({
  surveyId,
  question,
  answer,
  onSaved,
}: {
  surveyId: string;
  question: string;
  answer: string;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const options = ccQuestions.find(([key]) => key === question)?.[2] ?? scale;
  return (
    <div className="w-full min-w-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 py-1 text-xs font-semibold text-primary"
      >
        <Pencil className="h-3 w-3" />
        Correct answer
      </button>
      {open ? (
        <form
          className="mt-2 grid min-w-0 gap-2 border-l-2 border-primary/20 pl-3"
          onSubmit={() => setPending(true)}
          action={async (data) => {
            setPending(true);
            setError("");
            try {
              const result = await correctSurveyAnswerAction(data);
              if (!result.ok) {
                setError(result.message);
                return;
              }
              router.refresh();
              onSaved();
            } catch {
              setError("Unable to save. Please try again.");
            } finally {
              setPending(false);
            }
          }}
        >
      <FormFeedback />
          <CsrfField />
          <input type="hidden" name="surveyId" value={surveyId} />
          <input type="hidden" name="question" value={question} />
          <input type="hidden" name="previousAnswer" value={answer} />
          <label className="grid min-w-0 gap-1 text-xs font-semibold">
            Correct answer
            <select
              name="answer"
              defaultValue={options.some((option) => option === answer) ? answer : ""}
              required
              className="w-full min-w-0 rounded-md border bg-white p-2 text-sm font-normal"
            >
              {!options.some((option) => option === answer) ? <option value="" disabled>Current answer: {answer}</option> : null}
              {options.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-xs font-semibold">
            Reason for correction
            <textarea
              name="reason"
              required
              maxLength={1000}
              rows={2}
              className="w-full min-w-0 rounded-md border p-2 text-sm font-normal"
            />
          </label>
          <p className="text-xs text-slate-500">
            The previous answer, new answer, reason, administrator, and time
            will be recorded in Activity Logs.
          </p>
          {error ? (
            <p role="alert" className="text-xs text-red-700">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              disabled={pending}
              className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save correction"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setOpen(false)}
              className="rounded-md border px-3 py-2 text-xs"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
