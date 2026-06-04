<template>
  <div class="dashboard">
    <header class="header">
      <div class="header-content">
        <h1>FSA CUSTOMER DATA DASHBOARD</h1>

        <div class="settings-dropdown">
          <select id="pricing-select" v-model="selectedPricing">
            <option value="2025">Pricing 2025</option>
            <option value="2026">Pricing 2026</option>
          </select>
        </div>
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
            <h3>Relevant Types Revenue</h3>
            <Pie
              :data="relevantTypesRevenueData"
              :options="revenueChartOptions"
            />
          </div>
          <div class="chart">
            <h3>Subscription Duration Distribution</h3>
            <Pie :data="subscriptionDurationData" :options="chartOptions" />
          </div>
          <div class="chart">
            <h3>Revenue per Customer</h3>
            <Bar :data="revenuePerCustomerData" :options="barChartOptions" />
          </div>
          <div class="chart">
            <h3>Upgrade Funnel: Normal vs Pro</h3>
            <Bar :data="upgradeFunnelData" :options="stackedChartOptions" />
          </div>
          <div class="chart">
            <h3>Salutation Distribution</h3>
            <Pie :data="salutationDistributionData" :options="chartOptions" />
          </div>
          <div class="chart">
            <h3>Age Group Distribution</h3>
            <Bar :data="ageGroupDistributionData" :options="barChartOptions" />
          </div>
          <div class="chart wide-chart">
            <h3>Current Subscriptions Revenue</h3>
            <Bar
              :data="allSubscriptionsRevenueData"
              :options="revenueChartOptions"
            />
          </div>
          <div class="chart wide-chart">
            <div class="chart-header">
              <h3>Subscription Growth Over Time</h3>

              <label
                class="switch-label"
                :class="{ disabled: selectedYears.length !== 1 }"
              >
                <input
                  type="checkbox"
                  v-model="compareToPreviousYear"
                  :disabled="selectedYears.length !== 1"
                />
                Compare to pre year
              </label>
            </div>

            <Line :data="subscriptionGrowthData" :options="lineChartOptions" />
          </div>
          <div class="chart wide-chart">
            <div class="chart-header">
              <h3>Special Training Packages</h3>

              <label
                class="switch-label"
                :class="{ disabled: selectedYears.length !== 1 }"
              >
                <input
                  type="checkbox"
                  v-model="compareToPreviousYear"
                  :disabled="selectedYears.length !== 1"
                />
                Compare to pre year
              </label>
            </div>

            <Line :data="specialTrainingData" :options="lineChartOptions" />
          </div>
          <div class="chart wide-chart">
            <h3>Trial Training Overview</h3>
            <Line :data="probetrainingData" :options="lineChartOptions" />
          </div>
          <div class="chart wide-chart">
            <h3>Monthly Conversions by Type</h3>
            <Bar :data="conversionChartData" :options="barChartOptions" />
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
                'Kinder',
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
            <h3>
              Auslaufende gekündigte Abos (gemäss Gültig bis, kein Folgeabo)
            </h3>
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
import { useDashboardStore } from "../stores/dashboardStore";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
);

// --- Store ---
const store = useDashboardStore();

// Destructure store state (bleibt reaktiv via store.xxx)
const processing = ref(false);
const error = ref("");
const selectedFiles = ref<FileList | null>(null);

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

const relevantTypes = [
  "Striking",
  "Grappling",
  "MMA",
  "Fit & Athletik",
  "Kinder",
];

const subscriptionPrices2026: SubscriptionPrice[] = [
  { name: "Mitarbeiter", price: 0 },
  { name: "Striking 1 Jahr | reduziert | Ratenzahlung", price: 995 },
  { name: "Striking 1 Jahr | Ratenzahlung", price: 1250 },
  { name: "Striking 6 Monate | reduziert | Ratenzahlung", price: 720 },
  { name: "Striking 6 Monate | Ratenzahlung", price: 850 },
  { name: "MMA 6 Monate | Ratenzahlung", price: 996 },
  { name: "Kinder & Jugendliche 6 Monate", price: 490 },
  { name: "MMA Pro 6 Monate | reduziert | Ratenzahlung", price: 1240 },
  { name: "MMA Pro 1 Jahr | Ratenzahlung", price: 1905 },
  { name: "MMA Pro 6 Monate | Ratenzahlung", price: 1391 },
  { name: "MMA Pro 1 Jahr | monatlich", price: 1980 },
  { name: "MMA Pro 1 Jahr | reduziert | monatlich", price: 1740 },
  { name: "Striking 1 Jahr | Legacy", price: 1250 },
  { name: "Week Pass Fit & Athletik", price: 50 },
  { name: "Grappling 1 Jahr", price: 995 },
  { name: "Goal Getter Personal Training | monatlich", price: 130 },
  { name: "MMA 6 Monate | reduziert | Ratenzahlung", price: 845 },
  { name: "Grappling 1 Jahr | Ratenzahlung", price: 995 },
  { name: "Striking 1 Jahr", price: 1250 },
  { name: "Probetraining Abo", price: 0 },
  { name: "Nutrition Basic Continuous Athlete Support", price: 160 },
  { name: "Special Member", price: 0 },
  { name: "MMA Pro 1 Jahr", price: 1905 },
  { name: "Striking 1 Jahr | reduziert", price: 995 },
  { name: "5x Personal Training Package", price: 695 },
  { name: "Day Pass", price: 35 },
  { name: "Grappling 1 Jahr | reduziert", price: 850 },
  { name: "Striking 6 Monate", price: 850 },
  { name: "Striking 1 Jahr | monatlich", price: 1260 },
  { name: "Striking 6 Monate | reduziert | monatlich", price: 780 },
  { name: "MMA 1 Jahr | reduziert | monatlich", price: 1320 },
  { name: "MMA 6 Monate | monatlich", price: 1170 },
  { name: "MMA 6 Monate", price: 996 },
  { name: "MMA 1 Jahr | reduziert", price: 1285 },
  { name: "MMA 1 Jahr", price: 1510 },
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
  { name: "MMA 1 Jahr | Ratenzahlung", price: 1510 },
  { name: "Grappling 6 Monate | Ratenzahlung", price: 685 },
  { name: "Fit & Athletik 1 Jahr | Ratenzahlung", price: 1080 },
  { name: "MMA Pro 1 Jahr | reduziert | Ratenzahlung", price: 1680 },
  { name: "Striking Pro 6 Monate | reduziert | Ratenzahlung", price: 1115 },
  { name: "Fit & Athletik 6 Monate | reduziert | Ratenzahlung", price: 630 },
  { name: "Striking Pro 1 Jahr | Ratenzahlung", price: 1645 },
  { name: "MMA 1 Jahr | reduziert | Ratenzahlung", price: 1285 },
  { name: "Striking Pro 6 Monate | Ratenzahlung", price: 1245 },
  { name: "Fit & Athletik 1 Jahr | reduziert | Ratenzahlung", price: 920 },
  { name: "Striking Pro 1 Jahr | reduziert | monatlich", price: 1500 },
  { name: "Striking Pro 6 Monate", price: 1245 },
  { name: "Grappling Pro 1 Jahr | reduziert", price: 1245 },
  { name: "Striking Pro 1 Jahr | reduziert | Ratenzahlung", price: 1390 },
  { name: "Fit & Athletik 6 Monate | Ratenzahlung", price: 740 },
  { name: "Grappling Pro 6 Monate | Ratenzahlung", price: 935 },
  { name: "MTT - Medizinische Trainingstherapie", price: 50 },
  { name: "Grappling Pro 6 Monate | reduziert | Ratenzahlung", price: 830 },
  { name: "Striking Pro 1 Jahr | reduziert", price: 1390 },
  { name: "Striking Pro 1 Jahr | Legacy", price: 1645 },
  { name: "Striking Pro 6 Monate | reduziert", price: 1115 },
  { name: "Eltern Kinder 1 Jahr | Ratenzahlung", price: 1160 },
  { name: "Kinder & Jugendliche 1 Jahr | Ratenzahlung", price: 720 },
  { name: "Kinder & Jugendliche 1 Jahr", price: 720 },
  { name: "Kinder & Jugendliche 6 Monate | Ratenzahlung", price: 490 },
  { name: "Athlete - Advanced Package Standart", price: 255 },
  { name: "1x Single Personal Training", price: 150 },
  { name: "Next Level Intense Personal Training | monatlich", price: 800 },
  { name: "Athlete - Advanced Package Pro", price: 350 },
  { name: "Grappling 1 Jahr | reduziert | Ratenzahlung", price: 850 },
  { name: "Striking 6 Monate | reduziert", price: 720 },
  { name: "BJJ Kids Bullyproof", price: 0 },
  { name: "Grappling 1 Jahr | Legacy", price: 995 },
  { name: "EarlyBird 1 Jahr", price: 795 },
  { name: "EarlyBird 6 Monate", price: 565 },
  { name: "MMA 6 Monate | reduziert", price: 845 },
  { name: "MMA Pro 1 Jahr | reduziert", price: 1680 },
  { name: "Striking Pro 1 Jahr", price: 1645 },
  { name: "Grappling 1 Jahr reduziert | Legacy", price: 850 },
  { name: "Striking 1 Jahr | reduziert | monatlich", price: 1080 },
  { name: "Goal Getter Intense Personal Training | monatlich", price: 240 },
  { name: "Eltern Kinder 1 Jahr", price: 1160 },
  { name: "Striking 6 Monate | Legacy", price: 850 },
];

const subscriptionPrices2025: SubscriptionPrice[] = [
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

const datasets = computed(() => store.datasets);
const selectedYears = computed({
  get: () => store.selectedYears,
  set: (v) => {
    store.selectedYears = v;
  },
});
const selectedTableFilter = computed({
  get: () => store.selectedTableFilter,
  set: (v) => {
    store.selectedTableFilter = v;
  },
});
const selectedPricing = computed({
  get: () => store.selectedPricing,
  set: (v) => {
    store.selectedPricing = v;
  },
});
const compareToPreviousYear = computed({
  get: () => store.compareToPreviousYear,
  set: (v) => {
    store.compareToPreviousYear = v;
  },
});
const selectedCancellationFilter = computed({
  get: () => store.selectedCancellationFilter,
  set: (v) => {
    store.selectedCancellationFilter = v;
  },
});

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
          parseInt(day),
        );

        return isValidDate(parsedDate) ? parsedDate : null;
      }
    } catch (e) {
      console.log("Error parsing German date:", e);
    }
  }

  return null;
};

const activeSubscriptionPrices = computed(() => {
  return selectedPricing.value === "2025"
    ? subscriptionPrices2025
    : subscriptionPrices2026;
});

const availableYears = computed(() => store.availableYears);

const initializeYearFilter = () => {
  if (availableYears.value.length > 0) {
    selectedYears.value = availableYears.value.slice(0, 2);
  }
};

const toggleYear = (year: number) => store.toggleYear(year);

// filteredDatasets – unveränderte Logik, liest jetzt aus store
const filteredDatasets = computed(() => {
  if (store.selectedYears.length === 0) return store.datasets;
  return store.datasets.filter((ds) =>
    store.selectedYears.includes(getYear(ds.timestamp)),
  );
});

const shouldCompareToPreviousYear = computed(() => {
  return compareToPreviousYear.value && selectedYears.value.length === 1;
});

const isRelevantSubscription = (subscription: string): boolean => {
  if (subscription.toLowerCase().includes("probetraining")) return false;
  const type = getSubscriptionType(subscription);
  return ["Striking", "Grappling", "MMA", "Fit & Athletik", "Kinder"].includes(
    type,
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

  const prices = activeSubscriptionPrices.value;

  // Exact match first
  const exactMatch = prices.find(
    (price) => price.name.toLowerCase().trim() === normalizedSubscription,
  );
  if (exactMatch) return exactMatch.price;

  // Fuzzy matching
  const matchingPrices = prices.filter((price) => {
    const priceName = price.name.toLowerCase().trim();

    const mainType = priceName.split(" ")[0];
    if (!normalizedSubscription.includes(mainType)) return false;

    const hasYear =
      priceName.includes("jahr") === normalizedSubscription.includes("jahr");

    const hasMonth =
      priceName.includes("monate") ===
      normalizedSubscription.includes("monate");

    const hasReduced =
      priceName.includes("reduziert") ===
      normalizedSubscription.includes("reduziert");

    const hasPro =
      priceName.includes("pro") === normalizedSubscription.includes("pro");

    return (hasYear || hasMonth) && hasReduced && hasPro;
  });

  if (matchingPrices.length > 0) {
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

  // Fallback prices
  if (normalizedSubscription.includes("kinder")) {
    const kinderPrice = prices.find((p) => p.name.includes("Kinder"));
    return kinderPrice ? kinderPrice.price : 490;
  }

  if (
    normalizedSubscription.includes("fit") ||
    normalizedSubscription.includes("athletik")
  ) {
    const fitPrice = prices.find((p) => p.name.includes("Fit & Athletik"));
    return fitPrice ? fitPrice.price : 740;
  }

  console.log("No price match found for subscription:", subscription);
  return 0;
};

const totalCustomers = computed(() => {
  if (filteredDatasets.value.length === 0) return 0;

  const latestDataset =
    filteredDatasets.value[filteredDatasets.value.length - 1];
  return latestDataset.customers.filter((customer) =>
    isRelevantSubscription(customer.subscription),
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
        getSubscriptionType(c.subscription) === category,
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
                getSubscriptionType(c.subscription) === category,
            ).length
          : 0,
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
    (a, b) => b[1].revenue - a[1].revenue,
  );

  const labels = sortedEntries.map(([label]) => label);
  const data = sortedEntries.map(([, value]) => value.revenue);
  const backgroundColor = labels.map(
    (_, i) => colorPalette[i % colorPalette.length],
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
    0,
  );

  const sortedEntries = Array.from(typeData.entries()).sort(
    (a, b) => b[1].revenue - a[1].revenue,
  );

  const labels = sortedEntries.map(([label]) => label);
  const data = sortedEntries.map(([, value]) => value.revenue);
  const backgroundColor = labels.map(
    (_, i) => colorPalette[i % colorPalette.length],
  );

  // Prozentwerte berechnen
  const percentages = sortedEntries.map(
    ([, value]) => ((value.revenue / totalRevenue) * 100).toFixed(2) + "%",
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

const getSubscriptionDuration = (subscription: string): string => {
  const lower = subscription.toLowerCase();

  if (lower.includes("1 jahr")) return "1 Jahr";
  if (lower.includes("6 monate")) return "6 Monate";
  if (lower.includes("monatlich")) return "Monatlich";
  if (lower.includes("week pass")) return "Week Pass";
  if (lower.includes("day pass")) return "Day Pass";
  if (lower.includes("personal training")) return "Personal Training";
  if (lower.includes("nutrition")) return "Nutrition";
  if (lower.includes("probetraining")) return "Probetraining";

  return "Other";
};

const getAge = (birthday: Date | null): number | null => {
  if (!birthday || !isValidDate(birthday)) return null;

  const today = new Date();
  let age = today.getFullYear() - birthday.getFullYear();

  const hasHadBirthdayThisYear =
    today.getMonth() > birthday.getMonth() ||
    (today.getMonth() === birthday.getMonth() &&
      today.getDate() >= birthday.getDate());

  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }

  return age;
};

const getAgeGroup = (age: number | null): string => {
  if (age === null) return "Unknown";

  if (age < 13) return "Under 13";
  if (age < 18) return "13–17";
  if (age < 25) return "18–24";
  if (age < 35) return "25–34";
  if (age < 45) return "35–44";
  if (age < 55) return "45–54";
  if (age < 65) return "55–64";

  return "65+";
};

const subscriptionDurationData = computed(() => {
  if (filteredDatasets.value.length === 0)
    return { labels: [], datasets: [{ data: [] }] };

  const latestDataset =
    filteredDatasets.value[filteredDatasets.value.length - 1];

  const durationMap = new Map<string, number>();

  latestDataset.customers.forEach((customer) => {
    const subscription = customer.subscription || "";

    if (!subscription) return;
    if (subscription.toLowerCase().includes("probetraining")) return;

    const duration = getSubscriptionDuration(subscription);

    if (!durationMap.has(duration)) {
      durationMap.set(duration, 0);
    }

    durationMap.set(duration, durationMap.get(duration)! + 1);
  });

  const preferredOrder = [
    "1 Jahr",
    "6 Monate",
    "Monatlich",
    "Week Pass",
    "Day Pass",
    "Personal Training",
    "Nutrition",
    "Other",
  ];

  const sortedEntries = Array.from(durationMap.entries()).sort(
    ([a], [b]) => preferredOrder.indexOf(a) - preferredOrder.indexOf(b),
  );

  return {
    labels: sortedEntries.map(([label]) => label),
    datasets: [
      {
        data: sortedEntries.map(([, count]) => count),
        backgroundColor: sortedEntries.map(
          (_, i) => colorPalette[i % colorPalette.length],
        ),
      },
    ],
  };
});

const subscriptionGrowthData = computed(() => {
  if (filteredDatasets.value.length === 0) return { labels: [], datasets: [] };

  // Normal mode: exactly like before
  if (!shouldCompareToPreviousYear.value) {
    const sortedDatasets = [...filteredDatasets.value].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    const labels = sortedDatasets.map((ds) => format(ds.timestamp, "MMM yyyy"));

    const subscriptionData = subscriptionCategories.map((category, index) => ({
      label: category,
      data: sortedDatasets.map(
        (ds) =>
          ds.customers.filter(
            (c) =>
              !c.subscription.toLowerCase().includes("probetraining") &&
              getSubscriptionType(c.subscription) === category,
          ).length,
      ),
      borderColor: colorPalette[index % colorPalette.length],
      backgroundColor: colorPalette[index % colorPalette.length],
      tension: 0.4,
    }));

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
          }).length,
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
            .length,
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
  }

  // Compare mode
  const selectedYear = selectedYears.value[0];
  const previousYear = selectedYear - 1;

  const compareDatasets = datasets.value
    .filter((ds) =>
      [selectedYear, previousYear].includes(getYear(ds.timestamp)),
    )
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const monthLabels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const getDatasetForMonth = (year: number, monthIndex: number) => {
    return compareDatasets.find(
      (ds) =>
        getYear(ds.timestamp) === year &&
        ds.timestamp.getMonth() === monthIndex,
    );
  };

  const buildCompareDataset = (
    year: number,
    category: string,
    color: string,
    dashed = false,
  ) => ({
    label: `${category} ${year}`,
    data: monthLabels.map((_, monthIndex) => {
      const dataset = getDatasetForMonth(year, monthIndex);

      if (!dataset) return null;

      if (category === "Total") {
        return dataset.customers.filter((c) =>
          isRelevantSubscription(c.subscription),
        ).length;
      }

      if (category === "Pro") {
        return dataset.customers.filter((c) => {
          const subscriptionLower = c.subscription.toLowerCase();
          return (
            subscriptionLower.includes("pro") &&
            !subscriptionLower.includes("probetraining")
          );
        }).length;
      }

      return dataset.customers.filter(
        (c) =>
          !c.subscription.toLowerCase().includes("probetraining") &&
          getSubscriptionType(c.subscription) === category,
      ).length;
    }),
    borderColor: color,
    backgroundColor: color,
    borderDash: dashed ? [6, 6] : [],
    tension: 0.4,
    spanGaps: true,
  });

  const chartDatasets: any[] = [];

  subscriptionCategories.forEach((category, index) => {
    chartDatasets.push(
      buildCompareDataset(
        selectedYear,
        category,
        colorPalette[index % colorPalette.length],
      ),
    );

    chartDatasets.push(
      buildCompareDataset(
        previousYear,
        category,
        colorPalette[index % colorPalette.length],
        true,
      ),
    );
  });

  chartDatasets.push(buildCompareDataset(selectedYear, "Pro", "#ff4444"));
  chartDatasets.push(buildCompareDataset(previousYear, "Pro", "#ff4444", true));

  chartDatasets.push(buildCompareDataset(selectedYear, "Total", "#1a519b"));
  chartDatasets.push(
    buildCompareDataset(previousYear, "Total", "#1a519b", true),
  );

  return {
    labels: monthLabels,
    datasets: chartDatasets,
  };
});

const revenuePerCustomerData = computed(() => {
  if (filteredDatasets.value.length === 0)
    return { labels: [], datasets: [{ data: [] }] };

  const latestDataset =
    filteredDatasets.value[filteredDatasets.value.length - 1];

  const typeData = new Map<
    string,
    { customers: number; revenue: number; revenuePerCustomer: number }
  >();

  relevantTypes.forEach((type) => {
    typeData.set(type, {
      customers: 0,
      revenue: 0,
      revenuePerCustomer: 0,
    });
  });

  latestDataset.customers.forEach((customer) => {
    const subscription = customer.subscription || "";

    if (subscription.toLowerCase().includes("probetraining")) return;

    const type = getSubscriptionType(subscription);

    if (!relevantTypes.includes(type)) return;

    const current = typeData.get(type)!;

    current.customers += 1;
    current.revenue += getSubscriptionPrice(subscription);
  });

  const sortedEntries = Array.from(typeData.entries())
    .map(([type, data]) => {
      const revenuePerCustomer =
        data.customers > 0 ? Math.round(data.revenue / data.customers) : 0;

      return [
        type,
        {
          ...data,
          revenuePerCustomer,
        },
      ] as const;
    })
    .sort((a, b) => b[1].revenuePerCustomer - a[1].revenuePerCustomer);

  return {
    labels: sortedEntries.map(([type]) => type),
    datasets: [
      {
        label: "CHF per Customer",
        data: sortedEntries.map(([, data]) => data.revenuePerCustomer),
        backgroundColor: sortedEntries.map(
          (_, i) => colorPalette[i % colorPalette.length],
        ),
      },
    ],
  };
});

const upgradeFunnelData = computed(() => {
  if (filteredDatasets.value.length === 0) return { labels: [], datasets: [] };

  const latestDataset =
    filteredDatasets.value[filteredDatasets.value.length - 1];

  const upgradeTypes = ["Striking", "Grappling", "MMA"];

  const funnelData = new Map<
    string,
    { normal: number; pro: number; total: number; proRate: number }
  >();

  upgradeTypes.forEach((type) => {
    funnelData.set(type, {
      normal: 0,
      pro: 0,
      total: 0,
      proRate: 0,
    });
  });

  latestDataset.customers.forEach((customer) => {
    const subscription = customer.subscription || "";

    if (subscription.toLowerCase().includes("probetraining")) return;

    const type = getSubscriptionType(subscription);

    if (!upgradeTypes.includes(type)) return;

    const isPro = subscription.toLowerCase().includes("pro");
    const current = funnelData.get(type)!;

    if (isPro) {
      current.pro += 1;
    } else {
      current.normal += 1;
    }

    current.total += 1;
  });

  const sortedEntries = Array.from(funnelData.entries()).map(([type, data]) => {
    const proRate =
      data.total > 0 ? Math.round((data.pro / data.total) * 1000) / 10 : 0;

    return [
      `${type} (${proRate}% Pro)`,
      {
        ...data,
        proRate,
      },
    ] as const;
  });

  return {
    labels: sortedEntries.map(([label]) => label),
    datasets: [
      {
        label: "Normal",
        data: sortedEntries.map(([, data]) => data.normal),
        backgroundColor: "#999999",
      },
      {
        label: "Pro",
        data: sortedEntries.map(([, data]) => data.pro),
        backgroundColor: "#1a519b",
      },
    ],
  };
});

const salutationDistributionData = computed(() => {
  if (filteredDatasets.value.length === 0)
    return { labels: [], datasets: [{ data: [] }] };

  const latestDataset =
    filteredDatasets.value[filteredDatasets.value.length - 1];

  const salutationMap = new Map<string, number>();

  latestDataset.customers
    .filter((customer) => isRelevantSubscription(customer.subscription))
    .forEach((customer) => {
      const salutation = (customer.salutation || "").trim();

      const label =
        salutation === "Herr"
          ? "Male"
          : salutation === "Frau"
            ? "Female"
            : "Other / Unknown";

      salutationMap.set(label, (salutationMap.get(label) || 0) + 1);
    });

  const sortedEntries = Array.from(salutationMap.entries()).sort(
    (a, b) => b[1] - a[1],
  );

  return {
    labels: sortedEntries.map(([label]) => label),
    datasets: [
      {
        data: sortedEntries.map(([, count]) => count),
        backgroundColor: sortedEntries.map(
          (_, i) => colorPalette[i % colorPalette.length],
        ),
      },
    ],
  };
});

const ageGroupDistributionData = computed(() => {
  if (filteredDatasets.value.length === 0)
    return { labels: [], datasets: [{ data: [] }] };

  const latestDataset =
    filteredDatasets.value[filteredDatasets.value.length - 1];

  const ageGroupMap = new Map<string, number>();

  const preferredOrder = [
    "Under 13",
    "13–17",
    "18–24",
    "25–34",
    "35–44",
    "45–54",
    "55–64",
    "65+",
    "Unknown",
  ];

  latestDataset.customers
    .filter((customer) => isRelevantSubscription(customer.subscription))
    .forEach((customer) => {
      const age = getAge(customer.birthday);
      const group = getAgeGroup(age);

      ageGroupMap.set(group, (ageGroupMap.get(group) || 0) + 1);
    });

  const sortedEntries = Array.from(ageGroupMap.entries()).sort(
    ([a], [b]) => preferredOrder.indexOf(a) - preferredOrder.indexOf(b),
  );

  return {
    labels: sortedEntries.map(([label]) => label),
    datasets: [
      {
        label: "Customers",
        data: sortedEntries.map(([, count]) => count),
        backgroundColor: sortedEntries.map(
          (_, i) => colorPalette[i % colorPalette.length],
        ),
      },
    ],
  };
});

const probetrainingData = computed(() => {
  if (filteredDatasets.value.length === 0) return { labels: [], datasets: [] };

  const sortedDatasets = [...filteredDatasets.value].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
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

const conversionChartData = computed(() => {
  if (filteredDatasets.value.length === 0) return { labels: [], datasets: [] };

  const relevantTypes = ["Striking", "Grappling", "MMA", "Kinder"];
  const customerTypeHistory = new Map<string, Map<string, Date>>(); // Map<email, Map<type, firstDate>>

  // Schritt 1: Durch alle Kunden iterieren und für jeden Typ den frühesten validFrom speichern
  for (const dataset of filteredDatasets.value) {
    for (const customer of dataset.customers) {
      const email = customer.email || customer.name; // Fallback falls keine E-Mail
      const type = getSubscriptionType(customer.subscription || "");
      const validFrom = customer.validFrom;

      if (!relevantTypes.includes(type)) continue;
      if (!(validFrom instanceof Date) || isNaN(validFrom.getTime())) continue;

      if (!customerTypeHistory.has(email)) {
        customerTypeHistory.set(email, new Map());
      }

      const typeHistory = customerTypeHistory.get(email)!;

      if (!typeHistory.has(type) || validFrom < typeHistory.get(type)!) {
        typeHistory.set(type, validFrom);
      }
    }
  }

  // Schritt 2: Für jede Conversion eintragen, in welchem Monat sie passiert ist
  const conversionMap = new Map<string, Map<string, number>>(); // Map<"MMM yyyy", Map<type, count>>

  for (const [email, typeMap] of customerTypeHistory.entries()) {
    for (const [type, date] of typeMap.entries()) {
      const year = date.getFullYear();
      if (!selectedYears.value.includes(year)) continue;

      const label = format(date, "MMM yyyy");

      if (!conversionMap.has(label)) {
        conversionMap.set(label, new Map());
      }

      const typeCountMap = conversionMap.get(label)!;
      typeCountMap.set(type, (typeCountMap.get(type) || 0) + 1);
    }
  }

  // Schritt 3: Labels sortieren
  const sortedLabels = Array.from(conversionMap.keys()).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime(),
  );

  // Schritt 4: Daten für jedes Typ-Label kombinieren
  const datasets = relevantTypes.map((type, index) => {
    const data = sortedLabels.map((label) => {
      const map = conversionMap.get(label);
      return map?.get(type) || 0;
    });

    return {
      label: type,
      data,
      backgroundColor: colorPalette[index % colorPalette.length],
    };
  });

  return {
    labels: sortedLabels,
    datasets,
  };
});

const specialTrainingData = computed(() => {
  if (filteredDatasets.value.length === 0) return { labels: [], datasets: [] };

  const countSpecialType = (
    dataset: DataSet,
    type: "athlete" | "personal" | "nutrition",
  ) => {
    return dataset.customers.filter((c) => {
      const subscriptionLower = c.subscription.toLowerCase();

      if (type === "athlete") {
        return (
          subscriptionLower.includes("athlete") &&
          subscriptionLower.includes("package")
        );
      }

      if (type === "personal") {
        return (
          subscriptionLower.includes("personal") &&
          subscriptionLower.includes("training")
        );
      }

      if (type === "nutrition") {
        return subscriptionLower.includes("nutrition");
      }

      return false;
    }).length;
  };

  // Normal mode: exactly like before
  if (!shouldCompareToPreviousYear.value) {
    const sortedDatasets = [...filteredDatasets.value].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    const labels = sortedDatasets.map((ds) => format(ds.timestamp, "MMM yyyy"));

    return {
      labels,
      datasets: [
        {
          label: "Athlete Packages",
          data: sortedDatasets.map((ds) => countSpecialType(ds, "athlete")),
          borderColor: "#1a519b",
          backgroundColor: "#1a519b",
          tension: 0.4,
        },
        {
          label: "Personal Training",
          data: sortedDatasets.map((ds) => countSpecialType(ds, "personal")),
          borderColor: "#5a91db",
          backgroundColor: "#5a91db",
          tension: 0.4,
        },
        {
          label: "Nutrition",
          data: sortedDatasets.map((ds) => countSpecialType(ds, "nutrition")),
          borderColor: "#7ab1fb",
          backgroundColor: "#7ab1fb",
          tension: 0.4,
        },
      ],
    };
  }

  // Compare mode
  const selectedYear = selectedYears.value[0];
  const previousYear = selectedYear - 1;

  const compareDatasets = datasets.value
    .filter((ds) =>
      [selectedYear, previousYear].includes(getYear(ds.timestamp)),
    )
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const monthLabels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const getDatasetForMonth = (year: number, monthIndex: number) => {
    return compareDatasets.find(
      (ds) =>
        getYear(ds.timestamp) === year &&
        ds.timestamp.getMonth() === monthIndex,
    );
  };

  const buildCompareDataset = (
    year: number,
    label: string,
    type: "athlete" | "personal" | "nutrition",
    color: string,
    dashed = false,
  ) => ({
    label: `${label} ${year}`,
    data: monthLabels.map((_, monthIndex) => {
      const dataset = getDatasetForMonth(year, monthIndex);
      return dataset ? countSpecialType(dataset, type) : null;
    }),
    borderColor: color,
    backgroundColor: color,
    borderDash: dashed ? [6, 6] : [],
    tension: 0.4,
    spanGaps: true,
  });

  return {
    labels: monthLabels,
    datasets: [
      buildCompareDataset(
        selectedYear,
        "Athlete Packages",
        "athlete",
        "#1a519b",
      ),
      buildCompareDataset(
        previousYear,
        "Athlete Packages",
        "athlete",
        "#1a519b",
        true,
      ),

      buildCompareDataset(
        selectedYear,
        "Personal Training",
        "personal",
        "#5a91db",
      ),
      buildCompareDataset(
        previousYear,
        "Personal Training",
        "personal",
        "#5a91db",
        true,
      ),

      buildCompareDataset(selectedYear, "Nutrition", "nutrition", "#7ab1fb"),
      buildCompareDataset(
        previousYear,
        "Nutrition",
        "nutrition",
        "#7ab1fb",
        true,
      ),
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
    ([a], [b]) => new Date(a).getTime() - new Date(b).getTime(),
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
        !["Striking", "Grappling", "Fit & Athletik", "MMA", "Kinder"].includes(
          subscriptionType,
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
          parseInt(day),
        );
        const label = format(parsed, "MMM yyyy");

        if (!cancellationMap.has(label)) cancellationMap.set(label, 0);
        cancellationMap.set(label, cancellationMap.get(label)! + 1);
      }
    }
  }

  const sortedEntries = Array.from(cancellationMap.entries()).sort(
    ([a], [b]) => new Date(a).getTime() - new Date(b).getTime(),
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

  // Step 1: Indexiere alle Abos pro Kunde
  const futureSubscriptions = new Map<string, Date[]>();

  for (const dataset of filteredDatasets.value) {
    for (const customer of dataset.customers) {
      const email = customer.email || customer.name;
      const type = getSubscriptionType(customer.subscription || "");
      const validFrom = customer.validFrom;

      if (!relevantTypes.includes(type)) continue;
      if (!isValidDate(validFrom)) continue;

      const key = `${email}-${type}`;

      if (!futureSubscriptions.has(key)) {
        futureSubscriptions.set(key, []);
      }
      futureSubscriptions.get(key)!.push(validFrom);
    }
  }

  // Step 2: Sortiere alle Dates
  for (const [_, dates] of futureSubscriptions) {
    dates.sort((a, b) => a.getTime() - b.getTime());
  }

  // Step 3: Prüfe Kündigungen
  for (const dataset of filteredDatasets.value) {
    for (const customer of dataset.customers) {
      const status = (customer.subscriptionStatus || "").toLowerCase();
      const subscription = customer.subscription || "";
      const validUntil = customer.validUntil;
      const type = getSubscriptionType(subscription);
      const email = customer.email || customer.name;

      if (!relevantTypes.includes(type)) continue;
      if (
        selectedCancellationFilter.value !== "All" &&
        type !== selectedCancellationFilter.value
      )
        continue;

      const isCancelled = status.includes("gekündigt am");
      if (!isCancelled || !isValidDate(validUntil)) continue;

      const key = `${email}-${type}`;
      const futureStarts = futureSubscriptions.get(key) || [];

      const hasFollowUp = futureStarts.some((start) => start > validUntil);
      if (!hasFollowUp) {
        const label = format(validUntil, "MMM yyyy");
        if (!expiryMap.has(label)) expiryMap.set(label, 0);
        expiryMap.set(label, expiryMap.get(label)! + 1);
      }
    }
  }

  const sortedEntries = Array.from(expiryMap.entries()).sort(
    ([a], [b]) => new Date(a).getTime() - new Date(b).getTime(),
  );

  return {
    labels: sortedEntries.map(([label]) => label),
    datasets: [
      {
        label: "Kündigungen (Ablaufdatum, ohne neues Abo)",
        data: sortedEntries.map(([, count]) => count),
        backgroundColor: "#ffa500",
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

const stackedChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
    },
    tooltip: {
      mode: "index",
      intersect: false,
    },
  },
  scales: {
    x: {
      stacked: true,
    },
    y: {
      stacked: true,
      beginAtZero: true,
      ticks: {
        stepSize: 1,
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
    const newDatasets = [];

    for (const file of Array.from(selectedFiles.value)) {
      const timestamp = extractTimestampFromFilename(file.name);
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(worksheet);

      const customers = rawData.map((row: any) => {
        const validFrom = parseExcelDate(row["Gültig ab"]);
        const validUntil = parseExcelDate(row["Gültig bis"]);
        const purchaseDate = parseExcelDate(row["Kaufdatum"]);
        const birthday = parseExcelDate(row["Geburtstag"]);

        return {
          id: row.ID || "",
          subscription: row.Abonnement || "",
          validFrom,
          validUntil,
          purchaseDate,
          birthday,
          pendingBookings: parseInt(row["Ausstehende Buchungen"] || "0"),
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
          email: row["E-Mail"] || "",
          language: row.Sprache || "",
        };
      });

      newDatasets.push({ timestamp, customers });
    }

    store.addDatasets(newDatasets); // ← Store statt lokalem ref
    store.initializeYearFilter();
  } catch (err: any) {
    error.value = err.message;
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
  justify-content: space-between;
}

.settings-dropdown {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: bold;
  color: #1a519b;
}

.settings-dropdown select {
  padding: 8px 12px;
  border: 2px solid #1a519b;
  border-radius: 4px;
  background: white;
  color: #1a519b;
  font-weight: bold;
  cursor: pointer;
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

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.chart-header h3 {
  margin: 0;
}

.switch-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1a519b;
  font-weight: bold;
  cursor: pointer;
}

.switch-label input {
  cursor: pointer;
}

.switch-label.disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
