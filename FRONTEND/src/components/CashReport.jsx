import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { getAuthHeader } from '../services/auth'
import { getVendorId } from '../services/session'
import { Pie, Bar, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js'
import '../styles/CashReport.css'


const API_BASE_URL = 'https://aqma-queue-management-1.onrender.com/api'

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
  Filler
)

function CashReport({ vendorId: propVendorId }) {
  const vendorId = propVendorId || getVendorId()
  const [reportData, setReportData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [startDate, setStartDate] = useState(new Date())
  const [endDate, setEndDate] = useState(new Date())
  const [isDateSelected, setIsDateSelected] = useState(false)
  const [viewType, setViewType] = useState('total')
  const [dateRangeError, setDateRangeError] = useState('')
  const [userProfile, setUserProfile] = useState(null)
  const animatedAmounts = useRef({})

  useEffect(() => {
    fetchCashReport()
  }, [vendorId, selectedDate, startDate, endDate, viewType])

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/users/profile`, {
          headers: getAuthHeader()
        })
        if (response.data.success && response.data.user) {
          setUserProfile(response.data.user)
        }
      } catch (error) {
        console.error('Error fetching user profile:', error)
      }
    }
    fetchUserProfile()
  }, [])

  const fetchCashReport = async () => {
    try {
      setIsLoading(true)
      setError('')

      const params = { type: viewType }

      if (viewType === 'date' || viewType === 'range') {
        params.startDate = startDate.toISOString()
        params.endDate = endDate.toISOString()
      }

      const response = await axios.get(`${API_BASE_URL}/tokens/cash-report`, {
        headers: getAuthHeader(),
        params
      })

      if (response.data.success) {
        setReportData(response.data.data)
        setError('')
      } else {
        setError(response.data.message || 'Failed to load cash report')
        setReportData(null)
      }
    } catch (error) {
      console.error('Error fetching cash report:', error)
      setError(error.response?.data?.message || 'Failed to load cash report')
      setReportData(null)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0)
  }

  const validateDateRange = (start, end) => {
    if (!start || !end) return 'Both start and end dates are required'
    if (start >= end) return 'Start date must be before end date'
    return null
  }

  const handleDateRangeChange = (newStartDate, newEndDate) => {
    const error = validateDateRange(newStartDate, newEndDate)
    setDateRangeError(error)
    if (!error) {
      setStartDate(newStartDate)
      setEndDate(newEndDate)
    }
  }

  const getPaymentMethodChartData = () => {
    if (!reportData?.paymentMethods) return null
    const methods = Object.entries(reportData.paymentMethods)
    return {
      labels: methods.map(([method]) => method.toUpperCase()),
      datasets: [{
        data: methods.map(([, data]) => data.amount),
        backgroundColor: ['#48bb78', '#667eea', '#ed8936'],
        borderWidth: 2,
        borderColor: '#ffffff',
      }]
    }
  }

  const getCounterChartData = () => {
    if (!reportData?.counters) return null
    return {
      labels: reportData.counters.map(c => `Counter ${c.counterNumber}`),
      datasets: [{
        label: 'Cash Collection',
        data: reportData.counters.map(c => c.totalCash),
        backgroundColor: '#667eea',
        borderColor: '#5a67d8',
        borderWidth: 1,
      }]
    }
  }

  const getCabinChartData = () => {
    if (!reportData?.cabins) return null
    return {
      labels: reportData.cabins.map(c => c.cabinName),
      datasets: [{
        label: 'Cash Collection',
        data: reportData.cabins.map(c => c.totalCash),
        backgroundColor: '#48bb78',
        borderColor: '#38a169',
        borderWidth: 1,
      }]
    }
  }

  const getItemChartData = () => {
    if (!reportData?.items) return null
    return {
      labels: reportData.items.map(i => i.itemName),
      datasets: [{
        label: 'Quantity Sold',
        data: reportData.items.map(i => i.quantity),
        borderColor: '#ed8936',
        backgroundColor: 'rgba(237, 137, 54, 0.2)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      }]
    }
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' },
      tooltip: {
        callbacks: {
          label: function (context) {
            return formatCurrency(context.parsed.y || context.parsed)
          }
        }
      }
    }
  }

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' },
      tooltip: {
        callbacks: {
          label: function (context) {
            return `${context.label}: ${formatCurrency(context.parsed)}`
          }
        }
      }
    }
  }

  const getUniqueCounters = (transactions) =>
    [...new Set(transactions.map(t => t.counterNumber))].sort((a, b) => a - b)

  const getUniqueCabins = (transactions) =>
    [...new Set(transactions.map(t => t.cabin))].sort()

  const getTokenCountForCounterCabin = (transactions, counterNumber, cabin) =>
    transactions.filter(t => t.counterNumber === counterNumber && t.cabin === cabin).length

  const getTotalTokensForCounter = (transactions, counterNumber) =>
    transactions.filter(t => t.counterNumber === counterNumber).length

  const getTotalTokensForCabin = (transactions, cabin) =>
    transactions.filter(t => t.cabin === cabin).length

  const getGroupedDataForCounter = (transactions, counterNumber) => {
    const filtered = transactions.filter(t => t.counterNumber === counterNumber)
    const grouped = {}
    filtered.forEach(t => {
      const key = `${t.cabin}-${t.paymentMode}`
      if (!grouped[key]) {
        grouped[key] = { cabin: t.cabin, paymentMode: t.paymentMode, items: [], totalAmount: 0 }
      }
      if (t.items && Array.isArray(t.items)) grouped[key].items.push(...t.items)
      grouped[key].totalAmount += t.amount || 0
    })
    return Object.values(grouped)
  }

  const getGroupedDataForCabin = (transactions, cabinName) => {
    const filtered = transactions.filter(t => t.cabin === cabinName)
    const grouped = {}
    filtered.forEach(t => {
      const key = `${t.counterNumber}-${t.paymentMode}`
      if (!grouped[key]) {
        grouped[key] = { counter: t.counterNumber, paymentMode: t.paymentMode, items: [], totalAmount: 0 }
      }
      if (t.items && Array.isArray(t.items)) grouped[key].items.push(...t.items)
      grouped[key].totalAmount += t.amount || 0
    })
    return Object.values(grouped)
  }

  return (
    <div className="cash-report-container">
      <div className="report-header">
        <h1 className="report-title">💰 Cash Report</h1>
        <div className="view-toggle">
          <button
            className={`toggle-btn ${viewType === 'total' ? 'active' : ''}`}
            onClick={() => setViewType('total')}
          >
            Total View
          </button>
          <button
            className={`toggle-btn ${viewType === 'date' ? 'active' : ''}`}
            onClick={() => setViewType('date')}
          >
            Date-wise View
          </button>
        </div>
      </div>

      {viewType === 'date' && (
        <div className="date-selector">
          <h4 className="filter-label">Date & Time Selection</h4>
          <div className="date-controls">
            <div className="date-range-wrapper">
              <div className="date-picker-wrapper">
                <label>Start Date & Time</label>
                <DatePicker
                  selected={startDate}
                  onChange={(date) => handleDateRangeChange(date, endDate)}
                  dateFormat="yyyy-MM-dd HH:mm"
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  maxDate={new Date()}
                  className="date-input"
                  popperPlacement="down"
                />
                <div className="calendar-icon">📅</div>
              </div>
              <div className="date-picker-wrapper">
                <label>End Date & Time</label>
                <DatePicker
                  selected={endDate}
                  onChange={(date) => handleDateRangeChange(startDate, date)}
                  dateFormat="yyyy-MM-dd HH:mm"
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  maxDate={new Date()}
                  className="date-input"
                  popperPlacement="down"
                />
                <div className="calendar-icon">📅</div>
              </div>
            </div>
            <button
              className="refresh-btn"
              onClick={fetchCashReport}
              disabled={isLoading || dateRangeError}
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          {dateRangeError && (
            <div className="error-message">{dateRangeError}</div>
          )}
        </div>
      )}

      {error && (
        <div className="error-state">
          <div>❌ {error}</div>
        </div>
      )}

      {isLoading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <div>Loading cash report...</div>
        </div>
      ) : reportData ? (
        <>
          {/* Total Amount Box */}
          <div className="total-amount-box">
            <div className="total-amount-header">
              <span className="total-amount-icon">💰</span>
              <h2 className="total-amount-title">Total Amount</h2>
            </div>
            <p className="total-amount-value">{formatCurrency(reportData.overall.totalAmount)}</p>
            <p className="total-amount-subtitle">{reportData.overall.totalTokens} transactions</p>
          </div>

          {/* ✅ FIX: inline style — CSS override bypass */}
          <div
            className="summary-cards"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '20px',
              width: '100%',
              marginBottom: '30px'
            }}
          >
            <div className="summary-card">
              <div className="card-header">
                <div className="card-icon total"><span>📈</span></div>
                <div><h3 className="card-title">Total Revenue</h3></div>
              </div>
              <p className="card-amount">{formatCurrency(reportData.overall.totalAmount)}</p>
              <p className="card-subtitle">{reportData.overall.totalTokens} transactions</p>
            </div>

            <div className="summary-card">
              <div className="card-header">
                <div className="card-icon cash"><span>💵</span></div>
                <div><h3 className="card-title">Cash Collection</h3></div>
              </div>
              <p className="card-amount">{formatCurrency(reportData.overall.cashCollection)}</p>
              <p className="card-subtitle">Primary payment method</p>
            </div>

            <div className="summary-card">
              <div className="card-header">
                <div className="card-icon upi"><span>📱</span></div>
                <div><h3 className="card-title">UPI Collection</h3></div>
              </div>
              <p className="card-amount">{formatCurrency(reportData.overall.upiCollection)}</p>
              <p className="card-subtitle">Digital payments</p>
            </div>

            <div className="summary-card">
              <div className="card-header">
                <div className="card-icon card"><span>💳</span></div>
                <div><h3 className="card-title">Card Collection</h3></div>
              </div>
              <p className="card-amount">{formatCurrency(reportData.overall.creditCardCollection)}</p>
              <p className="card-subtitle">Credit/Debit cards</p>
            </div>
          </div>

          {/* Counter vs Cabin Token Matrix */}
          {reportData.transactions && reportData.transactions.length > 0 && (
            <div className="table-container">
              <br />
              <h3>🏪 Counter vs Cabin Token Matrix</h3>
              <div className="matrix-table-wrapper">
                <table className="matrix-table">
                  <thead>
                    <tr>
                      <th>Counters / Cabins</th>
                      {getUniqueCabins(reportData.transactions).map(cabin => (
                        <th key={cabin}>{cabin}</th>
                      ))}
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getUniqueCounters(reportData.transactions).map(counter => (
                      <tr key={counter}>
                        <td className="counter-cell">Counter {counter}</td>
                        {getUniqueCabins(reportData.transactions).map(cabin => {
                          const count = getTokenCountForCounterCabin(reportData.transactions, counter, cabin)
                          return (
                            <td key={`${counter}-${cabin}`} className="matrix-cell">
                              {count > 0 ? count : '-'}
                            </td>
                          )
                        })}
                        <td className="total-cell">
                          {getTotalTokensForCounter(reportData.transactions, counter)}
                        </td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td className="counter-cell"><strong>Total</strong></td>
                      {getUniqueCabins(reportData.transactions).map(cabin => (
                        <td key={`total-${cabin}`} className="total-cell">
                          <strong>{getTotalTokensForCabin(reportData.transactions, cabin)}</strong>
                        </td>
                      ))}
                      <td className="grand-total-cell">
                        <strong>{reportData.transactions.length}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Counter-wise Detailed Breakdown */}
          {reportData.transactions && reportData.transactions.length > 0 && (
            <div className="detailed-tables-section">
              <br />
              <h3>🛒 Counter-wise Detailed Breakdown</h3>
              {getUniqueCounters(reportData.transactions).map(counter => (
                <div key={`counter-detail-${counter}`} className="table-container">
                  <br />
                  <h4>Counter {counter} Details</h4>
                  <table className="detailed-table">
                    <thead>
                      <tr>
                        <th>Cabin</th>
                        <th>Payment Mode</th>
                        <th>Items</th>
                        <th>Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getGroupedDataForCounter(reportData.transactions, counter).map((group, index) => (
                        <tr key={`counter-${counter}-group-${index}`}>
                          <td>{group.cabin}</td>
                          <td>
                            <span className={`payment-badge ${group.paymentMode?.toLowerCase()}`}>
                              {group.paymentMode?.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            {group.items.length > 0 ? (
                              <ul className="items-list">
                                {group.items.map((item, itemIndex) => (
                                  <li key={itemIndex}>
                                    {item.itemName} - Qty: {item.quantity}, Amount: {formatCurrency(item.amount)}
                                  </li>
                                ))}
                              </ul>
                            ) : 'No items'}
                          </td>
                          <td className="amount-cell">{formatCurrency(group.totalAmount)}</td>
                        </tr>
                      ))}
                      <tr className="total-row">
                        <td colSpan="3"><strong>Total for Counter {counter}</strong></td>
                        <td className="amount-cell">
                          <strong>
                            {formatCurrency(
                              getGroupedDataForCounter(reportData.transactions, counter)
                                .reduce((sum, group) => sum + group.totalAmount, 0)
                            )}
                          </strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {/* Cabin-wise Detailed Breakdown (vendor only) */}
          {userProfile?.role === 'vendor' && reportData.transactions && reportData.transactions.length > 0 && (
            <div className="detailed-tables-section">
              <br />
              <h3>🏪 Cabin-wise Detailed Breakdown</h3>
              {getUniqueCabins(reportData.transactions).map(cabin => (
                <div key={`cabin-detail-${cabin}`} className="table-container">
                  <br />
                  <h4>{cabin} Details</h4>
                  <table className="detailed-table">
                    <thead>
                      <tr>
                        <th>Counter</th>
                        <th>Payment Mode</th>
                        <th>Items</th>
                        <th>Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getGroupedDataForCabin(reportData.transactions, cabin).map((group, index) => (
                        <tr key={`cabin-${cabin}-group-${index}`}>
                          <td>Counter {group.counter}</td>
                          <td>
                            <span className={`payment-badge ${group.paymentMode?.toLowerCase()}`}>
                              {group.paymentMode?.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            {group.items.length > 0 ? (
                              <ul className="items-list">
                                {group.items.map((item, itemIndex) => (
                                  <li key={itemIndex}>
                                    {item.itemName} - Qty: {item.quantity}, Amount: {formatCurrency(item.amount)}
                                  </li>
                                ))}
                              </ul>
                            ) : 'No items'}
                          </td>
                          <td className="amount-cell">{formatCurrency(group.totalAmount)}</td>
                        </tr>
                      ))}
                      <tr className="total-row">
                        <td colSpan="3"><strong>Total for {cabin}</strong></td>
                        <td className="amount-cell">
                          <strong>
                            {formatCurrency(
                              getGroupedDataForCabin(reportData.transactions, cabin)
                                .reduce((sum, group) => sum + group.totalAmount, 0)
                            )}
                          </strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {/* Charts Section */}
          <div className="charts-section">
            {getPaymentMethodChartData() && (
              <div className="chart-card">
                <h3 className="chart-title">Payment Method Distribution</h3>
                <Pie data={getPaymentMethodChartData()} options={pieOptions} />
              </div>
            )}
            {getCounterChartData() && (
              <div className="chart-card">
                <h3 className="chart-title">Counter-wise Collection</h3>
                <Bar data={getCounterChartData()} options={chartOptions} />
              </div>
            )}
            {getCabinChartData() && (
              <div className="chart-card">
                <h3 className="chart-title">Cabin-wise Collection</h3>
                <Bar data={getCabinChartData()} options={chartOptions} />
              </div>
            )}
            {getItemChartData() && (
              <div className="chart-card">
                <h3 className="chart-title">Item-wise Sales Trend</h3>
                <Line data={getItemChartData()} options={chartOptions} />
              </div>
            )}
          </div>

          {/* Cabin-wise Breakdown (vendor only) */}
          {userProfile?.role === 'vendor' && reportData.cabins && reportData.cabins.length > 0 && (
            <div className="breakdown-section">
              <h3 className="section-title">🏪 Cabin-wise Collection</h3>
              <div className="breakdown-grid">
                {reportData.cabins.map((cabin, index) => (
                  <div key={`cabin-${index}`} className="breakdown-item">
                    <div className="breakdown-name">{cabin.cabinName}</div>
                    <div className="breakdown-amount">{formatCurrency(cabin.totalCash)}</div>
                    <div className="breakdown-count">{cabin.tokenCount} tokens</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Counter-wise Breakdown */}
          {reportData.counters && reportData.counters.length > 0 && (
            <div className="breakdown-section">
              <h3 className="section-title">🛒 Counter-wise Collection</h3>
              <div className="breakdown-grid">
                {reportData.counters.map((counter, index) => (
                  <div key={`counter-${index}`} className="breakdown-item">
                    <div className="breakdown-name">Counter {counter.counterNumber}</div>
                    <div className="breakdown-amount">{formatCurrency(counter.totalCash)}</div>
                    <div className="breakdown-count">{counter.tokenCount} tokens</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Item-wise Sales */}
          {reportData.items && reportData.items.length > 0 && (
            <div className="breakdown-section">
              <h3 className="section-title">📦 Item-wise Sales</h3>
              <div className="breakdown-grid">
                {reportData.items.map((item, index) => (
                  <div key={`item-${index}`} className="breakdown-item">
                    <div className="breakdown-name">{item.itemName}</div>
                    <div className="breakdown-amount">{formatCurrency(item.totalAmount)}</div>
                    <div className="breakdown-count">{item.quantity} sold</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Transactions Table */}
          <div className="table-container">
            <h3>📋 Transaction Details</h3>
            <div className="table-wrapper">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>Token ID</th>
                    <th>Daily ID</th>
                    <th>Customer</th>
                    <th>Counter</th>
                    <th>Cabin</th>
                    <th>Amount</th>
                    <th>Payment Mode</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.transactions?.map((transaction, index) => (
                    <tr key={`transaction-${index}`}>
                      <td>{transaction.tokenId}</td>
                      <td>{transaction.dailyTokenId}</td>
                      <td>{transaction.customerName}</td>
                      <td>{transaction.counterNumber}</td>
                      <td>{transaction.cabin}</td>
                      <td className="amount-cell">{formatCurrency(transaction.amount)}</td>
                      <td>
                        <span className={`payment-badge ${transaction.paymentMode?.toLowerCase()}`}>
                          {transaction.paymentMode?.toUpperCase()}
                        </span>
                      </td>
                      <td>{transaction.completedAt
                        ? new Date(transaction.completedAt).toLocaleString()
                        : new Date(transaction.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  )) || (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                          No transactions found for the selected period
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="no-data-state">
          <div className="no-data-icon">📊</div>
          <h3>No Cash Report Available</h3>
          <p>Select a different date or check back later</p>
        </div>
      )}
    </div>
  )
}

export default CashReport