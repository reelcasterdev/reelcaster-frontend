"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Shown when a free user taps a locked forecast day (11–14). Routes to
 * pricing for the Boat Pro upgrade.
 */
export default function UpgradeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-rc-panel border-rc-rule text-rc-ink sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-rc-ink">
            Days 11–14 are Boat Pro
          </DialogTitle>
          <DialogDescription className="text-rc-ink-soft">
            The free forecast runs 10 days out. Upgrade to Boat Pro for the full
            14-day outlook, per-day best windows, and alerts.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 mt-2">
          <Link
            href="/pricing"
            className="flex-1 text-center px-4 py-2.5 rounded-lg bg-rc-brand hover:bg-rc-brand-hover text-white text-sm font-semibold transition-colors"
          >
            See Boat Pro
          </Link>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2.5 rounded-lg border border-rc-rule text-rc-ink text-sm font-medium hover:bg-rc-surface transition-colors"
          >
            Not now
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
