import { useState, useEffect, useMemo, useCallback } from "react";

const STORAGE_KEY = "pharm-order-mgr-v2";

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const won = (n) => (n || 0).toLocaleString("ko-KR") + "원";
const wonShort = (n) => {
  if (n >= 10000000) return (n / 10000000).toFixed(1).replace(/\.0$/, "") + "천만";
  if (n >= 10000) return (n / 10000).toFixed(0) + "만";
  return n.toLocaleString();
};
const pct = (a, b) => (b === 0 ? 0 : Math.round((a / b) * 100));
const getWeekLabel = (dateStr) => {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const firstDay = new Date(year, d.getMonth(), 1);
  const weekNum = Math.ceil((d.getDate() + firstDay.getDay()) / 7);
  return `${year}년 ${month}월 ${weekNum}주차`;
};
const getMonthKey = (dateStr) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const getMonthLabel = (key) => {
  const [y, m] = key.split("-");
  return `${y}년 ${parseInt(m)}월`;
};
const today = () => new Date().toISOString().slice(0, 10);
const getWeekRange = (baseDate) => {
  const d = new Date(baseDate || new Date());
  const day = d.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { start: mon.toISOString().slice(0, 10), end: sun.toISOString().slice(0, 10) };
};
const formatRange = (s, e) => {
  if (!s || !e) return "-";
  const sd = new Date(s), ed = new Date(e);
  const sm = `${sd.getMonth() + 1}/${sd.getDate()}`;
  const em = `${ed.getMonth() + 1}/${ed.getDate()}`;
  return `${sm} ~ ${em}`;
};

const MONTHLY_MIN_ORDER = 10000000;
const BANK_BALANCE_MIN = 30000000;
const ORDER_RATIO = 0.5;

// ─── Icons ───
const I = {
  Plus: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>,
  Won: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6l4 12L12 6l4 12L20 6"/><path d="M3 10h18M3 14h18"/></svg>,
  Cart: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
  Bank: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M8 10v11M12 10v11M16 10v11M20 10v11"/></svg>,
  Check: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24"><polyline points="20,6 9,17 4,12"/></svg>,
  Alert: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r=".5"/></svg>,
  Down: () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Trash: () => <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Edit: () => <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Cal: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Hist: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>,
  Close: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Gauge: () => <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 6v6l4 2"/></svg>,
};

// ─── Modal ───
function Modal({ open, onClose, title, children, w = "500px" }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,20,30,0.45)", backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: "20px", width: "92%", maxWidth: w, maxHeight: "88vh", overflow: "auto", boxShadow: "0 32px 64px rgba(0,0,0,0.18)", animation: "modalIn .25s ease" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px 16px" }}>
          <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: "10px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b" }}><I.Close /></button>
        </div>
        <div style={{ padding: "0 24px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Gauge Component ───
function Gauge({ value, max, label, color, danger, suffix = "원", showAlert }) {
  const ratio = Math.min(value / max, 1);
  const circumference = 2 * Math.PI * 54;
  const offset = circumference * (1 - ratio * 0.75);
  return (
    <div style={{ textAlign: "center", position: "relative" }}>
      <svg width="130" height="110" viewBox="0 0 130 120">
        <path d="M 11 95 A 54 54 0 1 1 119 95" fill="none" stroke="#e8ecf1" strokeWidth="10" strokeLinecap="round" />
        <path d="M 11 95 A 54 54 0 1 1 119 95" fill="none" stroke={danger ? "#ef4444" : color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${circumference * 0.75}`} strokeDashoffset={circumference * 0.75 - (circumference * 0.75 * ratio)}
          style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.4s ease" }} />
        <text x="65" y="68" textAnchor="middle" style={{ fontSize: "22px", fontWeight: 800, fill: danger ? "#ef4444" : "#0f172a", fontFamily: "'Outfit', sans-serif" }}>{pct(value, max)}%</text>
        <text x="65" y="86" textAnchor="middle" style={{ fontSize: "11px", fill: "#94a3b8", fontFamily: "'Pretendard', sans-serif" }}>{wonShort(value)} / {wonShort(max)}</text>
      </svg>
      <div style={{ fontSize: "12px", fontWeight: 700, color: danger ? "#ef4444" : "#475569", marginTop: "-4px", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
        {showAlert && <I.Alert />} {label}
      </div>
    </div>
  );
}

// ─── Progress Bar ───
function ProgressBar({ value, max, color, height = 10 }) {
  const ratio = Math.min(value / max, 1) * 100;
  return (
    <div style={{ background: "#f1f5f9", borderRadius: height, height, overflow: "hidden", width: "100%" }}>
      <div style={{ height: "100%", borderRadius: height, background: color, width: `${ratio}%`, transition: "width 0.6s ease" }} />
    </div>
  );
}

// ─── Main ───
export default function PharmOrderManager() {
  const [records, setRecords] = useState([]);
  const [bankBalance, setBankBalance] = useState(30000000);
  const [settings, setSettings] = useState({ orderRatio: ORDER_RATIO, monthlyMin: MONTHLY_MIN_ORDER, bankMin: BANK_BALANCE_MIN });
  const [showAdd, setShowAdd] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [form, setForm] = useState(() => { const w = getWeekRange(); return { startDate: w.start, endDate: w.end, weeklySales: "", dailyOrders: [{ date: today(), amount: "" }] }; });
  const [bankForm, setBankForm] = useState({ type: "set", amount: "" });
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);

  // Load
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const d = JSON.parse(stored);
        setRecords(d.records || []);
        setBankBalance(d.bankBalance ?? 30000000);
        if (d.settings) setSettings(d.settings);
      }
    } catch {}
    setLoading(false);
  }, []);

  const save = useCallback((recs, bal, sett) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ records: recs, bankBalance: bal, settings: sett }));
    } catch (e) { console.error(e); }
  }, []);

  // ─── Derived Data ───
  const currentMonthKey = getMonthKey(today());
  const currentMonthRecords = useMemo(() => records.filter(r => getMonthKey(r.startDate || r.date) === currentMonthKey), [records, currentMonthKey]);
  const monthlyOrderTotal = useMemo(() => currentMonthRecords.reduce((s, r) => s + (r.actualOrder || 0), 0), [currentMonthRecords]);
  const monthlySalesTotal = useMemo(() => currentMonthRecords.reduce((s, r) => s + r.weeklySales, 0), [currentMonthRecords]);
  const monthlyRemainOrder = Math.max(settings.monthlyMin - monthlyOrderTotal, 0);
  const weeksLeftInMonth = useMemo(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.max(1, Math.ceil((lastDay - now.getDate()) / 7));
  }, []);
  const suggestedWeeklyFromMin = weeksLeftInMonth > 0 ? Math.ceil(monthlyRemainOrder / weeksLeftInMonth) : 0;

  // After-order bank balance projection
  const bankAfterOrder = (orderAmount) => bankBalance - orderAmount;

  // Monthly grouped for history
  const monthlyGroups = useMemo(() => {
    const groups = {};
    records.forEach(r => {
      const mk = getMonthKey(r.startDate || r.date);
      if (!groups[mk]) groups[mk] = [];
      groups[mk].push(r);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [records]);

  // ─── Actions ───
  const handleAddRecord = () => {
    const sales = parseInt(form.weeklySales) || 0;
    const validOrders = form.dailyOrders.filter(o => (parseInt(o.amount) || 0) > 0);
    const dailyTotal = validOrders.reduce((s, o) => s + (parseInt(o.amount) || 0), 0);
    if (sales <= 0 && dailyTotal <= 0) { alert("주간 매출액 또는 일별 주문을 입력해 주세요."); return; }
    const suggested = Math.round(sales * settings.orderRatio);
    const actual = dailyTotal > 0 ? dailyTotal : suggested;
    const rec = {
      id: editRecord ? editRecord.id : genId(),
      startDate: form.startDate,
      endDate: form.endDate,
      date: form.startDate,
      weeklySales: sales,
      suggestedOrder: suggested,
      actualOrder: actual,
      dailyOrders: validOrders.length > 0 ? validOrders.map(o => ({ date: o.date, amount: parseInt(o.amount) || 0 })) : [{ date: form.startDate, amount: actual }],
    };
    let newRecs;
    if (editRecord) {
      newRecs = records.map(r => r.id === editRecord.id ? rec : r);
    } else {
      newRecs = [rec, ...records];
    }
    newRecs.sort((a, b) => (b.startDate || b.date).localeCompare(a.startDate || a.date));

    let newBal = bankBalance;
    if (!editRecord) {
      newBal = bankBalance - actual;
    } else {
      newBal = bankBalance + editRecord.actualOrder - actual;
    }

    setRecords(newRecs);
    setBankBalance(newBal);
    save(newRecs, newBal, settings);
    setShowAdd(false);
    setEditRecord(null);
    setForm(() => { const w = getWeekRange(); return { startDate: w.start, endDate: w.end, weeklySales: "", dailyOrders: [{ date: today(), amount: "" }] }; });
  };

  const handleDelete = (rec) => {
    setDeleteConfirm(rec);
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    const newRecs = records.filter(r => r.id !== deleteConfirm.id);
    const newBal = bankBalance + deleteConfirm.actualOrder;
    setRecords(newRecs);
    setBankBalance(newBal);
    save(newRecs, newBal, settings);
    setDeleteConfirm(null);
  };

  const handleEditClick = (rec) => {
    setEditRecord(rec);
    setForm({ startDate: rec.startDate || rec.date, endDate: rec.endDate || rec.date, weeklySales: String(rec.weeklySales), dailyOrders: rec.dailyOrders && rec.dailyOrders.length > 0 ? rec.dailyOrders.map(o => ({ date: o.date, amount: String(o.amount) })) : [{ date: rec.startDate || rec.date, amount: String(rec.actualOrder) }] });
    setTab("dashboard");
  };

  const handleBankUpdate = () => {
    const amt = parseInt(bankForm.amount) || 0;
    if (amt <= 0) { alert("금액을 입력해 주세요."); return; }
    let newBal;
    if (bankForm.type === "set") newBal = amt;
    else if (bankForm.type === "add") newBal = bankBalance + amt;
    else newBal = bankBalance - amt;
    setBankBalance(newBal);
    save(records, newBal, settings);
    setShowBankModal(false);
    setBankForm({ type: "set", amount: "" });
  };

  const handleSaveSettings = () => {
    save(records, bankBalance, settings);
    setShowSettings(false);
  };

  // CSV export
  const exportCSV = () => {
    let csv = "\uFEFF기간시작,기간종료,기간,주간매출,권장주문,실제주문합계,일별주문내역\n";
    records.forEach(r => {
      const dailyStr = (r.dailyOrders || []).map(o => `${o.date}:${o.amount}`).join(" / ");
      csv += `${r.startDate || r.date},${r.endDate || r.date},"${formatRange(r.startDate || r.date, r.endDate || r.date)}",${r.weeklySales},${r.suggestedOrder},${r.actualOrder},"${dailyStr}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `약국_주문관리_${today()}.csv`;
    link.click();
  };

  // ─── Computed alerts ───
  const bankDanger = bankBalance < settings.bankMin;
  const monthlyShort = monthlyOrderTotal < settings.monthlyMin;
  const formSales = parseInt(form.weeklySales) || 0;
  const formSuggested = Math.round(formSales * settings.orderRatio);
  const formDailyTotal = form.dailyOrders.reduce((s, o) => s + (parseInt(o.amount) || 0), 0);
  const formActual = formDailyTotal > 0 ? formDailyTotal : formSuggested;
  const formBankAfter = editRecord ? bankBalance + editRecord.actualOrder - formActual : bankBalance - formActual;
  const formBankDanger = formBankAfter < settings.bankMin;

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#0B1120" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: "36px", height: "36px", border: "3px solid #1e293b", borderTopColor: "#38bdf8", borderRadius: "50%", animation: "spin .7s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: "#64748b", fontFamily: "'Pretendard', sans-serif", fontSize: "14px" }}>불러오는 중...</p>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Pretendard', 'Noto Sans KR', -apple-system, sans-serif", background: "#0B1120", minHeight: "100vh", color: "#e2e8f0" }}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
        @keyframes modalIn { from { opacity:0; transform:scale(.95) translateY(10px) } to { opacity:1; transform:scale(1) translateY(0) } }
        @keyframes fadeSlide { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.6 } }
        * { box-sizing: border-box; }
        input:focus, select:focus, textarea:focus { border-color: #38bdf8 !important; outline: none; }
        button { cursor: pointer; transition: all .15s ease; }
        button:hover { filter: brightness(1.08); transform: translateY(-1px); }
        button:active { transform: translateY(0); }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }
      `}</style>

      {/* ─── Header ─── */}
      <header style={{ padding: "0 28px", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1e293b" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: "linear-gradient(135deg, #0ea5e9, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>💊</div>
          <div>
            <h1 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#f1f5f9", fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.5px" }}>PharmOrder</h1>
            <p style={{ margin: 0, fontSize: "10px", color: "#475569", letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 600 }}>일반약 주문 관리</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {/* Bank balance chip */}
          <button onClick={() => setShowBankModal(true)} style={{
            display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px",
            background: bankDanger ? "rgba(239,68,68,0.15)" : "rgba(56,189,248,0.1)",
            border: `1px solid ${bankDanger ? "rgba(239,68,68,0.3)" : "rgba(56,189,248,0.2)"}`,
            borderRadius: "12px", color: bankDanger ? "#f87171" : "#38bdf8", fontSize: "13px", fontWeight: 700
          }}>
            <I.Bank /> {won(bankBalance)}
            {bankDanger && <span style={{ animation: "pulse 1.5s infinite", fontSize: "11px" }}>⚠</span>}
          </button>
          <button onClick={() => setShowSettings(true)} style={{
            background: "#1e293b", border: "1px solid #334155", borderRadius: "10px",
            width: "34px", height: "34px", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "16px"
          }}>⚙</button>
        </div>
      </header>

      {/* ─── Tabs ─── */}
      <nav style={{ display: "flex", gap: "2px", padding: "12px 28px 0", borderBottom: "1px solid #1e293b" }}>
        {[
          { id: "dashboard", label: "주문 판단", icon: <I.Gauge /> },
          { id: "history", label: "기록 내역", icon: <I.Hist /> },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: "flex", alignItems: "center", gap: "6px", padding: "10px 18px", background: "none", border: "none",
            fontSize: "13px", fontWeight: tab === t.id ? 700 : 500,
            color: tab === t.id ? "#38bdf8" : "#64748b",
            borderBottom: tab === t.id ? "2px solid #38bdf8" : "2px solid transparent",
            marginBottom: "-1px"
          }}>{t.icon}{t.label}</button>
        ))}
      </nav>

      <main style={{ padding: "24px 28px", maxWidth: "960px", margin: "0 auto" }}>

        {/* ════════════ DASHBOARD ════════════ */}
        {tab === "dashboard" && (
          <div style={{ animation: "fadeSlide .35s ease" }}>

            {/* ── 핵심 규칙 3가지 상태 ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "22px" }}>
              {/* 1. 이번주 권장 주문 */}
              <div style={{
                background: "linear-gradient(145deg, #0f1d32, #162033)", borderRadius: "18px", padding: "22px",
                border: "1px solid #1e293b", position: "relative", overflow: "hidden"
              }}>
                <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "80px", height: "80px", background: "radial-gradient(circle, rgba(56,189,248,0.08), transparent)", borderRadius: "50%" }} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ background: "rgba(56,189,248,0.12)", borderRadius: "8px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", color: "#38bdf8" }}><I.Cart /></div>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b" }}>주간 주문 비율</span>
                  </div>
                </div>
                {/* Ratio adjuster */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <button onClick={() => { const nr = Math.max(0.05, settings.orderRatio - 0.05); const ns = { ...settings, orderRatio: Math.round(nr * 100) / 100 }; setSettings(ns); save(records, bankBalance, ns); }}
                    style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 700, lineHeight: 1 }}>−</button>
                  <div style={{ flex: 1, position: "relative" }}>
                    <input type="range" min="5" max="100" step="5" value={Math.round(settings.orderRatio * 100)}
                      onChange={e => { const ns = { ...settings, orderRatio: parseInt(e.target.value) / 100 }; setSettings(ns); save(records, bankBalance, ns); }}
                      style={{ width: "100%", accentColor: "#38bdf8", cursor: "pointer" }} />
                  </div>
                  <button onClick={() => { const nr = Math.min(1, settings.orderRatio + 0.05); const ns = { ...settings, orderRatio: Math.round(nr * 100) / 100 }; setSettings(ns); save(records, bankBalance, ns); }}
                    style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 700, lineHeight: 1 }}>+</button>
                  <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: "20px", fontWeight: 800, color: "#38bdf8", minWidth: "48px", textAlign: "right" }}>{Math.round(settings.orderRatio * 100)}%</span>
                </div>
                {/* Quick preset buttons */}
                <div style={{ display: "flex", gap: "4px", marginBottom: "10px" }}>
                  {[30, 40, 50, 60, 70].map(p => (
                    <button key={p} onClick={() => { const ns = { ...settings, orderRatio: p / 100 }; setSettings(ns); save(records, bankBalance, ns); }}
                      style={{
                        flex: 1, padding: "4px 0", borderRadius: "6px", fontSize: "11px", fontWeight: 700, border: "none",
                        background: Math.round(settings.orderRatio * 100) === p ? "#38bdf8" : "#1e293b",
                        color: Math.round(settings.orderRatio * 100) === p ? "#0B1120" : "#64748b",
                      }}>{p}%</button>
                  ))}
                </div>
                {currentMonthRecords.length > 0 ? (
                  <p style={{ margin: 0, fontSize: "12px", color: "#cbd5e1" }}>최근 매출 {won(currentMonthRecords[0]?.weeklySales || 0)} → 권장 <strong style={{ color: "#f1f5f9" }}>{won(Math.round((currentMonthRecords[0]?.weeklySales || 0) * settings.orderRatio))}</strong></p>
                ) : (
                  <p style={{ margin: 0, fontSize: "12px", color: "#475569" }}>기록을 추가해 주세요</p>
                )}
              </div>

              {/* 2. 월 최소 주문 */}
              <div style={{
                background: "linear-gradient(145deg, #0f1d32, #162033)", borderRadius: "18px", padding: "22px",
                border: `1px solid ${monthlyShort && weeksLeftInMonth <= 1 ? "rgba(239,68,68,0.3)" : "#1e293b"}`, position: "relative", overflow: "hidden"
              }}>
                <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "80px", height: "80px", background: "radial-gradient(circle, rgba(168,85,247,0.08), transparent)", borderRadius: "50%" }} />
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "14px" }}>
                  <div style={{ background: "rgba(168,85,247,0.12)", borderRadius: "8px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", color: "#a855f7" }}><I.Won /></div>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b" }}>월 최소 주문</span>
                </div>
                <div style={{ marginBottom: "10px" }}>
                  <ProgressBar value={monthlyOrderTotal} max={settings.monthlyMin} color={monthlyOrderTotal >= settings.monthlyMin ? "#22c55e" : "#a855f7"} height={8} />
                </div>
                <p style={{ margin: 0, fontSize: "13px", color: "#cbd5e1" }}>
                  <strong style={{ color: "#a855f7" }}>{won(monthlyOrderTotal)}</strong> / {won(settings.monthlyMin)}
                </p>
                {monthlyRemainOrder > 0 ? (
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#f59e0b" }}>
                    잔여 {won(monthlyRemainOrder)} · 주당 약 {won(suggestedWeeklyFromMin)} 필요
                  </p>
                ) : (
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#22c55e", display: "flex", alignItems: "center", gap: "4px" }}><I.Check /> 최소 주문 달성!</p>
                )}
              </div>

              {/* 3. 은행잔고 */}
              <div style={{
                background: "linear-gradient(145deg, #0f1d32, #162033)", borderRadius: "18px", padding: "22px",
                border: `1px solid ${bankDanger ? "rgba(239,68,68,0.3)" : "#1e293b"}`, position: "relative", overflow: "hidden"
              }}>
                <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "80px", height: "80px", background: `radial-gradient(circle, ${bankDanger ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)"}, transparent)`, borderRadius: "50%" }} />
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                  <div style={{ background: bankDanger ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)", borderRadius: "8px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", color: bankDanger ? "#ef4444" : "#22c55e" }}><I.Bank /></div>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b" }}>은행 잔고 유지</span>
                </div>
                <div style={{ position: "relative", marginBottom: "8px" }}>
                  <input
                    type="number"
                    value={bankBalance || ""}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 0;
                      setBankBalance(val);
                      save(records, val, settings);
                    }}
                    style={{
                      width: "100%", padding: "8px 10px", fontFamily: "'Outfit', sans-serif", fontSize: "22px", fontWeight: 800,
                      color: bankDanger ? "#f87171" : "#f1f5f9", background: "#0B1120", border: `1.5px solid ${bankDanger ? "rgba(239,68,68,0.3)" : "#1e293b"}`,
                      borderRadius: "10px", outline: "none", transition: "border 0.2s",
                    }}
                    onFocus={e => e.target.style.borderColor = "#38bdf8"}
                    onBlur={e => e.target.style.borderColor = bankDanger ? "rgba(239,68,68,0.3)" : "#1e293b"}
                  />
                  <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "13px", color: "#475569", fontWeight: 600, pointerEvents: "none" }}>원</span>
                </div>
                <p style={{ margin: 0, fontSize: "12px", color: bankDanger ? "#f87171" : "#64748b" }}>
                  최소 유지: {won(settings.bankMin)}
                  {bankDanger && <span style={{ marginLeft: "6px", fontWeight: 700, animation: "pulse 1.5s infinite" }}>⚠ 부족!</span>}
                </p>
              </div>
            </div>

            {/* ── 주문 시뮬레이션 & 빠른 기록 ── */}
            <div style={{
              background: "linear-gradient(145deg, #0f1d32, #162033)", borderRadius: "18px", padding: "24px",
              border: "1px solid #1e293b", marginBottom: "22px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#f1f5f9", display: "flex", alignItems: "center", gap: "8px" }}>
                  <I.Cart /> 이번 주 주문 기록
                </h3>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "6px", display: "block" }}>포스기 일반약 주간 매출 <span style={{ color: "#ef4444" }}>*</span></label>
                  <input type="number" value={form.weeklySales} onChange={e => setForm({ ...form, weeklySales: e.target.value })}
                    placeholder="예: 5000000"
                    style={{ width: "100%", padding: "12px 14px", background: "#0B1120", border: "1.5px solid #1e293b", borderRadius: "12px", color: "#f1f5f9", fontSize: "15px", fontWeight: 700 }} />
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <I.Cal /> 매출 기간 (1주)
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <input type="date" value={form.startDate} onChange={e => {
                      const s = e.target.value;
                      const ed = new Date(s);
                      ed.setDate(ed.getDate() + 6);
                      setForm({ ...form, startDate: s, endDate: ed.toISOString().slice(0, 10) });
                    }}
                      style={{ flex: 1, padding: "12px 10px", background: "#0B1120", border: "1.5px solid #1e293b", borderRadius: "12px", color: "#f1f5f9", fontSize: "13px" }} />
                    <span style={{ color: "#475569", fontSize: "13px", fontWeight: 600 }}>~</span>
                    <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })}
                      style={{ flex: 1, padding: "12px 10px", background: "#0B1120", border: "1.5px solid #1e293b", borderRadius: "12px", color: "#f1f5f9", fontSize: "13px" }} />
                  </div>
                  <div style={{ display: "flex", gap: "4px", marginTop: "6px" }}>
                    {[
                      { label: "이번 주", fn: () => { const w = getWeekRange(); setForm({ ...form, startDate: w.start, endDate: w.end }); } },
                      { label: "지난 주", fn: () => { const d = new Date(); d.setDate(d.getDate() - 7); const w = getWeekRange(d); setForm({ ...form, startDate: w.start, endDate: w.end }); } },
                      { label: "2주 전", fn: () => { const d = new Date(); d.setDate(d.getDate() - 14); const w = getWeekRange(d); setForm({ ...form, startDate: w.start, endDate: w.end }); } },
                    ].map(b => (
                      <button key={b.label} onClick={b.fn} style={{
                        flex: 1, padding: "4px 0", borderRadius: "6px", fontSize: "10px", fontWeight: 700,
                        background: "#1e293b", color: "#64748b", border: "1px solid #334155"
                      }}>{b.label}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live calculation */}
              {(formSales > 0 || formDailyTotal > 0) && (
                <div style={{ background: "#0B1120", borderRadius: "14px", padding: "18px", marginBottom: "16px", border: "1px solid #1e293b" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "14px", textAlign: "center", marginBottom: "14px" }}>
                    <div>
                      <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#64748b" }}>주간 매출</p>
                      <p style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#38bdf8", fontFamily: "'Outfit', sans-serif" }}>{won(formSales)}</p>
                    </div>
                    <div>
                      <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#64748b" }}>× {Math.round(settings.orderRatio * 100)}% = 권장 주문</p>
                      <p style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#a855f7", fontFamily: "'Outfit', sans-serif" }}>{won(formSuggested)}</p>
                    </div>
                    <div>
                      <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#64748b" }}>일별 주문 합계</p>
                      <p style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: formDailyTotal > 0 ? "#f1f5f9" : "#334155", fontFamily: "'Outfit', sans-serif" }}>
                        {formDailyTotal > 0 ? won(formDailyTotal) : "-"}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#64748b" }}>주문 후 잔고</p>
                      <p style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: formBankDanger ? "#f87171" : "#22c55e", fontFamily: "'Outfit', sans-serif" }}>
                        {won(formBankAfter)}
                      </p>
                    </div>
                  </div>

                  {/* Warnings */}
                  {formBankDanger && (
                    <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "10px 14px", marginBottom: "10px", fontSize: "13px", color: "#f87171", display: "flex", alignItems: "center", gap: "8px" }}>
                      <I.Alert /> 이 주문을 실행하면 은행잔고가 {won(settings.bankMin)} 미만이 됩니다!
                    </div>
                  )}

                  {/* How much can we order while maintaining min balance */}
                  <div style={{ fontSize: "12px", color: "#64748b", display: "flex", gap: "16px", flexWrap: "wrap" }}>
                    <span>최대 주문 가능액 (잔고 {wonShort(settings.bankMin)} 유지): <strong style={{ color: "#22c55e" }}>{won(Math.max(bankBalance - settings.bankMin, 0))}</strong></span>
                    <span>월 최소까지 잔여: <strong style={{ color: "#a855f7" }}>{won(monthlyRemainOrder)}</strong></span>
                  </div>
                </div>
              )}

              {/* Daily order entries */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>
                    📦 일별 주문 내역 <span style={{ fontSize: "11px", color: "#475569" }}>(미입력 시 권장액 적용)</span>
                  </label>
                  <span style={{ fontSize: "13px", fontWeight: 800, color: formDailyTotal > 0 ? "#a855f7" : "#334155", fontFamily: "'Outfit', sans-serif" }}>
                    합계: {won(formDailyTotal)}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {form.dailyOrders.map((order, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#475569", minWidth: "20px", textAlign: "center" }}>{idx + 1}</span>
                      <input type="date" value={order.date} onChange={e => {
                        const newOrders = [...form.dailyOrders];
                        newOrders[idx] = { ...newOrders[idx], date: e.target.value };
                        setForm({ ...form, dailyOrders: newOrders });
                      }}
                        style={{ width: "150px", padding: "10px 10px", background: "#0B1120", border: "1.5px solid #1e293b", borderRadius: "10px", color: "#f1f5f9", fontSize: "13px" }} />
                      <input type="number" value={order.amount} onChange={e => {
                        const newOrders = [...form.dailyOrders];
                        newOrders[idx] = { ...newOrders[idx], amount: e.target.value };
                        setForm({ ...form, dailyOrders: newOrders });
                      }}
                        placeholder="주문액"
                        style={{ flex: 1, padding: "10px 14px", background: "#0B1120", border: "1.5px solid #1e293b", borderRadius: "10px", color: "#f1f5f9", fontSize: "14px", fontWeight: 700 }} />
                      <span style={{ fontSize: "11px", color: "#475569", minWidth: "50px" }}>{won(parseInt(order.amount) || 0).replace("원", "")}</span>
                      {form.dailyOrders.length > 1 && (
                        <button onClick={() => {
                          const newOrders = form.dailyOrders.filter((_, i) => i !== idx);
                          setForm({ ...form, dailyOrders: newOrders });
                        }} style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: "8px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", flexShrink: 0 }}>
                          <I.Trash />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={() => setForm({ ...form, dailyOrders: [...form.dailyOrders, { date: today(), amount: "" }] })}
                  style={{ marginTop: "8px", padding: "8px 14px", background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", color: "#64748b", fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", gap: "5px" }}>
                  <I.Plus /> 주문 추가
                </button>
              </div>

              <button onClick={handleAddRecord} disabled={!formSales && formDailyTotal <= 0} style={{
                width: "100%", padding: "14px", background: (formSales > 0 || formDailyTotal > 0) ? "linear-gradient(135deg, #0ea5e9, #6366f1)" : "#1e293b",
                border: "none", borderRadius: "14px", color: (formSales > 0 || formDailyTotal > 0) ? "#fff" : "#475569",
                fontSize: "15px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                opacity: (formSales > 0 || formDailyTotal > 0) ? 1 : 0.5
              }}>
                <I.Plus /> {editRecord ? "기록 수정" : "주문 기록 저장"}
              </button>
              {editRecord && (
                <button onClick={() => { setEditRecord(null); const w = getWeekRange(); setForm({ startDate: w.start, endDate: w.end, weeklySales: "", dailyOrders: [{ date: today(), amount: "" }] }); }}
                  style={{ width: "100%", padding: "10px", background: "none", border: "1px solid #334155", borderRadius: "12px", color: "#94a3b8", fontSize: "13px", marginTop: "8px" }}>
                  수정 취소
                </button>
              )}
            </div>

            {/* ── 이번 달 요약 ── */}
            <div style={{
              background: "linear-gradient(145deg, #0f1d32, #162033)", borderRadius: "18px", padding: "24px",
              border: "1px solid #1e293b"
            }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 800, color: "#f1f5f9" }}>
                📊 {getMonthLabel(currentMonthKey)} 요약
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}>
                {[
                  { l: "총 주간 매출", v: won(monthlySalesTotal), c: "#38bdf8" },
                  { l: "총 주문액", v: won(monthlyOrderTotal), c: "#a855f7" },
                  { l: "기록 건수", v: `${currentMonthRecords.length}주`, c: "#f1f5f9" },
                  { l: "평균 주문/매출 비율", v: monthlySalesTotal > 0 ? `${pct(monthlyOrderTotal, monthlySalesTotal)}%` : "-", c: "#22c55e" },
                ].map((item, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <p style={{ margin: "0 0 6px", fontSize: "11px", color: "#64748b" }}>{item.l}</p>
                    <p style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: item.c, fontFamily: "'Outfit', sans-serif" }}>{item.v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════════ HISTORY ════════════ */}
        {tab === "history" && (
          <div style={{ animation: "fadeSlide .35s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#f1f5f9" }}>기록 내역</h2>
              <button onClick={exportCSV} style={{
                display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px",
                background: "#1e293b", border: "1px solid #334155", borderRadius: "10px",
                color: "#94a3b8", fontSize: "13px", fontWeight: 600
              }}><I.Down /> CSV 내보내기</button>
            </div>

            {monthlyGroups.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", background: "linear-gradient(145deg, #0f1d32, #162033)", borderRadius: "18px", border: "1px solid #1e293b" }}>
                <p style={{ fontSize: "28px", margin: "0 0 8px" }}>📋</p>
                <p style={{ color: "#64748b", fontWeight: 600 }}>기록이 없습니다</p>
                <p style={{ color: "#475569", fontSize: "13px" }}>대시보드에서 주간 매출과 주문을 기록해 보세요</p>
              </div>
            ) : (
              monthlyGroups.map(([mk, recs]) => {
                const monthTotal = recs.reduce((s, r) => s + r.actualOrder, 0);
                const monthSales = recs.reduce((s, r) => s + r.weeklySales, 0);
                const isMinMet = monthTotal >= settings.monthlyMin;
                return (
                  <div key={mk} style={{ marginBottom: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                      <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#94a3b8" }}>{getMonthLabel(mk)}</h3>
                      <span style={{
                        fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "8px",
                        background: isMinMet ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
                        color: isMinMet ? "#22c55e" : "#f59e0b",
                        display: "flex", alignItems: "center", gap: "4px"
                      }}>
                        {isMinMet ? <><I.Check /> 최소달성</> : <>미달 ({won(settings.monthlyMin - monthTotal)} 부족)</>}
                      </span>
                      <span style={{ fontSize: "11px", color: "#475569" }}>매출 {won(monthSales)} · 주문 {won(monthTotal)}</span>
                    </div>
                    <div style={{ background: "linear-gradient(145deg, #0f1d32, #162033)", borderRadius: "14px", border: "1px solid #1e293b", overflow: "hidden" }}>
                      {recs.sort((a, b) => (b.startDate || b.date).localeCompare(a.startDate || a.date)).map((r, i) => (
                        <div key={r.id} style={{ borderBottom: i < recs.length - 1 ? "1px solid #1e293b" : "none" }}>
                          <div style={{
                            display: "grid", gridTemplateColumns: "120px 1fr 1fr 1fr auto", gap: "12px",
                            alignItems: "center", padding: "14px 18px",
                          }}>
                            <div>
                              <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#cbd5e1" }}>{formatRange(r.startDate || r.date, r.endDate || r.date)}</p>
                              <p style={{ margin: 0, fontSize: "10px", color: "#475569" }}>{getWeekLabel(r.startDate || r.date)}</p>
                            </div>
                            <div>
                              <p style={{ margin: 0, fontSize: "10px", color: "#64748b" }}>주간 매출</p>
                              <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#38bdf8" }}>{won(r.weeklySales)}</p>
                            </div>
                            <div>
                              <p style={{ margin: 0, fontSize: "10px", color: "#64748b" }}>권장 ({Math.round(settings.orderRatio * 100)}%)</p>
                              <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#94a3b8" }}>{won(r.suggestedOrder)}</p>
                            </div>
                            <div>
                              <p style={{ margin: 0, fontSize: "10px", color: "#64748b" }}>실제 주문 합계</p>
                              <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: r.actualOrder > r.suggestedOrder ? "#f59e0b" : "#a855f7" }}>
                                {won(r.actualOrder)}
                                {r.dailyOrders && <span style={{ fontSize: "10px", color: "#475569", marginLeft: "4px" }}>({r.dailyOrders.length}건)</span>}
                              </p>
                            </div>
                            <div style={{ display: "flex", gap: "4px" }}>
                              <button onClick={() => handleEditClick(r)} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}><I.Edit /></button>
                              <button onClick={() => handleDelete(r)} style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: "8px", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444" }}><I.Trash /></button>
                            </div>
                          </div>
                          {/* Daily breakdown */}
                          {r.dailyOrders && r.dailyOrders.length > 0 && (
                            <div style={{ padding: "0 18px 12px 18px" }}>
                              <div style={{ background: "#0B1120", borderRadius: "10px", padding: "10px 14px" }}>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                  {r.dailyOrders.sort((a, b) => a.date.localeCompare(b.date)).map((o, oi) => {
                                    const d = new Date(o.date);
                                    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
                                    const dayName = dayNames[d.getDay()];
                                    const dayColor = d.getDay() === 0 ? "#f87171" : d.getDay() === 6 ? "#60a5fa" : "#94a3b8";
                                    return (
                                      <div key={oi} style={{
                                        display: "flex", alignItems: "center", gap: "6px", padding: "5px 10px",
                                        background: "#162033", borderRadius: "8px", fontSize: "12px"
                                      }}>
                                        <span style={{ color: dayColor, fontWeight: 700 }}>{`${d.getMonth() + 1}/${d.getDate()}`}<span style={{ fontSize: "10px" }}>({dayName})</span></span>
                                        <span style={{ color: "#a855f7", fontWeight: 700 }}>{won(o.amount)}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* ─── Bank Balance Modal ─── */}
      <Modal open={showBankModal} onClose={() => setShowBankModal(false)} title="은행 잔고 관리" w="420px">
        <div style={{ background: "#f0f9ff", borderRadius: "12px", padding: "16px", marginBottom: "18px", textAlign: "center" }}>
          <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#64748b" }}>현재 잔고</p>
          <p style={{ margin: 0, fontSize: "26px", fontWeight: 800, color: bankDanger ? "#ef4444" : "#0f172a", fontFamily: "'Outfit', sans-serif" }}>{won(bankBalance)}</p>
          {bankDanger && <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#ef4444", fontWeight: 600 }}>⚠ 최소 유지금액 ({won(settings.bankMin)}) 미달</p>}
        </div>
        <div style={{ marginBottom: "14px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px", display: "block" }}>변경 방식</label>
          <div style={{ display: "flex", gap: "6px" }}>
            {[{ v: "set", l: "직접 입력" }, { v: "add", l: "입금 (+)" }, { v: "sub", l: "출금 (-)" }].map(t => (
              <button key={t.v} onClick={() => setBankForm({ ...bankForm, type: t.v })} style={{
                flex: 1, padding: "9px 12px", borderRadius: "10px", fontSize: "13px", fontWeight: 600,
                background: bankForm.type === t.v ? "#0ea5e9" : "#f1f5f9",
                color: bankForm.type === t.v ? "#fff" : "#64748b",
                border: bankForm.type === t.v ? "1.5px solid #0ea5e9" : "1.5px solid #e2e8f0"
              }}>{t.l}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: "16px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px", display: "block" }}>금액 (원)</label>
          <input type="number" value={bankForm.amount} onChange={e => setBankForm({ ...bankForm, amount: e.target.value })}
            placeholder="금액 입력" style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #e2e8f0", borderRadius: "12px", fontSize: "15px", fontWeight: 700, color: "#0f172a", background: "#f8fafc" }} />
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => setShowBankModal(false)} style={{ flex: 1, padding: "12px", background: "#f1f5f9", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: 600, color: "#64748b" }}>취소</button>
          <button onClick={handleBankUpdate} style={{ flex: 1, padding: "12px", background: "#0ea5e9", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: 700, color: "#fff" }}>적용</button>
        </div>
      </Modal>

      {/* ─── Settings Modal ─── */}
      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="운영 규칙 설정" w="440px">
        <div style={{ marginBottom: "18px" }}>
          <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px", display: "block" }}>주문 비율 (매출 대비 %)</label>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input type="number" value={settings.orderRatio * 100} onChange={e => setSettings({ ...settings, orderRatio: (parseInt(e.target.value) || 50) / 100 })}
              style={{ width: "100px", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "16px", fontWeight: 700, color: "#0f172a", textAlign: "center" }} />
            <span style={{ color: "#64748b", fontWeight: 600 }}>%</span>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>현재: 매출의 {settings.orderRatio * 100}%를 주문</span>
          </div>
        </div>
        <div style={{ marginBottom: "18px" }}>
          <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px", display: "block" }}>월 최소 주문액 (원)</label>
          <input type="number" value={settings.monthlyMin} onChange={e => setSettings({ ...settings, monthlyMin: parseInt(e.target.value) || 10000000 })}
            style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "15px", fontWeight: 700, color: "#0f172a" }} />
        </div>
        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569", marginBottom: "6px", display: "block" }}>은행 잔고 최소 유지액 (원)</label>
          <input type="number" value={settings.bankMin} onChange={e => setSettings({ ...settings, bankMin: parseInt(e.target.value) || 30000000 })}
            style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "15px", fontWeight: 700, color: "#0f172a" }} />
        </div>
        <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "14px", marginBottom: "16px", fontSize: "13px", color: "#64748b", lineHeight: "1.6" }}>
          <strong style={{ color: "#0f172a" }}>현재 규칙 요약</strong><br />
          ① 매주 포스기 일반약 매출의 <strong>{settings.orderRatio * 100}%</strong>를 주문<br />
          ② 매달 최소 <strong>{won(settings.monthlyMin)}</strong> 이상 주문<br />
          ③ 은행잔고 항상 <strong>{won(settings.bankMin)}</strong> 이상 유지
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => setShowSettings(false)} style={{ flex: 1, padding: "12px", background: "#f1f5f9", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: 600, color: "#64748b" }}>취소</button>
          <button onClick={handleSaveSettings} style={{ flex: 1, padding: "12px", background: "#0ea5e9", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: 700, color: "#fff" }}>저장</button>
        </div>
      </Modal>

      {/* ─── Delete Confirmation Modal ─── */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="기록 삭제" w="380px">
        <div style={{ textAlign: "center", padding: "8px 0 20px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", color: "#ef4444" }}>
            <I.Trash />
          </div>
          <p style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>이 기록을 삭제하시겠습니까?</p>
          {deleteConfirm && (
            <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
              {formatRange(deleteConfirm.startDate || deleteConfirm.date, deleteConfirm.endDate || deleteConfirm.date)} · 주문 {won(deleteConfirm.actualOrder)}
              <br />삭제 시 은행잔고에 주문액이 복원됩니다.
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: "12px", background: "#f1f5f9", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: 600, color: "#64748b" }}>취소</button>
          <button onClick={confirmDelete} style={{ flex: 1, padding: "12px", background: "#ef4444", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: 700, color: "#fff" }}>삭제</button>
        </div>
      </Modal>
    </div>
  );
}
