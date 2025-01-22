<template>
  <div class="dashboard">
    <header>
      <h1>Customer Data Dashboard</h1>
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
          {{ processing ? 'Processing...' : 'Process Files' }}
        </button>
        <div v-if="processing" class="progress">Processing files...</div>
        <div v-if="error" class="error">{{ error }}</div>
      </div>

      <div class="dashboard-content">
        <div class="stats-container">
          <div class="stat-card">
            <h3>Total Customers</h3>
            <p>{{ totalCustomers }}</p>
          </div>
          <div class="stat-card">
            <h3>Active Subscriptions</h3>
            <p>{{ activeSubscriptions }}</p>
          </div>
          <div class="stat-card">
            <h3>Trial to Regular Conversion</h3>
            <p>{{ convertedCustomers }}</p>
          </div>
        </div>

        <div v-if="datasets.length > 0" class="charts-container">
          <div class="chart">
            <h3>Subscription Distribution (Pie)</h3>
            <Pie 
              :data="subscriptionChartData"
              :options="chartOptions"
            />
          </div>
          <div class="chart">
            <h3>Subscription Distribution (Bar)</h3>
            <Bar
              :data="subscriptionBarData"
              :options="barChartOptions"
            />
          </div>
          <div class="chart">
            <h3>Trial to Regular Conversion</h3>
            <Bar
              :data="conversionChartData"
              :options="barChartOptions"
            />
          </div>
          <div class="chart wide-chart">
            <h3>Subscription Growth Over Time</h3>
            <Line
              :data="subscriptionGrowthData"
              :options="lineChartOptions"
            />
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
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
  PointElement
} from 'chart.js'
import { Pie, Bar, Line } from 'vue-chartjs'
import { parse, subYears, format } from 'date-fns'
import * as XLSX from 'xlsx'

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
)

interface Customer {
  id: string
  subscription: string
  validFrom: Date
  validUntil: Date
  pendingBookings: number
  purchaseDate: Date
  subscriptionStatus: string
  customer: string
  salutation: string
  firstName: string
  lastName: string
  address: string
  postalCode: string
  country: string
  mobile: string
  phonePrivate: string
  phoneWork: string
  birthday: Date
  email: string
  language: string
}

interface DataSet {
  timestamp: Date
  customers: Customer[]
}

const datasets = ref<DataSet[]>([])
const processing = ref(false)
const error = ref('')
const selectedFiles = ref<FileList | null>(null)

const subscriptionCategories = [
  'Striking', 'Grappling', 'MMA', 'Fit & Athletik',
  'Pro', 'Mitarbeiter', 'Kinder'
]

const colorPalette = [
  '#1a519b',  // Main blue
  '#999999',  // Main grey
  '#3a71bb',  // Lighter blue 1
  '#b3b3b3',  // Lighter grey 1
  '#5a91db',  // Lighter blue 2
  '#cccccc',  // Lighter grey 2
  '#7ab1fb',  // Lightest blue
]

const isRelevantSubscription = (subscription: string): boolean => {
  const type = getSubscriptionType(subscription)
  return ['Striking', 'Grappling', 'MMA', 'Fit & Athletik', 'Kinder'].includes(type)
}

const getSubscriptionType = (subscription: string): string => {
  const subscriptionLower = subscription.toLowerCase()
  if (subscriptionLower.includes('striking')) return 'Striking'
  if (subscriptionLower.includes('grappling')) return 'Grappling'
  if (subscriptionLower.includes('mma')) return 'MMA'
  if (subscriptionLower.includes('fit') || subscriptionLower.includes('athletik')) return 'Fit & Athletik'
  if (subscriptionLower.includes('pro')) return 'Pro'
  if (subscriptionLower.includes('mitarbeiter')) return 'Mitarbeiter'
  if (subscriptionLower.includes('kinder')) return 'Kinder'
  return 'Other'
}

const isTrialSubscription = (subscription: string): boolean => {
  return subscription.toLowerCase().includes('probe')
}

const isRegularSubscription = (subscription: string): boolean => {
  const type = getSubscriptionType(subscription)
  return isRelevantSubscription(subscription) && !isTrialSubscription(subscription)
}

const getCustomerHistory = (customerId: string): Customer[] => {
  return datasets.value.flatMap(dataset => 
    dataset.customers.filter(customer => customer.id === customerId)
  )
}

const hasHadTrialSubscription = (customerId: string): boolean => {
  const history = getCustomerHistory(customerId)
  return history.some(record => isTrialSubscription(record.subscription))
}

const hasHadRegularSubscription = (customerId: string): boolean => {
  const history = getCustomerHistory(customerId)
  return history.some(record => isRegularSubscription(record.subscription))
}

const convertedCustomers = computed(() => {
  if (datasets.value.length === 0) return 0
  
  const latestDataset = datasets.value[datasets.value.length - 1]
  const uniqueCustomers = new Set(latestDataset.customers.map(c => c.id))
  
  let converted = 0
  uniqueCustomers.forEach(customerId => {
    if (hasHadTrialSubscription(customerId) && hasHadRegularSubscription(customerId)) {
      converted++
    }
  })
  
  return converted
})

const totalCustomers = computed(() => {
  if (datasets.value.length === 0) return 0
  
  const latestDataset = datasets.value[datasets.value.length - 1]
  return latestDataset.customers.filter(customer => 
    isRelevantSubscription(customer.subscription)
  ).length
})

const activeSubscriptions = computed(() => {
  if (datasets.value.length === 0) return 0
  
  const latestDataset = datasets.value[datasets.value.length - 1]
  
  return latestDataset.customers.filter(customer => {
    return isRelevantSubscription(customer.subscription) && 
           new Date(customer.validUntil) > new Date()
  }).length
})

const subscriptionChartData = computed(() => {
  if (datasets.value.length === 0) return { labels: [], datasets: [{ data: [] }] }
  
  const latestDataset = datasets.value[datasets.value.length - 1]
  
  const data = subscriptionCategories.map(category => {
    return latestDataset.customers.filter(c => 
      getSubscriptionType(c.subscription) === category
    ).length
  })

  return {
    labels: subscriptionCategories,
    datasets: [{
      data,
      backgroundColor: colorPalette
    }]
  }
})

const subscriptionBarData = computed(() => ({
  labels: subscriptionCategories,
  datasets: [{
    label: 'Number of Subscriptions',
    data: subscriptionCategories.map(category =>
      datasets.value.length > 0
        ? datasets.value[datasets.value.length - 1].customers.filter(
            c => getSubscriptionType(c.subscription) === category
          ).length
        : 0
    ),
    backgroundColor: colorPalette
  }]
}))

const conversionChartData = computed(() => {
  if (datasets.value.length === 0) return { labels: [], datasets: [] }

  const latestDataset = datasets.value[datasets.value.length - 1]
  const uniqueCustomers = new Set(latestDataset.customers.map(c => c.id))
  
  const totalTrials = Array.from(uniqueCustomers).filter(customerId => 
    hasHadTrialSubscription(customerId)
  ).length

  const converted = Array.from(uniqueCustomers).filter(customerId => 
    hasHadTrialSubscription(customerId) && hasHadRegularSubscription(customerId)
  ).length

  const trialOnly = Array.from(uniqueCustomers).filter(customerId => 
    hasHadTrialSubscription(customerId) && !hasHadRegularSubscription(customerId)
  ).length

  return {
    labels: ['Total Trial Customers', 'Converted to Regular', 'Trial Only'],
    datasets: [{
      label: 'Number of Customers',
      data: [totalTrials, converted, trialOnly],
      backgroundColor: ['#5a91db', '#1a519b', '#999999']
    }]
  }
})

const subscriptionGrowthData = computed(() => {
  if (datasets.value.length === 0) return { labels: [], datasets: [] }

  // Filter datasets to last 2 years
  const twoYearsAgo = subYears(new Date(), 2)
  const relevantDatasets = datasets.value.filter(ds => ds.timestamp >= twoYearsAgo)

  // Sort datasets by timestamp
  const sortedDatasets = [...relevantDatasets].sort((a, b) => 
    a.timestamp.getTime() - b.timestamp.getTime()
  )

  // Create labels (dates)
  const labels = sortedDatasets.map(ds => format(ds.timestamp, 'MMM yyyy'))

  // Create datasets for each subscription type plus total
  const subscriptionData = subscriptionCategories.map((category, index) => ({
    label: category,
    data: sortedDatasets.map(ds => 
      ds.customers.filter(c => getSubscriptionType(c.subscription) === category).length
    ),
    borderColor: colorPalette[index % colorPalette.length],
    backgroundColor: colorPalette[index % colorPalette.length],
    tension: 0.4
  }))

  // Add total subscriptions dataset
  subscriptionData.push({
    label: 'Total (Relevant Types Only)',
    data: sortedDatasets.map(ds => 
      ds.customers.filter(c => isRelevantSubscription(c.subscription)).length
    ),
    borderColor: '#1a519b',
    backgroundColor: '#1a519b',
    borderWidth: 3,
    tension: 0.4
  })

  return {
    labels,
    datasets: subscriptionData
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'right' as const,
      labels: {
        color: '#1a519b'
      }
    }
  }
}

const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    title: {
      display: false
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: '#99999933'
      },
      ticks: {
        color: '#1a519b',
        stepSize: 1
      }
    },
    x: {
      grid: {
        color: '#99999933'
      },
      ticks: {
        color: '#1a519b'
      }
    }
  }
}

const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        color: '#1a519b',
        usePointStyle: true,
        padding: 20
      }
    },
    tooltip: {
      mode: 'index' as const,
      intersect: false
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: '#99999933'
      },
      ticks: {
        color: '#1a519b',
        stepSize: 5
      }
    },
    x: {
      grid: {
        color: '#99999933'
      },
      ticks: {
        color: '#1a519b'
      }
    }
  },
  interaction: {
    intersect: false,
    mode: 'index' as const
  }
}

const extractTimestampFromFilename = (filename: string): Date => {
  const match = filename.match(/(\d{12})/)
  if (!match) throw new Error('Invalid filename format')
  return parse(match[1], 'yyyyMMddHHmm', new Date())
}

const handleFileUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  selectedFiles.value = input.files
}

const processFiles = async () => {
  if (!selectedFiles.value?.length) return

  processing.value = true
  error.value = ''

  try {
    for (const file of Array.from(selectedFiles.value)) {
      const timestamp = extractTimestampFromFilename(file.name)
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer)
      
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      
      const rawData = XLSX.utils.sheet_to_json(worksheet)
      
      const customers = rawData.map((row: any) => ({
        id: row.ID || '',
        subscription: row.Abonnement || row.Subscription || '',
        validFrom: new Date(row.ValidFrom || ''),
        validUntil: new Date(row.ValidUntil || ''),
        pendingBookings: parseInt(row.PendingBookings || '0'),
        purchaseDate: new Date(row.PurchaseDate || ''),
        subscriptionStatus: row.SubscriptionStatus || '',
        customer: row.Customer || '',
        salutation: row.Salutation || '',
        firstName: row.FirstName || '',
        lastName: row.LastName || '',
        address: row.Address || '',
        postalCode: row.PostalCode || '',
        country: row.Country || '',
        mobile: row.Mobile || '',
        phonePrivate: row.PhonePrivate || '',
        phoneWork: row.PhoneWork || '',
        birthday: new Date(row.Birthday || ''),
        email: row.Email || '',
        language: row.Language || ''
      }))
      
      datasets.value.push({
        timestamp,
        customers
      })
    }

    // Sort datasets by timestamp
    datasets.value.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    
  } catch (err: any) {
    error.value = err.message
    console.error('Error processing files:', err)
  } finally {
    processing.value = false
    selectedFiles.value = null
  }
}
</script>

<style scoped>
.dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

header {
  margin-bottom: 30px;
  text-align: center;
}

h1, h2, h3 {
  margin-top: 0;
  color: #333;
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
  background-color: #4CAF50;
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
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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
  padding: 50px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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