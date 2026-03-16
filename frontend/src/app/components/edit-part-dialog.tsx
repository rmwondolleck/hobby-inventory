import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

interface Part {
  id: string;
  name: string;
  category: string | null;
  manufacturer: string | null;
  mpn: string | null;
  tags: string[];
  notes: string | null;
  parameters: Record<string, any>;
}

interface EditPartDialogProps {
  part: Part | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<Part>) => Promise<void>;
}

interface FormData {
  name: string;
  category: string;
  manufacturer: string;
  mpn: string;
  tags: string;
  notes: string;
}

export function EditPartDialog({ part, open, onOpenChange, onSave }: EditPartDialogProps) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>();

  useEffect(() => {
    if (part && open) {
      reset({
        name: part.name,
        category: part.category || "",
        manufacturer: part.manufacturer || "",
        mpn: part.mpn || "",
        tags: part.tags.join(", "),
        notes: part.notes || "",
      });
    }
  }, [part, open, reset]);

  async function onSubmit(data: FormData) {
    try {
      await onSave({
        name: data.name,
        category: data.category || null,
        manufacturer: data.manufacturer || null,
        mpn: data.mpn || null,
        tags: data.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        notes: data.notes || null,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save part:", error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Part</DialogTitle>
          <DialogDescription>
            Update the catalog information for this part
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                {...register("name", { required: true })}
                placeholder="ESP32-WROOM-32"
              />
              {errors.name && (
                <p className="text-xs text-destructive">Name is required</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Input
                id="edit-category"
                {...register("category")}
                placeholder="Microcontrollers"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-manufacturer">Manufacturer</Label>
              <Input
                id="edit-manufacturer"
                {...register("manufacturer")}
                placeholder="Espressif"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-mpn">MPN</Label>
              <Input
                id="edit-mpn"
                {...register("mpn")}
                placeholder="ESP32-WROOM-32D"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-tags">Tags</Label>
            <Input
              id="edit-tags"
              {...register("tags")}
              placeholder="wifi, bluetooth, iot (comma-separated)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              {...register("notes")}
              placeholder="Additional information..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
