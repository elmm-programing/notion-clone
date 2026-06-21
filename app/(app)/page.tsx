export default function DashboardPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <h1 className="text-2xl font-semibold">Your workspace</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Select a page from the sidebar, or create a new one to start writing.
      </p>
    </div>
  );
}
