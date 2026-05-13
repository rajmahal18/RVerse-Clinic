import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { Button } from "@/components/ui/button";

export default function InventoryPage() {
  return <AppShell><PageHeader title="Inventory" eyebrow="Home / Inventory" actions={<><input className="h-10 rounded-xl border bg-white px-4 text-sm" placeholder="Search item" /><Button><Plus className="h-4 w-4" /> Add Item</Button></>} /><InventoryTable /></AppShell>;
}
