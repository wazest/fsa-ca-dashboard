<template>
  <div class="finance">
    <header class="header">
      <div class="header-content">
        <h1>FSA FINANCE</h1>
      </div>
    </header>

    <main>
      <!-- ============ UPLOAD ============ -->
      <div class="upload-container">
        <h2>Upload Invoice Excel Files</h2>
        <p class="hint">
          Verwende vollständigen Export (Bezahlt + Offen + Annulliert). Du
          kannst mehrere monatliche Snapshots laden – Rechnungen werden über die
          Rechnungsnummer dedupliziert, der neueste Snapshot gewinnt.
        </p>
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
        <button v-if="hasData" @click="store.reset()" class="reset-button">
          Reset
        </button>
        <div v-if="processing" class="progress">Processing files...</div>
        <div v-if="error" class="error">{{ error }}</div>
        <div v-if="hasData" class="snapshot-info">
          {{ store.snapshots.length }} Snapshot(s) |
          {{ mergedInvoices.length }} Rechnungen total<span
            v-if="filteredInvoices.length !== mergedInvoices.length"
          >
            ({{ filteredInvoices.length }} im Filter)</span
          >
          | {{ snapshotLabels.join(", ") }}
        </div>
      </div>

      <!-- ============ YEAR FILTER ============ -->
      <div v-if="hasData && availableYears.length > 0" class="year-filter-card">
        <div class="year-filter">
          <button
            v-for="year in availableYears"
            :key="year"
            @click="toggleYear(year)"
            :class="['filter-button', { active: selectedYears.includes(year) }]"
          >
            {{ year }}
          </button>
        </div>
      </div>

      <div v-if="hasData">
        <!-- ============ AKTUELLER STATUS (offene Rechnungen) ============ -->
        <section class="section">
          <h2 class="section-title">Aktueller Status – Offene Rechnungen</h2>

          <div class="stats-container">
            <div
              v-for="status in OUTSTANDING_STATUSES"
              :key="status"
              class="stat-card"
              :style="{ borderTop: `4px solid ${statusColors[status]}` }"
            >
              <h4>{{ status }}</h4>
              <p class="count">
                {{ outstandingBreakdown[status].count }} Rechnungen
              </p>
              <p class="amount">
                CHF {{ formatNumber(outstandingBreakdown[status].amount) }}
              </p>
            </div>
            <div class="stat-card total">
              <h4>Total Offen</h4>
              <p class="count">{{ outstandingTotal.count }} Rechnungen</p>
              <p class="amount">
                CHF {{ formatNumber(outstandingTotal.amount) }}
              </p>
            </div>
          </div>

          <div class="chart-wrapper">
            <h3>Verteilung der offenen Rechnungen</h3>
            <div class="chart">
              <Pie
                :data="outstandingPieData"
                :options="outstandingPieOptions"
              />
            </div>
          </div>
        </section>

        <!-- ============ ÜBERSICHT ============ -->
        <section class="section">
          <h2 class="section-title">Übersicht</h2>
          <div class="stats-container">
            <div class="stat-card total">
              <h4>Gesamt Volumen</h4>
              <p class="count">{{ overview.totalCount }} Rechnungen</p>
              <p class="amount">CHF {{ formatNumber(overview.totalAmount) }}</p>
            </div>
            <div class="stat-card paid">
              <h4>Bezahlt</h4>
              <p class="count">{{ overview.paidCount }} Rechnungen</p>
              <p class="amount">CHF {{ formatNumber(overview.paidAmount) }}</p>
            </div>
            <div class="stat-card outstanding">
              <h4>Offen / Mahnung</h4>
              <p class="count">{{ overview.outstandingCount }} Rechnungen</p>
              <p class="amount">
                CHF {{ formatNumber(overview.outstandingAmount) }}
              </p>
            </div>
            <div class="stat-card switch">
              <h4>Abo-Wechsel</h4>
              <p class="count">
                {{ cancellationAnalysis.switchCount }} Rechnungen
              </p>
              <p class="amount">
                CHF {{ formatNumber(cancellationAnalysis.switchAmount) }}
              </p>
            </div>
            <div class="stat-card cancelled">
              <h4>Echt Annulliert</h4>
              <p class="count">
                {{ cancellationAnalysis.trueCancelCount }} Rechnungen
              </p>
              <p class="amount">
                CHF {{ formatNumber(cancellationAnalysis.trueCancelAmount) }}
              </p>
            </div>
          </div>

          <p class="hint" style="margin-top: -10px; text-align: center">
            ℹ️ Abo-Wechsel erkannt wenn derselbe Kunde innerhalb von
            {{ 30 }} Tagen eine neue (nicht annullierte) Rechnung hat.
          </p>

          <div class="chart-wrapper">
            <h3>Status Verteilung (CHF)</h3>
            <div class="chart">
              <Pie :data="statusPieData" :options="statusPieOptions" />
            </div>
          </div>
        </section>

        <!-- ============ UMSATZ & CASHFLOW ============ -->
        <section class="section">
          <h2 class="section-title">Umsatz & Cashflow</h2>

          <div class="chart-wrapper wide-chart">
            <h3>Monatlicher Umsatz vs. Cash-In</h3>
            <p class="chart-hint">
              <span class="legend-dot" style="background: #1a519b"></span>
              Umsatz (Kaufdatum, ohne Annullierte)
              <span class="legend-dot" style="background: #00c851"></span>
              Cash-In (Zahlung erhalten)
            </p>
            <div class="chart">
              <Bar :data="revenueVsCashInData" :options="moneyChartOptions" />
            </div>
          </div>

          <div class="chart-wrapper wide-chart">
            <h3>Outstanding Amount nach Fälligkeit</h3>
            <div class="chart">
              <Bar
                :data="monthlyOutstandingData"
                :options="moneyChartOptions"
              />
            </div>
          </div>
        </section>

        <!-- ============ ZAHLUNGSVERHALTEN ============ -->
        <section class="section">
          <h2 class="section-title">Zahlungsverhalten</h2>

          <div class="stats-container">
            <div class="stat-card highlight">
              <h4>Ø Tage bis Zahlung</h4>
              <p class="count">{{ paymentStats.average }} Tage</p>
              <p class="amount">{{ paymentStats.count }} bezahlte Rechnungen</p>
            </div>
            <div class="stat-card highlight">
              <h4>Median</h4>
              <p class="count">{{ paymentStats.median }} Tage</p>
            </div>
            <div class="stat-card highlight">
              <h4>Schnellste Zahlung</h4>
              <p class="count">{{ paymentStats.min }} Tage</p>
            </div>
            <div class="stat-card highlight">
              <h4>Langsamste Zahlung</h4>
              <p class="count">{{ paymentStats.max }} Tage</p>
            </div>
          </div>

          <div class="chart-wrapper wide-chart">
            <h3>Days to Payment – Verteilung</h3>
            <div class="chart">
              <Bar :data="daysHistogramData" :options="histogramOptions" />
            </div>
          </div>

          <div class="chart-wrapper wide-chart">
            <h3>Ø Tage bis Zahlung pro Abo-Typ</h3>
            <div class="chart">
              <Bar :data="daysBySubTypeData" :options="horizontalBarOptions" />
            </div>
          </div>
        </section>

        <!-- ============ AGING REPORT ============ -->
        <section class="section">
          <h2 class="section-title">Aging Report</h2>
          <p class="hint">
            Nur unbezahlte, nicht-annullierte Rechnungen. Tage seit Fälligkeit.
          </p>

          <div class="stats-container">
            <div
              v-for="bucket in agingReport.buckets"
              :key="bucket.label"
              class="stat-card"
              :style="{ borderTop: `4px solid ${bucket.color}` }"
            >
              <h4>{{ bucket.label }}</h4>
              <p class="count">{{ bucket.count }} Rechnungen</p>
              <p class="amount">CHF {{ formatNumber(bucket.amount) }}</p>
            </div>
          </div>

          <div class="chart-wrapper wide-chart">
            <h3>Aging Buckets (CHF)</h3>
            <div class="chart">
              <Bar :data="agingChartData" :options="moneyChartOptions" />
            </div>
          </div>

          <div v-if="criticalInvoices.length > 0" class="critical-table">
            <h3>⚠️ Kritisch: 90+ Tage überfällig</h3>
            <table>
              <thead>
                <tr>
                  <th>Rechnungs-Nr.</th>
                  <th>Abonnement</th>
                  <th>Fällig seit</th>
                  <th>Tage über</th>
                  <th>Status</th>
                  <th class="right">Betrag (CHF)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="inv in criticalInvoices" :key="inv.rechnungsnummer">
                  <td class="mono">{{ inv.rechnungsnummer }}</td>
                  <td>{{ inv.abonnement }}</td>
                  <td>
                    {{
                      inv.zahlbarBis
                        ? format(inv.zahlbarBis, "dd.MM.yyyy")
                        : "-"
                    }}
                  </td>
                  <td>{{ inv.daysOverdue }}</td>
                  <td>{{ extractStatus(inv.rechnungsstatus) }}</td>
                  <td class="right">{{ formatNumber(inv.total) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- ============ TRENDS ============ -->
        <section class="section">
          <h2 class="section-title">Trends</h2>

          <div class="chart-wrapper wide-chart">
            <h3>Annullierungen pro Monat (Abo-Wechsel vs. Echt)</h3>
            <div class="chart">
              <Bar
                :data="cancellationTrendData"
                :options="stackedMoneyChartOptions"
              />
            </div>
          </div>

          <div class="chart-wrapper wide-chart">
            <h3>Status pro Erstellungsmonat</h3>
            <p class="chart-hint">
              Welchen Status haben Rechnungen die in dem jeweiligen Monat
              erstellt wurden? Zeigt z.B. die Bezahl-Reifung über Zeit.
            </p>
            <div class="chart">
              <Bar :data="statusEvolutionData" :options="stackedChartOptions" />
            </div>
          </div>

          <div v-if="recoveryStats.totalMahnungen > 0" class="recovery-stats">
            <h3>Recovery Rate</h3>
            <p class="hint">
              Wieviele Rechnungen, die je in Mahnung waren, sind jetzt bezahlt?
            </p>
            <div class="stats-container">
              <div
                v-for="(data, status) in recoveryStats.byStufe"
                :key="status"
                class="stat-card"
              >
                <h4>{{ status }}</h4>
                <p class="count">
                  {{ data.recovered }} / {{ data.total }} bezahlt
                </p>
                <p class="amount">{{ data.rate }}%</p>
              </div>
              <div class="stat-card highlight">
                <h4>Gesamt-Recovery</h4>
                <p class="count">
                  {{ recoveryStats.totalRecovered }} /
                  {{ recoveryStats.totalMahnungen }}
                </p>
                <p class="amount">{{ recoveryStats.totalRate }}%</p>
              </div>
            </div>
          </div>
        </section>

        <!-- ============ ZAHLUNGSMIX ============ -->
        <section class="section">
          <h2 class="section-title">Zahlungsmix</h2>

          <div class="chart-wrapper">
            <h3>Zahlungsart der bezahlten Rechnungen</h3>
            <div class="chart">
              <Pie :data="paymentMethodData" :options="chartOptions" />
            </div>
          </div>
        </section>
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
const mergedInvoices = computed(() => store.mergedInvoices);
const filteredInvoices = computed(() => store.filteredInvoices);
const availableYears = computed(() => store.availableYears);
const selectedYears = computed(() => store.selectedYears);
const toggleYear = (year: number) => store.toggleYear(year);

const matchesYearFilter = (inv: Invoice): boolean => {
  if (store.selectedYears.length === 0) return true;
  if (!inv.kaufdatum) return false;
  return store.selectedYears.includes(inv.kaufdatum.getFullYear());
};

// ============================================================
// CONSTANTS
// ============================================================
const STATUSES = [
  "Bezahlt",
  "Offen",
  "1. Mahnung",
  "2. Mahnung",
  "3. Mahnung",
  "Annulliert",
];

// Pie chart shows annulments split into switches vs true cancellations
const PIE_STATUSES = [
  "Bezahlt",
  "Offen",
  "1. Mahnung",
  "2. Mahnung",
  "3. Mahnung",
  "Abo-Wechsel",
  "Echt Annulliert",
];

const statusColors: Record<string, string> = {
  Bezahlt: "#00C851",
  Offen: "#1a519b",
  "1. Mahnung": "#ffbb33",
  "2. Mahnung": "#ff8800",
  "3. Mahnung": "#ff4444",
  Annulliert: "#999999",
  "Abo-Wechsel": "#5a91db",
  "Echt Annulliert": "#999999",
};

const MAHNSTUFEN = ["1. Mahnung", "2. Mahnung", "3. Mahnung"];
const OUTSTANDING_STATUSES = [
  "Offen",
  "1. Mahnung",
  "2. Mahnung",
  "3. Mahnung",
];

// ============================================================
// UTILITIES
// ============================================================
const formatNumber = (num: number): string =>
  num.toLocaleString("de-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const isValidDate = (d: any): boolean =>
  d instanceof Date && !isNaN(d.getTime());

const parseExcelDate = (date: any): Date | null => {
  if (!date || date === "-") return null;
  if (typeof date === "string") {
    const [day, month, year] = date.split(".");
    if (day && month && year) {
      const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return isValidDate(d) ? d : null;
    }
  }
  return null;
};

const extractTimestampFromFilename = (filename: string): Date => {
  const match = filename.match(/(\d{12})/);
  if (!match) throw new Error(`Invalid filename format: ${filename}`);
  return parse(match[1], "yyyyMMddHHmm", new Date());
};

const extractStatus = (fullStatus: string): string => {
  if (!fullStatus) return "Offen";
  const part = fullStatus.split(":")[0].trim();
  if (part === "Bezahlt") return "Bezahlt";
  if (part === "Annulliert") return "Annulliert";
  if (part.includes("1. Mahnung")) return "1. Mahnung";
  if (part.includes("2. Mahnung")) return "2. Mahnung";
  if (part.includes("3. Mahnung")) return "3. Mahnung";
  return "Offen";
};

// Reuse Dashboard's classification (kept local to keep Finance standalone)
const getSubscriptionType = (subscription: string): string => {
  const s = (subscription || "").toLowerCase();
  if (s.includes("striking")) return "Striking";
  if (s.includes("grappling")) return "Grappling";
  if (s.includes("mma")) return "MMA";
  if (s.includes("fit") || s.includes("athletik")) return "Fit & Athletik";
  if (s.includes("kinder") || s.includes("jugendliche")) return "Kinder";
  if (s.includes("personal training")) return "Personal Training";
  if (s.includes("nutrition")) return "Nutrition";
  if (s.includes("probetraining")) return "Probetraining";
  return "Other";
};

const monthKey = (d: Date) => format(d, "MMM yyyy");
const sortMonthKeys = (keys: string[]) =>
  [...keys].sort(
    (a, b) =>
      parse(a, "MMM yyyy", new Date()).getTime() -
      parse(b, "MMM yyyy", new Date()).getTime(),
  );

const snapshotLabels = computed(() =>
  store.snapshots.map((s) => format(s.timestamp, "MMM yyyy")),
);

// ============================================================
// SECTION: AKTUELLER STATUS (outstanding only)
// ============================================================
const outstandingBreakdown = computed(() => {
  const data: Record<string, { count: number; amount: number }> = {};
  for (const s of OUTSTANDING_STATUSES) data[s] = { count: 0, amount: 0 };

  for (const inv of filteredInvoices.value) {
    const status = extractStatus(inv.rechnungsstatus);
    if (status in data) {
      data[status].count += 1;
      data[status].amount += inv.total;
    }
  }

  return data;
});

const outstandingTotal = computed(() => {
  let count = 0;
  let amount = 0;
  for (const s of OUTSTANDING_STATUSES) {
    count += outstandingBreakdown.value[s].count;
    amount += outstandingBreakdown.value[s].amount;
  }
  return { count, amount };
});

const outstandingPieData = computed(() => ({
  labels: OUTSTANDING_STATUSES,
  datasets: [
    {
      data: OUTSTANDING_STATUSES.map(
        (s) => outstandingBreakdown.value[s].amount,
      ),
      backgroundColor: OUTSTANDING_STATUSES.map((s) => statusColors[s]),
    },
  ],
}));

const outstandingPieOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "right" as const,
      labels: { color: "#1a519b" },
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const status = ctx.label || "";
          const amount = ctx.raw || 0;
          const count = outstandingBreakdown.value[status]?.count ?? 0;
          const total = outstandingTotal.value.amount;
          const pct = total > 0 ? ((amount / total) * 100).toFixed(1) : "0";
          return [
            `${status}: ${count} Rechnungen`,
            `CHF ${formatNumber(amount)} (${pct}%)`,
          ];
        },
      },
    },
  },
};

// ============================================================
// SECTION: ÜBERSICHT
// ============================================================
const overview = computed(() => {
  const result = {
    totalCount: 0,
    totalAmount: 0,
    paidCount: 0,
    paidAmount: 0,
    outstandingCount: 0,
    outstandingAmount: 0,
    cancelledCount: 0,
    cancelledAmount: 0,
  };

  for (const inv of filteredInvoices.value) {
    const status = extractStatus(inv.rechnungsstatus);
    result.totalCount += 1;
    result.totalAmount += inv.total;

    if (status === "Bezahlt") {
      result.paidCount += 1;
      result.paidAmount += inv.total;
    } else if (status === "Annulliert") {
      result.cancelledCount += 1;
      result.cancelledAmount += inv.total;
    } else {
      result.outstandingCount += 1;
      result.outstandingAmount += inv.total;
    }
  }

  return result;
});

const statusBreakdown = computed(() => {
  const data: Record<string, { count: number; amount: number }> = {};
  for (const s of STATUSES) data[s] = { count: 0, amount: 0 };

  for (const inv of filteredInvoices.value) {
    const status = extractStatus(inv.rechnungsstatus);
    if (status in data) {
      data[status].count += 1;
      data[status].amount += inv.total;
    }
  }

  return data;
});

const pieBreakdown = computed(() => {
  const data: Record<string, { count: number; amount: number }> = {};
  for (const s of PIE_STATUSES) data[s] = { count: 0, amount: 0 };

  const analysis = cancellationAnalysis.value;

  for (const inv of filteredInvoices.value) {
    const status = extractStatus(inv.rechnungsstatus);

    if (status === "Annulliert") {
      const bucket = analysis.switches.has(inv.rechnungsnummer)
        ? "Abo-Wechsel"
        : "Echt Annulliert";
      data[bucket].count += 1;
      data[bucket].amount += inv.total;
    } else if (status in data) {
      data[status].count += 1;
      data[status].amount += inv.total;
    }
  }

  return data;
});

const statusPieData = computed(() => ({
  labels: PIE_STATUSES,
  datasets: [
    {
      data: PIE_STATUSES.map((s) => pieBreakdown.value[s].amount),
      backgroundColor: PIE_STATUSES.map((s) => statusColors[s]),
    },
  ],
}));

const statusPieOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "right" as const,
      labels: { color: "#1a519b" },
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const label = ctx.label || "";
          const amount = ctx.raw || 0;
          const count = pieBreakdown.value[label]?.count ?? 0;
          const total = PIE_STATUSES.reduce(
            (sum, s) => sum + pieBreakdown.value[s].amount,
            0,
          );
          const pct = total > 0 ? ((amount / total) * 100).toFixed(1) : "0";
          return [
            `${label}: ${count} Rechnungen`,
            `CHF ${formatNumber(amount)} (${pct}%)`,
          ];
        },
      },
    },
  },
};

// ============================================================
// SECTION: UMSATZ & CASHFLOW
// ============================================================
const revenueVsCashInData = computed(() => {
  const revenue = new Map<string, number>(); // by Kaufdatum
  const cashIn = new Map<string, number>(); // by Zahlung erhalten

  for (const inv of filteredInvoices.value) {
    const status = extractStatus(inv.rechnungsstatus);

    // Revenue: alle ausser Annulliert, grouped by Kaufdatum
    if (status !== "Annulliert" && inv.kaufdatum) {
      const key = monthKey(inv.kaufdatum);
      revenue.set(key, (revenue.get(key) ?? 0) + inv.total);
    }

    // Cash-In: nur Bezahlt mit Zahlung-erhalten-Datum
    if (status === "Bezahlt" && inv.zahlungErhalten) {
      const key = monthKey(inv.zahlungErhalten);
      cashIn.set(key, (cashIn.get(key) ?? 0) + inv.total);
    }
  }

  const allKeys = sortMonthKeys(
    Array.from(new Set([...revenue.keys(), ...cashIn.keys()])),
  );

  return {
    labels: allKeys,
    datasets: [
      {
        label: "Umsatz (Kaufdatum)",
        data: allKeys.map((k) => revenue.get(k) ?? 0),
        backgroundColor: "#1a519b",
      },
      {
        label: "Cash-In (Zahlung erhalten)",
        data: allKeys.map((k) => cashIn.get(k) ?? 0),
        backgroundColor: "#00C851",
      },
    ],
  };
});

const monthlyOutstandingData = computed(() => {
  const monthly = new Map<string, number>();

  for (const inv of filteredInvoices.value) {
    const status = extractStatus(inv.rechnungsstatus);
    if (status === "Bezahlt" || status === "Annulliert") continue;
    if (!inv.zahlbarBis) continue;
    const key = monthKey(inv.zahlbarBis);
    monthly.set(key, (monthly.get(key) ?? 0) + inv.total);
  }

  const keys = sortMonthKeys(Array.from(monthly.keys()));
  return {
    labels: keys,
    datasets: [
      {
        label: "Outstanding (CHF)",
        data: keys.map((k) => monthly.get(k) ?? 0),
        backgroundColor: "#ff8800",
      },
    ],
  };
});

// ============================================================
// SECTION: ZAHLUNGSVERHALTEN
// ============================================================
const paidWithDays = computed(() =>
  filteredInvoices.value
    .filter(
      (inv) =>
        extractStatus(inv.rechnungsstatus) === "Bezahlt" &&
        inv.kaufdatum &&
        inv.zahlungErhalten,
    )
    .map((inv) => ({
      inv,
      days: differenceInDays(inv.zahlungErhalten!, inv.kaufdatum!),
    }))
    .filter((x) => x.days >= 0),
);

const paymentStats = computed(() => {
  const days = paidWithDays.value.map((x) => x.days);
  if (days.length === 0)
    return { average: 0, median: 0, min: 0, max: 0, count: 0 };

  const sorted = [...days].sort((a, b) => a - b);
  const sum = sorted.reduce((s, d) => s + d, 0);
  return {
    average: Math.round(sum / sorted.length),
    median: sorted[Math.floor(sorted.length / 2)],
    min: sorted[0],
    max: sorted[sorted.length - 1],
    count: sorted.length,
  };
});

const daysHistogramData = computed(() => {
  const buckets = [
    { label: "0-7 Tage", min: 0, max: 7, count: 0 },
    { label: "8-14 Tage", min: 8, max: 14, count: 0 },
    { label: "15-30 Tage", min: 15, max: 30, count: 0 },
    { label: "31-60 Tage", min: 31, max: 60, count: 0 },
    { label: "61-90 Tage", min: 61, max: 90, count: 0 },
    { label: "90+ Tage", min: 91, max: Infinity, count: 0 },
  ];

  for (const { days } of paidWithDays.value) {
    const bucket = buckets.find((b) => days >= b.min && days <= b.max);
    if (bucket) bucket.count += 1;
  }

  return {
    labels: buckets.map((b) => b.label),
    datasets: [
      {
        label: "Anzahl Rechnungen",
        data: buckets.map((b) => b.count),
        backgroundColor: [
          "#00C851",
          "#7ab1fb",
          "#1a519b",
          "#ffbb33",
          "#ff8800",
          "#ff4444",
        ],
      },
    ],
  };
});

const daysBySubTypeData = computed(() => {
  const map = new Map<string, { sum: number; count: number }>();

  for (const { inv, days } of paidWithDays.value) {
    const type = getSubscriptionType(inv.abonnement);
    if (!map.has(type)) map.set(type, { sum: 0, count: 0 });
    const entry = map.get(type)!;
    entry.sum += days;
    entry.count += 1;
  }

  const entries = Array.from(map.entries())
    .map(([type, { sum, count }]) => ({
      type,
      avg: Math.round(sum / count),
      count,
    }))
    .sort((a, b) => b.avg - a.avg);

  return {
    labels: entries.map((e) => `${e.type} (${e.count})`),
    datasets: [
      {
        label: "Ø Tage bis Zahlung",
        data: entries.map((e) => e.avg),
        backgroundColor: "#1a519b",
      },
    ],
  };
});

// ============================================================
// SECTION: AGING REPORT
// ============================================================
const today = new Date();

const agingReport = computed(() => {
  const buckets = [
    {
      label: "Nicht fällig",
      min: -Infinity,
      max: -1,
      count: 0,
      amount: 0,
      color: "#00C851",
    },
    {
      label: "0-30 Tage",
      min: 0,
      max: 30,
      count: 0,
      amount: 0,
      color: "#ffbb33",
    },
    {
      label: "31-60 Tage",
      min: 31,
      max: 60,
      count: 0,
      amount: 0,
      color: "#ff8800",
    },
    {
      label: "61-90 Tage",
      min: 61,
      max: 90,
      count: 0,
      amount: 0,
      color: "#ff4444",
    },
    {
      label: "90+ Tage",
      min: 91,
      max: Infinity,
      count: 0,
      amount: 0,
      color: "#990000",
    },
  ];

  for (const inv of filteredInvoices.value) {
    const status = extractStatus(inv.rechnungsstatus);
    if (status === "Bezahlt" || status === "Annulliert") continue;
    if (!inv.zahlbarBis) continue;

    const overdue = differenceInDays(today, inv.zahlbarBis);
    const bucket = buckets.find((b) => overdue >= b.min && overdue <= b.max);
    if (bucket) {
      bucket.count += 1;
      bucket.amount += inv.total;
    }
  }

  return { buckets };
});

const agingChartData = computed(() => ({
  labels: agingReport.value.buckets.map((b) => b.label),
  datasets: [
    {
      label: "CHF",
      data: agingReport.value.buckets.map((b) => b.amount),
      backgroundColor: agingReport.value.buckets.map((b) => b.color),
    },
  ],
}));

const criticalInvoices = computed(() => {
  return filteredInvoices.value
    .filter((inv) => {
      const status = extractStatus(inv.rechnungsstatus);
      if (status === "Bezahlt" || status === "Annulliert") return false;
      if (!inv.zahlbarBis) return false;
      return differenceInDays(today, inv.zahlbarBis) > 90;
    })
    .map((inv) => ({
      ...inv,
      daysOverdue: differenceInDays(today, inv.zahlbarBis!),
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
});

// ============================================================
// CANCELLATION ANALYSIS: Switch vs True Cancellation
// Heuristik: Wenn derselbe Kunde innerhalb von SWITCH_WINDOW_DAYS Tagen
// eine NICHT-annullierte Rechnung hat → Abo-Wechsel.
// ============================================================
const SWITCH_WINDOW_DAYS = 30;

const cancellationAnalysis = computed(() => {
  // Build customer → invoices map (from ALL invoices for accurate lookup,
  // even if year filter is active — we want to find switches across years)
  const byCustomer = new Map<string, Invoice[]>();
  for (const inv of mergedInvoices.value) {
    if (!inv.customerId) continue;
    if (!byCustomer.has(inv.customerId)) byCustomer.set(inv.customerId, []);
    byCustomer.get(inv.customerId)!.push(inv);
  }

  const switches = new Set<string>();
  const trueCancellations = new Set<string>();

  for (const inv of filteredInvoices.value) {
    if (extractStatus(inv.rechnungsstatus) !== "Annulliert") continue;

    if (!inv.kaufdatum || !inv.customerId) {
      trueCancellations.add(inv.rechnungsnummer);
      continue;
    }

    const customerInvoices = byCustomer.get(inv.customerId) || [];
    const hasNearbyNonCancelled = customerInvoices.some((other) => {
      if (other.rechnungsnummer === inv.rechnungsnummer) return false;
      if (extractStatus(other.rechnungsstatus) === "Annulliert") return false;
      if (!other.kaufdatum) return false;
      const days = Math.abs(differenceInDays(other.kaufdatum, inv.kaufdatum!));
      return days <= SWITCH_WINDOW_DAYS;
    });

    if (hasNearbyNonCancelled) {
      switches.add(inv.rechnungsnummer);
    } else {
      trueCancellations.add(inv.rechnungsnummer);
    }
  }

  // Calculate amounts
  let switchAmount = 0;
  let trueCancelAmount = 0;
  for (const inv of filteredInvoices.value) {
    if (switches.has(inv.rechnungsnummer)) switchAmount += inv.total;
    else if (trueCancellations.has(inv.rechnungsnummer))
      trueCancelAmount += inv.total;
  }

  return {
    switches,
    trueCancellations,
    switchCount: switches.size,
    trueCancelCount: trueCancellations.size,
    switchAmount,
    trueCancelAmount,
  };
});

// ============================================================
// SECTION: TRENDS
// ============================================================
const cancellationTrendData = computed(() => {
  const switches = new Map<string, number>();
  const trueCancels = new Map<string, number>();
  const analysis = cancellationAnalysis.value;

  for (const inv of filteredInvoices.value) {
    if (extractStatus(inv.rechnungsstatus) !== "Annulliert") continue;
    if (!inv.kaufdatum) continue;
    const key = monthKey(inv.kaufdatum);

    if (analysis.switches.has(inv.rechnungsnummer)) {
      switches.set(key, (switches.get(key) ?? 0) + inv.total);
    } else {
      trueCancels.set(key, (trueCancels.get(key) ?? 0) + inv.total);
    }
  }

  const keys = sortMonthKeys(
    Array.from(new Set([...switches.keys(), ...trueCancels.keys()])),
  );

  return {
    labels: keys,
    datasets: [
      {
        label: "Abo-Wechsel",
        data: keys.map((k) => switches.get(k) ?? 0),
        backgroundColor: "#5a91db",
      },
      {
        label: "Echt Annulliert",
        data: keys.map((k) => trueCancels.get(k) ?? 0),
        backgroundColor: "#999999",
      },
    ],
  };
});

// Status-Evolution: grouped by Kaufdatum-Monat. Zeigt für Rechnungen die in
// einem bestimmten Monat erstellt wurden, wie deren Status heute aussieht.
const statusEvolutionData = computed(() => {
  const analysis = cancellationAnalysis.value;
  const byMonth = new Map<string, Record<string, number>>();

  for (const inv of filteredInvoices.value) {
    if (!inv.kaufdatum) continue;
    const key = monthKey(inv.kaufdatum);

    if (!byMonth.has(key)) {
      const initial: Record<string, number> = {};
      for (const s of PIE_STATUSES) initial[s] = 0;
      byMonth.set(key, initial);
    }

    const status = extractStatus(inv.rechnungsstatus);
    const bucket =
      status === "Annulliert"
        ? analysis.switches.has(inv.rechnungsnummer)
          ? "Abo-Wechsel"
          : "Echt Annulliert"
        : status;

    byMonth.get(key)![bucket] += 1;
  }

  const labels = sortMonthKeys(Array.from(byMonth.keys()));

  const datasets = PIE_STATUSES.map((status) => ({
    label: status,
    data: labels.map((label) => byMonth.get(label)![status] ?? 0),
    backgroundColor: statusColors[status],
  }));

  return { labels, datasets };
});

// Recovery Rate – needs multi-snapshot data to be exact.
// We track each Rechnungsnummer's "worst" status across history, then check
// if it ended as "Bezahlt" in the merged view.
const recoveryStats = computed(() => {
  if (store.snapshots.length < 2) {
    return {
      byStufe: {} as Record<
        string,
        { total: number; recovered: number; rate: number }
      >,
      totalMahnungen: 0,
      totalRecovered: 0,
      totalRate: 0,
    };
  }

  // For each Rechnungsnummer, find the highest Mahnstufe ever reached
  const worstStufe = new Map<string, string>();
  for (const snap of store.snapshots) {
    for (const inv of snap.invoices) {
      if (!matchesYearFilter(inv)) continue;
      const status = extractStatus(inv.rechnungsstatus);
      if (!MAHNSTUFEN.includes(status)) continue;
      const current = worstStufe.get(inv.rechnungsnummer);
      const currentLevel = current ? MAHNSTUFEN.indexOf(current) : -1;
      const newLevel = MAHNSTUFEN.indexOf(status);
      if (newLevel > currentLevel) {
        worstStufe.set(inv.rechnungsnummer, status);
      }
    }
  }

  // Now check current status in merged view
  const currentStatus = new Map<string, string>();
  for (const inv of filteredInvoices.value) {
    currentStatus.set(inv.rechnungsnummer, extractStatus(inv.rechnungsstatus));
  }

  const byStufe: Record<
    string,
    { total: number; recovered: number; rate: number }
  > = {};
  for (const stufe of MAHNSTUFEN) {
    byStufe[stufe] = { total: 0, recovered: 0, rate: 0 };
  }

  let totalMahnungen = 0;
  let totalRecovered = 0;

  for (const [rn, stufe] of worstStufe) {
    byStufe[stufe].total += 1;
    totalMahnungen += 1;
    if (currentStatus.get(rn) === "Bezahlt") {
      byStufe[stufe].recovered += 1;
      totalRecovered += 1;
    }
  }

  for (const stufe of MAHNSTUFEN) {
    const { total, recovered } = byStufe[stufe];
    byStufe[stufe].rate =
      total > 0 ? Math.round((recovered / total) * 1000) / 10 : 0;
  }

  return {
    byStufe,
    totalMahnungen,
    totalRecovered,
    totalRate:
      totalMahnungen > 0
        ? Math.round((totalRecovered / totalMahnungen) * 1000) / 10
        : 0,
  };
});

// ============================================================
// SECTION: ZAHLUNGSMIX
// ============================================================
const paymentMethodData = computed(() => {
  const map = new Map<string, number>();
  for (const inv of filteredInvoices.value) {
    if (extractStatus(inv.rechnungsstatus) !== "Bezahlt") continue;
    const method = inv.zahlungsart || "Unbekannt";
    map.set(method, (map.get(method) ?? 0) + inv.total);
  }

  const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  const colors = [
    "#1a519b",
    "#3a71bb",
    "#5a91db",
    "#7ab1fb",
    "#999999",
    "#cccccc",
  ];

  return {
    labels: sorted.map(([m]) => m),
    datasets: [
      {
        data: sorted.map(([, v]) => v),
        backgroundColor: sorted.map((_, i) => colors[i % colors.length]),
      },
    ],
  };
});

// ============================================================
// CHART OPTIONS
// ============================================================
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "right" as const,
      labels: { color: "#1a519b" },
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) => `${ctx.label}: CHF ${formatNumber(ctx.raw || 0)}`,
      },
    },
  },
};

const moneyChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, position: "top" as const },
    tooltip: {
      callbacks: {
        label: (ctx: any) =>
          `${ctx.dataset.label}: CHF ${formatNumber(ctx.raw || 0)}`,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { callback: (v: number) => `CHF ${formatNumber(v)}` },
    },
  },
};

const stackedMoneyChartOptions = {
  ...moneyChartOptions,
  scales: {
    x: { stacked: true },
    y: {
      stacked: true,
      beginAtZero: true,
      ticks: { callback: (v: number) => `CHF ${formatNumber(v)}` },
    },
  },
};

const histogramOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
};

const horizontalBarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: "y" as const,
  plugins: { legend: { display: false } },
  scales: { x: { beginAtZero: true } },
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

// ============================================================
// FILE HANDLING
// ============================================================
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

      const invoices: Invoice[] = rawData.map((row: any) => {
        const rechnungsnummer = row["Rechnungsnummer"] || "";
        // Format: #01344-CUSTOMER_ID-INVOICE_ID
        const customerMatch = rechnungsnummer.match(/#\d+-(\d+)-\d+/);
        const customerId = customerMatch ? customerMatch[1] : "";

        return {
          rechnungsnummer,
          customerId,
          rechnungsstatus: row["Rechnungsstatus"] || "",
          total: parseFloat(row["Total"] || 0),
          betrag: parseFloat(row["Betrag"] || 0),
          teilzahlungErhalten: parseFloat(row["Teilzahlung erhalten"] || 0),
          kaufdatum: parseExcelDate(row["Kaufdatum"]),
          zahlbarBis: parseExcelDate(row["Zahlbar bis"]),
          zahlungErhalten: parseExcelDate(row["Zahlung erhalten"]),
          abonnement: row["Abonnement"] || "",
          zahlungsart: row["Zahlungsart"] || "",
        };
      });

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

.section {
  margin-bottom: 50px;
}

.section-title {
  font-family: "Chakra Petch", sans-serif;
  color: #1a519b;
  border-bottom: 2px solid #1a519b;
  padding-bottom: 8px;
  margin-bottom: 20px;
  text-transform: uppercase;
  font-size: 1.5rem;
}

.upload-container {
  padding: 20px;
  border: 2px dashed #ccc;
  border-radius: 8px;
  text-align: center;
  margin-bottom: 30px;
  background: white;
}

.hint {
  color: #666;
  font-size: 0.9rem;
  margin: 8px 0;
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

.year-filter-card {
  background: white;
  padding: 20px;
  margin-bottom: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.year-filter {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
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

.process-button,
.reset-button {
  margin-top: 10px;
  margin-left: 5px;
  padding: 8px 16px;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: "Bebas Neue", sans-serif;
  font-size: 16px;
}

.process-button {
  background-color: #1a519b;
}

.reset-button {
  background-color: #999;
}

.process-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.chart-wrapper {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.chart-wrapper h3 {
  margin: 0 0 20px 0;
  color: #1a519b;
  text-align: center;
}

.chart-hint {
  text-align: center;
  font-size: 0.85rem;
  color: #666;
  margin: -10px 0 15px;
}

.legend-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin: 0 4px 0 10px;
  vertical-align: middle;
}

.chart {
  height: 400px;
  position: relative;
}

.wide-chart .chart {
  height: 500px;
}

.stats-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
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

.stat-card .count {
  font-size: 16px;
  color: #666;
  margin: 4px 0;
}

.stat-card .amount {
  font-size: 22px;
  font-weight: bold;
  color: #1a519b;
  margin: 4px 0;
}

.stat-card.total {
  background-color: #1a519b;
  color: white;
}

.stat-card.total h4,
.stat-card.total .amount {
  color: white;
}

.stat-card.total .count {
  color: rgba(255, 255, 255, 0.8);
}

.stat-card.paid {
  border-top: 4px solid #00c851;
}

.stat-card.outstanding {
  border-top: 4px solid #ff8800;
}

.stat-card.cancelled {
  border-top: 4px solid #999;
}

.stat-card.switch {
  border-top: 4px solid #5a91db;
}

.stat-card.highlight {
  border-left: 4px solid #1a519b;
}

.critical-table {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-top: 20px;
}

.critical-table h3 {
  color: #ff4444;
  text-align: center;
}

.critical-table table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
}

.critical-table th,
.critical-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
  font-size: 0.9rem;
}

.critical-table th {
  background: #f8f9fa;
  color: #1a519b;
}

.critical-table .right {
  text-align: right;
}

.critical-table .mono {
  font-family: monospace;
  font-size: 0.85rem;
}

.recovery-stats {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-top: 20px;
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
