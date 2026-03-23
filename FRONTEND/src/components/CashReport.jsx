import { useState, useEffect } from 'react'
import axios from 'axios'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { getAuthHeader } from '../services/auth'
import { getVendorId } from '../services/session'
import { Pie, Bar, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, Title,
  PointElement, LineElement, Filler,
} from 'chart.js'

const API_BASE_URL = 'https://aqma-queue-management-1.onrender.com/api'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale,
  BarElement, Title, PointElement, LineElement, Filler)

/* ── STYLES injected directly — bypasses Vercel CSS caching ── */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Rajdhani:wght@400;500;600;700&display=swap');

.cr-wrap { font-family: 'Rajdhani', sans-serif; width: 100%; padding: 28px 24px 40px; box-sizing: border-box; }
.cr-wrap *, .cr-wrap *::before, .cr-wrap *::after { box-sizing: border-box; }

.cr-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; margin-bottom: 32px; }
.cr-title { font-family: 'Orbitron', monospace; font-size: 26px; font-weight: 900; letter-spacing: 2px; background: linear-gradient(135deg,#7c3aed,#4338ca); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin: 0; }
.cr-toggle { display: flex; gap: 4px; padding: 4px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 12px; }
.cr-toggle-btn { padding: 9px 20px; border: none; border-radius: 8px; font-family: 'Rajdhani', sans-serif; font-size: 15px; font-weight: 600; letter-spacing: 1px; cursor: pointer; background: transparent; color: #64748b; transition: all 0.2s; }
.cr-toggle-btn.active { background: linear-gradient(135deg,#7c3aed,#4338ca); color: #fff; box-shadow: 0 4px 12px rgba(124,58,237,0.35); }

.cr-hero { text-align: center; padding: 32px 24px; margin-bottom: 28px; background: linear-gradient(135deg,rgba(124,58,237,0.06),rgba(67,56,202,0.06)); border-radius: 20px; border: 1px solid rgba(124,58,237,0.15); }
.cr-hero-header { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 8px; }
.cr-hero-label { font-family: 'Orbitron', monospace; font-size: 13px; letter-spacing: 4px; text-transform: uppercase; color: #64748b; font-weight: 400; margin: 0; }
.cr-hero-amount { font-family: 'Orbitron', monospace; font-size: 62px; font-weight: 900; line-height: 1; color: #7c3aed; margin: 0 0 12px; }
.cr-hero-pill { display: inline-flex; align-items: center; background: rgba(124,58,237,0.08); border: 1px solid rgba(124,58,237,0.2); border-radius: 20px; padding: 5px 18px; font-size: 15px; color: #7c3aed; margin: 0; }

.cr-cards { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; width: 100%; margin-bottom: 28px; }
@media(max-width:900px){ .cr-cards { grid-template-columns: repeat(2,1fr); } }
@media(max-width:500px){ .cr-cards { grid-template-columns: 1fr; } }
.cr-card { position: relative; background: #fff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 22px 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); transition: transform 0.25s, box-shadow 0.25s; }
.cr-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.1); }
.cr-card:nth-child(1) { border-top: 3px solid #a78bfa; }
.cr-card:nth-child(2) { border-top: 3px solid #34d399; }
.cr-card:nth-child(3) { border-top: 3px solid #60a5fa; }
.cr-card:nth-child(4) { border-top: 3px solid #f97316; }
.cr-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.cr-card-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
.cr-card-icon.total { background: rgba(167,139,250,0.12); }
.cr-card-icon.cash  { background: rgba(52,211,153,0.12); }
.cr-card-icon.upi   { background: rgba(96,165,250,0.12); }
.cr-card-icon.card  { background: rgba(249,115,22,0.12); }
.cr-card-title { font-size: 13px; letter-spacing: 2px; text-transform: uppercase; color: #64748b; margin: 0; font-weight: 600; font-family: 'Rajdhani',sans-serif; }
.cr-card-amount { font-family: 'Orbitron', monospace; font-size: 30px; font-weight: 700; color: #1e293b; margin: 0 0 6px; line-height: 1; }
.cr-card-sub { font-size: 14px; color: #94a3b8; margin: 0; }

.cr-table-box { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; margin-bottom: 20px; overflow: visible; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
.cr-table-box-title { font-family: 'Orbitron', monospace; font-size: 15px; letter-spacing: 2px; text-transform: uppercase; color: #7c3aed; font-weight: 600; padding: 20px 22px 0; margin: 0 0 16px; display: flex; align-items: center; gap: 8px; }
.cr-table-box-subtitle { font-family: 'Orbitron', monospace; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; color: #94a3b8; font-weight: 400; padding: 16px 22px 0; margin: 0 0 12px; }

.cr-matrix-wrap { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
.cr-scroll-wrap  { width: 100%; overflow-x: auto; overflow-y: auto; max-height: 480px; -webkit-overflow-scrolling: touch; }

.cr-matrix { width: 100%; border-collapse: collapse; min-width: 300px; }
.cr-matrix th { padding: 13px 20px; text-align: left; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; color: #64748b; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-family: 'Rajdhani',sans-serif; font-weight: 600; white-space: nowrap; }
.cr-matrix td { padding: 15px 20px; font-size: 16px; color: #334155; border-bottom: 1px solid #f1f5f9; white-space: nowrap; }
.cr-matrix tr:last-child td { border-bottom: none; }
.cr-matrix tbody tr:hover td { background: #f8fafc; }
.cr-counter-cell { color: #1e293b; font-weight: 600; }
.cr-matrix-cell { text-align: center; }
.cr-total-cell { font-family: 'Orbitron',monospace; font-size: 13px; color: #7c3aed; font-weight: 600; }
.cr-total-row td { background: rgba(124,58,237,0.04); border-top: 1px solid rgba(124,58,237,0.1); }
.cr-grand-total { font-family: 'Orbitron',monospace; font-size: 15px; color: #7c3aed; font-weight: 700; }

.cr-detail-table, .cr-txn-table { width: 100%; border-collapse: collapse; min-width: 580px; font-size: 15px; }
.cr-detail-table thead, .cr-txn-table thead { position: sticky; top: 0; z-index: 5; }
.cr-detail-table th, .cr-txn-table th { padding: 14px 18px; text-align: left; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; color: #64748b; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-family: 'Rajdhani',sans-serif; font-weight: 600; white-space: nowrap; }
.cr-detail-table td, .cr-txn-table td { padding: 14px 18px; color: #475569; border-bottom: 1px solid #f1f5f9; vertical-align: top; font-size: 15px; }
.cr-detail-table tr:last-child td, .cr-txn-table tr:last-child td { border-bottom: none; }
.cr-detail-table tbody tr:hover td, .cr-txn-table tbody tr:hover td { background: #f8fafc; }
.cr-amount-cell { font-family: 'Orbitron',monospace; font-size: 13px; color: #7c3aed; font-weight: 600; white-space: nowrap; }

.cr-badge { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; font-family: 'Rajdhani',sans-serif; }
.cr-badge.cash   { background: rgba(52,211,153,0.12); color: #059669; border: 1px solid rgba(52,211,153,0.3); }
.cr-badge.upi    { background: rgba(96,165,250,0.12);  color: #2563eb; border: 1px solid rgba(96,165,250,0.3); }
.cr-badge.card, .cr-badge.credit, .cr-badge.debit { background: rgba(249,115,22,0.12); color: #ea580c; border: 1px solid rgba(249,115,22,0.3); }

.cr-charts { display: grid; grid-template-columns: repeat(auto-fit,minmax(260px,1fr)); gap: 18px; margin-bottom: 24px; }
.cr-chart-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 22px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); transition: transform 0.25s; }
.cr-chart-card:hover { transform: translateY(-3px); }
.cr-chart-title { font-family: 'Orbitron',monospace; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; color: #64748b; margin: 0 0 18px; font-weight: 400; }

.cr-breakdown { margin-bottom: 24px; }
.cr-breakdown-title { font-family: 'Orbitron',monospace; font-size: 15px; letter-spacing: 2px; text-transform: uppercase; color: #7c3aed; margin: 0 0 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.cr-breakdown-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(170px,1fr)); gap: 12px; }
.cr-breakdown-item { background: #fff; border: 1px solid #e2e8f0; border-left: 3px solid #7c3aed; border-radius: 12px; padding: 16px 18px; transition: transform 0.2s; box-shadow: 0 2px 10px rgba(0,0,0,0.04); }
.cr-breakdown-item:hover { transform: translateY(-2px); }
.cr-breakdown-name   { font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase; color: #64748b; margin-bottom: 6px; font-weight: 600; }
.cr-breakdown-amount { font-family: 'Orbitron',monospace; font-size: 20px; font-weight: 700; color: #7c3aed; margin-bottom: 3px; line-height: 1; }
.cr-breakdown-count  { font-size: 14px; color: #94a3b8; }

.cr-items { list-style: none; padding: 0; margin: 0; }
.cr-items li { font-size: 14px; color: #64748b; padding: 2px 0; border-bottom: 1px solid #f1f5f9; }
.cr-items li:last-child { border-bottom: none; }

.cr-section-title { font-family: 'Orbitron',monospace; font-size: 15px; letter-spacing: 2px; text-transform: uppercase; color: #7c3aed; font-weight: 600; margin: 0 0 14px; display: flex; align-items: center; gap: 8px; }

.cr-loading { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 60px 24px; color: #64748b; font-size: 14px; letter-spacing: 2px; text-transform: uppercase; font-family: 'Orbitron',monospace; }
.cr-spinner { width: 36px; height: 36px; border: 2px solid #e2e8f0; border-top-color: #7c3aed; border-radius: 50%; animation: cr-spin 0.8s linear infinite; }
@keyframes cr-spin { to { transform: rotate(360deg); } }
.cr-error { background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 18px 22px; color: #dc2626; font-size: 14px; margin-bottom: 20px; }
.cr-no-data { text-align: center; padding: 60px 24px; }
.cr-no-data-icon { font-size: 44px; margin-bottom: 16px; opacity: 0.4; }
.cr-no-data h3 { color: #64748b; font-size: 16px; margin-bottom: 8px; }
.cr-no-data p  { color: #94a3b8; font-size: 14px; }

.cr-date-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 22px; margin-bottom: 24px; }
.cr-date-label { font-family: 'Orbitron',monospace; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #64748b; margin-bottom: 14px; font-weight: 400; display: block; }
.cr-date-controls { display: flex; gap: 14px; align-items: flex-end; flex-wrap: wrap; }
.cr-date-range { display: flex; gap: 14px; flex-wrap: wrap; flex: 1; }
.cr-date-picker { position: relative; flex: 1; min-width: 190px; }
.cr-date-picker label { display: block; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #64748b; margin-bottom: 6px; font-weight: 600; }
.cr-date-input { width: 100%; padding: 10px 36px 10px 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; color: #1e293b; font-family: 'Rajdhani',sans-serif; font-size: 14px; outline: none; transition: border-color 0.2s; }
.cr-date-input:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
.cr-cal-icon { position: absolute; right: 10px; bottom: 11px; font-size: 15px; pointer-events: none; }
.cr-refresh-btn { padding: 10px 22px; background: linear-gradient(135deg,#7c3aed,#4338ca); color: #fff; border: none; border-radius: 10px; font-family: 'Rajdhani',sans-serif; font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; cursor: pointer; transition: all 0.2s; min-height: 42px; white-space: nowrap; box-shadow: 0 4px 12px rgba(124,58,237,0.35); }
.cr-refresh-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(124,58,237,0.45); }
.cr-refresh-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.cr-date-error { color: #dc2626; font-size: 13px; margin-top: 10px; padding: 8px 12px; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca; }

@media(max-width:640px){
  .cr-wrap { padding: 16px 12px 28px; }
  .cr-header { flex-direction: column; align-items: flex-start; }
  .cr-title { font-size: 18px; }
  .cr-hero-amount { font-size: 32px; }
  .cr-date-controls { flex-direction: column; }
  .cr-refresh-btn { width: 100%; }
  .cr-charts { grid-template-columns: 1fr; }
}
`

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { color: '#94a3b8', font: { family: "'Rajdhani', sans-serif", size: 12 }, padding: 16, usePointStyle: true },
    },
    tooltip: {
      backgroundColor: 'rgba(15,23,42,0.95)', titleColor: '#a5b4fc', bodyColor: '#e2e8f0',
      borderColor: 'rgba(99,102,241,0.3)', borderWidth: 1, cornerRadius: 10,
    },
  },
  scales: {
    x: { grid: { color: 'rgba(99,102,241,0.06)' }, ticks: { color: '#64748b' } },
    y: { grid: { color: 'rgba(99,102,241,0.06)' }, ticks: { color: '#64748b' } },
  },
}

const pieDefaults = {
  responsive: true,
  plugins: { legend: chartDefaults.plugins.legend, tooltip: { ...chartDefaults.plugins.tooltip } },
}

function fmt(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0)
}

function CashReport({ vendorId: propVendorId }) {
  const vendorId = propVendorId || getVendorId()
  const [reportData, setReportData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [startDate, setStartDate] = useState(new Date())
  const [endDate, setEndDate] = useState(new Date())
  const [viewType, setViewType] = useState('total')
  const [dateRangeError, setDateRangeError] = useState('')
  const [userProfile, setUserProfile] = useState(null)

  useEffect(() => { fetchReport() }, [vendorId, startDate, endDate, viewType])

  useEffect(() => {
    axios.get(`${API_BASE_URL}/users/profile`, { headers: getAuthHeader() })
      .then(r => { if (r.data.success) setUserProfile(r.data.user) })
      .catch(() => { })
  }, [])

  const fetchReport = async () => {
    try {
      setIsLoading(true); setError('')
      const params = { type: viewType }
      if (viewType === 'date' || viewType === 'range') {
        params.startDate = startDate.toISOString()
        params.endDate = endDate.toISOString()
      }
      const r = await axios.get(`${API_BASE_URL}/tokens/cash-report`, { headers: getAuthHeader(), params })
      if (r.data.success) { setReportData(r.data.data); setError('') }
      else { setError(r.data.message || 'Failed'); setReportData(null) }
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load'); setReportData(null)
    } finally { setIsLoading(false) }
  }

  const handleDateChange = (s, e) => {
    if (!s || !e) return setDateRangeError('Both dates required')
    if (s >= e) return setDateRangeError('Start must be before end')
    setDateRangeError(''); setStartDate(s); setEndDate(e)
  }

  const uniq = (arr, key) => [...new Set(arr.map(t => t[key]))].sort()
  const ctrs = (txns) => [...new Set(txns.map(t => t.counterNumber))].sort((a, b) => a - b)
  const cnt = (txns, c, cab) => txns.filter(t => t.counterNumber === c && t.cabin === cab).length
  const cTot = (txns, c) => txns.filter(t => t.counterNumber === c).length
  const cabTot = (txns, cab) => txns.filter(t => t.cabin === cab).length

  const groupByCtr = (txns, ctr) => {
    const g = {}
    txns.filter(t => t.counterNumber === ctr).forEach(t => {
      const k = `${t.cabin}-${t.paymentMode}`
      if (!g[k]) g[k] = { cabin: t.cabin, paymentMode: t.paymentMode, items: [], totalAmount: 0 }
      if (t.items?.length) g[k].items.push(...t.items)
      g[k].totalAmount += t.amount || 0
    })
    return Object.values(g)
  }

  const groupByCab = (txns, cab) => {
    const g = {}
    txns.filter(t => t.cabin === cab).forEach(t => {
      const k = `${t.counterNumber}-${t.paymentMode}`
      if (!g[k]) g[k] = { counter: t.counterNumber, paymentMode: t.paymentMode, items: [], totalAmount: 0 }
      if (t.items?.length) g[k].items.push(...t.items)
      g[k].totalAmount += t.amount || 0
    })
    return Object.values(g)
  }

  const payChart = () => {
    if (!reportData?.paymentMethods) return null
    const m = Object.entries(reportData.paymentMethods)
    return { labels: m.map(([k]) => k.toUpperCase()), datasets: [{ data: m.map(([, v]) => v.amount), backgroundColor: ['rgba(52,211,153,0.8)', 'rgba(96,165,250,0.8)', 'rgba(249,115,22,0.8)'], borderColor: ['#34d399', '#60a5fa', '#f97316'], borderWidth: 2, hoverOffset: 8 }] }
  }
  const ctrChart = () => !reportData?.counters ? null : { labels: reportData.counters.map(c => `Counter ${c.counterNumber}`), datasets: [{ label: 'Collection', data: reportData.counters.map(c => c.totalCash), backgroundColor: 'rgba(99,102,241,0.5)', borderColor: '#818cf8', borderWidth: 2, borderRadius: 8 }] }
  const cabChart = () => !reportData?.cabins ? null : { labels: reportData.cabins.map(c => c.cabinName), datasets: [{ label: 'Collection', data: reportData.cabins.map(c => c.totalCash), backgroundColor: 'rgba(52,211,153,0.5)', borderColor: '#34d399', borderWidth: 2, borderRadius: 8 }] }
  const itemChart = () => !reportData?.items ? null : { labels: reportData.items.map(i => i.itemName), datasets: [{ label: 'Qty', data: reportData.items.map(i => i.quantity), borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,0.12)', borderWidth: 2, fill: true, tension: 0.45, pointBackgroundColor: '#f97316', pointRadius: 5 }] }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="cr-wrap">

        <div className="cr-header">
          <h1 className="cr-title">💰 Cash Report</h1>
          <div className="cr-toggle">
            <button className={`cr-toggle-btn ${viewType === 'total' ? 'active' : ''}`} onClick={() => setViewType('total')}>Total View</button>
            <button className={`cr-toggle-btn ${viewType === 'date' ? 'active' : ''}`} onClick={() => setViewType('date')}>Date-wise</button>
          </div>
        </div>

        {viewType === 'date' && (
          <div className="cr-date-box">
            <span className="cr-date-label">Date &amp; Time Selection</span>
            <div className="cr-date-controls">
              <div className="cr-date-range">
                <div className="cr-date-picker">
                  <label>Start Date &amp; Time</label>
                  <DatePicker selected={startDate} onChange={d => handleDateChange(d, endDate)} dateFormat="yyyy-MM-dd HH:mm" showTimeSelect timeFormat="HH:mm" timeIntervals={15} maxDate={new Date()} className="cr-date-input" popperPlacement="bottom" />
                  <div className="cr-cal-icon">📅</div>
                </div>
                <div className="cr-date-picker">
                  <label>End Date &amp; Time</label>
                  <DatePicker selected={endDate} onChange={d => handleDateChange(startDate, d)} dateFormat="yyyy-MM-dd HH:mm" showTimeSelect timeFormat="HH:mm" timeIntervals={15} maxDate={new Date()} className="cr-date-input" popperPlacement="bottom" />
                  <div className="cr-cal-icon">📅</div>
                </div>
              </div>
              <button className="cr-refresh-btn" onClick={fetchReport} disabled={isLoading || !!dateRangeError}>{isLoading ? 'Loading…' : 'Refresh'}</button>
            </div>
            {dateRangeError && <div className="cr-date-error">{dateRangeError}</div>}
          </div>
        )}

        {error && <div className="cr-error">❌ {error}</div>}

        {isLoading ? (
          <div className="cr-loading"><div className="cr-spinner" />Loading Report</div>
        ) : reportData ? (
          <>
            <div className="cr-hero">
              <div className="cr-hero-header"><span>💰</span><span className="cr-hero-label">Total Amount</span></div>
              <p className="cr-hero-amount">{fmt(reportData.overall.totalAmount)}</p>
              <p className="cr-hero-pill">{reportData.overall.totalTokens} transactions</p>
            </div>

            <div className="cr-cards">
              {[
                { icon: '📈', cls: 'total', label: 'Total Revenue', val: reportData.overall.totalAmount, sub: `${reportData.overall.totalTokens} transactions` },
                { icon: '💵', cls: 'cash', label: 'Cash Collection', val: reportData.overall.cashCollection, sub: 'Primary payment method' },
                { icon: '📱', cls: 'upi', label: 'UPI Collection', val: reportData.overall.upiCollection, sub: 'Digital payments' },
                { icon: '💳', cls: 'card', label: 'Card Collection', val: reportData.overall.creditCardCollection, sub: 'Credit / Debit cards' },
              ].map(c => (
                <div className="cr-card" key={c.label}>
                  <div className="cr-card-header">
                    <div className={`cr-card-icon ${c.cls}`}>{c.icon}</div>
                    <span className="cr-card-title">{c.label}</span>
                  </div>
                  <p className="cr-card-amount">{fmt(c.val)}</p>
                  <p className="cr-card-sub">{c.sub}</p>
                </div>
              ))}
            </div>

            {reportData.transactions?.length > 0 && (
              <div className="cr-table-box">
                <div className="cr-table-box-title">🏪 Counter vs Cabin Token Matrix</div>
                <div className="cr-matrix-wrap">
                  <table className="cr-matrix">
                    <thead><tr><th>Counters / Cabins</th>{uniq(reportData.transactions, 'cabin').map(c => <th key={c}>{c}</th>)}<th>Total</th></tr></thead>
                    <tbody>
                      {ctrs(reportData.transactions).map(ctr => (
                        <tr key={ctr}>
                          <td className="cr-counter-cell">Counter {ctr}</td>
                          {uniq(reportData.transactions, 'cabin').map(cab => {
                            const n = cnt(reportData.transactions, ctr, cab)
                            return <td key={`${ctr}-${cab}`} className="cr-matrix-cell">{n > 0 ? n : <span style={{ color: '#94a3b8' }}>—</span>}</td>
                          })}
                          <td className="cr-total-cell">{cTot(reportData.transactions, ctr)}</td>
                        </tr>
                      ))}
                      <tr className="cr-total-row">
                        <td className="cr-counter-cell"><strong>Total</strong></td>
                        {uniq(reportData.transactions, 'cabin').map(cab => <td key={`t-${cab}`} className="cr-total-cell"><strong>{cabTot(reportData.transactions, cab)}</strong></td>)}
                        <td className="cr-grand-total"><strong>{reportData.transactions.length}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {reportData.transactions?.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div className="cr-section-title">🛒 Counter-wise Detailed Breakdown</div>
                {ctrs(reportData.transactions).map(ctr => (
                  <div key={ctr} className="cr-table-box">
                    <div className="cr-table-box-subtitle">Counter {ctr} Details</div>
                    <div className="cr-scroll-wrap">
                      <table className="cr-detail-table">
                        <thead><tr><th>Cabin</th><th>Payment</th><th>Items</th><th>Amount</th></tr></thead>
                        <tbody>
                          {groupByCtr(reportData.transactions, ctr).map((g, i) => (
                            <tr key={i}>
                              <td>{g.cabin}</td>
                              <td><span className={`cr-badge ${g.paymentMode?.toLowerCase()}`}>{g.paymentMode?.toUpperCase()}</span></td>
                              <td>{g.items.length > 0 ? <ul className="cr-items">{g.items.map((it, j) => <li key={j}>{it.itemName} — Qty:{it.quantity}, {fmt(it.amount)}</li>)}</ul> : <span style={{ color: '#94a3b8' }}>No items</span>}</td>
                              <td className="cr-amount-cell">{fmt(g.totalAmount)}</td>
                            </tr>
                          ))}
                          <tr className="cr-total-row">
                            <td colSpan="3"><strong>Total for Counter {ctr}</strong></td>
                            <td className="cr-amount-cell"><strong>{fmt(groupByCtr(reportData.transactions, ctr).reduce((s, g) => s + g.totalAmount, 0))}</strong></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {userProfile?.role === 'vendor' && reportData.transactions?.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div className="cr-section-title">🏪 Cabin-wise Detailed Breakdown</div>
                {uniq(reportData.transactions, 'cabin').map(cab => (
                  <div key={cab} className="cr-table-box">
                    <div className="cr-table-box-subtitle">{cab} Details</div>
                    <div className="cr-scroll-wrap">
                      <table className="cr-detail-table">
                        <thead><tr><th>Counter</th><th>Payment</th><th>Items</th><th>Amount</th></tr></thead>
                        <tbody>
                          {groupByCab(reportData.transactions, cab).map((g, i) => (
                            <tr key={i}>
                              <td>Counter {g.counter}</td>
                              <td><span className={`cr-badge ${g.paymentMode?.toLowerCase()}`}>{g.paymentMode?.toUpperCase()}</span></td>
                              <td>{g.items.length > 0 ? <ul className="cr-items">{g.items.map((it, j) => <li key={j}>{it.itemName} — Qty:{it.quantity}, {fmt(it.amount)}</li>)}</ul> : <span style={{ color: '#94a3b8' }}>No items</span>}</td>
                              <td className="cr-amount-cell">{fmt(g.totalAmount)}</td>
                            </tr>
                          ))}
                          <tr className="cr-total-row">
                            <td colSpan="3"><strong>Total for {cab}</strong></td>
                            <td className="cr-amount-cell"><strong>{fmt(groupByCab(reportData.transactions, cab).reduce((s, g) => s + g.totalAmount, 0))}</strong></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="cr-charts">
              {payChart() && <div className="cr-chart-card"><p className="cr-chart-title">Payment Distribution</p><Pie data={payChart()} options={pieDefaults} /></div>}
              {ctrChart() && <div className="cr-chart-card"><p className="cr-chart-title">Counter-wise Collection</p><Bar data={ctrChart()} options={chartDefaults} /></div>}
              {cabChart() && <div className="cr-chart-card"><p className="cr-chart-title">Cabin-wise Collection</p><Bar data={cabChart()} options={chartDefaults} /></div>}
              {itemChart() && <div className="cr-chart-card"><p className="cr-chart-title">Item Sales Trend</p><Line data={itemChart()} options={chartDefaults} /></div>}
            </div>

            {userProfile?.role === 'vendor' && reportData.cabins?.length > 0 && (
              <div className="cr-breakdown">
                <div className="cr-breakdown-title">🏪 Cabin-wise Collection</div>
                <div className="cr-breakdown-grid">{reportData.cabins.map((c, i) => <div key={i} className="cr-breakdown-item"><div className="cr-breakdown-name">{c.cabinName}</div><div className="cr-breakdown-amount">{fmt(c.totalCash)}</div><div className="cr-breakdown-count">{c.tokenCount} tokens</div></div>)}</div>
              </div>
            )}

            {reportData.counters?.length > 0 && (
              <div className="cr-breakdown">
                <div className="cr-breakdown-title">🛒 Counter-wise Collection</div>
                <div className="cr-breakdown-grid">{reportData.counters.map((c, i) => <div key={i} className="cr-breakdown-item"><div className="cr-breakdown-name">Counter {c.counterNumber}</div><div className="cr-breakdown-amount">{fmt(c.totalCash)}</div><div className="cr-breakdown-count">{c.tokenCount} tokens</div></div>)}</div>
              </div>
            )}

            {reportData.items?.length > 0 && (
              <div className="cr-breakdown">
                <div className="cr-breakdown-title">📦 Item-wise Sales</div>
                <div className="cr-breakdown-grid">{reportData.items.map((item, i) => <div key={i} className="cr-breakdown-item"><div className="cr-breakdown-name">{item.itemName}</div><div className="cr-breakdown-amount">{fmt(item.totalAmount)}</div><div className="cr-breakdown-count">{item.quantity} sold</div></div>)}</div>
              </div>
            )}

            <div className="cr-table-box">
              <div className="cr-table-box-title">📋 Transaction Details</div>
              <div className="cr-scroll-wrap">
                <table className="cr-txn-table">
                  <thead><tr><th>Token ID</th><th>Daily ID</th><th>Customer</th><th>Counter</th><th>Cabin</th><th>Amount</th><th>Payment</th><th>Time</th></tr></thead>
                  <tbody>
                    {reportData.transactions?.length > 0
                      ? reportData.transactions.map((t, i) => (
                        <tr key={i}>
                          <td style={{ color: '#7c3aed', fontFamily: 'monospace', fontSize: '12px' }}>{t.tokenId}</td>
                          <td>{t.dailyTokenId}</td>
                          <td style={{ fontWeight: 600 }}>{t.customerName}</td>
                          <td>{t.counterNumber}</td>
                          <td>{t.cabin}</td>
                          <td className="cr-amount-cell">{fmt(t.amount)}</td>
                          <td><span className={`cr-badge ${t.paymentMode?.toLowerCase()}`}>{t.paymentMode?.toUpperCase()}</span></td>
                          <td style={{ color: '#94a3b8', fontSize: '12px' }}>{new Date(t.completedAt || t.createdAt).toLocaleString()}</td>
                        </tr>
                      ))
                      : <tr><td colSpan="8" style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>No transactions found</td></tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="cr-no-data">
            <div className="cr-no-data-icon">📊</div>
            <h3>No Cash Report Available</h3>
            <p>Select a different date or check back later</p>
          </div>
        )}
      </div>
    </>
  )
}

export default CashReport