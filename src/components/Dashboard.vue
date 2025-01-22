<template>
  <div class="dashboard">
    <header class="header">
      <div class="header-content">
        <h1>FSA CUSTOMER DATA DASHBOARD</h1>
      </div>
    </header>

    <main>
      <div class="upload-container">
        <h2>Upload Excel Files</h2>
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

      <div class="dashboard-content">
        <div class="filter-container">
          <div class="year-filter">
            <button
              v-for="year in availableYears"
              :key="year"
              @click="toggleYear(year)"
              :class="[
                'filter-button',
                { active: selectedYears.includes(year) },
              ]"
            >
              {{ year }}
            </button>
          </div>
        </div>

        <div class="stats-container">
          <div class="stat-card">
            <h3>Total Customers</h3>
            <p>{{ totalCustomers }}</p>
          </div>
        </div>

        <div v-if="filteredDatasets.length > 0" class="charts-container">
          <div class="chart">
            <h3>Subscription Distribution (Pie)</h3>
            <Pie :data="subscriptionChartData" :options="chartOptions" />
          </div>
          <div class="chart">
            <h3>Subscription Distribution (Bar)</h3>
            <Bar :data="subscriptionBarData" :options="barChartOptions" />
          </div>
          <div class="chart wide-chart">
            <h3>Subscription Growth Over Time</h3>
            <Line :data="subscriptionGrowthData" :options="lineChartOptions" />
          </div>
          <div class="chart wide-chart">
            <h3>Special Training Packages</h3>
            <Line :data="specialTrainingData" :options="lineChartOptions" />
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  LineElement,
  PointElement,
} from "chart.js";
import { Pie, Bar, Line } from "vue-chartjs";
import { parse, subYears, format, getYear } from "date-fns";
import * as XLSX from "xlsx";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title
);

interface Customer {
  id: string;
  subscription: string;
  validFrom: Date;
  validUntil: Date;
  pendingBookings: number;
  purchaseDate: Date;
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
  birthday: Date;
  email: string;
  language: string;
}

interface DataSet {
  timestamp: Date;
  customers: Customer[];
}

const datasets = ref<DataSet[]>([]);
const processing = ref(false);
const error = ref("");
const selectedFiles = ref<FileList | null>(null);
const selectedYears = ref<number[]>([]);

const availableYears = computed(() => {
  if (datasets.value.length === 0) return [];
  const years = new Set(datasets.value.map((ds) => getYear(ds.timestamp)));
  return Array.from(years).sort((a, b) => b - a); // Sort descending
});

const initializeYearFilter = () => {
  if (availableYears.value.length > 0) {
    // Select the last two years by default
    selectedYears.value = availableYears.value.slice(0, 2);
  }
};

const toggleYear = (year: number) => {
  const index = selectedYears.value.indexOf(year);
  if (index === -1) {
    selectedYears.value.push(year);
  } else {
    selectedYears.value.splice(index, 1);
  }
};

const filteredDatasets = computed(() => {
  if (selectedYears.value.length === 0) return datasets.value;
  return datasets.value.filter((ds) =>
    selectedYears.value.includes(getYear(ds.timestamp))
  );
});

const subscriptionCategories = [
  "Striking",
  "Grappling",
  "MMA",
  "Fit & Athletik",
  "Pro",
  "Mitarbeiter",
  "Kinder",
];

const colorPalette = [
  "#1a519b", // Main blue
  "#999999", // Main grey
  "#3a71bb", // Lighter blue 1
  "#b3b3b3", // Lighter grey 1
  "#5a91db", // Lighter blue 2
  "#cccccc", // Lighter grey 2
  "#7ab1fb", // Lightest blue
];

const isRelevantSubscription = (subscription: string): boolean => {
  const type = getSubscriptionType(subscription);
  return ["Striking", "Grappling", "MMA", "Fit & Athletik", "Kinder"].includes(
    type
  );
};

const getSubscriptionType = (subscription: string): string => {
  const subscriptionLower = subscription.toLowerCase();
  if (subscriptionLower.includes("striking")) return "Striking";
  if (subscriptionLower.includes("grappling")) return "Grappling";
  if (subscriptionLower.includes("mma")) return "MMA";
  if (
    subscriptionLower.includes("fit") ||
    subscriptionLower.includes("athletik")
  )
    return "Fit & Athletik";
  if (subscriptionLower.includes("pro")) return "Pro";
  if (subscriptionLower.includes("mitarbeiter")) return "Mitarbeiter";
  if (subscriptionLower.includes("kinder")) return "Kinder";
  return "Other";
};

const totalCustomers = computed(() => {
  if (filteredDatasets.value.length === 0) return 0;

  const latestDataset =
    filteredDatasets.value[filteredDatasets.value.length - 1];
  return latestDataset.customers.filter((customer) =>
    isRelevantSubscription(customer.subscription)
  ).length;
});

const subscriptionChartData = computed(() => {
  if (filteredDatasets.value.length === 0)
    return { labels: [], datasets: [{ data: [] }] };

  const latestDataset =
    filteredDatasets.value[filteredDatasets.value.length - 1];

  const data = subscriptionCategories.map((category) => {
    return latestDataset.customers.filter(
      (c) => getSubscriptionType(c.subscription) === category
    ).length;
  });

  return {
    labels: subscriptionCategories,
    datasets: [
      {
        data,
        backgroundColor: colorPalette,
      },
    ],
  };
});

const subscriptionBarData = computed(() => ({
  labels: subscriptionCategories,
  datasets: [
    {
      label: "Number of Subscriptions",
      data: subscriptionCategories.map((category) =>
        filteredDatasets.value.length > 0
          ? filteredDatasets.value[
              filteredDatasets.value.length - 1
            ].customers.filter(
              (c) => getSubscriptionType(c.subscription) === category
            ).length
          : 0
      ),
      backgroundColor: colorPalette,
    },
  ],
}));

const subscriptionGrowthData = computed(() => {
  if (filteredDatasets.value.length === 0) return { labels: [], datasets: [] };

  const sortedDatasets = [...filteredDatasets.value].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  const labels = sortedDatasets.map((ds) => format(ds.timestamp, "MMM yyyy"));

  const subscriptionData = subscriptionCategories.map((category, index) => ({
    label: category,
    data: sortedDatasets.map(
      (ds) =>
        ds.customers.filter(
          (c) => getSubscriptionType(c.subscription) === category
        ).length
    ),
    borderColor: colorPalette[index % colorPalette.length],
    backgroundColor: colorPalette[index % colorPalette.length],
    tension: 0.4,
  }));

  subscriptionData.push({
    label: "Total (Relevant Types Only)",
    data: sortedDatasets.map(
      (ds) =>
        ds.customers.filter((c) => isRelevantSubscription(c.subscription))
          .length
    ),
    borderColor: "#1a519b",
    backgroundColor: "#1a519b",
    borderWidth: 3,
    tension: 0.4,
  });

  return {
    labels,
    datasets: subscriptionData,
  };
});

const specialTrainingData = computed(() => {
  if (filteredDatasets.value.length === 0) return { labels: [], datasets: [] };

  const sortedDatasets = [...filteredDatasets.value].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  const labels = sortedDatasets.map((ds) => format(ds.timestamp, "MMM yyyy"));

  return {
    labels,
    datasets: [
      {
        label: "Athlete Packages",
        data: sortedDatasets.map(
          (ds) =>
            ds.customers.filter((c) => {
              const subscriptionLower = c.subscription.toLowerCase();
              return (
                subscriptionLower.includes("athlete") &&
                subscriptionLower.includes("package")
              );
            }).length
        ),
        borderColor: "#1a519b",
        backgroundColor: "#1a519b",
        tension: 0.4,
      },
      {
        label: "Personal Training",
        data: sortedDatasets.map(
          (ds) =>
            ds.customers.filter((c) => {
              const subscriptionLower = c.subscription.toLowerCase();
              return (
                subscriptionLower.includes("personal") &&
                subscriptionLower.includes("training")
              );
            }).length
        ),
        borderColor: "#5a91db",
        backgroundColor: "#5a91db",
        tension: 0.4,
      },
      {
        label: "Nutrition",
        data: sortedDatasets.map(
          (ds) =>
            ds.customers.filter((c) => {
              const subscriptionLower = c.subscription.toLowerCase();
              return subscriptionLower.includes("nutrition");
            }).length
        ),
        borderColor: "#7ab1fb",
        backgroundColor: "#7ab1fb",
        tension: 0.4,
      },
    ],
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: "right" as const,
      labels: {
        color: "#1a519b",
      },
    },
  },
};

const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    title: {
      display: false,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: "#99999933",
      },
      ticks: {
        color: "#1a519b",
        stepSize: 1,
      },
    },
    x: {
      grid: {
        color: "#99999933",
      },
      ticks: {
        color: "#1a519b",
      },
    },
  },
};

const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top" as const,
      labels: {
        color: "#1a519b",
        usePointStyle: true,
        padding: 20,
      },
    },
    tooltip: {
      mode: "index" as const,
      intersect: false,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: "#99999933",
      },
      ticks: {
        color: "#1a519b",
        stepSize: 5,
      },
    },
    x: {
      grid: {
        color: "#99999933",
      },
      ticks: {
        color: "#1a519b",
      },
    },
  },
  interaction: {
    intersect: false,
    mode: "index" as const,
  },
};

const extractTimestampFromFilename = (filename: string): Date => {
  const match = filename.match(/(\d{12})/);
  if (!match) throw new Error("Invalid filename format");
  return parse(match[1], "yyyyMMddHHmm", new Date());
};

const handleFileUpload = (event: Event) => {
  const input = event.target as HTMLInputElement;
  selectedFiles.value = input.files;
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

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      const rawData = XLSX.utils.sheet_to_json(worksheet);

      const customers = rawData.map((row: any) => ({
        id: row.ID || "",
        subscription: row.Abonnement || row.Subscription || "",
        validFrom: new Date(row.ValidFrom || ""),
        validUntil: new Date(row.ValidUntil || ""),
        pendingBookings: parseInt(row.PendingBookings || "0"),
        purchaseDate: new Date(row.PurchaseDate || ""),
        subscriptionStatus: row.SubscriptionStatus || "",
        customer: row.Customer || "",
        salutation: row.Salutation || "",
        firstName: row.FirstName || "",
        lastName: row.LastName || "",
        address: row.Address || "",
        postalCode: row.PostalCode || "",
        country: row.Country || "",
        mobile: row.Mobile || "",
        phonePrivate: row.PhonePrivate || "",
        phoneWork: row.PhoneWork || "",
        birthday: new Date(row.Birthday || ""),
        email: row.Email || "",
        language: row.Language || "",
      }));

      datasets.value.push({
        timestamp,
        customers,
      });
    }

    datasets.value.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
    initializeYearFilter();
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
.dashboard {
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

h2,
h3 {
  margin-top: 0;
  color: #333;
}

.filter-container {
  margin-bottom: 20px;
}

.year-filter {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.filter-button {
  padding: 8px 16px;
  border: 2px solid #1a519b;
  border-radius: 4px;
  background: white;
  color: #1a519b;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-button.active {
  background: #1a519b;
  color: white;
}

.filter-button:hover {
  background: #1a519b;
  color: white;
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
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.process-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
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

.charts-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.chart {
  background: white;
  padding: 55px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  height: 400px;
}

.wide-chart {
  grid-column: 1 / -1;
  height: 600px;
}

.error {
  color: red;
  margin-top: 10px;
}

.progress {
  color: blue;
  margin-top: 10px;
}
</style>
