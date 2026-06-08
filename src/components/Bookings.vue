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

        <!-- <div class="chart-wrapper wide-chart"> -->
        <!-- <h3>Bookings by Time Slot</h3> -->
        <!-- <div class="chart"> -->
        <!-- <Bar :data="bookingsByTimeChartData" :options="chartOptions" /> -->
        <!-- </div> -->
        <!-- </div> -->
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
        <div class="stat-card">
          <h4>Total Bookings</h4>
          <p class="count">{{ totalBookings }}</p>
        </div>

        <div class="stat-card">
          <h4>Total Lessons</h4>
          <p class="count">{{ totalLessons }}</p>
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
import { useBookingsStore, type FilterType } from "../stores/bookingsStore";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

interface Booking {
  className: string;
  weekday: string;
  time: string;
  averageAttendance: number;
  totalAttendance: number;
  totalLessons: number;
  date: Date;
}

interface ClassAverage {
  className: string;
  weekday: string;
  time: string;
  averageAttendance: number;
  totalAttendance: number;
  fileCount: number;
}

type FilterType = "all" | "kickboxing" | "bjj" | "athletik";

// --- Store ---
const store = useBookingsStore();

const selectedFiles = ref<FileList | null>(null);
const processing = ref(false);
const error = ref("");
const bookingData = computed(() => store.bookingData);
const selectedFilter = computed(() => store.selectedFilter);
const toggleFilter = (filter: FilterType) => store.setFilter(filter);

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

const isRelevantClass = (className: string): boolean => {
  const lower = className.toLowerCase();

  const excludedKeywords = [
    "test",
    "testing",
    "seminar",
    "workshop",
    "event",
    "oster",
    "ostermontag",
    "prüfung",
  ];

  if (excludedKeywords.some((keyword) => lower.includes(keyword))) {
    return false;
  }

  const includedKeywords = [
    "kickbox",
    "fitbox",
    "bjj",
    "athletik",
    "athletic",
    "kids",
    "competition",
    "sparring",
  ];

  return includedKeywords.some((keyword) => lower.includes(keyword));
};

const matchesFilter = (className: string): boolean => {
  if (selectedFilter.value === "all") return true;

  const lowerClassName = className.toLowerCase();

  if (selectedFilter.value === "kickboxing") {
    return (
      lowerClassName.includes("kickbox") ||
      lowerClassName.includes("fitbox") ||
      lowerClassName.includes("sparring")
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

const getClassType = (className: string): FilterType => {
  const lower = className.toLowerCase();
  if (
    lower.includes("kickbox") ||
    lower.includes("fitbox") ||
    lower.includes("sparring")
  )
    return "kickboxing";
  if (lower.includes("bjj") || lower.includes("brazilian")) return "bjj";
  if (lower.includes("athletik") || lower.includes("athletic"))
    return "athletik";
  return "all";
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
    0,
  );
  return Math.round((sum / filteredClassAverages.value.length) * 10) / 10;
});

const highestAverageBookings = computed(() => {
  if (filteredClassAverages.value.length === 0) return 0;
  const highest = Math.max(
    ...filteredClassAverages.value.map((cls) => cls.averageAttendance),
  );
  return highest;
});

const classAverages = computed(() => {
  if (bookingData.value.length === 0) return [];

  const classMap = new Map<string, ClassAverage & { names: Set<string> }>();

  bookingData.value
    .filter((booking) => matchesFilter(booking.className))
    .forEach((booking) => {
      const classType = getClassType(booking.className);
      const key = `${classType}-${booking.weekday}-${booking.time}`;

      if (!classMap.has(key)) {
        classMap.set(key, {
          className: booking.className,
          weekday: booking.weekday,
          time: booking.time,
          averageAttendance: 0,
          totalAttendance: booking.averageAttendance,
          fileCount: 1,
          names: new Set([booking.className]),
        });
      } else {
        const entry = classMap.get(key)!;
        entry.totalAttendance += booking.averageAttendance;
        entry.fileCount += 1;
        entry.names.add(booking.className);
      }
    });

  return Array.from(classMap.values())
    .map((entry) => ({
      className: Array.from(entry.names).join(" + "),
      weekday: entry.weekday,
      time: entry.time,
      totalAttendance: entry.totalAttendance,
      fileCount: entry.fileCount,
      averageAttendance:
        Math.round((entry.totalAttendance / entry.fileCount) * 10) / 10,
    }))
    .sort((a, b) => {
      const weekdayA = weekdayOrder[weekdayMap[a.weekday] || a.weekday] || 0;
      const weekdayB = weekdayOrder[weekdayMap[b.weekday] || b.weekday] || 0;

      if (weekdayA !== weekdayB) return weekdayA - weekdayB;
      if (a.time !== b.time) return a.time.localeCompare(b.time);
      return a.className.localeCompare(b.className);
    });
});

const bookingsByTimeChartData = computed(() => {
  const timeMap = new Map<
    string,
    {
      totalAttendance: number;
      count: number;
    }
  >();

  bookingData.value
    .filter((booking) => matchesFilter(booking.className))
    .forEach((booking) => {
      const time = booking.time;

      if (!timeMap.has(time)) {
        timeMap.set(time, {
          totalAttendance: 0,
          count: 0,
        });
      }

      const current = timeMap.get(time)!;

      current.totalAttendance += booking.averageAttendance;
      current.count += 1;
    });

  const sortedEntries = Array.from(timeMap.entries())
    .map(([time, data]) => ({
      time,
      average: Math.round((data.totalAttendance / data.count) * 10) / 10,
    }))
    .sort((a, b) => a.time.localeCompare(b.time));

  return {
    labels: sortedEntries.map((e) => e.time),
    datasets: [
      {
        label: "Average Bookings",
        data: sortedEntries.map((e) => e.average),
        backgroundColor: sortedEntries.map(
          (_, i) => colorPalette[i % colorPalette.length],
        ),
      },
    ],
  };
});

const totalBookings = computed(() => {
  return bookingData.value
    .filter((booking) => matchesFilter(booking.className))
    .reduce((sum, booking) => sum + booking.totalAttendance, 0);
});

const totalLessons = computed(() => {
  return bookingData.value
    .filter((booking) => matchesFilter(booking.className))
    .reduce((sum, booking) => sum + booking.totalLessons, 0);
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
          (_, index) => colorPalette[index % colorPalette.length],
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
    parseInt(match[1].substring(10, 12)), // minutes
  );
};

const processFiles = async () => {
  if (!selectedFiles.value?.length) return;
  processing.value = true;
  error.value = "";

  try {
    for (const file of Array.from(selectedFiles.value)) {
      const timestamp = extractTimestampFromFilename(file.name);
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(worksheet);

      const processedData = rawData
        .map((row: any) => ({
          className: row["Stunde"] || "",
          weekday: row["Tag"] || "",
          time: row["Zeit"] || "",
          averageAttendance: parseFloat(
            row["Durchschnittliche Teilnehmerzahl"] || "0",
          ),
          totalAttendance: parseFloat(row["Teilnehmerzahl total"] || "0"),
          totalLessons: parseFloat(row["Anzahl Lektionen Total"] || "0"),
          date: timestamp,
        }))
        .filter(
          (b) =>
            b.className !== "" &&
            b.weekday !== "" &&
            b.averageAttendance > 0 &&
            b.totalAttendance > 0 &&
            b.totalLessons > 0 &&
            isRelevantClass(b.className),
        );

      store.addBookings(processedData); // ← Store statt lokalem ref
    }
  } catch (err: any) {
    error.value = err.message;
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
