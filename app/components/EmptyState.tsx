import * as React from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-10 text-card-foreground shadow-sm backdrop-blur">
      <div className="mx-auto max-w-xl space-y-3 text-center">
        <div className="text-base font-semibold">{title}</div>
        {description ? (
          <div className="text-sm text-muted-foreground">{description}</div>
        ) : null}
        {action ? <div className="pt-2 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}
