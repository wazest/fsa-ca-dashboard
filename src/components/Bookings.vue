<template>
  <div class="bookings">
    <header class="header">
      <div class="header-content">
        <h1>FSA BOOKINGS</h1>
      </div>
    </header>

    <main>
      <div class="upload-container">
        <h2>Upload Booking Excel Files</h2>
        <input
          type="file"
          multiple
          accept=".xlsx,.xls"
          @change="handleFileUpload"
          class="file-input"
        />
        <button
          @click="processFiles"
          :disabled="!selectedFiles?.length || processing"
          class="process-button"
        >
          {{ processing ? "Processing..." : "Process Files" }}
        </button>
        <div v-if="processing" class="progress">Processing files...</div>
        <div v-if="error" class="error">{{ error }}</div>
      </div>

      <div v-if="bookingData.length > 0" class="chart-container">
        <div class="filters">
          <div class="filter-title">Filter by Class Type:</div>
          <div class="filter-buttons">
            <button
              @click="toggleFilter('all')"
              :class="['filter-button', { active: selectedFilter === 'all' }]"
            >
              All Classes
            </button>
            <button
              @click="toggleFilter('kickboxing')"
              :class="[
                'filter-button',
                { active: selectedFilter === 'kickboxing' },
              ]"
            >
              Kickboxing
            </button>
            <button
              @click="toggleFilter('bjj')"
              :class="['filter-button', { active: selectedFilter === 'bjj' }]"
            >
              BJJ
            </button>
            <button
              @click="toggleFilter('athletik')"
              :class="[
                'filter-button',
                { active: selectedFilter === 'athletik' },
              ]"
            >
              Athletik
            </button>
          </div>
        </div>

        <div class="chart-wrapper wide-chart">
          <h3>Average Bookings by Class</h3>
          <div class="chart">
            <Bar :data="averageBookingsChartData" :options="chartOptions" />
          </div>
        </div>
      </div>

      <div v-if="bookingData.length > 0" class="stats-container">
        <div class="stat-card">
          <h4>Total Classes</h4>
          <p class="count">{{ totalClasses }}</p>
        </div>
        <div class="stat-card">
          <h4>Average Bookings Overall</h4>
          <p class="count">{{ overallAverageBookings }}</p>
        </div>
        <div class="stat-card">
          <h4>Highest Average</h4>
          <p class="count">{{ highestAverageBookings }}</p>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "vue-chartjs";
import * as XLSX from "xlsx";
import { format } from "date-fns";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface Booking {
  className: string;
  weekday: string;
  time: string;
  averageAttendance: number;
  date: Date;
}

interface ClassAverage {
  className: string;
  weekday: string;
  time: string;
  averageAttendance: number;
}

type FilterType = "all" | "kickboxing" | "bjj" | "athletik";

const selectedFiles = ref<FileList | null>(null);
const processing = ref(false);
const error = ref("");
const bookingData = ref<Booking[]>([]);
const selectedFilter = ref<FilterType>("all");

const colorPalette = [
  "#1a519b",
  "#3a71bb",
  "#5a91db",
  "#7ab1fb",
  "#999999",
  "#b3b3b3",
  "#cccccc",
];

// German to English weekday mapping
const weekdayMap: { [key: string]: string } = {
  Montag: "Monday",
  Dienstag: "Tuesday",
  Mittwoch: "Wednesday",
  Donnerstag: "Thursday",
  Freitag: "Friday",
  Samstag: "Saturday",
  Sonntag: "Sunday",
};

// Weekday order for sorting
const weekdayOrder: { [key: string]: number } = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
};

const isValidDate = (date: any): boolean => {
  return date instanceof Date && !isNaN(date.getTime());
};

const formatDate = (date: Date): string => {
  return format(date, "MMM d, yyyy");
};

const toggleFilter = (filter: FilterType) => {
  selectedFilter.value = filter;
};

const matchesFilter = (className: string): boolean => {
  if (selectedFilter.value === "all") return true;

  const lowerClassName = className.toLowerCase();

  if (selectedFilter.value === "kickboxing") {
    return (
      lowerClassName.includes("kickbox") || lowerClassName.includes("fitbox")
    );
  }

  if (selectedFilter.value === "bjj") {
    return (
      lowerClassName.includes("bjj") || lowerClassName.includes("brazilian")
    );
  }

  if (selectedFilter.value === "athletik") {
    return (
      lowerClassName.includes("athletik") || lowerClassName.includes("athletic")
    );
  }

  return false;
};

const filteredClassAverages = computed(() => {
  return classAverages.value.filter((cls) => matchesFilter(cls.className));
});

const totalClasses = computed(() => {
  return filteredClassAverages.value.length;
});

const overallAverageBookings = computed(() => {
  if (filteredClassAverages.value.length === 0) return 0;
  const sum = filteredClassAverages.value.reduce(
    (total, cls) => total + cls.averageAttendance,
    0
  );
  return Math.round((sum / filteredClassAverages.value.length) * 10) / 10;
});

const highestAverageBookings = computed(() => {
  if (filteredClassAverages.value.length === 0) return 0;
  const highest = Math.max(
    ...filteredClassAverages.value.map((cls) => cls.averageAttendance)
  );
  return highest;
});

const classAverages = computed(() => {
  if (bookingData.value.length === 0) return [];

  // Group by class name and weekday
  const classMap = new Map<string, ClassAverage>();

  bookingData.value.forEach((booking) => {
    const key = `${booking.weekday}-${booking.className}-${booking.time}`;

    if (!classMap.has(key)) {
      classMap.set(key, {
        className: booking.className,
        weekday: booking.weekday,
        time: booking.time,
        averageAttendance: booking.averageAttendance,
      });
    }
  });

  // Convert to array and sort by weekday and then by class name
  return Array.from(classMap.values()).sort((a, b) => {
    const weekdayA = weekdayOrder[weekdayMap[a.weekday] || a.weekday] || 0;
    const weekdayB = weekdayOrder[weekdayMap[b.weekday] || b.weekday] || 0;

    if (weekdayA !== weekdayB) {
      return weekdayA - weekdayB;
    }

    // If same weekday, sort by time
    if (a.time !== b.time) {
      return a.time.localeCompare(b.time);
    }

    // If same time, sort by class name
    return a.className.localeCompare(b.className);
  });
});

const averageBookingsChartData = computed(() => {
  const filtered = filteredClassAverages.value;

  const labels = filtered.map((cls) => {
    const weekday = weekdayMap[cls.weekday] || cls.weekday;
    return `${weekday.substring(0, 3)} ${cls.time} - ${cls.className}`;
  });

  const data = filtered.map((cls) => cls.averageAttendance);

  return {
    labels,
    datasets: [
      {
        label: "Average Bookings",
        data,
        backgroundColor: data.map(
          (_, index) => colorPalette[index % colorPalette.length]
        ),
        barPercentage: 0.8,
        categoryPercentage: 0.9,
      },
    ],
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: "y" as const,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          const value = context.parsed.x;
          return `Average Bookings: ${value}`;
        },
      },
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      ticks: {
        stepSize: 1,
      },
    },
    y: {
      grid: {
        display: false,
      },
    },
  },
};

const handleFileUpload = (event: Event) => {
  const input = event.target as HTMLInputElement;
  selectedFiles.value = input.files;
};

const extractTimestampFromFilename = (filename: string): Date => {
  const match = filename.match(/(\d{12})/);
  if (!match) throw new Error("Invalid filename format");
  return new Date(
    parseInt(match[1].substring(0, 4)), // year
    parseInt(match[1].substring(4, 6)) - 1, // month (0-based)
    parseInt(match[1].substring(6, 8)), // day
    parseInt(match[1].substring(8, 10)), // hours
    parseInt(match[1].substring(10, 12)) // minutes
  );
};

const processFiles = async () => {
  if (!selectedFiles.value?.length) return;

  processing.value = true;
  error.value = "";
  bookingData.value = [];

  try {
    for (const file of Array.from(selectedFiles.value)) {
      const timestamp = extractTimestampFromFilename(file.name);
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      const rawData = XLSX.utils.sheet_to_json(worksheet);

      const processedData = rawData
        .map((row: any) => {
          return {
            className: row["Stunde"] || "",
            weekday: row["Tag"] || "",
            time: row["Zeit"] || "",
            averageAttendance: parseFloat(
              row["Durchschnittliche Teilnehmerzahl"] || "0"
            ),
            date: timestamp,
          };
        })
        .filter(
          (booking): booking is Booking =>
            booking.className !== "" &&
            booking.weekday !== "" &&
            booking.averageAttendance > 0
        );

      bookingData.value.push(...processedData);
    }

    // Sort bookings by date
    bookingData.value.sort((a, b) => a.date.getTime() - b.date.getTime());
  } catch (err: any) {
    error.value = err.message;
    console.error("Error processing files:", err);
  } finally {
    processing.value = false;
    selectedFiles.value = null;
  }
};
</script>

<style scoped>
.bookings {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  margin-bottom: 30px;
  background: white;
  width: 100vw;
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
}

h1 {
  margin: 0;
  color: #333;
  font-family: "Chakra Petch", sans-serif;
  font-size: 2.5rem;
  text-transform: uppercase;
}

.upload-container {
  padding: 20px;
  border: 2px dashed #ccc;
  border-radius: 8px;
  text-align: center;
  margin-bottom: 20px;
  background: white;
}

.process-button {
  margin-top: 10px;
  padding: 8px 16px;
  background-color: #1a519b;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: "Bebas Neue", sans-serif;
  font-size: 16px;
}

.process-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.filters {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.filter-title {
  font-size: 1.2rem;
  margin-bottom: 10px;
  color: #1a519b;
  font-weight: bold;
}

.filter-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.filter-button {
  padding: 8px 16px;
  background-color: white;
  color: #1a519b;
  border: 2px solid #1a519b;
  border-radius: 4px;
  cursor: pointer;
  font-family: "Bebas Neue", sans-serif;
  font-size: 16px;
  transition: all 0.2s ease;
}

.filter-button:hover {
  background-color: #e6eeff;
}

.filter-button.active {
  background-color: #1a519b;
  color: white;
}

.chart-container {
  margin-bottom: 30px;
}

.chart-wrapper {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.wide-chart {
  width: 100%;
}

.chart-wrapper h3 {
  margin: 0 0 20px 0;
  color: #1a519b;
  text-align: center;
}

.chart {
  height: 800px;
  position: relative;
  margin: 0 auto;
}

.stats-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.stat-card h4 {
  margin: 0 0 10px 0;
  color: #1a519b;
  font-size: 1.2rem;
}

.stat-card .count {
  margin: 0;
  font-size: 2rem;
  font-weight: bold;
  color: #333;
}

.error {
  color: #ff4444;
  margin-top: 10px;
}

.progress {
  color: #1a519b;
  margin-top: 10px;
}

@media (max-width: 768px) {
  .chart-wrapper {
    padding: 15px;
  }

  .chart {
    height: 600px;
  }

  .filter-buttons {
    flex-direction: column;
    align-items: center;
  }

  .filter-button {
    width: 100%;
  }
}
</style>
