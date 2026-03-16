import { useState } from "react";
import { useForm } from "react-hook-form";
import { api } from "../lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { PartAutocomplete } from "../components/part-autocomplete";
import { LocationSelect } from "../components/location-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import { Zap, Package, Plus } from "lucide-react";
import { useNavigate } from "react-router";

type IntakeMode = "existing" | "new";

interface IntakeFormData {
  // Part info (for new part)
  partName: string;
  category: string;
  manufacturer: string;
  mpn: string;
  partNotes: string;
  
  // Lot info
  quantity: number;
  unit: string;
  locationId: string | null;
  
  // Source info
  seller: string;
  sourceUrl: string;
  unitCost: number | null;
  currency: string;
  receivedAt: string;
  
  lotNotes: string;
}

export function Intake() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<IntakeMode>("existing");
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [selectedPart, setSelectedPart] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<IntakeFormData>({
    defaultValues: {
      quantity: 1,
      unit: "pcs",
      currency: "USD",
      receivedAt: new Date().toISOString().split("T")[0],
      locationId: null,
    },
  });

  const watchedLocationId = watch("locationId");

  async function onSubmit(data: IntakeFormData) {
    try {
      setSubmitting(true);

      let partId = selectedPartId;

      // Create new part if in "new" mode
      if (mode === "new") {
        const newPart = await api.createPart({
          name: data.partName,
          category: data.category || null,
          manufacturer: data.manufacturer || null,
          mpn: data.mpn || null,
          notes: data.partNotes || null,
        });
        partId = newPart.id;
        toast.success(`Created new part: ${data.partName}`);
      }

      if (!partId) {
        toast.error("Please select a part");
        return;
      }

      // Create lot
      const lotData = {
        partId,
        quantityMode: "exact",
        quantity: data.quantity,
        unit: data.unit || null,
        status: "in_stock",
        locationId: data.locationId || null,
        source: {
          seller: data.seller || null,
          url: data.sourceUrl || null,
          unitCost: data.unitCost || null,
          currency: data.currency || null,
        },
        receivedAt: data.receivedAt ? new Date(data.receivedAt).toISOString() : null,
        notes: data.lotNotes || null,
      };

      const newLot = await api.createLot(lotData);

      toast.success(
        mode === "new" 
          ? `Successfully added ${data.quantity} ${data.unit} of ${data.partName}!`
          : `Successfully added ${data.quantity} ${data.unit} of ${selectedPart?.name}!`
      );

      // Reset form
      reset();
      setSelectedPartId(null);
      setSelectedPart(null);

      // Navigate to the new lot
      navigate(`/lots/${newLot.id}`);
    } catch (error: any) {
      console.error("Failed to create intake:", error);
      toast.error(error.message || "Failed to add inventory");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground mb-2 flex items-center gap-3">
          <Zap className="size-8 text-amber-500" />
          Quick Intake
        </h1>
        <p className="text-muted-foreground">
          Fast-track new inventory into your system
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Stock</CardTitle>
          <CardDescription>
            Add a new lot to your inventory. Choose an existing part or create a new one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Mode Selection */}
            <Tabs value={mode} onValueChange={(v) => setMode(v as IntakeMode)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="existing">
                  <Package className="size-4 mr-2" />
                  Existing Part
                </TabsTrigger>
                <TabsTrigger value="new">
                  <Plus className="size-4 mr-2" />
                  New Part
                </TabsTrigger>
              </TabsList>

              {/* Existing Part */}
              <TabsContent value="existing" className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="part-select">Part *</Label>
                  <PartAutocomplete
                    value={selectedPartId}
                    onSelect={(part) => {
                      setSelectedPartId(part?.id || null);
                      setSelectedPart(part);
                    }}
                    placeholder="Search for a part..."
                  />
                  {selectedPart && (
                    <div className="mt-2 p-3 bg-secondary/50 rounded-lg border border-border">
                      <div className="text-sm font-medium">{selectedPart.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {[
                          selectedPart.category,
                          selectedPart.manufacturer,
                          selectedPart.mpn,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* New Part */}
              <TabsContent value="new" className="space-y-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="partName">Part Name *</Label>
                    <Input
                      id="partName"
                      {...register("partName", { required: mode === "new" })}
                      placeholder="ESP32-WROOM-32"
                    />
                    {errors.partName && (
                      <p className="text-xs text-destructive">Part name is required</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      {...register("category")}
                      placeholder="Microcontrollers"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manufacturer">Manufacturer</Label>
                    <Input
                      id="manufacturer"
                      {...register("manufacturer")}
                      placeholder="Espressif"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mpn">MPN</Label>
                    <Input
                      id="mpn"
                      {...register("mpn")}
                      placeholder="ESP32-WROOM-32D"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="partNotes">Part Notes</Label>
                  <Textarea
                    id="partNotes"
                    {...register("partNotes")}
                    placeholder="Additional information about this part..."
                    rows={2}
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Lot Information */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Lot Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    step="1"
                    {...register("quantity", { 
                      required: true,
                      min: 0,
                      valueAsNumber: true,
                    })}
                  />
                  {errors.quantity && (
                    <p className="text-xs text-destructive">Valid quantity required</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    {...register("unit")}
                    placeholder="pcs, m, kg, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="receivedAt">Received Date</Label>
                  <Input
                    id="receivedAt"
                    type="date"
                    {...register("receivedAt")}
                  />
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <Label htmlFor="locationId">Storage Location</Label>
                <LocationSelect
                  value={watchedLocationId}
                  onValueChange={(value) => setValue("locationId", value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lotNotes">Lot Notes</Label>
                <Textarea
                  id="lotNotes"
                  {...register("lotNotes")}
                  placeholder="Any notes specific to this batch..."
                  rows={2}
                />
              </div>
            </div>

            {/* Source Information */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Source Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="seller">Seller / Vendor</Label>
                  <Select onValueChange={(value) => setValue("seller", value)}>
                    <SelectTrigger id="seller">
                      <SelectValue placeholder="Select or type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DigiKey">DigiKey</SelectItem>
                      <SelectItem value="Mouser">Mouser</SelectItem>
                      <SelectItem value="LCSC">LCSC</SelectItem>
                      <SelectItem value="Amazon">Amazon</SelectItem>
                      <SelectItem value="AliExpress">AliExpress</SelectItem>
                      <SelectItem value="eBay">eBay</SelectItem>
                      <SelectItem value="Local">Local</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sourceUrl">Product URL</Label>
                  <Input
                    id="sourceUrl"
                    type="url"
                    {...register("sourceUrl")}
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unitCost">Unit Cost</Label>
                  <Input
                    id="unitCost"
                    type="number"
                    min="0"
                    step="0.01"
                    {...register("unitCost", { valueAsNumber: true })}
                    placeholder="3.50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select 
                    defaultValue="USD"
                    onValueChange={(value) => setValue("currency", value)}
                  >
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                      <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                      <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={submitting || (mode === "existing" && !selectedPartId)}
                className="flex-1"
              >
                {submitting ? (
                  "Adding..."
                ) : (
                  <>
                    <Zap className="size-4 mr-2" />
                    Add to Inventory
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  reset();
                  setSelectedPartId(null);
                  setSelectedPart(null);
                }}
              >
                Clear
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
