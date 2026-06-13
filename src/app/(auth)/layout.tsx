import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg-app auth-mesh p-4 sm:p-6">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/[0.04] rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-primary/[0.03] rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-sm animate-spring-up">
        {children}
      </div>
    </div>
  );
}
