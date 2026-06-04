import { defineStore } from "pinia";
import { ref, computed } from "vue";

export interface Invoice {
  rechnungsnummer: string;
  rechnungsstatus: string;
  total: number;
  betrag: number;
  teilzahlungErhalten: number;
  kaufdatum: Date | null;
  zahlbarBis: Date | null;
  zahlungErhalten: Date | null;
  abonnement: string;
}

export interface InvoiceSnapshot {
  timestamp: Date;
  invoices: Invoice[];
}

export const useFinanceStore = defineStore("finance", () => {
  const snapshots = ref<InvoiceSnapshot[]>([]);

  const hasData = computed(() => snapshots.value.length > 0);

  // Latest snapshot – used by existing single-snapshot charts
  const latestSnapshot = computed<InvoiceSnapshot | null>(() => {
    if (snapshots.value.length === 0) return null;
    return snapshots.value[snapshots.value.length - 1];
  });

  // Backwards-compatible flat invoice list (latest snapshot)
  const invoiceData = computed<Invoice[]>(() => {
    return latestSnapshot.value?.invoices ?? [];
  });

  function addSnapshots(newSnapshots: InvoiceSnapshot[]) {
    // Deduplicate by timestamp
    for (const snap of newSnapshots) {
      const exists = snapshots.value.some(
        (existing) => existing.timestamp.getTime() === snap.timestamp.getTime(),
      );
      if (!exists) {
        snapshots.value.push(snap);
      }
    }
    snapshots.value.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }

  function reset() {
    snapshots.value = [];
  }

  return {
    snapshots,
    latestSnapshot,
    invoiceData,
    hasData,
    addSnapshots,
    reset,
  };
});
