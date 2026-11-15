import { useState, useEffect } from "react";
import { MOVIES, CINEMAS, getUpcomingDates, getShowtimesForCinema } from "./movies";
import AuthPage from "./AuthPage";
import PaymentPanel from "./PaymentPanel";
import QrModal from "./QrModal";

export default function App() {
  const dates = getUpcomingDates();
  const firstMovie = MOVIES.find(Boolean);
  const firstDate = dates.find(Boolean);
  const saved = JSON.parse(sessionStorage.getItem("cine_booking_state") || "null");

  const [currentUser, setCurrentUser] = useState(() =>
    JSON.parse(localStorage.getItem("cine_user") || "null")
  );
  const [view, setView] = useState(saved?.view || "HOME");
  const [pendingBooking, setPendingBooking] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState("SEATS");
  const [combos, setCombos] = useState({ family: 0, sweet: 0 });
  const [voucherCode, setVoucherCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [payMethod, setPayMethod] = useState("QR");
  const [showQrModal, setShowQrModal] = useState(false);
  const [city, setCity] = useState(saved?.city || "Hà Nội");
  const [cinema, setCinema] = useState(saved?.cinema || "Cine Thanh Xuân");
  const [tab, setTab] = useState("DANG_CHIEU");
  const [selectedMovie, setSelectedMovie] = useState(saved?.selectedMovie || firstMovie);
  const [selectedDate, setSelectedDate] = useState(
    saved?.view === "BOOKING" && saved?.selectedDate ? saved.selectedDate : firstDate
  );
  const [selectedTime, setSelectedTime] = useState(saved?.selectedTime || "18:40");
  const [seats, setSeats] = useState([]);
  const [logs, setLogs] = useState([]);
  const [ticket, setTicket] = useState(null);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [availMap, setAvailMap] = useState({});
  const [allAvailMap, setAllAvailMap] = useState({});
  const [showTop, setShowTop] = useState(false);

  const kongUrl = window.location.origin.replace("-8080.", "-8000.");
  const currentShowtimes = getShowtimesForCinema(cinema);
  const slotKey = `${cinema}_${selectedMovie.id}_${selectedDate.id}_${selectedTime}`;
  const activeUserId = currentUser ? currentUser.fullName : "Khách";

  useEffect(() => {
    sessionStorage.setItem(
      "cine_booking_state",
      JSON.stringify({ view, city, cinema, selectedMovie, selectedDate, selectedTime })
    );
    if (view === "HOME") document.title = "Phim - Cine Cinemas";
    else if (view === "SCHEDULE") document.title = "Lịch chiếu - Cine Cinemas";
    else if (view === "AUTH") document.title = "Đăng nhập / Đăng ký - Cine Cinemas";
    else document.title = `Chọn ghế (${selectedMovie.title}) - Cine Cinemas`;
  }, [view, city, cinema, selectedMovie, selectedDate, selectedTime]);
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const addLog = (text, type = "info") => {
    const time = new Date().toLocaleTimeString("vi-VN");
    setLogs((prev) => [{ time, text, type }, ...prev.slice(0, 6)]);
  };

  const fetchSeats = async () => {
    try {
      const res = await fetch(`${kongUrl}/api/seats?movieId=${slotKey}`);
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
  const loadAvailForDate = async (movie, dateObj, targetCinema = cinema) => {
    const nextMap = {};
    const list = getShowtimesForCinema(targetCinema);
    for (const st of list) {
      const key = `${targetCinema}_${movie.id}_${dateObj.id}_${st.time}`;
      try {
        const res = await fetch(`${kongUrl}/api/seats?movieId=${key}`);
        const data = await res.json();
        nextMap[st.time] = Array.isArray(data) ? data.filter((s) => s.status === "AVAILABLE").length : 10;
      } catch {
        nextMap[st.time] = 10;
      }
    }
    setAvailMap(nextMap);
  };

  const loadAllMoviesSchedule = async (dateObj, targetCinema = cinema) => {
    const map = {};
    const list = getShowtimesForCinema(targetCinema);
    for (const m of MOVIES) {
      for (const st of list) {
        const key = `${targetCinema}_${m.id}_${dateObj.id}_${st.time}`;
        try {
          const res = await fetch(`${kongUrl}/api/seats?movieId=${key}`);
          const data = await res.json();
          map[key] = Array.isArray(data) ? data.filter((s) => s.status === "AVAILABLE").length : 10;
        } catch {
          map[key] = 10;
        }
      }
    }
    setAllAvailMap(map);
  };

  const openScheduleModal = async (movie) => {
    setSelectedMovie(movie);
    setSelectedDate(firstDate);
    setTicket(null);
    setShowModal(true);
    await loadAvailForDate(movie, firstDate, cinema);
  };

  const isPastShowtime = (dateObj, timeStr) => {
    if (!dateObj || !firstDate || dateObj.id !== firstDate.id) return false;
    const now = new Date();
    const [hh, mm] = timeStr.split(":").map(Number);
    return now.getHours() > hh || (now.getHours() === hh && now.getMinutes() >= mm);
  };

  const goToBooking = (movieObj, timeStr) => {
    setCheckoutStep("SEATS"); setCombos({ family: 0, sweet: 0 }); setDiscount(0); setShowQrModal(false);
    setSelectedTime(timeStr);
    setSelectedMovie(movieObj);
    setTicket(null);
    setShowModal(false);
    if (!currentUser) {
      setPendingBooking(true);
      setView("AUTH");
    } else {
      setView("BOOKING");
    }
  };
  useEffect(() => {
    if (view === "BOOKING") {
      fetchSeats();
      const timer = setInterval(fetchSeats, 1000);
      return () => clearInterval(timer);
    } else if (view === "SCHEDULE") {
      loadAllMoviesSchedule(selectedDate, cinema);
    }
  }, [view, selectedMovie, selectedDate, selectedTime, cinema]);

  const myLockedSeats = seats.filter((s) => s.status === "LOCKED" && s.lockedBy === activeUserId);
  const minRemain = myLockedSeats.length > 0 ? Math.min(...myLockedSeats.map((s) => s.remainingSeconds || 0)) : 0;
  const seatTotal = myLockedSeats.length * selectedMovie.price;
  const comboTotal = combos.family * 220000 + combos.sweet * 110000;
  const totalPrice = Math.max(0, seatTotal + comboTotal - discount);

  const handleToggleSeat = async (seat) => {
    if (seat.status === "BOOKED" || busy) return;
    setBusy(true);
    setTicket(null);

    if (seat.status === "LOCKED" && seat.lockedBy === activeUserId) {
      try {
        await fetch(`${kongUrl}/api/seats/unlock`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seatCode: seat.seatCode, userId: activeUserId, movieId: slotKey })
        });
        addLog(`[Seat Locking] ${activeUserId} đã hủy giữ ghế ${seat.seatCode}.`, "info");
        await fetchSeats();
      } catch {
        addLog("Lỗi khi hủy giữ ghế", "error");
      }
      setBusy(false);
      return;
    }

    try {
      addLog(`[Kong Gateway] Gửi yêu cầu giữ ghế ${seat.seatCode} (${cinema} - ${selectedTime})...`);
      const lockRes = await fetch(`${kongUrl}/api/seats/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatCode: seat.seatCode, userId: activeUserId, movieId: slotKey })
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
          body: JSON.stringify({ seatCode: code, userId: activeUserId, movieId: slotKey })
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
          user: activeUserId,
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
      <div style={{ background: "#015198", color: "#fff", fontSize: "12px", padding: "7px 0" }}>
        <div style={{ maxWidth: "1140px", margin: "0 auto", padding: "0 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Hệ thống đặt vé xem phim phân tán Microservices</span>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {currentUser ? (
              <>
                <span>Xin chào: <b style={{ color: "#38bdf8" }}>{currentUser.fullName}</b></span>
                <span style={{ color: "#475569" }}>|</span>
                <span onClick={() => { localStorage.removeItem("cine_user"); setCurrentUser(null); setView("HOME"); }} style={{ cursor: "pointer", color: "#fca5a5" }}>
                  Đăng xuất ↪
                </span>
              </>
            ) : (
              <>
                <span onClick={() => { setPendingBooking(false); setView("AUTH"); }} style={{ cursor: "pointer", fontWeight: "600" }}>Đăng nhập</span>
                <span style={{ color: "#475569" }}>|</span>
                <span onClick={() => { setPendingBooking(false); setView("AUTH"); }} style={{ cursor: "pointer", fontWeight: "600" }}>Đăng ký</span>
              </>
            )}
          </div>
        </div>
      </div>
      <header style={{ borderBottom: "1px solid #e2e8f0", background: "#fff", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: "1140px", margin: "0 auto", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div onClick={() => setView("HOME")} style={{ cursor: "pointer", display: "flex", flexDirection: "column", lineHeight: 1 }}>
              <span style={{ fontSize: "26px", fontWeight: "900", color: "#03599d", letterSpacing: "-1px" }}>cine</span>
              <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b" }}>cinemas</span>
            </div>

            <div className={`cinema-dropdown ${menuOpen ? "open" : ""}`}>
              <div className="cinema-btn" onClick={() => setMenuOpen(!menuOpen)}>
                <span>{cinema}</span>
                <span style={{ fontSize: "10px", color: "#64748b" }}>{menuOpen ? "▲" : "▼"}</span>
              </div>
              <div className="cinema-menu">
                {Object.entries(CINEMAS).map(([cityName, theaterList]) => (
                  <div key={cityName} className="city-item">
                    <span>{cityName}</span>
                    <span style={{ fontSize: "11px" }}>›</span>
                    <div className="sub-menu">
                      {theaterList.map((theater) => (
                        <div key={theater} className="sub-item" onClick={() => {
                          setCity(cityName);
                          setCinema(theater);
                          setMenuOpen(false);
                          if (view === "SCHEDULE") loadAllMoviesSchedule(selectedDate, theater);
                        }}>
                          {theater}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <nav style={{ display: "flex", gap: "20px", fontSize: "14px", fontWeight: "700", color: "#334155" }}>
            <span onClick={() => { setView("SCHEDULE"); loadAllMoviesSchedule(selectedDate, cinema); }} style={{ cursor: "pointer", color: view === "SCHEDULE" ? "#03599d" : "#334155", borderBottom: view === "SCHEDULE" ? "2px solid #03599d" : "none", paddingBottom: "4px" }}>
              LỊCH CHIẾU THEO RẠP
            </span>
            <span onClick={() => setView("HOME")} style={{ cursor: "pointer", color: view === "HOME" ? "#03599d" : "#334155", borderBottom: view === "HOME" ? "2px solid #03599d" : "none", paddingBottom: "4px" }}>
              PHIM
            </span>
            <span style={{ color: "#64748b" }}>RẠP</span>
            <span style={{ color: "#64748b" }}>GIÁ VÉ</span>
          </nav>
        </div>
      </header>

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
                <div className="poster-box" onClick={() => openScheduleModal(m)}>
                  <img src={m.poster} alt={m.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <span style={{ position: "absolute", top: "10px", left: "10px", background: m.rating === "P" ? "#16a34a" : m.rating === "T13" ? "#0284c7" : m.rating === "T18" ? "#dc2626" : "#f59e0b", color: "#fff", fontWeight: "800", fontSize: "12px", padding: "3px 8px", borderRadius: "6px" }}>{m.rating}</span>
                  {m.hot && <span style={{ position: "absolute", top: "10px", right: "-24px", background: "#ef4444", color: "#fff", fontWeight: "800", fontSize: "11px", padding: "3px 28px", transform: "rotate(45deg)" }}>HOT</span>}
                  <div className="poster-overlay">
                    <h4 style={{ fontSize: "18px", fontWeight: "800", lineHeight: "1.3", marginBottom: "6px", textTransform: "uppercase" }}>{m.title} ({m.rating})</h4>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}><span>🏷️</span> <span>{m.genre}</span></div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}><span>🕒</span> <span>{m.duration}</span></div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}><span>🌐</span> <span>{m.country || "Việt Nam"}</span></div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px" }}><span>💬</span> <span>{m.lang || "Phụ Đề"}</span></div>
                  </div>
                </div>
                <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#03599d", marginBottom: "6px" }}>{m.title}</h3>
                <p style={{ fontSize: "13px", color: "#475569", marginBottom: "2px" }}><b>Thể loại:</b> {m.genre}</p>
                <p style={{ fontSize: "13px", color: "#475569", marginBottom: "12px" }}><b>Thời lượng:</b> {m.duration}</p>
                <button onClick={() => openScheduleModal(m)} style={{ marginTop: "auto", width: "100%", padding: "10px", background: "linear-gradient(90deg, #0a64a4, #0a64a4)", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "700", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  🎟️ MUA VÉ
                </button>
              </div>
            ))}
          </div>
        </main>
      ) : view === "SCHEDULE" ? (
        <main style={{ maxWidth: "1140px", margin: "0 auto", padding: "28px 16px" }}>
          <div style={{ display: "flex", gap: "36px", borderBottom: "1px solid #e2e8f0", marginBottom: "16px", overflowX: "auto" }}>
            {dates.map((d) => {
              const active = selectedDate.id === d.id;
              return (
                <div key={d.id} onClick={() => { setSelectedDate(d); loadAllMoviesSchedule(d, cinema); }} style={{ paddingBottom: "10px", cursor: "pointer", whiteSpace: "nowrap", color: active ? "#03599d" : "#334155", borderBottom: active ? "3px solid #03599d" : "3px solid transparent" }}>
                  <span style={{ fontSize: "30px", fontWeight: "800" }}>{d.day}</span>
                  <span style={{ fontSize: "14px", fontWeight: "700" }}>{d.sub}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#475569", marginBottom: "28px" }}>
            <span style={{ width: "14px", height: "14px", background: "#93c5fd", display: "inline-block", borderRadius: "2px" }} />
            <span>Suất chiếu muộn từ 22h00</span>
          </div>

          {firstMovie && (
            <div className="schedule-featured">
              <div style={{ position: "relative", borderRadius: "14px", overflow: "hidden", aspectRatio: "2/3", boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}>
                <img src={firstMovie.poster} alt={firstMovie.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <span style={{ position: "absolute", top: "10px", left: "10px", background: "#f59e0b", color: "#fff", fontWeight: "800", fontSize: "12px", padding: "3px 8px", borderRadius: "6px" }}>{firstMovie.rating}</span>
              </div>
              <div>
                <h2 style={{ fontSize: "26px", fontWeight: "800", color: "#03599d", marginBottom: "8px" }}>{firstMovie.title}</h2>
                <p style={{ fontSize: "14px", color: "#475569", marginBottom: "20px" }}>🏷️ {firstMovie.genre} &nbsp;&nbsp; 🕒 {firstMovie.duration}</p>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "#1e293b", marginBottom: "12px" }}>2D PHỤ ĐỀ</div>
                <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
                  {currentShowtimes.map((st) => {
                    const key = `${cinema}_${firstMovie.id}_${selectedDate.id}_${st.time}`;
                    const free = allAvailMap[key] ?? 10;
                    const isLate = Number(st.time.slice(0, 2)) >= 22;
                    return (
                      <div key={st.time} style={{ textAlign: "center" }}>
                        {(() => { const past = isPastShowtime(selectedDate, st.time); return (<>
                        <div className={`showtime-pill ${isLate ? "late" : ""}`} onClick={() => !past && goToBooking({ ...firstMovie, time: `${st.time} (${selectedDate.id}) - ${st.room}` }, st.time)} style={past ? { opacity: 0.45, cursor: "not-allowed", background: "#e2e8f0", color: "#64748b" } : {}}>
                          {st.time}
                        </div>
                        <div style={{ fontSize: "11px", color: past ? "#94a3b8" : "#64748b", marginTop: "4px" }}>{past ? "Đã chiếu" : `${free} ghế trống`}</div>
                        </>); })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="schedule-grid-2">
            {MOVIES.slice(1).map((m) => (
              <div key={m.id} style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: "18px" }}>
                <div style={{ position: "relative", borderRadius: "12px", overflow: "hidden", aspectRatio: "2/3", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}>
                  <img src={m.poster} alt={m.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <span style={{ position: "absolute", top: "8px", left: "8px", background: m.rating === "P" ? "#16a34a" : m.rating === "T13" ? "#0284c7" : m.rating === "T18" ? "#dc2626" : "#f59e0b", color: "#fff", fontWeight: "800", fontSize: "11px", padding: "2px 6px", borderRadius: "4px" }}>{m.rating}</span>
                </div>
                <div>
                  <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#03599d", marginBottom: "6px" }}>{m.title}</h3>
                  <p style={{ fontSize: "13px", color: "#475569", marginBottom: "14px" }}>🏷️ {m.genre} &nbsp; 🕒 {m.duration}</p>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b", marginBottom: "10px" }}>2D PHỤ ĐỀ</div>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    {currentShowtimes.map((st) => {
                      const key = `${cinema}_${m.id}_${selectedDate.id}_${st.time}`;
                      const free = allAvailMap[key] ?? 10;
                      const isLate = Number(st.time.slice(0, 2)) >= 22;
                      return (
                        <div key={st.time} style={{ textAlign: "center" }}>
                          {(() => { const past = isPastShowtime(selectedDate, st.time); return (<>
                          <div className={`showtime-pill ${isLate ? "late" : ""}`} onClick={() => !past && goToBooking({ ...m, time: `${st.time} (${selectedDate.id}) - ${st.room}` }, st.time)} style={past ? { opacity: 0.45, cursor: "not-allowed", background: "#e2e8f0", color: "#64748b" } : {}}>
                            {st.time}
                          </div>
                          <div style={{ fontSize: "11px", color: past ? "#94a3b8" : "#64748b", marginTop: "4px" }}>{past ? "Đã chiếu" : `${free} ghế trống`}</div>
                          </>); })()}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      ) : view === "AUTH" ? (
        <AuthPage
          kongUrl={kongUrl}
          onSuccess={(user) => {
            localStorage.setItem("cine_user", JSON.stringify(user));
            setCurrentUser(user);
            setView(pendingBooking ? "BOOKING" : "HOME");
            setPendingBooking(false);
          }}
          onBack={() => setView("HOME")}
        />
      ) : (
        <main style={{ maxWidth: "1140px", margin: "0 auto", padding: "24px 16px" }}>
          <div style={{ fontSize: "15px", fontWeight: "700", color: "#03599d", marginBottom: "14px" }}>
            <span onClick={() => setView("HOME")} style={{ cursor: "pointer" }}>Trang chủ</span> &gt; Đặt vé &gt; <span style={{ color: "#1e293b" }}>{selectedMovie.title}</span>
          </div>

          <div style={{ background: "#f59e0b", color: "#fff", textAlign: "center", padding: "10px", borderRadius: "6px", fontWeight: "700", fontSize: "13px", marginBottom: "20px" }}>
            Phim dành cho khán giả theo phân loại độ tuổi ({selectedMovie.rating}). Vui lòng kiểm tra thông tin suất chiếu trước khi đặt ghế.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: "24px" }}>
            {checkoutStep === "PAYMENT" && myLockedSeats.length > 0 ? <PaymentPanel currentUser={currentUser} selectedMovie={selectedMovie} myLockedSeats={myLockedSeats} seatTotal={seatTotal} comboTotal={comboTotal} totalPrice={totalPrice} combos={combos} setCombos={setCombos} voucherCode={voucherCode} setVoucherCode={setVoucherCode} discount={discount} setDiscount={setDiscount} payMethod={payMethod} setPayMethod={setPayMethod} minRemain={minRemain} /> : <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "24px", textAlign: "center" }}>
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
                <span>⬜ Ghế trống</span><span>🟨 Ghế đang được giữ</span><span>🟥 Đã bán</span>
              </div>
            </div>}

            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "22px", boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "125px 1fr", gap: "16px", paddingBottom: "18px", borderBottom: "1px dashed #cbd5e1", marginBottom: "18px" }}>
                <div style={{ position: "relative", borderRadius: "10px", overflow: "hidden", aspectRatio: "2/3", boxShadow: "0 4px 10px rgba(0,0,0,0.12)" }}>
                  <img src={selectedMovie.poster} alt={selectedMovie.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <span style={{ position: "absolute", top: "8px", left: "8px", background: selectedMovie.rating === "P" ? "#16a34a" : selectedMovie.rating === "T13" ? "#0284c7" : selectedMovie.rating === "T18" ? "#dc2626" : "#f59e0b", color: "#fff", fontWeight: "800", fontSize: "11px", padding: "2px 7px", borderRadius: "5px" }}>
                    {selectedMovie.rating}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <h3 style={{ fontSize: "20px", fontWeight: "800", color: "#03599d", lineHeight: "1.3", marginBottom: "8px" }}>
                    {selectedMovie.title}
                  </h3>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#334155" }}>2D Phụ đề</div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px", color: "#334155", marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b" }}>🏷️ Thể loại</span>
                  <b style={{ color: "#1e293b" }}>{selectedMovie.genre}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", borderBottom: "1px dashed #e2e8f0" }}>
                  <span style={{ color: "#64748b" }}>🕒 Thời lượng</span>
                  <b style={{ color: "#1e293b" }}>{selectedMovie.duration}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b" }}>🏛️ Rạp chiếu</span>
                  <b style={{ color: "#1e293b" }}>{cinema}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b" }}>📅 Ngày chiếu</span>
                  <b style={{ color: "#1e293b" }}>{selectedDate.id}/2026</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b" }}>⏰ Giờ chiếu</span>
                  <b style={{ color: "#1e293b" }}>{selectedTime}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#64748b" }}>💺 Ghế ngồi</span>
                  <b style={{ color: myLockedSeats.length > 0 ? "#03599d" : "#94a3b8" }}>
                    {myLockedSeats.length > 0 ? myLockedSeats.map((s) => s.seatCode).join(", ") : "Chưa chọn ghế"}
                  </b>
                </div>
                {myLockedSeats.length > 0 && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#64748b" }}>⏳ Thời gian giữ</span>
                      <b style={{ color: "#ef4444" }}>{minRemain}s</b>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", borderTop: "1px solid #e2e8f0" }}>
                      <span style={{ fontWeight: "700", color: "#1e293b" }}>Tổng thanh toán</span>
                      <b style={{ color: "#03599d", fontSize: "18px" }}>{totalPrice.toLocaleString("vi-VN")} đ</b>
                    </div>
                  </>
                )}
              </div>

              {myLockedSeats.length > 0 ? (
                checkoutStep === "SEATS" ? (
                  <button onClick={() => setCheckoutStep("PAYMENT")} style={{ width: "100%", padding: "12px", background: "linear-gradient(90deg, #0a64a4, #1d8fe1)", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "800", fontSize: "15px", cursor: "pointer" }}>
                    TIẾP TỤC
                  </button>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <button onClick={() => setCheckoutStep("SEATS")} style={{ padding: "12px", background: "#cbd5e1", color: "#1e293b", border: "none", borderRadius: "8px", fontWeight: "800", fontSize: "14px", cursor: "pointer" }}>QUAY LẠI</button>
                    <button onClick={() => setShowQrModal(true)} disabled={busy} style={{ padding: "12px", background: "linear-gradient(90deg, #0a64a4, #1d8fe1)", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "800", fontSize: "14px", cursor: "pointer" }}>TIẾP TỤC</button>
                  </div>
                )
              ) : ticket ? (
                <div style={{ background: "#f0f9ff", border: "1px dashed #03599d", borderRadius: "10px", padding: "14px", fontSize: "13px" }}>
                  <div style={{ fontWeight: "800", color: "#059669", marginBottom: "6px" }}>✅ ĐẶT VÉ THÀNH CÔNG!</div>
                  <div style={{ marginBottom: "4px" }}>Khách hàng: <b>{ticket.user}</b></div>
                  <div style={{ marginBottom: "4px" }}>Ghế ({ticket.count}): <b style={{ color: "#03599d" }}>{ticket.seats}</b></div>
                  <div style={{ marginBottom: "8px" }}>Đã thanh toán: <b style={{ color: "#d97706" }}>{ticket.price}</b></div>
                  <div style={{ fontSize: "11px", color: "#64748b", background: "#fff", padding: "6px", borderRadius: "4px", border: "1px solid #cbd5e1", wordBreak: "break-all" }}>
                    UUID: {ticket.ids.join(" | ")}
                  </div>
                </div>
              ) : (
                <button
                  disabled
                  style={{ width: "100%", padding: "12px", background: "#cbd5e1", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "800", fontSize: "15px", cursor: "not-allowed" }}
                >
                  TIẾP TỤC
                </button>
              )}
            </div>
          </div>
        </main>
      )}
{showQrModal && myLockedSeats.length > 0 && <QrModal payMethod={payMethod} cinema={cinema} myLockedSeats={myLockedSeats} totalPrice={totalPrice} activeUserId={activeUserId} minRemain={minRemain} busy={busy} onClose={() => setShowQrModal(false)} onConfirm={() => { setShowQrModal(false); setCheckoutStep("SEATS"); handleConfirmPayment(); }} />}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "16px" }}>
          <div style={{ background: "#ffffff", width: "100%", maxWidth: "760px", borderRadius: "8px", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "18px", fontWeight: "700", color: "#334155" }}>LỊCH CHIẾU - {selectedMovie.title}</span>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: "20px", color: "#94a3b8", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ padding: "24px 32px 36px" }}>
              <h2 style={{ textAlign: "center", fontSize: "24px", fontWeight: "700", color: "#1e293b", marginBottom: "24px" }}>Rạp {cinema}</h2>
              <div style={{ display: "flex", gap: "24px", borderBottom: "1px solid #e2e8f0", marginBottom: "24px", overflowX: "auto" }}>
                {dates.map((d) => {
                  const active = selectedDate.id === d.id;
                  return (
                    <div key={d.id} onClick={() => { setSelectedDate(d); loadAvailForDate(selectedMovie, d, cinema); }} style={{ paddingBottom: "10px", cursor: "pointer", whiteSpace: "nowrap", color: active ? "#03599d" : "#334155", borderBottom: active ? "3px solid #03599d" : "3px solid transparent" }}>
                      <span style={{ fontSize: "26px", fontWeight: "800" }}>{d.day}</span>
                      <span style={{ fontSize: "13px", fontWeight: "700" }}>{d.sub}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#334155", marginBottom: "12px" }}>2D PHỤ ĐỀ</div>
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "20px" }}>
                {currentShowtimes.map((st) => {
                  const freeSeats = availMap[st.time] ?? 10;
                  const isLate = Number(st.time.slice(0, 2)) >= 22;
                  return (
                    <div key={st.time} style={{ textAlign: "center" }}>
                      {(() => { const past = isPastShowtime(selectedDate, st.time); return (<>
                      <div className={`showtime-pill ${isLate ? "late" : ""}`} onClick={() => !past && goToBooking({ ...selectedMovie, time: `${st.time} (${selectedDate.id}) - ${st.room}` }, st.time)} style={past ? { opacity: 0.45, cursor: "not-allowed", background: "#e2e8f0", color: "#64748b" } : {}}>
                        {st.time}
                      </div>
                      <div style={{ fontSize: "11px", color: past ? "#94a3b8" : freeSeats > 0 ? "#059669" : "#ef4444", fontWeight: "600", marginTop: "4px" }}>{past ? "Đã chiếu" : `${freeSeats} ghế trống`}</div>
                      </>); })()}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#475569" }}>
                <span style={{ width: "14px", height: "14px", background: "#93c5fd", display: "inline-block", borderRadius: "2px" }} />
                <span>Suất chiếu muộn từ 22h00</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="cine-footer">
        <div className="footer-grid">
          <div>
            <div style={{ lineHeight: 1, marginBottom: "18px" }}>
              <div style={{ fontSize: "30px", fontWeight: "900", letterSpacing: "-1px" }}>cine</div>
              <div style={{ fontSize: "15px", fontWeight: "600", color: "#bae6fd" }}>cinemas</div>
            </div>
            <ul className="footer-list">
              <li>› Tuyển dụng</li><li>› Giới thiệu</li><li>› Liên hệ</li><li>› FAQ</li>
              <li>› Hoạt động xã hội</li><li>› Điều khoản sử dụng</li>
              <li>› Chính sách thanh toán, đổi trả - hoàn vé</li>
              <li>› Liên hệ quảng cáo</li><li>› Điều khoản bảo mật</li><li>› Hướng dẫn đặt vé online</li>
            </ul>
          </div>
          <div>
            <div className="footer-title">CỤM RẠP CINE</div>
            <ul className="footer-list">
              <li>› Cine Cinemas Thanh Xuân, Hà Nội - Hotline 082 4812878</li>
              <li>› Cine Cinemas Mỹ Đình, Hà Nội - Hotline 0866 154 610</li>
              <li>› Cine Cinemas Giải Phóng, Hà Nội - Hotline 0585 680 360</li>
              <li>› Cine Cinemas Quang Trung, TP Hồ Chí Minh - Hotline 0706 075 509</li>
              <li>› Cine Cinemas Thái Nguyên - Hotline 0867 460 053</li>
              <li>› Cine Cinemas Thanh Hóa - Hotline 0325 360 249</li>
              <li>› Cine Cinemas Nha Trang, Khánh Hòa - Hotline 0399 475 165</li>
              <li>› Cine Cinemas Biên Hòa, Đồng Nai - Hotline 0979 460 002</li>
            </ul>
          </div>
          <div>
            <div className="footer-title">LIÊN HỆ</div>
            <div style={{ fontWeight: "700", marginBottom: "8px" }}>CÔNG TY CỔ PHẦN CINE MEDIA</div>
            <p style={{ color: "#e2e8f0", lineHeight: "1.6", marginBottom: "12px" }}>Địa chỉ trụ sở: Tầng 3, số 595, đường Giải Phóng, Phường Tương Mai, Thành phố Hà Nội, Việt Nam</p>
            <p style={{ color: "#e2e8f0", marginBottom: "16px" }}>Hotline: 1900 636807 • Email: cskh@cinecinemas.vn</p>
            <div style={{ display: "inline-block", background: "#0284c7", border: "1px solid #38bdf8", padding: "6px 14px", borderRadius: "6px", fontWeight: "700", fontSize: "12px" }}>
              ✓ ĐÃ THÔNG BÁO BỘ CÔNG THƯƠNG
            </div>
          </div>
        </div>
      </footer>

      {showTop && (
        <button className="scroll-top-btn" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} title="Lên đầu trang">∧</button>
      )}
    </div>
  );
}
