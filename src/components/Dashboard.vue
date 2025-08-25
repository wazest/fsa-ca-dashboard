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
          <div class="chart">
            <h3>All Subscriptions Revenue</h3>
            <Bar
              :data="allSubscriptionsRevenueData"
              :options="revenueChartOptions"
            />
          </div>
          <div class="chart">
            <h3>Relevant Types Revenue</h3>
            <Pie
              :data="relevantTypesRevenueData"
              :options="revenueChartOptions"
            />
          </div>
          <div class="chart wide-chart">
            <h3>Subscription Growth Over Time</h3>
            <Line :data="subscriptionGrowthData" :options="lineChartOptions" />
          </div>
          <div class="chart wide-chart">
            <h3>Trial Training Overview</h3>
            <Line :data="probetrainingData" :options="lineChartOptions" />
          </div>
          <div class="chart wide-chart">
            <h3>Special Training Packages</h3>
            <Line :data="specialTrainingData" :options="lineChartOptions" />
          </div>
          <div class="chart wide-chart">
            <h3>Renewal Forecast</h3>
            <Bar :data="renewalForecastData" :options="barChartOptions" />
          </div>
        </div>

        <!-- Kündigungsfilter außerhalb der Grid-Container -->
        <div
          v-if="filteredDatasets.length > 0"
          class="cancellation-filter-card"
        >
          <h3>Kündigungen filtern nach Abotyp</h3>
          <div class="table-filters">
            <button
              v-for="type in [
                'All',
                'Striking',
                'Grappling',
                'Fit & Athletik',
                'MMA',
              ]"
              :key="type"
              @click="selectedCancellationFilter = type"
              :class="[
                'filter-button',
                { active: selectedCancellationFilter === type },
              ]"
            >
              {{ type }}
            </button>
          </div>
        </div>
        <div v-if="filteredDatasets.length > 0" class="charts-container">
          <!-- 💡 Kündigungs-Charts bleiben breit -->
          <div v-if="filteredDatasets.length > 0" class="chart wide-chart">
            <h3>Kündigungen nach Monat (gemäss Kündigungsdatum)</h3>
            <Bar :data="cancellationsByMonth" :options="barChartOptions" />
          </div>

          <div v-if="filteredDatasets.length > 0" class="chart wide-chart">
            <h3>Auslaufende gekündigte Abos (gemäss Gültig bis)</h3>
            <Bar
              :data="cancellationsExpiringByMonth"
              :options="barChartOptions"
            />
          </div>
        </div>

        <div v-if="filteredDatasets.length > 0" class="subscription-table">
          <h3>Subscription Revenue Overview</h3>
          <div class="table-filters">
            <button
              v-for="type in [
                'All',
                'Striking',
                'Grappling',
                'Fit & Athletik',
                'MMA',
                'Kinder',
                'Pro Abos',
              ]"
              :key="type"
              @click="selectedTableFilter = type"
              :class="[
                'filter-button',
                { active: selectedTableFilter === type },
              ]"
            >
              {{ type }}
            </button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Subscription Type</th>
                <th>Count</th>
                <th>Price (CHF)</th>
                <th>Total Revenue (CHF)</th>
                <th v-if="selectedTableFilter === 'Pro Abos'">
                  Pro Revenue (CHF)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in filteredTableData" :key="row.subscription">
                <td>{{ row.subscription }}</td>
                <td>{{ row.count }}</td>
                <td>{{ row.price.toLocaleString() }}</td>
                <td>{{ row.revenue.toLocaleString() }}</td>
                <td v-if="selectedTableFilter === 'Pro Abos'">
                  {{ row.proRevenue.toLocaleString() }}
                </td>
              </tr>
              <tr class="total-row">
                <td>Total</td>
                <td>{{ totalCount }}</td>
                <td>-</td>
                <td>{{ totalRevenue.toLocaleString() }}</td>
                <td v-if="selectedTableFilter === 'Pro Abos'">
                  {{ totalProRevenue.toLocaleString() }}
                </td>
              </tr>
            </tbody>
          </table>
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
import { parse, format, getYear } from "date-fns";
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

interface DataSet {
  timestamp: Date;
  customers: Customer[];
}

interface SubscriptionPrice {
  name: string;
  price: number;
}

const subscriptionPrices: SubscriptionPrice[] = [
  { name: "Mitarbeiter", price: 0 },
  { name: "Striking 1 Jahr | reduziert | Ratenzahlung", price: 970 },
  { name: "Striking 1 Jahr | Ratenzahlung", price: 1145 },
  { name: "Striking 6 Monate | reduziert | Ratenzahlung", price: 660 },
  { name: "Striking 6 Monate | Ratenzahlung", price: 775 },
  { name: "MMA 6 Monate | Ratenzahlung", price: 980 },
  { name: "Kinder & Jugendliche 6 Monate", price: 490 },
  { name: "MMA Pro 6 Monate | reduziert | Ratenzahlung", price: 1085 },
  { name: "MMA Pro 1 Jahr | Ratenzahlung", price: 1835 },
  { name: "MMA Pro 6 Monate | Ratenzahlung", price: 1230 },
  { name: "MMA Pro 1 Jahr | monatlich", price: 1980 },
  { name: "MMA Pro 1 Jahr | reduziert | monatlich", price: 1740 },
  { name: "Striking 1 Jahr | Legacy", price: 1145 },
  { name: "Week Pass Fit & Athletik", price: 50 },
  { name: "Grappling 1 Jahr", price: 995 },
  { name: "Goal Getter Personal Training | monatlich", price: 130 },
  { name: "MMA 6 Monate | reduziert | Ratenzahlung", price: 835 },
  { name: "Grappling 1 Jahr | Ratenzahlung", price: 995 },
  { name: "Striking 1 Jahr", price: 1145 },
  { name: "Probetraining Abo", price: 0 },
  { name: "Nutrition Basic Continuous Athlete Support", price: 160 },
  { name: "Special Member", price: 0 },
  { name: "MMA Pro 1 Jahr", price: 1835 },
  { name: "Striking 1 Jahr | reduziert", price: 970 },
  { name: "5x Personal Training Package", price: 695 },
  { name: "Day Pass", price: 35 },
  { name: "Grappling 1 Jahr | reduziert", price: 850 },
  { name: "Striking 6 Monate", price: 775 },
  { name: "Striking 1 Jahr | monatlich", price: 1260 },
  { name: "Striking 6 Monate | reduziert | monatlich", price: 780 },
  { name: "MMA 1 Jahr | reduziert | monatlich", price: 1320 },
  { name: "MMA 6 Monate | monatlich", price: 1170 },
  { name: "MMA 6 Monate", price: 980 },
  { name: "MMA 1 Jahr | reduziert", price: 1225 },
  { name: "MMA 1 Jahr", price: 1440 },
  { name: "Striking Pro 6 Monate | monatlich", price: 1320 },
  { name: "Grappling 6 Monate", price: 685 },
  { name: "Fit & Athletik 6 Monate | reduziert", price: 630 },
  { name: "Grappling 1 Jahr | reduziert | monatlich", price: 960 },
  { name: "Grappling 6 Monate | reduziert", price: 580 },
  { name: "Grappling Pro 1 Jahr", price: 1390 },
  { name: "Grappling Pro 6 Monate | reduziert | monatlich", price: 1080 },
  { name: "Grappling Pro 6 Monate", price: 935 },
  { name: "Grappling Pro 6 Monate | reduziert", price: 830 },
  { name: "Fit & Athletik 1 Jahr", price: 1080 },
  { name: "Striking 6 Monate | monatlich", price: 780 },
  { name: "Grappling 1 Jahr | monatlich", price: 1080 },
  { name: "Fit & Athletik 6 Monate", price: 740 },
  { name: "Striking Pro 1 Jahr | monatlich", price: 1740 },
  { name: "Fit & Athletik 1 Jahr | reduziert", price: 920 },
  { name: "12x Personal Training Package", price: 1190 },
  { name: "MMA Pro 6 Monate | monatlich", price: 1560 },
  { name: "WAKO Lizenz", price: 0 },
  { name: "NLZ Coach", price: 0 },
  { name: "Probetraining Abo Kinder & Jugendliche", price: 0 },
  { name: "Next Level Personal Training | monatlich", price: 420 },
  { name: "MMA 1 Jahr | monatlich", price: 1560 },
  {
    name: "Nutrition One-Time Support: Messung der Körperzusammensetzung",
    price: 180,
  },
  { name: "Grappling Pro 1 Jahr | Ratenzahlung", price: 1390 },
  { name: "Grappling 6 Monate | reduziert | Ratenzahlung", price: 580 },
  { name: "Grappling Pro 1 Jahr | reduziert | Ratenzahlung", price: 1245 },
  { name: "MMA 1 Jahr | Ratenzahlung", price: 1440 },
  { name: "Grappling 6 Monate | Ratenzahlung", price: 685 },
  { name: "Fit & Athletik 1 Jahr | Ratenzahlung", price: 1080 },
  { name: "MMA Pro 1 Jahr | reduziert | Ratenzahlung", price: 1620 },
  { name: "Striking Pro 6 Monate | reduziert | Ratenzahlung", price: 910 },
  { name: "Fit & Athletik 6 Monate | reduziert | Ratenzahlung", price: 630 },
  { name: "Striking Pro 1 Jahr | Ratenzahlung", price: 1540 },
  { name: "MMA 1 Jahr | reduziert | Ratenzahlung", price: 1225 },
  { name: "Striking Pro 6 Monate | Ratenzahlung", price: 1025 },
  { name: "Fit & Athletik 1 Jahr | reduziert | Ratenzahlung", price: 920 },
  { name: "Striking Pro 1 Jahr | reduziert | monatlich", price: 1500 },
  { name: "Striking Pro 6 Monate", price: 1025 },
  { name: "Grappling Pro 1 Jahr | reduziert", price: 1245 },
  { name: "Striking Pro 1 Jahr | reduziert | Ratenzahlung", price: 1365 },
  { name: "Fit & Athletik 6 Monate | Ratenzahlung", price: 740 },
  { name: "Grappling Pro 6 Monate | Ratenzahlung", price: 935 },
  { name: "MTT - Medizinische Trainingstherapie", price: 50 },
  { name: "Grappling Pro 6 Monate | reduziert | Ratenzahlung", price: 830 },
  { name: "Striking Pro 1 Jahr | reduziert", price: 1365 },
  { name: "Striking Pro 1 Jahr | Legacy", price: 1540 },
  { name: "Striking Pro 6 Monate | reduziert", price: 910 },
  { name: "Eltern Kinder 1 Jahr | Ratenzahlung", price: 1160 },
  { name: "Kinder & Jugendliche 1 Jahr | Ratenzahlung", price: 720 },
  { name: "Kinder & Jugendliche 1 Jahr", price: 720 },
  { name: "Kinder & Jugendliche 6 Monate | Ratenzahlung", price: 490 },
  { name: "Athlete - Advanced Package Standart", price: 255 },
  { name: "1x Single Personal Training", price: 150 },
  { name: "Next Level Intense Personal Training | monatlich", price: 800 },
  { name: "Athlete - Advanced Package Pro", price: 350 },
  { name: "Grappling 1 Jahr | reduziert | Ratenzahlung", price: 850 },
  { name: "Striking 6 Monate | reduziert", price: 660 },
  { name: "BJJ Kids Bullyproof", price: 0 },
  { name: "Grappling 1 Jahr | Legacy", price: 995 },
  { name: "EarlyBird 1 Jahr", price: 795 },
  { name: "EarlyBird 6 Monate", price: 565 },
  { name: "MMA 6 Monate | reduziert", price: 835 },
  { name: "MMA Pro 1 Jahr | reduziert", price: 1620 },
  { name: "Striking Pro 1 Jahr", price: 1540 },
  { name: "Grappling 1 Jahr reduziert | Legacy", price: 850 },
  { name: "Striking 1 Jahr | reduziert | monatlich", price: 1080 },
  { name: "Goal Getter Intense Personal Training | monatlich", price: 240 },
  { name: "Eltern Kinder 1 Jahr", price: 1160 },
  { name: "Striking 6 Monate | Legacy", price: 775 },
];

const datasets = ref<DataSet[]>([]);
const processing = ref(false);
const error = ref("");
const selectedFiles = ref<FileList | null>(null);
const selectedYears = ref<number[]>([]);
const selectedTableFilter = ref("All");

const subscriptionCategories = [
  "Striking",
  "Grappling",
  "MMA",
  "Fit & Athletik",
  "Kinder",
  "Mitarbeiter",
];

const colorPalette = [
  "#1a519b",
  "#999999",
  "#3a71bb",
  "#b3b3b3",
  "#5a91db",
  "#cccccc",
  "#7ab1fb",
];

const selectedCancellationFilter = ref("All");

const isValidDate = (date: any): boolean => {
  return date instanceof Date && !isNaN(date.getTime()) && date.getTime() > 0;
};

const parseExcelDate = (date: any): Date | null => {
  if (!date) return null;

  if (typeof date === "string") {
    try {
      const [day, month, year] = date.split(".");
      if (day && month && year) {
        const parsedDate = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day)
        );

        return isValidDate(parsedDate) ? parsedDate : null;
      }
    } catch (e) {
      console.log("Error parsing German date:", e);
    }
  }

  return null;
};

const availableYears = computed(() => {
  if (datasets.value.length === 0) return [];
  const years = new Set(datasets.value.map((ds) => getYear(ds.timestamp)));
  return Array.from(years).sort((a, b) => b - a);
});

const initializeYearFilter = () => {
  if (availableYears.value.length > 0) {
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

const isRelevantSubscription = (subscription: string): boolean => {
  if (subscription.toLowerCase().includes("probetraining")) return false;
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
  if (
    subscriptionLower.includes("kinder") ||
    subscriptionLower.includes("jugendliche")
  )
    return "Kinder";
  if (subscriptionLower.includes("mitarbeiter")) return "Mitarbeiter";
  return "Other";
};

const getSubscriptionPrice = (subscription: string): number => {
  const normalizedSubscription = subscription.toLowerCase().trim();

  // Try exact match first
  const exactMatch = subscriptionPrices.find(
    (price) => price.name.toLowerCase() === normalizedSubscription
  );
  if (exactMatch) return exactMatch.price;

  // Try fuzzy matching
  const matchingPrices = subscriptionPrices.filter((price) => {
    const priceName = price.name.toLowerCase();

    // Extract main type (Striking, Grappling, MMA, etc.)
    const mainType = priceName.split(" ")[0];
    if (!normalizedSubscription.includes(mainType)) return false;

    // Check duration
    const hasYear =
      priceName.includes("jahr") === normalizedSubscription.includes("jahr");
    const hasMonth =
      priceName.includes("monate") ===
      normalizedSubscription.includes("monate");

    // Check modifiers
    const hasReduced =
      priceName.includes("reduziert") ===
      normalizedSubscription.includes("reduziert");
    const hasPro =
      priceName.includes("pro") === normalizedSubscription.includes("pro");

    return (hasYear || hasMonth) && hasReduced && hasPro;
  });

  if (matchingPrices.length > 0) {
    // Sort by price to get the closest match
    matchingPrices.sort((a, b) => {
      const aSimilarity = a.name
        .toLowerCase()
        .split(" ")
        .filter((word) => normalizedSubscription.includes(word)).length;
      const bSimilarity = b.name
        .toLowerCase()
        .split(" ")
        .filter((word) => normalizedSubscription.includes(word)).length;
      return bSimilarity - aSimilarity;
    });
    return matchingPrices[0].price;
  }

  // Fallback prices for special cases
  if (normalizedSubscription.includes("kinder")) {
    const kinderPrice = subscriptionPrices.find((p) =>
      p.name.includes("Kinder")
    );
    return kinderPrice ? kinderPrice.price : 490.0;
  }

  if (
    normalizedSubscription.includes("fit") ||
    normalizedSubscription.includes("athletik")
  ) {
    const fitPrice = subscriptionPrices.find((p) =>
      p.name.includes("Fit & Athletik")
    );
    return fitPrice ? fitPrice.price : 740.0;
  }

  console.log("No price match found for subscription:", subscription);
  return 0;
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
      (c) =>
        !c.subscription.toLowerCase().includes("probetraining") &&
        getSubscriptionType(c.subscription) === category
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
              (c) =>
                !c.subscription.toLowerCase().includes("probetraining") &&
                getSubscriptionType(c.subscription) === category
            ).length
          : 0
      ),
      backgroundColor: colorPalette,
    },
  ],
}));

const allSubscriptionsRevenueData = computed(() => {
  if (filteredDatasets.value.length === 0)
    return { labels: [], datasets: [{ data: [] }] };

  const latestDataset =
    filteredDatasets.value[filteredDatasets.value.length - 1];
  const subscriptionCounts = new Map<
    string,
    { count: number; revenue: number }
  >();

  latestDataset.customers.forEach((customer) => {
    const subscription = customer.subscription;
    if (subscription.toLowerCase().includes("probetraining")) return;

    const price = getSubscriptionPrice(subscription);

    if (!subscriptionCounts.has(subscription)) {
      subscriptionCounts.set(subscription, { count: 0, revenue: 0 });
    }

    const current = subscriptionCounts.get(subscription)!;
    current.count += 1;
    current.revenue += price;
  });

  const sortedEntries = Array.from(subscriptionCounts.entries()).sort(
    (a, b) => b[1].revenue - a[1].revenue
  );

  const labels = sortedEntries.map(([label]) => label);
  const data = sortedEntries.map(([, value]) => value.revenue);
  const backgroundColor = labels.map(
    (_, i) => colorPalette[i % colorPalette.length]
  );

  return {
    labels,
    datasets: [
      {
        label: "Revenue (CHF)",
        data,
        backgroundColor,
      },
    ],
  };
});

const relevantTypesRevenueData = computed(() => {
  if (filteredDatasets.value.length === 0)
    return { labels: [], datasets: [{ data: [] }] };

  const latestDataset =
    filteredDatasets.value[filteredDatasets.value.length - 1];
  const relevantTypes = [
    "Striking",
    "Grappling",
    "MMA",
    "Fit & Athletik",
    "Kinder",
  ];
  const typeData = new Map<string, { count: number; revenue: number }>();

  relevantTypes.forEach((type) => {
    typeData.set(type, { count: 0, revenue: 0 });
  });

  latestDataset.customers.forEach((customer) => {
    if (customer.subscription.toLowerCase().includes("probetraining")) return;

    const subscription = customer.subscription;
    const price = getSubscriptionPrice(subscription);

    relevantTypes.forEach((type) => {
      if (subscription.toLowerCase().includes(type.toLowerCase())) {
        const current = typeData.get(type)!;
        current.count += 1;
        current.revenue += price;
      }
    });
  });

  // Gesamtumsatz berechnen
  const totalRevenue = Array.from(typeData.values()).reduce(
    (sum, t) => sum + t.revenue,
    0
  );

  const sortedEntries = Array.from(typeData.entries()).sort(
    (a, b) => b[1].revenue - a[1].revenue
  );

  const labels = sortedEntries.map(([label]) => label);
  const data = sortedEntries.map(([, value]) => value.revenue);
  const backgroundColor = labels.map(
    (_, i) => colorPalette[i % colorPalette.length]
  );

  // Prozentwerte berechnen
  const percentages = sortedEntries.map(
    ([, value]) => ((value.revenue / totalRevenue) * 100).toFixed(2) + "%"
  );

  return {
    labels: labels.map((label, i) => `${label} (${percentages[i]})`),
    datasets: [
      {
        label: "Revenue (CHF)",
        data,
        backgroundColor,
      },
    ],
  };
});

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
          (c) =>
            !c.subscription.toLowerCase().includes("probetraining") &&
            getSubscriptionType(c.subscription) === category
        ).length
    ),
    borderColor: colorPalette[index % colorPalette.length],
    backgroundColor: colorPalette[index % colorPalette.length],
    tension: 0.4,
  }));

  // Add Pro subscriptions data
  subscriptionData.push({
    label: "Pro Subscriptions",
    data: sortedDatasets.map(
      (ds) =>
        ds.customers.filter((c) => {
          const subscriptionLower = c.subscription.toLowerCase();
          return (
            subscriptionLower.includes("pro") &&
            !subscriptionLower.includes("probetraining")
          );
        }).length
    ),
    borderColor: "#ff4444",
    backgroundColor: "#ff4444",
    tension: 0.4,
  });

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

const probetrainingData = computed(() => {
  if (filteredDatasets.value.length === 0) return { labels: [], datasets: [] };

  const sortedDatasets = [...filteredDatasets.value].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  const labels = sortedDatasets.map((ds) => format(ds.timestamp, "MMM yyyy"));

  const data = sortedDatasets.map((ds) => {
    return ds.customers.filter((c) => {
      const subscription = (c.subscription || "").toLowerCase().trim();

      const isValid =
        subscription.includes("probetraining") &&
        c.validFrom !== null &&
        isValidDate(c.validFrom);

      return isValid;
    }).length;
  });

  return {
    labels,
    datasets: [
      {
        label: "Trial Training",
        data,
        borderColor: colorPalette[0],
        backgroundColor: colorPalette[0],
        tension: 0.4,
      },
    ],
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

const renewalForecastData = computed(() => {
  if (filteredDatasets.value.length === 0) return { labels: [], datasets: [] };

  const latestDataset =
    filteredDatasets.value[filteredDatasets.value.length - 1];
  const renewalMap = new Map<string, number>();

  latestDataset.customers.forEach((c) => {
    const validUntil = c.validUntil;
    const status = (c.subscriptionStatus || "").toLowerCase();
    const name = (c.subscription || "").toLowerCase();

    if (!isValidDate(validUntil)) return;
    if (status === "gekündigt") return;

    // ✅ Nur 1 Jahr oder 6 Monate erlauben
    const isRelevant = name.includes("1 jahr") || name.includes("6 monate");
    if (!isRelevant) return;

    const label = format(validUntil, "MMM yyyy");

    if (!renewalMap.has(label)) renewalMap.set(label, 0);
    renewalMap.set(label, renewalMap.get(label)! + 1);
  });

  const sortedEntries = Array.from(renewalMap.entries()).sort(
    ([a], [b]) => new Date(a).getTime() - new Date(b).getTime()
  );

  const labels = sortedEntries.map(([label]) => label);
  const data = sortedEntries.map(([, count]) => count);

  return {
    labels,
    datasets: [
      {
        label: "Renewals",
        data,
        backgroundColor: "#1a519b",
      },
    ],
  };
});

const cancellationsByMonth = computed(() => {
  const cancellationMap = new Map<string, number>();

  for (const dataset of filteredDatasets.value) {
    for (const customer of dataset.customers) {
      const status = (customer.subscriptionStatus || "").toLowerCase();
      const subscription = customer.subscription || "";

      const subscriptionType = getSubscriptionType(subscription);
      if (
        !["Striking", "Grappling", "Fit & Athletik", "MMA"].includes(
          subscriptionType
        )
      )
        continue;

      if (
        selectedCancellationFilter.value !== "All" &&
        subscriptionType !== selectedCancellationFilter.value
      )
        continue;

      const match = status.match(/gekündigt am (\d{2}\.\d{2}\.\d{4})/i);
      if (match) {
        const rawDate = match[1];
        const [day, month, year] = rawDate.split(".");
        const parsed = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day)
        );
        const label = format(parsed, "MMM yyyy");

        if (!cancellationMap.has(label)) cancellationMap.set(label, 0);
        cancellationMap.set(label, cancellationMap.get(label)! + 1);
      }
    }
  }

  const sortedEntries = Array.from(cancellationMap.entries()).sort(
    ([a], [b]) => new Date(a).getTime() - new Date(b).getTime()
  );

  return {
    labels: sortedEntries.map(([label]) => label),
    datasets: [
      {
        label: "Kündigungen (Kündigungsdatum)",
        data: sortedEntries.map(([, count]) => count),
        backgroundColor: "#ff4444",
      },
    ],
  };
});

const cancellationsExpiringByMonth = computed(() => {
  const expiryMap = new Map<string, number>();

  for (const dataset of filteredDatasets.value) {
    for (const customer of dataset.customers) {
      const status = (customer.subscriptionStatus || "").toLowerCase();
      const subscription = customer.subscription || "";
      const validUntil = customer.validUntil;

      const subscriptionType = getSubscriptionType(subscription);
      if (
        !["Striking", "Grappling", "Fit & Athletik", "MMA"].includes(
          subscriptionType
        )
      )
        continue;

      if (
        selectedCancellationFilter.value !== "All" &&
        subscriptionType !== selectedCancellationFilter.value
      )
        continue;

      const isCancelled = status.includes("gekündigt am");
      if (!isCancelled || !isValidDate(validUntil)) continue;

      const label = format(validUntil!, "MMM yyyy");

      if (!expiryMap.has(label)) expiryMap.set(label, 0);
      expiryMap.set(label, expiryMap.get(label)! + 1);
    }
  }

  const sortedEntries = Array.from(expiryMap.entries()).sort(
    ([a], [b]) => new Date(a).getTime() - new Date(b).getTime()
  );

  return {
    labels: sortedEntries.map(([label]) => label),
    datasets: [
      {
        label: "Kündigungen (Ablaufdatum)",
        data: sortedEntries.map(([, count]) => count),
        backgroundColor: "#ffa500", // Orange für Unterscheidung
      },
    ],
  };
});

const filteredTableData = computed(() => {
  if (filteredDatasets.value.length === 0) return [];

  const latestDataset =
    filteredDatasets.value[filteredDatasets.value.length - 1];
  const subscriptionData = new Map<
    string,
    { count: number; price: number; revenue: number; proRevenue: number }
  >();

  latestDataset.customers.forEach((customer) => {
    const subscription = customer.subscription;
    if (subscription.toLowerCase().includes("probetraining")) return;

    const type = getSubscriptionType(subscription);

    const isProAbo =
      subscription.toLowerCase().includes("pro") &&
      !subscription.toLowerCase().includes("probetraining") &&
      (subscription.toLowerCase().includes("striking") ||
        subscription.toLowerCase().includes("grappling") ||
        subscription.toLowerCase().includes("mma"));

    // Überprüfen, ob der Filter "Pro Abos" aktiv ist
    if (selectedTableFilter.value === "Pro Abos" && !isProAbo) return;
    if (
      selectedTableFilter.value !== "All" &&
      selectedTableFilter.value !== "Pro Abos" &&
      type !== selectedTableFilter.value
    ) {
      return;
    }

    const price = getSubscriptionPrice(subscription);
    let proRevenue = 0;

    if (selectedTableFilter.value === "Pro Abos") {
      if (subscription.toLowerCase().includes("6 monate")) {
        proRevenue =
          250 * ((subscriptionData.get(subscription)?.count ?? 0 + 1) + 1);
      } else if (subscription.toLowerCase().includes("1 jahr")) {
        proRevenue =
          395 * ((subscriptionData.get(subscription)?.count ?? 0 + 1) + 1);
      }
    }

    if (!subscriptionData.has(subscription)) {
      subscriptionData.set(subscription, {
        count: 0,
        price,
        revenue: 0,
        proRevenue: 0,
      });
    }

    const data = subscriptionData.get(subscription)!;
    data.count += 1;
    data.revenue = data.count * data.price;
    data.proRevenue = proRevenue;
  });

  return Array.from(subscriptionData.entries())
    .map(([subscription, data]) => ({
      subscription,
      ...data,
    }))
    .sort((a, b) => b.revenue - a.revenue);
});

const totalCount = computed(() => {
  return filteredTableData.value.reduce((sum, row) => sum + row.count, 0);
});

const totalRevenue = computed(() => {
  return filteredTableData.value.reduce((sum, row) => sum + row.revenue, 0);
});

// Berechnung der Gesamtsumme für Pro Revenue
const totalProRevenue = computed(() => {
  return filteredTableData.value.reduce((sum, row) => sum + row.proRevenue, 0);
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

const revenueChartOptions = {
  ...chartOptions,
  plugins: {
    ...chartOptions.plugins,
    tooltip: {
      callbacks: {
        label: (context: any) => {
          const label = context.label || "";
          const value = context.raw || 0;
          return `${label}: CHF ${value.toLocaleString()}`;
        },
      },
    },
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

      const customers = rawData.map((row: any) => {
        if ((row.Abonnement || "").toLowerCase().includes("probetraining")) {
          console.log("Raw trial training row:", {
            subscription: row.Abonnement,
            validFrom: row["Gültig ab"],
            validUntil: row["Gültig bis"],
          });
        }

        const validFrom = parseExcelDate(row["Gültig ab"]);
        const validUntil = parseExcelDate(row["Gültig bis"]);
        const purchaseDate = parseExcelDate(row["Kaufdatum"]);
        const birthday = parseExcelDate(row["Geburtstag"]);

        return {
          id: row.ID || "",
          subscription: row.Abonnement || "",
          validFrom,
          validUntil,
          pendingBookings: parseInt(row["Ausstehende Buchungen"] || "0"),
          purchaseDate,
          subscriptionStatus: row["Abonnement-Status"] || "",
          customer: row.Kunde || "",
          salutation: row.Anrede || "",
          firstName: row.Vorname || "",
          lastName: row.Name || "",
          address: row.Adresse || "",
          postalCode: row["PLZ / Stadt"] || "",
          country: row.Land || "",
          mobile: row.Mobiltelefon || "",
          phonePrivate: row["Telefon Privat"] || "",
          phoneWork: row["Telefon Arbeit"] || "",
          birthday,
          email: row["E-Mail"] || "",
          language: row.Sprache || "",
        };
      });

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

.cancellation-filter-card {
  background: white;
  padding: 20px 30px;
  margin: 30px 0;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: 100%;
}

.subscription-cancel-filter {
  background: white;
  padding: 20px;
  margin-bottom: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  text-align: center;
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
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.chart {
  background: white;
  padding: 30px;
  padding-bottom: 65px;
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

.subscription-table {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-top: 30px;
}

.table-filters {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
  justify-content: center;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

th,
td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  background-color: #f8f9fa;
  color: #1a519b;
  font-weight: bold;
}

.total-row {
  font-weight: bold;
  background-color: #f8f9fa;
}

.total-row td {
  border-top: 2px solid #1a519b;
}
</style>
