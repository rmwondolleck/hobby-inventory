import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface Location {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
}

interface LocationSelectProps {
  value: string | null;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
}

export function LocationSelect({
  value,
  onValueChange,
  placeholder = "Select location...",
}: LocationSelectProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLocations();
  }, []);

  async function loadLocations() {
    try {
      setLoading(true);
      const response = await api.getLocations({ limit: 500 });
      setLocations(response.data || []);
    } catch (error) {
      console.error("Failed to load locations:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Select value={value || undefined} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={loading ? "Loading..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {locations.map((location) => (
          <SelectItem key={location.id} value={location.id}>
            {location.path}
          </SelectItem>
        ))}
        {locations.length === 0 && !loading && (
          <div className="p-2 text-sm text-muted-foreground text-center">
            No locations found
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
