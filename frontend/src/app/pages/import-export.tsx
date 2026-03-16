import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { FileUpload } from "../components/file-upload";
import { DataTable } from "../components/data-table";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { api } from "../lib/api";
import { parseCSV, generateCSV, downloadCSV, TEMPLATES } from "../lib/csv-utils";
import {
  Download,
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Package,
  MapPin,
  Archive,
} from "lucide-react";
import { toast } from "sonner";

type ImportType = 'parts' | 'lots' | 'locations';

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export function ImportExport() {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [importType, setImportType] = useState<ImportType>('parts');
  const [exportType, setExportType] = useState<ImportType>('parts');

  // Import state
  const [csvData, setCsvData] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);

  // Export state
  const [exporting, setExporting] = useState(false);

  async function handleFileSelect(file: File) {
    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      
      if (parsed.rows.length === 0) {
        toast.error("CSV file is empty");
        return;
      }

      setCsvData(parsed);
      
      // Validate the data
      const errors = validateCSV(parsed, importType);
      setValidationErrors(errors);

      if (errors.length === 0) {
        toast.success(`Loaded ${parsed.rows.length} rows successfully`);
      } else {
        toast.warning(`Loaded with ${errors.length} validation errors`);
      }
    } catch (error) {
      console.error("Failed to parse CSV:", error);
      toast.error("Failed to parse CSV file");
    }
  }

  function validateCSV(data: any, type: ImportType): ValidationError[] {
    const errors: ValidationError[] = [];
    const requiredFields: Record<ImportType, string[]> = {
      parts: ['name'],
      lots: ['partName', 'quantity'],
      locations: ['name'],
    };

    const required = requiredFields[type];

    data.rows.forEach((row: any, index: number) => {
      required.forEach(field => {
        if (!row[field] || row[field].trim() === '') {
          errors.push({
            row: index + 2, // +2 for header and 0-index
            field,
            message: `${field} is required`,
          });
        }
      });

      // Type-specific validation
      if (type === 'lots' && row.quantity) {
        const qty = parseFloat(row.quantity);
        if (isNaN(qty) || qty <= 0) {
          errors.push({
            row: index + 2,
            field: 'quantity',
            message: 'Must be a positive number',
          });
        }
      }
    });

    return errors;
  }

  async function handleImport() {
    if (!csvData || validationErrors.length > 0) {
      toast.error("Please fix validation errors before importing");
      return;
    }

    try {
      setImporting(true);
      setImportProgress({ current: 0, total: csvData.rows.length });

      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (let i = 0; i < csvData.rows.length; i++) {
        const row = csvData.rows[i];
        setImportProgress({ current: i + 1, total: csvData.rows.length });

        try {
          if (importType === 'parts') {
            await api.createPart({
              name: row.name,
              category: row.category || null,
              manufacturer: row.manufacturer || null,
              mpn: row.mpn || null,
              tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()) : [],
              notes: row.notes || null,
            });
          } else if (importType === 'lots') {
            // First, find or create the part
            const partsResponse = await api.getParts({ search: row.partName, limit: 1 });
            let partId = partsResponse.data?.[0]?.id;

            if (!partId) {
              // Create part if it doesn't exist
              const newPart = await api.createPart({ name: row.partName });
              partId = newPart.data.id;
            }

            // Find location if specified
            let locationId = null;
            if (row.locationPath) {
              const locResponse = await api.getLocations({ q: row.locationPath, limit: 1 });
              locationId = locResponse.data?.[0]?.id || null;
            }

            await api.createLot({
              partId,
              quantity: parseFloat(row.quantity),
              unit: row.unit || 'pcs',
              locationId,
              source: {
                seller: row.seller || undefined,
                unitCost: row.unitCost ? parseFloat(row.unitCost) : undefined,
                currency: row.currency || 'USD',
              },
              notes: row.notes || null,
            });
          } else if (importType === 'locations') {
            // Find parent if specified
            let parentId = null;
            if (row.parentPath) {
              const parentResponse = await api.getLocations({ q: row.parentPath, limit: 1 });
              parentId = parentResponse.data?.[0]?.id || null;
            }

            await api.createLocation({
              name: row.name,
              parentId,
              description: row.description || null,
            });
          }

          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: ${error.message}`);
        }
      }

      setImportProgress(null);
      setImporting(false);

      if (results.failed === 0) {
        toast.success(`Successfully imported ${results.success} records`);
        setCsvData(null);
      } else {
        toast.warning(
          `Imported ${results.success} records, ${results.failed} failed. Check console for details.`
        );
        console.error("Import errors:", results.errors);
      }
    } catch (error) {
      console.error("Import failed:", error);
      toast.error("Import failed");
      setImporting(false);
      setImportProgress(null);
    }
  }

  async function handleExport() {
    try {
      setExporting(true);

      let headers: string[] = [];
      let rows: string[][] = [];

      if (exportType === 'parts') {
        const response = await api.getParts({ limit: 10000 });
        const parts = response.data || [];

        headers = ['ID', 'Name', 'Category', 'Manufacturer', 'MPN', 'Tags', 'Notes', 'Created'];
        rows = parts.map((part: any) => [
          part.id,
          part.name,
          part.category || '',
          part.manufacturer || '',
          part.mpn || '',
          (part.tags || []).join(','),
          part.notes || '',
          new Date(part.createdAt).toLocaleDateString(),
        ]);

        toast.success(`Exported ${parts.length} parts`);
      } else if (exportType === 'lots') {
        const response = await api.getLots({ limit: 10000 });
        const lots = response.data || [];

        headers = ['ID', 'Part', 'Quantity', 'Unit', 'Status', 'Location', 'Seller', 'Cost', 'Created'];
        rows = lots.map((lot: any) => [
          lot.id,
          lot.part?.name || '',
          lot.quantity.toString(),
          lot.unit || '',
          lot.status,
          lot.location?.path || '',
          lot.source?.seller || '',
          lot.source?.unitCost ? `${lot.source.currency} ${lot.source.unitCost}` : '',
          new Date(lot.createdAt).toLocaleDateString(),
        ]);

        toast.success(`Exported ${lots.length} lots`);
      } else if (exportType === 'locations') {
        const response = await api.getLocations({ limit: 10000 });
        const locations = response.data || [];

        headers = ['ID', 'Name', 'Path', 'Description', 'Created'];
        rows = locations.map((loc: any) => [
          loc.id,
          loc.name,
          loc.path || '',
          loc.description || '',
          new Date(loc.createdAt).toLocaleDateString(),
        ]);

        toast.success(`Exported ${locations.length} locations`);
      }

      const csv = generateCSV(headers, rows);
      const timestamp = new Date().toISOString().split('T')[0];
      downloadCSV(`${exportType}_export_${timestamp}.csv`, csv);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }

  function downloadTemplate(type: ImportType) {
    const template = TEMPLATES[type];
    const csv = generateCSV(template.headers, template.example);
    downloadCSV(template.filename, csv);
    toast.success("Template downloaded");
  }

  const previewColumns = csvData ? csvData.headers.map((header: string) => ({
    key: header,
    label: header,
    render: (row: any) => (
      <span className="text-sm font-mono">{row[header]}</span>
    ),
  })) : [];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground mb-2 flex items-center gap-3">
          <Upload className="size-8 text-purple-500" />
          Import & Export
        </h1>
        <p className="text-muted-foreground">
          Bulk import data from CSV or export your inventory
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="mb-6">
          <TabsTrigger value="import">
            <Upload className="size-4 mr-2" />
            Import
          </TabsTrigger>
          <TabsTrigger value="export">
            <Download className="size-4 mr-2" />
            Export
          </TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Import from CSV</CardTitle>
              <CardDescription>
                Upload a CSV file to bulk import parts, lots, or locations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Import Type Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Import Type</label>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant={importType === 'parts' ? 'default' : 'outline'}
                    onClick={() => setImportType('parts')}
                    className="justify-start"
                  >
                    <Package className="size-4 mr-2" />
                    Parts
                  </Button>
                  <Button
                    variant={importType === 'lots' ? 'default' : 'outline'}
                    onClick={() => setImportType('lots')}
                    className="justify-start"
                  >
                    <Archive className="size-4 mr-2" />
                    Lots
                  </Button>
                  <Button
                    variant={importType === 'locations' ? 'default' : 'outline'}
                    onClick={() => setImportType('locations')}
                    className="justify-start"
                  >
                    <MapPin className="size-4 mr-2" />
                    Locations
                  </Button>
                </div>
              </div>

              {/* Template Download */}
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground mb-1">Download Template</h4>
                    <p className="text-sm text-muted-foreground">
                      Get a CSV template with example data for {importType}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadTemplate(importType)}
                  >
                    <Download className="size-4 mr-2" />
                    Template
                  </Button>
                </div>
              </div>

              {/* File Upload */}
              <FileUpload onFileSelect={handleFileSelect} disabled={importing} />

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <XCircle className="size-5 text-destructive mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-destructive mb-2">
                        {validationErrors.length} Validation Error{validationErrors.length !== 1 ? 's' : ''}
                      </h4>
                      <ul className="space-y-1 text-sm">
                        {validationErrors.slice(0, 5).map((error, i) => (
                          <li key={i} className="text-muted-foreground">
                            Row {error.row}, {error.field}: {error.message}
                          </li>
                        ))}
                        {validationErrors.length > 5 && (
                          <li className="text-muted-foreground font-medium">
                            +{validationErrors.length - 5} more errors
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Indicator */}
              {csvData && validationErrors.length === 0 && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="size-5 text-green-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-foreground mb-1">Ready to Import</h4>
                      <p className="text-sm text-muted-foreground">
                        {csvData.rows.length} record{csvData.rows.length !== 1 ? 's' : ''} validated successfully
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Import Progress */}
              {importProgress && (
                <div className="p-4 bg-secondary/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Importing...</span>
                    <span className="text-sm text-muted-foreground">
                      {importProgress.current} / {importProgress.total}
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${(importProgress.current / importProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {csvData && (
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCsvData(null);
                      setValidationErrors([]);
                    }}
                    disabled={importing}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={importing || validationErrors.length > 0}
                  >
                    {importing ? 'Importing...' : `Import ${csvData.rows.length} Records`}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Preview */}
          {csvData && csvData.rows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Data Preview</CardTitle>
                <CardDescription>
                  Showing first 10 rows
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={previewColumns}
                  data={csvData.rows.slice(0, 10)}
                  keyExtractor={(_, index) => index.toString()}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Export to CSV</CardTitle>
              <CardDescription>
                Download your inventory data as CSV files
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Export Type</label>
                <Select value={exportType} onValueChange={(v) => setExportType(v as ImportType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parts">
                      <div className="flex items-center gap-2">
                        <Package className="size-4" />
                        Parts Catalog
                      </div>
                    </SelectItem>
                    <SelectItem value="lots">
                      <div className="flex items-center gap-2">
                        <Archive className="size-4" />
                        Stock Lots
                      </div>
                    </SelectItem>
                    <SelectItem value="locations">
                      <div className="flex items-center gap-2">
                        <MapPin className="size-4" />
                        Locations
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-secondary/50 rounded-lg">
                <h4 className="font-medium mb-2">Export Details</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• All records will be exported to a single CSV file</li>
                  <li>• File includes all fields and metadata</li>
                  <li>• Compatible with spreadsheet applications</li>
                  <li>• Can be used for backup or analysis</li>
                </ul>
              </div>

              <Button onClick={handleExport} disabled={exporting} className="w-full">
                <Download className="size-4 mr-2" />
                {exporting ? 'Exporting...' : `Export ${exportType}`}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
