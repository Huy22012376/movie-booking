import { useState, useEffect } from "react";
import { MOVIES, CINEMAS } from "./movies";

export default function App() {
  const [view, setView] = useState("HOME"); // HOME | BOOKING
  const [city, setCity] = useState("Hà Nội");
  const [cinema, setCinema] = useState("Beta Thanh Xuân");
  const [tab, setTab] = useState("DANG_CHIEU");
  const [selectedMovie, setSelectedMovie] = useState(MOVIES[0]);
  const [seats, setSeats] = useState([]);
  const [userId, setUserId] = useState("user_01");
  const [logs, setLogs] = useState([]);
  const [ticket, setTicket] = useState(null);
  const [busy, setBusy] = useState(false);

  const kongUrl = window.location.origin.replace("-8080.", "-8000.");

  const addLog = (text, type = "info") => {
    const time = new Date().toLocaleTimeString("vi-VN");
    setLogs((prev) => [{ time, text, type }, ...prev.slice(0, 6)]);
  };

  const fetchSeats = async () => {
    try {
      const res = await fetch(`${kongUrl}/api/seats?movieId=${selectedMovie.id}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSeats((prevSeats) => {
            prevSeats.forEach((oldSeat) => {
              const newSeat = data.find((s) => s.seatCode === oldSeat.seatCode);
              if (oldSeat.status === "LOCKED" && newSeat && newSeat.status === "AVAILABLE" && (oldSeat.remainingSeconds || 0) <= 2) {
                addLog(`[CronJob - Hết hạn] Ghế ${oldSeat.seatCode} (${oldSeat.lockedBy}) đã tự động mở khóa!`, "warning");
              }
            });
            return data;
          });
        }
      }
    } catch {
      addLog("Lỗi kết nối Kong Gateway (Hãy bật cổng 8000 sang Public)", "error");
    }
  };

  useEffect(() => {
    if (view === "BOOKING") {
      fetchSeats();
      const timer = setInterval(fetchSeats, 1000);
      return () => clearInterval(timer);
    }
  }, [view, selectedMovie]);

  const myLockedSeats = seats.filter((s) => s.status === "LOCKED" && s.lockedBy === userId);
  const minRemain = myLockedSeats.length > 0 ? Math.min(...myLockedSeats.map((s) => s.remainingSeconds || 0)) : 0;
  const totalPrice = myLockedSeats.length * selectedMovie.price;

  const handleToggleSeat = async (seat) => {
    if (seat.status === "BOOKED" || busy) return;
    setBusy(true);
    setTicket(null);

    if (seat.status === "LOCKED" && seat.lockedBy === userId) {
      try {
        await fetch(`${kongUrl}/api/seats/unlock`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seatCode: seat.seatCode, userId, movieId: selectedMovie.id })
        });
        addLog(`[Seat Locking] ${userId} đã hủy giữ ghế ${seat.seatCode}.`, "info");
        await fetchSeats();
      } catch {
        addLog("Lỗi khi hủy giữ ghế", "error");
      }
      setBusy(false);
      return;
    }

    try {
      addLog(`[Kong Gateway] Gửi yêu cầu giữ ghế ${seat.seatCode} (${selectedMovie.title})...`);
      const lockRes = await fetch(`${kongUrl}/api/seats/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatCode: seat.seatCode, userId, movieId: selectedMovie.id })
      });
      if (!lockRes.ok) {
        const err = await lockRes.json();
        addLog(`[Seat Locking - 409 Conflict] ${err.message}`, "error");
        setBusy(false);
        return;
      }
      addLog(`[Seat Locking] Đã giữ ghế ${seat.seatCode} trong 60 giây!`, "warning");
      await fetchSeats();
    } catch {
      addLog("Lỗi mạng khi gọi Seat Locking", "error");
    }
    setBusy(false);
  };

  const handleConfirmPayment = async () => {
    if (myLockedSeats.length === 0 || busy) return;
    setBusy(true);
    const seatCodes = myLockedSeats.map((s) => s.seatCode);
    const paidAmount = totalPrice;

    try {
      addLog(`[Booking Service] Tạo đơn cho ${seatCodes.length} ghế (${seatCodes.join(", ")}) lên Kafka...`);
      const uuids = [];
      for (const code of seatCodes) {
        const bookRes = await fetch(`${kongUrl}/api/booking`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seatCode: code, userId, movieId: selectedMovie.id })
        });
        const data = await bookRes.json();
        if (data.id) uuids.push(data.id);
      }

      addLog(`[Kafka Event] Đang xử lý thanh toán & xuất vé điện tử...`, "warning");
      setTimeout(() => {
        fetchSeats();
        setTicket({
          ids: uuids,
          movie: selectedMovie.title,
          cinema,
          time: selectedMovie.time,
          seats: seatCodes.join(", "),
          count: seatCodes.length,
          user: userId,
          price: paidAmount.toLocaleString("vi-VN") + " đ"
        });
        addLog(`[Hoàn tất] Đã thanh toán ${seatCodes.length} ghế (${seatCodes.join(", ")})!`, "success");
        setBusy(false);
      }, 1500);
    } catch {
      addLog("Lỗi khi thanh toán qua Kafka", "error");
      setBusy(false);
    }
  };
  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      {/* TOP BAR XANH ĐẬM CHUẨN BETA */}
      <div style={{ background: "#031327", color: "#fff", fontSize: "12px", padding: "6px 0" }}>
        <div style={{ maxWidth: "1140px", margin: "0 auto", padding: "0 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Hệ thống đặt vé phân tán • Microservices & Kafka</span>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span>Tài khoản test:</span>
            <select value={userId} onChange={(e) => { setUserId(e.target.value); setTicket(null); }} style={{ background: "#0f294a", color: "#fff", border: "1px solid #1e4976", padding: "2px 8px", borderRadius: "4px", fontWeight: "bold" }}>
              <option value="user_01">Khách hàng A (user_01)</option>
              <option value="user_02">Khách hàng B (user_02)</option>
              <option value="user_03">Khách hàng C (user_03)</option>
            </select>
          </div>
        </div>
      </div>

      {/* NAVBAR CHÍNH */}
      <header style={{ borderBottom: "1px solid #e2e8f0", background: "#fff", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: "1140px", margin: "0 auto", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div onClick={() => setView("HOME")} style={{ cursor: "pointer", display: "flex", flexDirection: "column", lineHeight: 1 }}>
              <span style={{ fontSize: "26px", fontWeight: "900", color: "#03599d", letterSpacing: "-1px" }}>beta</span>
              <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b" }}>cinemas</span>
            </div>

            {/* BỘ CHỌN TỈNH/THÀNH & RẠP */}
            <div style={{ display: "flex", gap: "8px", background: "#f8fafc", padding: "6px 12px", borderRadius: "20px", border: "1px solid #cbd5e1" }}>
              <select value={city} onChange={(e) => { setCity(e.target.value); setCinema(CINEMAS[e.target.value][0]); }} style={{ border: "none", background: "transparent", fontWeight: "600", fontSize: "13px", color: "#334155", outline: "none" }}>
                {Object.keys(CINEMAS).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <span style={{ color: "#cbd5e1" }}>|</span>
              <select value={cinema} onChange={(e) => setCinema(e.target.value)} style={{ border: "none", background: "transparent", fontWeight: "600", fontSize: "13px", color: "#03599d", outline: "none" }}>
                {CINEMAS[city].map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <nav style={{ display: "flex", gap: "20px", fontSize: "14px", fontWeight: "700", color: "#334155" }}>
            <span onClick={() => setView("HOME")} style={{ cursor: "pointer", color: view === "HOME" ? "#03599d" : "#334155" }}>LỊCH CHIẾU THEO RẠP</span>
            <span onClick={() => setView("HOME")} style={{ cursor: "pointer", color: "#03599d" }}>PHIM</span>
            <span style={{ color: "#64748b" }}>RẠP</span>
            <span style={{ color: "#64748b" }}>GIÁ VÉ</span>
          </nav>
        </div>
      </header>

      {/* NỘI DUNG CHÍNH: MÀN HÌNH DANH SÁCH PHIM */}
      {view === "HOME" ? (
        <main style={{ maxWidth: "1140px", margin: "0 auto", padding: "28px 16px" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: "32px", borderBottom: "1px solid #e2e8f0", marginBottom: "32px" }}>
            {[
              { id: "SAP_CHIEU", label: "PHIM SẮP CHIẾU" },
              { id: "DANG_CHIEU", label: "PHIM ĐANG CHIẾU" },
              { id: "DAC_BIET", label: "SUẤT CHIẾU ĐẶC BIỆT" }
            ].map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: "none", border: "none", paddingBottom: "12px", fontSize: "18px", fontWeight: "800", cursor: "pointer",
                color: tab === t.id ? "#03599d" : "#334155",
                borderBottom: tab === t.id ? "3px solid #03599d" : "3px solid transparent"
              }}>
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "28px" }}>
            {MOVIES.map((m) => (
              <div key={m.id} style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ position: "relative", borderRadius: "14px", overflow: "hidden", aspectRatio: "2/3", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", marginBottom: "12px" }}>
                  <img src={m.poster} alt={m.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <span style={{ position: "absolute", top: "10px", left: "10px", background: "#f59e0b", color: "#fff", fontWeight: "800", fontSize: "12px", padding: "3px 8px", borderRadius: "6px" }}>{m.rating}</span>
                  {m.hot && <span style={{ position: "absolute", top: "10px", right: "-24px", background: "#ef4444", color: "#fff", fontWeight: "800", fontSize: "11px", padding: "3px 28px", transform: "rotate(45deg)" }}>HOT</span>}
                </div>
                <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#03599d", marginBottom: "6px" }}>{m.title}</h3>
                <p style={{ fontSize: "13px", color: "#475569", marginBottom: "2px" }}><b>Thể loại:</b> {m.genre}</p>
                <p style={{ fontSize: "13px", color: "#475569", marginBottom: "12px" }}><b>Thời lượng:</b> {m.duration}</p>
                <button
                  onClick={() => { setSelectedMovie(m); setTicket(null); setView("BOOKING"); }}
                  style={{ marginTop: "auto", width: "100%", padding: "10px", background: "linear-gradient(90deg, #0a64a4, #1d8fe1)", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "700", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                >
                  🎟️ MUA VÉ
                </button>
              </div>
            ))}
          </div>
        </main>
      ) : (
        /* MÀN HÌNH ĐẶT GHẾ & THANH TOÁN PHÂN TÁN */
        <main style={{ maxWidth: "1140px", margin: "0 auto", padding: "24px 16px" }}>
          <button onClick={() => setView("HOME")} style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "6px", fontWeight: "600", cursor: "pointer", marginBottom: "20px", color: "#334155" }}>
            ← Quay lại danh sách phim
          </button>

          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "24px" }}>
            {/* SƠ ĐỒ PHÒNG CHIẾU */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "24px", textAlign: "center" }}>
              <h2 style={{ fontSize: "20px", color: "#03599d", marginBottom: "4px" }}>{selectedMovie.title}</h2>
              <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "24px" }}>{cinema} • {selectedMovie.time}</p>

              <div style={{ height: "8px", width: "80%", margin: "0 auto 8px", background: "linear-gradient(90deg, transparent, #03599d, transparent)", borderRadius: "50%" }} />
              <p style={{ fontSize: "12px", letterSpacing: "4px", color: "#94a3b8", marginBottom: "28px" }}>MÀN HÌNH CHIẾU</p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", maxWidth: "440px", margin: "0 auto 24px" }}>
                {seats.map((seat) => {
                  const isBooked = seat.status === "BOOKED";
                  const isLocked = seat.status === "LOCKED";
                  const remain = seat.remainingSeconds || 0;
                  const bg = isBooked ? "#ef4444" : isLocked ? "#f59e0b" : "#e2e8f0";
                  const color = isBooked || isLocked ? "#fff" : "#1e293b";
                  return (
                    <button key={seat.id} onClick={() => handleToggleSeat(seat)} disabled={isBooked || busy} style={{ background: bg, border: "none", color, padding: "14px 6px", borderRadius: "8px", cursor: isBooked ? "not-allowed" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                      <span style={{ fontSize: "15px", fontWeight: "bold" }}>{seat.seatCode}</span>
                      <span style={{ fontSize: "10px" }}>{isBooked ? "ĐÃ BÁN" : isLocked ? `${seat.lockedBy} (${remain}s)` : "TRỐNG"}</span>
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "flex", justifyContent: "center", gap: "20px", fontSize: "12px", color: "#475569", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                <span>⬜ Ghế trống</span><span>🟨 Đang giữ (60s)</span><span>🟥 Đã bán</span>
              </div>
            </div>

            {/* GIỎ HÀNG, VÉ ĐIỆN TỬ & LOG */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.04)" }}>
                <h3 style={{ fontSize: "16px", color: "#03599d", marginBottom: "12px" }}>💳 THÔNG TIN ĐẶT VÉ</h3>
                {myLockedSeats.length > 0 ? (
                  <div style={{ background: "#fffbeb", border: "1px solid #f59e0b", borderRadius: "10px", padding: "14px", fontSize: "13px" }}>
                    <div style={{ color: "#b45309", fontWeight: "bold", marginBottom: "6px" }}>
                      ⏳ Đang giữ {myLockedSeats.length} ghế: <span style={{ color: "#0f172a" }}>{myLockedSeats.map((s) => s.seatCode).join(", ")}</span>
                    </div>
                    <div style={{ color: "#475569", marginBottom: "4px" }}>Thời gian giữ còn lại: <b style={{ color: "#ef4444" }}>{minRemain}s</b></div>
                    <div style={{ color: "#475569", marginBottom: "12px" }}>Tổng tiền: <b style={{ color: "#03599d", fontSize: "16px" }}>{totalPrice.toLocaleString("vi-VN")} đ</b></div>
                    <button onClick={handleConfirmPayment} disabled={busy} style={{ width: "100%", padding: "11px", background: "#03599d", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}>
                      {busy ? "ĐANG XỬ LÝ QUA KAFKA..." : `✅ THANH TOÁN ${myLockedSeats.length} GHẾ (${totalPrice.toLocaleString("vi-VN")} đ)`}
                    </button>
                  </div>
                ) : ticket ? (
                  <div style={{ background: "#f0f9ff", border: "1px dashed #03599d", borderRadius: "10px", padding: "14px", fontSize: "13px" }}>
                    <div style={{ fontWeight: "bold", fontSize: "16px", color: "#03599d", marginBottom: "6px" }}>🎟️ {ticket.movie}</div>
                    <div style={{ marginBottom: "4px" }}>Rạp: <b>{ticket.cinema}</b> • Suất: <b>{ticket.time}</b></div>
                    <div style={{ marginBottom: "4px" }}>Ghế ({ticket.count}): <b style={{ color: "#059669" }}>{ticket.seats}</b></div>
                    <div style={{ marginBottom: "8px" }}>Đã thanh toán: <b style={{ color: "#d97706" }}>{ticket.price}</b></div>
                    <div style={{ fontSize: "11px", color: "#64748b", background: "#fff", padding: "6px", borderRadius: "4px", border: "1px solid #cbd5e1", wordBreak: "break-all" }}>
                      UUID: {ticket.ids.join(" | ")}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "#64748b", fontSize: "13px", padding: "16px 0", textAlign: "center" }}>
                    Chọn ghế trống bên trái để giữ chỗ (màu vàng), bấm lại để hủy hoặc bấm thanh toán để xuất vé qua Kafka.
                  </div>
                )}
              </div>

              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "20px", flex: 1 }}>
                <h3 style={{ fontSize: "14px", color: "#475569", marginBottom: "10px" }}>⚡ LIVE DISTRIBUTED SYSTEM LOGS</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
                  {logs.length === 0 && <span style={{ color: "#94a3b8" }}>Đang chờ sự kiện giao dịch...</span>}
                  {logs.map((l, idx) => (
                    <div key={idx} style={{ padding: "8px 10px", borderRadius: "6px", background: "#fff", border: "1px solid #e2e8f0", borderLeft: `3px solid ${l.type === "error" ? "#ef4444" : l.type === "success" ? "#10b981" : l.type === "warning" ? "#f59e0b" : "#03599d"}` }}>
                      <span style={{ color: "#94a3b8", marginRight: "6px" }}>[{l.time}]</span>
                      <span style={{ color: l.type === "error" ? "#dc2626" : "#1e293b" }}>{l.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
