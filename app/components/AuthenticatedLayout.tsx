"use client";

import React from "react";
import AppShell from "./AppShell";

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
}

const AuthenticatedLayout: React.FC<AuthenticatedLayoutProps> = ({
  children,
  showHeader = true,
}) => {
  if (!showHeader) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return <AppShell>{children}</AppShell>;
};

export default AuthenticatedLayout;
