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
import '../styles/CashReportV2.css'

const API_BASE_URL = 'https://aqma-queue-management-1.onrender.com/api'

ChartJS.register(
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, Title,
  PointElement, LineElement, Filler
)

/* ─── FUTURISTIC CHART THEME ──────────────────────────────── */
const chartDefaults = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        color: '#94a3b8',
        font: { family: "'Rajdhani', sans-serif", size: 12, weight: '600' },
        padding: 16,
        usePointStyle: true,
        pointStyleWidth: 8,
      },
    },
    tooltip: {
      backgroundColor: 'rgba(10, 18, 35, 0.95)',
      titleColor: '#a5b4fc',
      bodyColor: '#e2e8f0',
      borderColor: 'rgba(99,102,241,0.3)',
      borderWidth: 1,
      cornerRadius: 10,
      titleFont: { family: "'Orbitron', monospace", size: 11 },
      bodyFont: { family: "'Rajdhani', sans-serif", size: 13 },
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(99,102,241,0.06)', drawBorder: false },
      ticks: { color: '#64748b', font: { family: "'Rajdhani', sans-serif", size: 11 } },
    },
    y: {
      grid: { color: 'rgba(99,102,241,0.06)', drawBorder: false },
      ticks: { color: '#64748b', font: { family: "'Rajdhani', sans-serif", size: 11 } },
    },
  },
}

const pieDefaults = {
  responsive: true,
  plugins: {
    legend: chartDefaults.plugins.legend,
    tooltip: {
      ...chartDefaults.plugins.tooltip,
      callbacks: { label: (ctx) => ` ${ctx.label}: ${formatCurrencyStatic(ctx.parsed)}` },
    },
  },
}

function formatCurrencyStatic(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0)
}

/* ─── COMPONENT ───────────────────────────────────────────── */
function CashReport({ vendorId: propVendorId }) {
  const vendorId = propVendorId || getVendorId()
  const [reportData, setReportData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [startDate, setStartDate] = useState(new Date())
  const [endDate, setEndDate] = useState(new Date())
  const [viewType, setViewType] = useState('total')
  const [dateRangeError, setDateRangeError] = useState('')
  const [userProfile, setUserProfile] = useState(null)

  useEffect(() => { fetchCashReport() }, [vendorId, selectedDate, startDate, endDate, viewType])

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/users/profile`, { headers: getAuthHeader() })
        if (res.data.success && res.data.user) setUserProfile(res.data.user)
      } catch (e) { console.error('Profile error:', e) }
    }
    fetchUserProfile()
  }, [])

  const fetchCashReport = async () => {
    try {
      setIsLoading(true); setError('')
      const params = { type: viewType }
      if (viewType === 'date' || viewType === 'range') {
        params.startDate = startDate.toISOString()
        params.endDate = endDate.toISOString()
      }
      const res = await axios.get(`${API_BASE_URL}/tokens/cash-report`, {
        headers: getAuthHeader(), params,
      })
      if (res.data.success) { setReportData(res.data.data); setError('') }
      else { setError(res.data.message || 'Failed to load cash report'); setReportData(null) }
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load cash report')
      setReportData(null)
    } finally { setIsLoading(false) }
  }

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0)

  const validateDateRange = (start, end) => {
    if (!start || !end) return 'Both start and end dates are required'
    if (start >= end) return 'Start date must be before end date'
    return null
  }

  const handleDateRangeChange = (newStart, newEnd) => {
    const err = validateDateRange(newStart, newEnd)
    setDateRangeError(err)
    if (!err) { setStartDate(newStart); setEndDate(newEnd) }
  }

  /* ─── CHART DATA ──────────────────────────────────────── */
  const getPaymentMethodChartData = () => {
    if (!reportData?.paymentMethods) return null
    const methods = Object.entries(reportData.paymentMethods)
    return {
      labels: methods.map(([m]) => m.toUpperCase()),
      datasets: [{
        data: methods.map(([, d]) => d.amount),
        backgroundColor: ['rgba(52,211,153,0.8)', 'rgba(96,165,250,0.8)', 'rgba(249,115,22,0.8)'],
        borderColor: ['#34d399', '#60a5fa', '#f97316'],
        borderWidth: 2,
        hoverOffset: 8,
      }],
    }
  }

  const getCounterChartData = () => {
    if (!reportData?.counters) return null
    return {
      labels: reportData.counters.map(c => `Counter ${c.counterNumber}`),
      datasets: [{
        label: 'Cash Collection',
        data: reportData.counters.map(c => c.totalCash),
        backgroundColor: 'rgba(99,102,241,0.5)',
        borderColor: '#818cf8',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }],
    }
  }

  const getCabinChartData = () => {
    if (!reportData?.cabins) return null
    return {
      labels: reportData.cabins.map(c => c.cabinName),
      datasets: [{
        label: 'Cash Collection',
        data: reportData.cabins.map(c => c.totalCash),
        backgroundColor: 'rgba(52,211,153,0.5)',
        borderColor: '#34d399',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }],
    }
  }

  const getItemChartData = () => {
    if (!reportData?.items) return null
    return {
      labels: reportData.items.map(i => i.itemName),
      datasets: [{
        label: 'Quantity Sold',
        data: reportData.items.map(i => i.quantity),
        borderColor: '#f97316',
        backgroundColor: 'rgba(249,115,22,0.12)',
        borderWidth: 2,
        fill: true,
        tension: 0.45,
        pointBackgroundColor: '#f97316',
        pointRadius: 5,
        pointHoverRadius: 8,
      }],
    }
  }

  /* ─── MATRIX HELPERS ─────────────────────────────────── */
  const getUniqueCounters = (txns) =>
    [...new Set(txns.map(t => t.counterNumber))].sort((a, b) => a - b)

  const getUniqueCabins = (txns) =>
    [...new Set(txns.map(t => t.cabin))].sort()

  const getTokenCount = (txns, counter, cabin) =>
    txns.filter(t => t.counterNumber === counter && t.cabin === cabin).length

  const getTotalForCounter = (txns, counter) =>
    txns.filter(t => t.counterNumber === counter).length

  const getTotalForCabin = (txns, cabin) =>
    txns.filter(t => t.cabin === cabin).length

  const getGroupedForCounter = (txns, counter) => {
    const filtered = txns.filter(t => t.counterNumber === counter)
    const grouped = {}
    filtered.forEach(t => {
      const key = `${t.cabin}-${t.paymentMode}`
      if (!grouped[key]) grouped[key] = { cabin: t.cabin, paymentMode: t.paymentMode, items: [], totalAmount: 0 }
      if (t.items?.length) grouped[key].items.push(...t.items)
      grouped[key].totalAmount += t.amount || 0
    })
    return Object.values(grouped)
  }

  const getGroupedForCabin = (txns, cabin) => {
    const filtered = txns.filter(t => t.cabin === cabin)
    const grouped = {}
    filtered.forEach(t => {
      const key = `${t.counterNumber}-${t.paymentMode}`
      if (!grouped[key]) grouped[key] = { counter: t.counterNumber, paymentMode: t.paymentMode, items: [], totalAmount: 0 }
      if (t.items?.length) grouped[key].items.push(...t.items)
      grouped[key].totalAmount += t.amount || 0
    })
    return Object.values(grouped)
  }

  /* ─── RENDER ─────────────────────────────────────────── */
  return (
    <div className="cash-report-container">

      {/* HEADER */}
      <div className="report-header">
        <h1 className="report-title">
          <span>💰</span> Cash Report
        </h1>
        <div className="view-toggle">
          <button
            className={`toggle-btn ${viewType === 'total' ? 'active' : ''}`}
            onClick={() => setViewType('total')}
          >Total View</button>
          <button
            className={`toggle-btn ${viewType === 'date' ? 'active' : ''}`}
            onClick={() => setViewType('date')}
          >Date-wise</button>
        </div>
      </div>

      {/* DATE FILTER */}
      {viewType === 'date' && (
        <div className="date-selector">
          <p className="filter-label">Date &amp; Time Selection</p>
          <div className="date-controls">
            <div className="date-range-wrapper">
              <div className="date-picker-wrapper">
                <label>Start Date &amp; Time</label>
                <DatePicker
                  selected={startDate}
                  onChange={(d) => handleDateRangeChange(d, endDate)}
                  dateFormat="yyyy-MM-dd HH:mm"
                  showTimeSelect timeFormat="HH:mm" timeIntervals={15}
                  maxDate={new Date()} className="date-input"
                  popperPlacement="bottom"
                />
                <div className="calendar-icon">📅</div>
              </div>
              <div className="date-picker-wrapper">
                <label>End Date &amp; Time</label>
                <DatePicker
                  selected={endDate}
                  onChange={(d) => handleDateRangeChange(startDate, d)}
                  dateFormat="yyyy-MM-dd HH:mm"
                  showTimeSelect timeFormat="HH:mm" timeIntervals={15}
                  maxDate={new Date()} className="date-input"
                  popperPlacement="bottom"
                />
                <div className="calendar-icon">📅</div>
              </div>
            </div>
            <button
              className="refresh-btn"
              onClick={fetchCashReport}
              disabled={isLoading || !!dateRangeError}
            >{isLoading ? 'Loading…' : 'Refresh'}</button>
          </div>
          {dateRangeError && <div className="error-message">{dateRangeError}</div>}
        </div>
      )}

      {/* ERROR */}
      {error && <div className="error-state">❌ {error}</div>}

      {/* LOADING */}
      {isLoading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          Loading Report
        </div>
      ) : reportData ? (
        <>
          {/* HERO AMOUNT */}
          <div className="total-amount-box">
            <div className="total-amount-header">
              <span className="total-amount-icon">💰</span>
              <h2 className="total-amount-title">Total Amount</h2>
            </div>
            <p className="total-amount-value">{formatCurrency(reportData.overall.totalAmount)}</p>
            <p className="total-amount-subtitle">{reportData.overall.totalTokens} transactions</p>
          </div>

          {/* SUMMARY CARDS — inline style: Vercel override */}
          <div
            className="summary-cards"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '18px',
              width: '100%',
              marginBottom: '28px',
            }}
          >
            <div className="summary-card">
              <div className="card-header">
                <div className="card-icon total"><span>📈</span></div>
                <h3 className="card-title">Total Revenue</h3>
              </div>
              <p className="card-amount">{formatCurrency(reportData.overall.totalAmount)}</p>
              <p className="card-subtitle">{reportData.overall.totalTokens} transactions</p>
            </div>

            <div className="summary-card">
              <div className="card-header">
                <div className="card-icon cash"><span>💵</span></div>
                <h3 className="card-title">Cash Collection</h3>
              </div>
              <p className="card-amount">{formatCurrency(reportData.overall.cashCollection)}</p>
              <p className="card-subtitle">Primary payment method</p>
            </div>

            <div className="summary-card">
              <div className="card-header">
                <div className="card-icon upi"><span>📱</span></div>
                <h3 className="card-title">UPI Collection</h3>
              </div>
              <p className="card-amount">{formatCurrency(reportData.overall.upiCollection)}</p>
              <p className="card-subtitle">Digital payments</p>
            </div>

            <div className="summary-card">
              <div className="card-header">
                <div className="card-icon card"><span>💳</span></div>
                <h3 className="card-title">Card Collection</h3>
              </div>
              <p className="card-amount">{formatCurrency(reportData.overall.creditCardCollection)}</p>
              <p className="card-subtitle">Credit / Debit cards</p>
            </div>
          </div>

          {/* COUNTER vs CABIN MATRIX */}
          {reportData.transactions?.length > 0 && (
            <div className="table-container">
              <h3>🏪 Counter vs Cabin Token Matrix</h3>
              {/* VERCEL FIX: wrapper has overflow-x:auto, parent has NO overflow:hidden */}
              <div className="matrix-table-wrapper">
                <table className="matrix-table">
                  <thead>
                    <tr>
                      <th>Counters / Cabins</th>
                      {getUniqueCabins(reportData.transactions).map(c => <th key={c}>{c}</th>)}
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getUniqueCounters(reportData.transactions).map(counter => (
                      <tr key={counter}>
                        <td className="counter-cell">Counter {counter}</td>
                        {getUniqueCabins(reportData.transactions).map(cabin => {
                          const n = getTokenCount(reportData.transactions, counter, cabin)
                          return (
                            <td key={`${counter}-${cabin}`} className="matrix-cell">
                              {n > 0 ? n : <span style={{ color: '#334155' }}>—</span>}
                            </td>
                          )
                        })}
                        <td className="total-cell">
                          {getTotalForCounter(reportData.transactions, counter)}
                        </td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td className="counter-cell"><strong>Total</strong></td>
                      {getUniqueCabins(reportData.transactions).map(cabin => (
                        <td key={`total-${cabin}`} className="total-cell">
                          <strong>{getTotalForCabin(reportData.transactions, cabin)}</strong>
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

          {/* COUNTER DETAILED BREAKDOWN */}
          {reportData.transactions?.length > 0 && (
            <div className="detailed-tables-section">
              <h3>🛒 Counter-wise Detailed Breakdown</h3>
              {getUniqueCounters(reportData.transactions).map(counter => (
                <div key={`cd-${counter}`} className="table-container">
                  <h4>Counter {counter} Details</h4>
                  <div className="table-wrapper">
                    <table className="detailed-table">
                      <thead>
                        <tr><th>Cabin</th><th>Payment Mode</th><th>Items</th><th>Total Amount</th></tr>
                      </thead>
                      <tbody>
                        {getGroupedForCounter(reportData.transactions, counter).map((g, i) => (
                          <tr key={i}>
                            <td>{g.cabin}</td>
                            <td>
                              <span className={`payment-badge ${g.paymentMode?.toLowerCase()}`}>
                                {g.paymentMode?.toUpperCase()}
                              </span>
                            </td>
                            <td>
                              {g.items.length > 0 ? (
                                <ul className="items-list">
                                  {g.items.map((item, j) => (
                                    <li key={j}>
                                      {item.itemName} — Qty: {item.quantity}, {formatCurrency(item.amount)}
                                    </li>
                                  ))}
                                </ul>
                              ) : <span style={{ color: '#475569' }}>No items</span>}
                            </td>
                            <td className="amount-cell">{formatCurrency(g.totalAmount)}</td>
                          </tr>
                        ))}
                        <tr className="total-row">
                          <td colSpan="3"><strong>Total for Counter {counter}</strong></td>
                          <td className="amount-cell">
                            <strong>
                              {formatCurrency(
                                getGroupedForCounter(reportData.transactions, counter)
                                  .reduce((s, g) => s + g.totalAmount, 0)
                              )}
                            </strong>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CABIN DETAILED BREAKDOWN (vendor only) */}
          {userProfile?.role === 'vendor' && reportData.transactions?.length > 0 && (
            <div className="detailed-tables-section">
              <h3>🏪 Cabin-wise Detailed Breakdown</h3>
              {getUniqueCabins(reportData.transactions).map(cabin => (
                <div key={`cbd-${cabin}`} className="table-container">
                  <h4>{cabin} Details</h4>
                  <div className="table-wrapper">
                    <table className="detailed-table">
                      <thead>
                        <tr><th>Counter</th><th>Payment Mode</th><th>Items</th><th>Total Amount</th></tr>
                      </thead>
                      <tbody>
                        {getGroupedForCabin(reportData.transactions, cabin).map((g, i) => (
                          <tr key={i}>
                            <td>Counter {g.counter}</td>
                            <td>
                              <span className={`payment-badge ${g.paymentMode?.toLowerCase()}`}>
                                {g.paymentMode?.toUpperCase()}
                              </span>
                            </td>
                            <td>
                              {g.items.length > 0 ? (
                                <ul className="items-list">
                                  {g.items.map((item, j) => (
                                    <li key={j}>
                                      {item.itemName} — Qty: {item.quantity}, {formatCurrency(item.amount)}
                                    </li>
                                  ))}
                                </ul>
                              ) : <span style={{ color: '#475569' }}>No items</span>}
                            </td>
                            <td className="amount-cell">{formatCurrency(g.totalAmount)}</td>
                          </tr>
                        ))}
                        <tr className="total-row">
                          <td colSpan="3"><strong>Total for {cabin}</strong></td>
                          <td className="amount-cell">
                            <strong>
                              {formatCurrency(
                                getGroupedForCabin(reportData.transactions, cabin)
                                  .reduce((s, g) => s + g.totalAmount, 0)
                              )}
                            </strong>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CHARTS */}
          <div className="charts-section">
            {getPaymentMethodChartData() && (
              <div className="chart-card">
                <h3 className="chart-title">Payment Distribution</h3>
                <Pie data={getPaymentMethodChartData()} options={pieDefaults} />
              </div>
            )}
            {getCounterChartData() && (
              <div className="chart-card">
                <h3 className="chart-title">Counter-wise Collection</h3>
                <Bar data={getCounterChartData()} options={chartDefaults} />
              </div>
            )}
            {getCabinChartData() && (
              <div className="chart-card">
                <h3 className="chart-title">Cabin-wise Collection</h3>
                <Bar data={getCabinChartData()} options={chartDefaults} />
              </div>
            )}
            {getItemChartData() && (
              <div className="chart-card">
                <h3 className="chart-title">Item Sales Trend</h3>
                <Line data={getItemChartData()} options={chartDefaults} />
              </div>
            )}
          </div>

          {/* CABIN BREAKDOWN (vendor) */}
          {userProfile?.role === 'vendor' && reportData.cabins?.length > 0 && (
            <div className="breakdown-section">
              <h3 className="section-title">🏪 Cabin-wise Collection</h3>
              <div className="breakdown-grid">
                {reportData.cabins.map((c, i) => (
                  <div key={i} className="breakdown-item">
                    <div className="breakdown-name">{c.cabinName}</div>
                    <div className="breakdown-amount">{formatCurrency(c.totalCash)}</div>
                    <div className="breakdown-count">{c.tokenCount} tokens</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* COUNTER BREAKDOWN */}
          {reportData.counters?.length > 0 && (
            <div className="breakdown-section">
              <h3 className="section-title">🛒 Counter-wise Collection</h3>
              <div className="breakdown-grid">
                {reportData.counters.map((c, i) => (
                  <div key={i} className="breakdown-item">
                    <div className="breakdown-name">Counter {c.counterNumber}</div>
                    <div className="breakdown-amount">{formatCurrency(c.totalCash)}</div>
                    <div className="breakdown-count">{c.tokenCount} tokens</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ITEM BREAKDOWN */}
          {reportData.items?.length > 0 && (
            <div className="breakdown-section">
              <h3 className="section-title">📦 Item-wise Sales</h3>
              <div className="breakdown-grid">
                {reportData.items.map((item, i) => (
                  <div key={i} className="breakdown-item">
                    <div className="breakdown-name">{item.itemName}</div>
                    <div className="breakdown-amount">{formatCurrency(item.totalAmount)}</div>
                    <div className="breakdown-count">{item.quantity} sold</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TRANSACTION TABLE */}
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
                    <th>Payment</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.transactions?.length > 0
                    ? reportData.transactions.map((t, i) => (
                      <tr key={i}>
                        <td style={{ color: '#a5b4fc', fontFamily: 'monospace', fontSize: '12px' }}>
                          {t.tokenId}
                        </td>
                        <td>{t.dailyTokenId}</td>
                        <td style={{ color: '#e2e8f0' }}>{t.customerName}</td>
                        <td>{t.counterNumber}</td>
                        <td>{t.cabin}</td>
                        <td className="amount-cell">{formatCurrency(t.amount)}</td>
                        <td>
                          <span className={`payment-badge ${t.paymentMode?.toLowerCase()}`}>
                            {t.paymentMode?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ color: '#64748b', fontSize: '12px' }}>
                          {new Date(t.completedAt || t.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                    : (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '48px', color: '#475569' }}>
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
