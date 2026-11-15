export default function PaymentPanel({
  currentUser, selectedMovie, myLockedSeats, seatTotal, comboTotal, totalPrice,
  combos, setCombos, voucherCode, setVoucherCode, discount, setDiscount,
  payMethod, setPayMethod, minRemain
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#1e293b", marginBottom: "16px" }}>👤 THÔNG TIN THANH TOÁN</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: "12px", fontSize: "13px", paddingBottom: "16px", borderBottom: "1px solid #e2e8f0", marginBottom: "14px" }}>
          <div><div style={{ color: "#64748b", fontWeight: "600" }}>Họ Tên:</div><div style={{ color: "#1e293b", marginTop: "2px" }}>{currentUser?.fullName || "Khách hàng"}</div></div>
          <div><div style={{ color: "#64748b", fontWeight: "600" }}>Số điện thoại:</div><div style={{ color: "#1e293b", marginTop: "2px" }}>{currentUser?.phone || "0353163114"}</div></div>
          <div><div style={{ color: "#64748b", fontWeight: "600" }}>Email:</div><div style={{ color: "#1e293b", marginTop: "2px" }}>{currentUser?.email || "khachhang@cinecinemas.vn"}</div></div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", fontWeight: "700" }}>
          <span>GHẾ TIÊU CHUẨN ({myLockedSeats.map(s => s.seatCode).join(", ")})</span>
          <span>{myLockedSeats.length} x {selectedMovie.price.toLocaleString("vi-VN")} = <b style={{ color: "#03599d" }}>{seatTotal.toLocaleString("vi-VN")} vnđ</b></span>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#1e293b", marginBottom: "14px" }}>🍿 COMBO ƯU ĐÃI</h3>
        {[
          { key: "family", name: "Family Combo 69oz", desc: "TIẾT KIỆM 95K!!! Gồm: 2 Bắp (69oz) + 4 Nước có gas (22oz) + 2 Snack Oishi (80g)", price: 220000, icon: "🍿🥤" },
          { key: "sweet", name: "Sweet Combo 69oz", desc: "TIẾT KIỆM 46K!!! Gồm: 1 Bắp (69oz) + 2 Nước có gas (22oz)", price: 110000, icon: "🥤🍿" }
        ].map((cb) => (
          <div key={cb.key} style={{ display: "grid", gridTemplateColumns: "60px 1.2fr 1.6fr 95px", gap: "12px", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f1f5f9", fontSize: "13px" }}>
            <div style={{ width: "52px", height: "52px", borderRadius: "10px", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>{cb.icon}</div>
            <div><div style={{ fontWeight: "700" }}>{cb.name}</div><div style={{ fontSize: "12px", color: "#03599d", fontWeight: "600" }}>{cb.price.toLocaleString("vi-VN")} đ</div></div>
            <div style={{ fontSize: "12px", color: "#475569" }}>{cb.desc}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <span style={{ fontWeight: "700" }}>{combos[cb.key]}</span>
              <button onClick={() => setCombos({ ...combos, [cb.key]: combos[cb.key] + 1 })} style={{ width: "24px", height: "24px", borderRadius: "4px", border: "none", background: "#03599d", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>+</button>
              <button onClick={() => setCombos({ ...combos, [cb.key]: Math.max(0, combos[cb.key] - 1) })} style={{ width: "24px", height: "24px", borderRadius: "4px", border: "none", background: "#94a3b8", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>-</button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#1e293b", marginBottom: "12px" }}>🎟️ GIẢM GIÁ</h3>
        <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
          <input value={voucherCode} onChange={(e) => setVoucherCode(e.target.value)} placeholder="Nhập mã Cine Voucher (VD: CINE20)..." style={{ flex: 1, padding: "9px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }} />
          <button onClick={() => { if (voucherCode.trim()) setDiscount(20000); }} style={{ padding: "9px 16px", background: "#03599d", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "700", fontSize: "13px", cursor: "pointer" }}>Áp dụng</button>
        </div>
        <div style={{ textAlign: "right", fontSize: "14px", lineHeight: "1.8" }}>
          <div>Tổng tiền: <b style={{ color: "#dc2626", marginLeft: "16px" }}>{(seatTotal + comboTotal).toLocaleString("vi-VN")} vnđ</b></div>
          <div>Số tiền được giảm: <b style={{ color: "#dc2626", marginLeft: "16px" }}>{discount.toLocaleString("vi-VN")} vnđ</b></div>
          <div>Số tiền cần thanh toán: <b style={{ color: "#dc2626", fontSize: "16px", marginLeft: "16px" }}>{totalPrice.toLocaleString("vi-VN")} vnđ</b></div>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#1e293b", marginBottom: "14px" }}>💳 PHƯƠNG THỨC THANH TOÁN</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "16px" }}>
          {[
            { id: "QR", label: "Mã QR", icon: "📱" }, { id: "ATM", label: "Thẻ nội địa", icon: "💳" }, { id: "VISA", label: "Thẻ quốc tế", icon: "🌐" },
            { id: "SHOPEE", label: "Ví ShopeePay", icon: "🧡" }, { id: "MOMO", label: "Ví MoMo", icon: "🩷" }, { id: "ZALO", label: "Ví ZaloPay", icon: "💙" }
          ].map((pm) => (
            <label key={pm.id} onClick={() => setPayMethod(pm.id)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px", borderRadius: "8px", border: payMethod === pm.id ? "2px solid #03599d" : "1px solid #e2e8f0", cursor: "pointer", fontSize: "13px", fontWeight: "600", background: payMethod === pm.id ? "#f0f9ff" : "#fff" }}>
              <input type="radio" checked={payMethod === pm.id} onChange={() => setPayMethod(pm.id)} />
              <span>{pm.icon}</span><span>{pm.label}</span>
            </label>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "1px dashed #cbd5e1" }}>
          <div style={{ fontSize: "12px", color: "#dc2626", lineHeight: "1.6" }}>
            <div>* Bạn vui lòng kiểm tra thông tin đầy đủ trước khi qua bước tiếp theo.</div>
            <div>* Vé đã hoàn thành thanh toán sẽ không được hoàn trả dưới mọi hình thức.</div>
          </div>
          <div style={{ textAlign: "center", minWidth: "110px" }}>
            <div style={{ fontSize: "12px", color: "#475569", fontWeight: "600" }}>Thời gian còn lại</div>
            <div style={{ fontSize: "26px", fontWeight: "900", color: "#dc2626" }}>00:{String(minRemain).padStart(2, "0")}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
