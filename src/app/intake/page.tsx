import { IntakeForm } from '@/features/intake/components/IntakeForm';

export const metadata = {
  title: 'Add to Inventory · Hobby Inventory',
};

export default function IntakePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Quick Add</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add parts and lots to your inventory in seconds.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <IntakeForm />
        </div>
      </div>
    </div>
  );
}
