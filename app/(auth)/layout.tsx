export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight">シマシェア</h1>
          <p className="mt-2 text-text-secondary">離島の助け合いアプリ</p>
        </div>
        {children}
      </div>
    </div>
  );
}
