import { defineStore } from "pinia";
import { ref, computed } from "vue";

export interface Invoice {
  rechnungsnummer: string;
  customerId: string;
  rechnungsstatus: string;
  total: number;
  betrag: number;
  mwst: number;
  teilzahlungErhalten: number;
  kaufdatum: Date | null;
  zahlbarBis: Date | null;
  gueltigBis: Date | null;
  zahlungErhalten: Date | null;
  abonnement: string;
  zahlungsart: string;
}

export interface InvoiceSnapshot {
  timestamp: Date;
  invoices: Invoice[];
}

export const useFinanceStore = defineStore("finance", () => {
  const snapshots = ref<InvoiceSnapshot[]>([]);
  const selectedYears = ref<number[]>([]);
  const accountingMode = ref(false); // false = Cash-Sicht, true = Buchhaltungs-Sicht

  const hasData = computed(() => snapshots.value.length > 0);

  const latestSnapshot = computed<InvoiceSnapshot | null>(() => {
    if (snapshots.value.length === 0) return null;
    return snapshots.value[snapshots.value.length - 1];
  });

  const mergedInvoices = computed<Invoice[]>(() => {
    const map = new Map<string, Invoice>();
    for (const snap of snapshots.value) {
      for (const inv of snap.invoices) {
        if (inv.rechnungsnummer) {
          map.set(inv.rechnungsnummer, inv);
        }
      }
    }
    return Array.from(map.values());
  });

  const availableYears = computed<number[]>(() => {
    const years = new Set<number>();
    for (const inv of mergedInvoices.value) {
      if (inv.kaufdatum) years.add(inv.kaufdatum.getFullYear());
    }
    return Array.from(years).sort((a, b) => b - a);
  });

  const filteredInvoices = computed<Invoice[]>(() => {
    if (selectedYears.value.length === 0) return mergedInvoices.value;
    return mergedInvoices.value.filter(
      (inv) =>
        inv.kaufdatum &&
        selectedYears.value.includes(inv.kaufdatum.getFullYear()),
    );
  });

  function addSnapshots(newSnapshots: InvoiceSnapshot[]) {
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
    initializeYearFilter();
  }

  function initializeYearFilter() {
    if (selectedYears.value.length === 0 && availableYears.value.length > 0) {
      selectedYears.value = [...availableYears.value];
    }
  }

  function toggleYear(year: number) {
    const index = selectedYears.value.indexOf(year);
    if (index === -1) {
      selectedYears.value.push(year);
    } else {
      selectedYears.value.splice(index, 1);
    }
  }

  function reset() {
    snapshots.value = [];
    selectedYears.value = [];
    accountingMode.value = false;
  }

  return {
    snapshots,
    latestSnapshot,
    mergedInvoices,
    filteredInvoices,
    availableYears,
    selectedYears,
    accountingMode,
    hasData,
    addSnapshots,
    toggleYear,
    initializeYearFilter,
    reset,
  };
});
