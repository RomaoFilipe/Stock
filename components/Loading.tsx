import React from "react";

export default function Loading() {
  return (
    <div className="flex flex-col justify-center items-center min-h-[50vh] gap-3">
      <p className="text-sm text-muted-foreground">A carregar...</p>
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted border-t-primary"></div>
    </div>
  );
}
