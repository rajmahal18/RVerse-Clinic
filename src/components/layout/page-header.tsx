import { ReactNode } from "react";

export function PageHeader({ title, actions }: { title: string; eyebrow?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-2xl font-black tracking-tight md:text-4xl">{title}</h2>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
