"use client";
import { useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { addDiseaseAction, deleteDiseaseAction } from "@/app/actions/workflow";
import { CsrfField } from "@/components/security/csrf-field";
import { Button } from "@/components/ui/button";
export function DiseaseMasterList({
  diseases,
}: {
  diseases: { id: string; name: string; isActive: boolean }[];
}) {
  const [search, setSearch] = useState("");
  return (
    <section className="min-w-0 bg-white px-4 py-4">
      <div className="mb-4">
        <h2 className="font-bold text-slate-900">Disease master list</h2>
        <p className="mt-1 text-sm text-slate-500">
          Choices for diagnosis checkboxes. Removing an entry keeps existing
          patient diagnoses intact.
        </p>
      </div>
      <form
        action={addDiseaseAction}
        className="flex flex-col gap-2 border-b pb-4 sm:flex-row"
      >
        <CsrfField />
        <label className="grid min-w-0 flex-1 gap-1 text-sm font-semibold">
          Disease name
          <input
            name="name"
            required
            maxLength={180}
            className="h-10 w-full min-w-0 rounded-lg border px-3 font-normal"
            placeholder="Enter a disease from the client’s master list"
          />
        </label>
        <Button type="submit" className="sm:self-end">
          <Plus className="h-4 w-4" /> Add disease
        </Button>
      </form>
      <label className="relative mt-4 block">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <input
          aria-label="Search master list"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full min-w-0 rounded-lg border pl-9 pr-3 text-sm"
          placeholder="Search master list"
        />
      </label>
      <div className="mt-3 divide-y">
        {diseases
          .filter(
            (d) =>
              d.isActive && d.name.toLowerCase().includes(search.toLowerCase()),
          )
          .map((d) => (
            <div key={d.id} className="flex items-center gap-3 py-3">
              <span className="min-w-0 flex-1 break-words text-sm font-semibold">
                {d.name}
              </span>
              <form
                action={deleteDiseaseAction}
                onSubmit={(e) => {
                  if (
                    !window.confirm(
                      "Remove " +
                        d.name +
                        " from available diagnosis choices? Existing records will be kept.",
                    )
                  )
                    e.preventDefault();
                }}
              >
                <CsrfField />
                <input type="hidden" name="diseaseId" value={d.id} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  aria-label={"Delete " + d.name}
                  className="text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </form>
            </div>
          ))}
      </div>
      {!diseases.some((d) => d.isActive) ? (
        <p className="py-6 text-sm text-slate-500">
          No diseases added yet. Add the client’s master list here.
        </p>
      ) : null}
    </section>
  );
}
