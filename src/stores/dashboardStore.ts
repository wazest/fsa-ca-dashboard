import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { getYear } from "date-fns";

export interface Customer {
  id: string;
  subscription: string;
  validFrom: Date | null;
  validUntil: Date | null;
  pendingBookings: number;
  purchaseDate: Date | null;
  subscriptionStatus: string;
  customer: string;
  salutation: string;
  firstName: string;
  lastName: string;
  address: string;
  postalCode: string;
  country: string;
  mobile: string;
  phonePrivate: string;
  phoneWork: string;
  birthday: Date | null;
  email: string;
  language: string;
}

export interface DataSet {
  timestamp: Date;
  customers: Customer[];
}

export const useDashboardStore = defineStore("dashboard", () => {
  const datasets = ref<DataSet[]>([]);
  const selectedYears = ref<number[]>([]);
  const selectedPricing = ref<"2025" | "2026">("2026");
  const compareToPreviousYear = ref(false);
  const selectedTableFilter = ref("All");
  const selectedCancellationFilter = ref("All");

  const availableYears = computed(() => {
    if (datasets.value.length === 0) return [];
    const years = new Set(datasets.value.map((ds) => getYear(ds.timestamp)));
    return Array.from(years).sort((a, b) => b - a);
  });

  const hasData = computed(() => datasets.value.length > 0);

  function addDatasets(newDatasets: DataSet[]) {
    // Deduplicate by timestamp
    for (const ds of newDatasets) {
      const exists = datasets.value.some(
        (existing) => existing.timestamp.getTime() === ds.timestamp.getTime(),
      );
      if (!exists) {
        datasets.value.push(ds);
      }
    }
    datasets.value.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }

  function initializeYearFilter() {
    if (availableYears.value.length > 0) {
      selectedYears.value = availableYears.value.slice(0, 2);
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
    datasets.value = [];
    selectedYears.value = [];
    selectedPricing.value = "2026";
    compareToPreviousYear.value = false;
    selectedTableFilter.value = "All";
    selectedCancellationFilter.value = "All";
  }

  return {
    datasets,
    selectedYears,
    selectedPricing,
    compareToPreviousYear,
    selectedTableFilter,
    selectedCancellationFilter,
    availableYears,
    hasData,
    addDatasets,
    initializeYearFilter,
    toggleYear,
    reset,
  };
});
