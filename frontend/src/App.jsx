import { useState, useEffect } from "react";
export default function App() {
  const [seats, setSeats] = useState([]);
  const [userId, setUserId] = useState("user_01");
  const [msg, setMsg] = useState("");
  const kongUrl = window.location.origin.replace("-8080.", "-8000.");
  const fetchSeats = async () => {
    try {
      const res = await fetch(kongUrl + "/api/seats");
      setSeats(await res.json());
    } catch (e) { setMsg("Loi ket noi Kong Gateway (Hay chuyen cong 8000 sang Public)"); }
  };
  useEffect(() => { fetchSeats(); const t = setInterval(fetchSeats, 3000); return () => clearInterval(t); }, []);
  const handleBook = async (seatCode) => {
    setMsg("Dang xu ly giu ghe " + seatCode + "...");
    const lockRes = await fetch(kongUrl + "/api/seats/lock", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seatCode, userId })
    });
    if (!lockRes.ok) { const err = await lockRes.json(); setMsg("BI CHAN: " + err.message); return; }
    setMsg("Da khoa ghe " + seatCode + "! Dang thanh toan qua Kafka...");
    await fetch(kongUrl + "/api/booking", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seatCode, userId })
    });
    setTimeout(() => { fetchSeats(); setMsg("DAT VE THANH CONG GHE " + seatCode + "!"); }, 1500);
  };
  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 600, margin: "40px auto", textAlign: "center" }}>
      <h2>HE THONG DAT VE XEM PHIM PHAN TAN</h2>
      <div style={{ marginBottom: 20 }}>
        <label>Chon tai khoan test tranh chap: </label>
        <select value={userId} onChange={(e) => setUserId(e.target.value)} style={{ padding: 6 }}>
          <option value="user_01">Khach hang 1 (user_01)</option>
          <option value="user_02">Khach hang 2 (user_02)</option>
        </select>
      </div>
      <div style={{ background: "#333", color: "#fff", padding: 10, borderRadius: 6, marginBottom: 20 }}>MAN HINH CHIEU PHIM</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {seats.map((s) => (
          <button key={s.id} onClick={() => handleBook(s.seatCode)} disabled={s.status === "BOOKED"}
            style={{
              padding: "16px 0", borderRadius: 8, border: "none", fontWeight: "bold", cursor: "pointer", color: "#fff",
              background: s.status === "BOOKED" ? "#e74c3c" : s.status === "LOCKED" ? "#f39c12" : "#2ecc71"
            }}>
            {s.seatCode}<br/><small>{s.status}</small>
          </button>
        ))}
      </div>
      {msg && <div style={{ marginTop: 20, padding: 12, background: "#f0f4f8", borderRadius: 6, fontWeight: "bold" }}>{msg}</div>}
      <p style={{ marginTop: 20, fontSize: 13, color: "#666" }}>Xanh la: Trong (AVAILABLE) | Cam: Dang giu (LOCKED) | Do: Da ban (BOOKED)</p>
    </div>
  );
}
