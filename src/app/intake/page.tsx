import { IntakeForm } from '@/features/intake/components/IntakeForm';
import { PageHeader } from '@/components/PageHeader';

export const metadata = {
  title: 'Add to Inventory · Hobby Inventory',
};

export default function IntakePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-8">
        <PageHeader
          title="Quick Add"
          description="Add parts and lots to your inventory in seconds."
        />
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <IntakeForm />
        </div>
      </div>
    </div>
  );
}
