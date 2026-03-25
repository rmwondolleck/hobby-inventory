'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  { keys: ['g', 'i'], description: 'Go to Intake' },
  { keys: ['g', 'p'], description: 'Go to Parts' },
  { keys: ['g', 'l'], description: 'Go to Lots' },
  { keys: ['g', 'j'], description: 'Go to Projects' },
  { keys: ['g', 'm'], description: 'Go to Locations' },
  { keys: ['?'], description: 'Toggle keyboard shortcuts' },
  { keys: ['Esc'], description: 'Close modal' },
  { keys: ['⌘K', 'Ctrl+K'], description: 'Open command palette' },
];

export function KeyboardShortcutsModal({ open, onOpenChange }: KeyboardShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Speed up your workflow with these keyboard shortcuts.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-2 text-left font-medium text-muted-foreground">Shortcut</th>
                <th className="pb-2 text-left font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {shortcuts.map(({ keys, description }) => (
                <tr key={description} className="border-b border-border last:border-0">
                  <td className="py-2 pr-4">
                    <span className="flex items-center gap-1">
                      {keys.map((key, i) => (
                        <span key={key} className="flex items-center gap-1">
                          {i > 0 && <span className="text-muted-foreground">then</span>}
                          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="py-2 text-foreground">{description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
