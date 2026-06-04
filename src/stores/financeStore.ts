import { defineStore } from "pinia";
import { ref, computed } from "vue";

export interface Invoice {
  rechnungsstatus: string;
  total: number;
  zahlbarBis: Date | null;
}

export const useFinanceStore = defineStore("finance", () => {
  const invoiceData = ref<Invoice[]>([]);

  const hasData = computed(() => invoiceData.value.length > 0);

  function addInvoices(newInvoices: Invoice[]) {
    invoiceData.value.push(...newInvoices);
  }

  function reset() {
    invoiceData.value = [];
  }

  return {
    invoiceData,
    hasData,
    addInvoices,
    reset,
  };
});
