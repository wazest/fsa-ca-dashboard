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
          {{ processing ? 'Processing...' : 'Process Files' }}
        </button>
        <div v-if="processing" class="progress">Processing files...</div>
        <div v-if="error" class="error">{{ error }}</div>
      </div>

      <div v-if="invoiceData.length > 0" class="charts-container">
        <div class="chart-wrapper">
          <h3>Invoice Status Distribution</h3>
          <div class="chart">
            <Pie 
              :data="invoiceStatusChartData"
              :options="chartOptions"
            />
          </div>
        </div>
        
        <div class="stats-container">
          <div class="stat-card" v-for="(data, status) in statusData" :key="status">
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
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Pie } from 'vue-chartjs'
import * as XLSX from 'xlsx'

ChartJS.register(ArcElement, Tooltip, Legend)

interface Invoice {
  rechnungsstatus: string;
  total: number;
}

const selectedFiles = ref<FileList | null>(null)
const processing = ref(false)
const error = ref('')
const invoiceData = ref<Invoice[]>([])

const colorPalette = [
  '#1a519b',  // Primary blue
  '#ff4444',  // Warning red
  '#ffbb33',  // Warning amber
  '#ff8800',  // Danger orange
  '#00C851',  // Success green
]

const formatNumber = (num: number): string => {
  return num.toLocaleString('de-CH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const extractStatus = (fullStatus: string): string => {
  if (!fullStatus) return 'Offen'
  
  const statusPart = fullStatus.split(':')[0].trim()
  
  if (statusPart.includes('1. Mahnung')) return '1. Mahnung'
  if (statusPart.includes('2. Mahnung')) return '2. Mahnung'
  if (statusPart.includes('3. Mahnung')) return '3. Mahnung'
  
  return 'Offen'
}

const statusData = computed(() => {
  const data: { [key: string]: { count: number; amount: number } } = {
    'Offen': { count: 0, amount: 0 },
    '1. Mahnung': { count: 0, amount: 0 },
    '2. Mahnung': { count: 0, amount: 0 },
    '3. Mahnung': { count: 0, amount: 0 },
  }
  
  invoiceData.value.forEach(invoice => {
    const status = extractStatus(invoice.rechnungsstatus)
    if (status in data) {
      data[status].count++
      data[status].amount += invoice.total
    }
  })
  
  return data
})

const totalInvoices = computed(() => {
  return Object.values(statusData.value).reduce((sum, data) => sum + data.count, 0)
})

const totalAmount = computed(() => {
  return Object.values(statusData.value).reduce((sum, data) => sum + data.amount, 0)
})

const invoiceStatusChartData = computed(() => {
  return {
    labels: Object.keys(statusData.value),
    datasets: [{
      data: Object.values(statusData.value).map(data => data.amount),
      backgroundColor: colorPalette,
    }]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right' as const,
      labels: {
        color: '#1a519b',
        font: {
          family: "'Bebas Neue', sans-serif",
          size: 14
        }
      }
    },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          const status = context.label || ''
          const amount = context.raw || 0
          const count = statusData.value[status].count
          const total = Object.values(statusData.value)
            .reduce((sum, data) => sum + data.amount, 0)
          const percentage = ((amount / total) * 100).toFixed(1)
          return [
            `${status}: ${count} invoices`,
            `CHF ${formatNumber(amount)} (${percentage}%)`
          ]
        }
      }
    }
  }
}

const handleFileUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  selectedFiles.value = input.files
}

const processFiles = async () => {
  if (!selectedFiles.value?.length) return

  processing.value = true
  error.value = ''
  invoiceData.value = []

  try {
    for (const file of Array.from(selectedFiles.value)) {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer)
      
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      
      const rawData = XLSX.utils.sheet_to_json(worksheet)
      
      const processedData = rawData.map((row: any) => ({
        rechnungsstatus: row['Rechnungsstatus'] || '',
        total: parseFloat(row['Total'] || 0)
      }))

      invoiceData.value.push(...processedData)
    }
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
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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
  font-family: 'Chakra Petch', sans-serif;
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
  font-family: 'Bebas Neue', sans-serif;
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
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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

.error {
  color: #ff4444;
  margin-top: 10px;
}

.progress {
  color: #1a519b;
  margin-top: 10px;
}
</style>