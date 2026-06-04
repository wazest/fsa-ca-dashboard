<template>
  <div class="finance">
    <header class="header">
      <div class="header-content">
        <h1>FSA FINANCE</h1>
      </div>
    </header>

    <main>
      <div class="upload-container">
        <h2>Upload Invoice Excel Files</h2>
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
        <div v-if="store.snapshots.length > 0" class="snapshot-info">
          {{ store.snapshots.length }} Snapshot(s) geladen:
          {{ snapshotLabels.join(", ") }}
        </div>
      </div>

      <div v-if="hasData" class="charts-container">
        <!-- Current Status (Latest Snapshot) -->
        <div class="chart-wrapper">
          <h3>Invoice Status Distribution (Aktueller Stand)</h3>
          <div class="chart">
            <Pie :data="invoiceStatusChartData" :options="chartOptions" />
          </div>
        </div>

        <div class="stats-container">
          <div
            class="stat-card"
            v-for="(data, status) in statusData"
            :key="status"
          >
            <h4>{{ status }}</h4>
            <p class="count">{{ data.count }} invoices</p>
            <p class="amount">CHF {{ formatNumber(data.amount) }}</p>
          </div>
          <div class="stat-card total">
            <h4>Total</h4>
            <p class="count">{{ totalInvoices }} invoices</p>
            <p class="amount">CHF {{ formatNumber(totalAmount) }}</p>
          </div>
        </div>

        <div class="chart-wrapper wide-chart">
          <h3>Outstanding Invoices by Due Date</h3>
          <div class="chart">
            <Bar
              :data="monthlyOutstandingData"
              :options="monthlyChartOptions"
            />
          </div>
        </div>

        <!-- NEW: Multi-Snapshot Charts -->
        <div v-if="store.snapshots.length > 1" class="chart-wrapper wide-chart">
          <h3>Status-Evolution über Zeit (Anzahl Rechnungen)</h3>
          <div class="chart">
            <Bar :data="statusEvolutionData" :options="stackedChartOptions" />
          </div>
        </div>

        <div v-if="store.snapshots.length > 1" class="chart-wrapper wide-chart">
          <h3>Status-Evolution über Zeit (CHF)</h3>
          <div class="chart">
            <Bar
              :data="statusEvolutionAmountData"
              :options="stackedAmountChartOptions"
            />
          </div>
        </div>

        <div v-if="store.snapshots.length > 1" class="recovery-stats">
          <h3>Recovery Analyse</h3>
          <p class="hint">
            Rechnungen, die in einem früheren Snapshot waren, aber in einem
            späteren verschwunden sind, gelten als bezahlt.
          </p>
          <div class="stats-container">
            <div
              class="stat-card"
              v-for="(data, status) in recoveryStats"
              :key="status"
            >
              <h4>{{ status }}</h4>
              <p class="count">
                {{ data.recovered }} / {{ data.total }} bezahlt
              </p>
              <p class="amount">{{ data.rate }}%</p>
            </div>
          </div>
        </div>

        <div v-if="store.snapshots.length > 1" class="chart-wrapper wide-chart">
          <h3>Recovery Rate nach Eskalationsstufe</h3>
          <div class="chart">
            <Bar :data="recoveryChartData" :options="recoveryChartOptions" />
          </div>
        </div>

        <div v-if="daysToPaymentStats.count > 0" class="stats-container">
          <div class="stat-card highlight">
            <h4>Ø Tage bis Zahlung</h4>
            <p class="count">{{ daysToPaymentStats.average }} Tage</p>
            <p class="amount">
              basierend auf {{ daysToPaymentStats.count }} bezahlten Rechnungen
            </p>
          </div>
          <div class="stat-card highlight">
            <h4>Median Tage bis Zahlung</h4>
            <p class="count">{{ daysToPaymentStats.median }} Tage</p>
          </div>
          <div class="stat-card highlight">
            <h4>Längste Zahlungsdauer</h4>
            <p class="count">{{ daysToPaymentStats.max }} Tage</p>
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
} from "chart.js";
import { Pie, Bar } from "vue-chartjs";
import * as XLSX from "xlsx";
import { format, parse, differenceInDays } from "date-fns";
import {
  useFinanceStore,
  type Invoice,
  type InvoiceSnapshot,
} from "../stores/financeStore";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
);

const store = useFinanceStore();

const selectedFiles = ref<FileList | null>(null);
const processing = ref(false);
const error = ref("");

const hasData = computed(() => store.hasData);
const invoiceData = computed(() => store.invoiceData);

const colorPalette = ["#1a519b", "#ff4444", "#ffbb33", "#ff8800", "#00C851"];

const statusColors: Record<string, string> = {
  Offen: "#1a519b",
  "1. Mahnung": "#ffbb33",
  "2. Mahnung": "#ff8800",
  "3. Mahnung": "#ff4444",
};

const STATUSES = ["Offen", "1. Mahnung", "2. Mahnung", "3. Mahnung"];

const formatNumber = (num: number): string => {
  return num.toLocaleString("de-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
          parseInt(day),
        );
        return isValidDate(parsedDate) ? parsedDate : null;
      }
    } catch {
      return null;
    }
  }
  return null;
};

const isValidDate = (date: any): boolean => {
  return date instanceof Date && !isNaN(date.getTime());
};

const extractTimestampFromFilename = (filename: string): Date => {
  const match = filename.match(/(\d{12})/);
  if (!match) throw new Error(`Invalid filename format: ${filename}`);
  return parse(match[1], "yyyyMMddHHmm", new Date());
};

const extractStatus = (fullStatus: string): string => {
  if (!fullStatus) return "Offen";
  const statusPart = fullStatus.split(":")[0].trim();
  if (statusPart.includes("1. Mahnung")) return "1. Mahnung";
  if (statusPart.includes("2. Mahnung")) return "2. Mahnung";
  if (statusPart.includes("3. Mahnung")) return "3. Mahnung";
  return "Offen";
};

// Snapshot labels for upload-info section
const snapshotLabels = computed(() =>
  store.snapshots.map((s) => format(s.timestamp, "MMM yyyy")),
);

// =====================================================
// EXISTING CHARTS (Latest Snapshot)
// =====================================================
const statusData = computed(() => {
  const data: { [key: string]: { count: number; amount: number } } = {
    Offen: { count: 0, amount: 0 },
    "1. Mahnung": { count: 0, amount: 0 },
    "2. Mahnung": { count: 0, amount: 0 },
    "3. Mahnung": { count: 0, amount: 0 },
  };

  invoiceData.value.forEach((invoice) => {
    const status = extractStatus(invoice.rechnungsstatus);
    if (status in data) {
      data[status].count++;
      data[status].amount += invoice.total;
    }
  });

  return data;
});

const totalInvoices = computed(() =>
  Object.values(statusData.value).reduce((sum, d) => sum + d.count, 0),
);

const totalAmount = computed(() =>
  Object.values(statusData.value).reduce((sum, d) => sum + d.amount, 0),
);

const invoiceStatusChartData = computed(() => ({
  labels: Object.keys(statusData.value),
  datasets: [
    {
      data: Object.values(statusData.value).map((d) => d.amount),
      backgroundColor: STATUSES.map((s) => statusColors[s]),
    },
  ],
}));

const monthlyOutstandingData = computed(() => {
  const monthlyData = new Map<string, number>();

  invoiceData.value.forEach((invoice) => {
    if (invoice.zahlbarBis) {
      const monthKey = format(invoice.zahlbarBis, "MMM yyyy");
      monthlyData.set(
        monthKey,
        (monthlyData.get(monthKey) || 0) + invoice.total,
      );
    }
  });

  const sortedEntries = Array.from(monthlyData.entries()).sort((a, b) => {
    const dateA = parse(a[0], "MMM yyyy", new Date());
    const dateB = parse(b[0], "MMM yyyy", new Date());
    return dateA.getTime() - dateB.getTime();
  });

  return {
    labels: sortedEntries.map(([month]) => month),
    datasets: [
      {
        label: "Outstanding Amount",
        data: sortedEntries.map(([, amount]) => amount),
        backgroundColor: "#1a519b",
      },
    ],
  };
});

// =====================================================
// NEW: MULTI-SNAPSHOT CHARTS
// =====================================================

// Status-Evolution Over Time (Count)
const statusEvolutionData = computed(() => {
  const labels = store.snapshots.map((s) => format(s.timestamp, "MMM yyyy"));

  const datasets = STATUSES.map((status) => ({
    label: status,
    data: store.snapshots.map(
      (snap) =>
        snap.invoices.filter(
          (inv) => extractStatus(inv.rechnungsstatus) === status,
        ).length,
    ),
    backgroundColor: statusColors[status],
  }));

  return { labels, datasets };
});

// Status-Evolution Over Time (CHF)
const statusEvolutionAmountData = computed(() => {
  const labels = store.snapshots.map((s) => format(s.timestamp, "MMM yyyy"));

  const datasets = STATUSES.map((status) => ({
    label: status,
    data: store.snapshots.map((snap) =>
      snap.invoices
        .filter((inv) => extractStatus(inv.rechnungsstatus) === status)
        .reduce((sum, inv) => sum + inv.total, 0),
    ),
    backgroundColor: statusColors[status],
  }));

  return { labels, datasets };
});

// Recovery Analysis:
// For each escalation status, find invoices that appeared in any snapshot
// with that status, and check whether they're missing from the LATEST snapshot
// (= assumed paid/recovered).
const recoveryStats = computed(() => {
  if (store.snapshots.length < 2) {
    return {} as Record<
      string,
      { total: number; recovered: number; rate: number }
    >;
  }

  const latestInvoiceNumbers = new Set(
    store.latestSnapshot!.invoices.map((i) => i.rechnungsnummer),
  );

  const result: Record<
    string,
    { total: number; recovered: number; rate: number }
  > = {};

  for (const status of STATUSES) {
    // All invoice numbers that ever appeared with this status (in any snapshot
    // EXCEPT the latest — otherwise current ones inflate the "total")
    const seenWithStatus = new Set<string>();

    for (let i = 0; i < store.snapshots.length - 1; i++) {
      const snap = store.snapshots[i];
      for (const inv of snap.invoices) {
        if (extractStatus(inv.rechnungsstatus) === status) {
          seenWithStatus.add(inv.rechnungsnummer);
        }
      }
    }

    const total = seenWithStatus.size;
    const recovered = Array.from(seenWithStatus).filter(
      (rn) => !latestInvoiceNumbers.has(rn),
    ).length;
    const rate = total > 0 ? Math.round((recovered / total) * 1000) / 10 : 0;

    result[status] = { total, recovered, rate };
  }

  return result;
});

const recoveryChartData = computed(() => {
  const stats = recoveryStats.value;
  const labels = STATUSES;

  return {
    labels,
    datasets: [
      {
        label: "Recovery Rate (%)",
        data: labels.map((status) => stats[status]?.rate ?? 0),
        backgroundColor: labels.map((s) => statusColors[s]),
      },
    ],
  };
});

// Days to Payment:
// For each invoice that disappeared from later snapshots, calculate days
// between Kaufdatum and the timestamp of the snapshot where it first
// disappeared.
const daysToPaymentStats = computed(() => {
  if (store.snapshots.length < 2) {
    return { average: 0, median: 0, max: 0, count: 0 };
  }

  const days: number[] = [];

  // Build a map: invoiceNumber -> earliest Kaufdatum we've seen
  const firstSeenKaufdatum = new Map<string, Date>();

  for (const snap of store.snapshots) {
    for (const inv of snap.invoices) {
      if (!inv.kaufdatum) continue;
      if (!firstSeenKaufdatum.has(inv.rechnungsnummer)) {
        firstSeenKaufdatum.set(inv.rechnungsnummer, inv.kaufdatum);
      }
    }
  }

  // For each invoice number, find the first snapshot where it's MISSING
  // (= payment date)
  for (const [rechnungsnummer, kaufdatum] of firstSeenKaufdatum.entries()) {
    let firstSeenInSnapshot = -1;
    let firstMissingInSnapshot = -1;

    for (let i = 0; i < store.snapshots.length; i++) {
      const present = store.snapshots[i].invoices.some(
        (inv) => inv.rechnungsnummer === rechnungsnummer,
      );

      if (present && firstSeenInSnapshot === -1) {
        firstSeenInSnapshot = i;
      }

      if (firstSeenInSnapshot !== -1 && !present) {
        firstMissingInSnapshot = i;
        break;
      }
    }

    if (firstMissingInSnapshot !== -1) {
      const paymentDate = store.snapshots[firstMissingInSnapshot].timestamp;
      const diff = differenceInDays(paymentDate, kaufdatum);
      if (diff >= 0) days.push(diff);
    }
  }

  if (days.length === 0) {
    return { average: 0, median: 0, max: 0, count: 0 };
  }

  days.sort((a, b) => a - b);
  const average = Math.round(days.reduce((s, d) => s + d, 0) / days.length);
  const median = days[Math.floor(days.length / 2)];
  const max = days[days.length - 1];

  return { average, median, max, count: days.length };
});

// =====================================================
// CHART OPTIONS
// =====================================================
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "right" as const,
      labels: {
        color: "#1a519b",
        font: { family: "'Bebas Neue', sans-serif", size: 14 },
      },
    },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          const status = context.label || "";
          const amount = context.raw || 0;
          const count = statusData.value[status]?.count ?? 0;
          const total = Object.values(statusData.value).reduce(
            (sum, d) => sum + d.amount,
            0,
          );
          const percentage =
            total > 0 ? ((amount / total) * 100).toFixed(1) : "0";
          return [
            `${status}: ${count} invoices`,
            `CHF ${formatNumber(amount)} (${percentage}%)`,
          ];
        },
      },
    },
  },
};

const monthlyChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context: any) => `CHF ${formatNumber(context.raw || 0)}`,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value: number) => `CHF ${formatNumber(value)}`,
      },
    },
  },
};

const stackedChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "top" as const },
    tooltip: { mode: "index" as const, intersect: false },
  },
  scales: {
    x: { stacked: true },
    y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } },
  },
};

const stackedAmountChartOptions = {
  ...stackedChartOptions,
  scales: {
    x: { stacked: true },
    y: {
      stacked: true,
      beginAtZero: true,
      ticks: {
        callback: (value: number) => `CHF ${formatNumber(value)}`,
      },
    },
  },
  plugins: {
    ...stackedChartOptions.plugins,
    tooltip: {
      mode: "index" as const,
      intersect: false,
      callbacks: {
        label: (context: any) =>
          `${context.dataset.label}: CHF ${formatNumber(context.raw || 0)}`,
      },
    },
  },
};

const recoveryChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          const status = context.label;
          const stats = recoveryStats.value[status];
          if (!stats) return `${context.raw}%`;
          return [
            `Recovery Rate: ${stats.rate}%`,
            `${stats.recovered} von ${stats.total} bezahlt`,
          ];
        },
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      max: 100,
      ticks: { callback: (value: number) => `${value}%` },
    },
  },
};

// =====================================================
// FILE HANDLING
// =====================================================
const handleFileUpload = (event: Event) => {
  const input = event.target as HTMLInputElement;
  selectedFiles.value = input.files;
};

const processFiles = async () => {
  if (!selectedFiles.value?.length) return;

  processing.value = true;
  error.value = "";

  try {
    const newSnapshots: InvoiceSnapshot[] = [];

    for (const file of Array.from(selectedFiles.value)) {
      const timestamp = extractTimestampFromFilename(file.name);
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(worksheet);

      const invoices: Invoice[] = rawData.map((row: any) => ({
        rechnungsnummer: row["Rechnungsnummer"] || "",
        rechnungsstatus: row["Rechnungsstatus"] || "",
        total: parseFloat(row["Total"] || 0),
        betrag: parseFloat(row["Betrag"] || 0),
        teilzahlungErhalten: parseFloat(row["Teilzahlung erhalten"] || 0),
        kaufdatum: parseExcelDate(row["Kaufdatum"]),
        zahlbarBis: parseExcelDate(row["Zahlbar bis"]),
        zahlungErhalten: parseExcelDate(row["Zahlung erhalten"]),
        abonnement: row["Abonnement"] || "",
      }));

      newSnapshots.push({ timestamp, invoices });
    }

    store.addSnapshots(newSnapshots);
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
.finance {
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

.hint {
  color: #666;
  font-size: 0.9rem;
  margin: 8px 0;
}

.hint code {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.85rem;
}

.snapshot-info {
  margin-top: 12px;
  padding: 8px 16px;
  background: #e6eeff;
  color: #1a519b;
  border-radius: 4px;
  font-size: 0.9rem;
  display: inline-block;
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

.charts-container {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  margin-top: 30px;
}

.chart-wrapper {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.chart-wrapper h3 {
  margin: 0 0 20px 0;
  color: #1a519b;
  text-align: center;
}

.chart {
  height: 500px;
  position: relative;
  margin: 0 auto;
  max-width: 800px;
}

.wide-chart {
  grid-column: 1 / -1;
}

.wide-chart .chart {
  max-width: 100%;
}

.stats-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 20px;
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
}

.stat-card p {
  margin: 5px 0;
}

.stat-card .count {
  font-size: 18px;
  color: #666;
}

.stat-card .amount {
  font-size: 24px;
  font-weight: bold;
  color: #1a519b;
}

.stat-card.total {
  background-color: #1a519b;
}

.stat-card.total h4 {
  color: white;
}

.stat-card.total .count {
  color: rgba(255, 255, 255, 0.8);
}

.stat-card.total .amount {
  color: white;
}

.stat-card.highlight {
  border-left: 4px solid #1a519b;
}

.recovery-stats {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.recovery-stats h3 {
  margin: 0 0 8px 0;
  color: #1a519b;
  text-align: center;
}

.error {
  color: #ff4444;
  margin-top: 10px;
}

.progress {
  color: #1a519b;
  margin-top: 10px;
}
</style>
