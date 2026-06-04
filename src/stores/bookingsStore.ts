import { defineStore } from "pinia";
import { ref, computed } from "vue";

export interface Booking {
  className: string;
  weekday: string;
  time: string;
  averageAttendance: number;
  totalAttendance: number;
  totalLessons: number;
  date: Date;
}

export type FilterType = "all" | "kickboxing" | "bjj" | "athletik";

export const useBookingsStore = defineStore("bookings", () => {
  const bookingData = ref<Booking[]>([]);
  const selectedFilter = ref<FilterType>("all");

  const hasData = computed(() => bookingData.value.length > 0);

  function addBookings(newBookings: Booking[]) {
    bookingData.value.push(...newBookings);
    bookingData.value.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  function setFilter(filter: FilterType) {
    selectedFilter.value = filter;
  }

  function reset() {
    bookingData.value = [];
    selectedFilter.value = "all";
  }

  return {
    bookingData,
    selectedFilter,
    hasData,
    addBookings,
    setFilter,
    reset,
  };
});
