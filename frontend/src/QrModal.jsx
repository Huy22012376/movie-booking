import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { VietQR } from "./vietQR";

export default function QrModal({ payMethod, cinema, myLockedSeats, totalPrice, activeUserId, minRemain, busy, onClose, onConfirm }) {
  const [qrImg, setQrImg] = useState("");
  const seatStr = myLockedSeats.map(s => s.seatCode).join("");
  const addInfo = `CINE ${seatStr} ${activeUserId}`;

  useEffect(() => {
    const emvPayload = new VietQR()
      .setBeneficiaryOrganization("970422", "0353163114")
      .setTransactionAmount(totalPrice)
      .setAdditionalDataFieldTemplate(addInfo)
      .build();

    QRCode.toDataURL(emvPayload, { width: 220, margin: 1 })
      .then((url) => setQrImg(url))
      .catch(() => {});
  }, [totalPrice, addInfo]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 120, padding: "16px" }}>
      <div style={{ background: "#fff", width: "100%", maxWidth: "430px", borderRadius: "16px", padding: "24px", textAlign: "center", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ fontWeight: "800", color: "#03599d", fontSize: "16px" }}>MB BANK • VIETQR ({payMethod})</span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#64748b" }}>✕</button>
        </div>
        <p style={{ fontSize: "13px", color: "#475569", marginBottom: "12px" }}>Quét mã VietQR bằng ứng dụng Ngân hàng bất kỳ</p>
        <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px dashed #94a3b8", marginBottom: "14px" }}>
          {qrImg ? (
            <img src={qrImg} alt="VietQR MB Bank" style={{ width: "195px", height: "195px", margin: "0 auto", display: "block", borderRadius: "8px" }} />
          ) : (
            <div style={{ height: "195px", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: "13px" }}>Đang tạo mã VietQR...</div>
          )}
          <div style={{ marginTop: "10px", fontSize: "13px" }}>Số tiền: <b style={{ color: "#dc2626", fontSize: "17px" }}>{totalPrice.toLocaleString("vi-VN")} vnđ</b></div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>STK: <b>0353163114 (MB Bank)</b> • Nội dung: <b>{addInfo}</b></div>
          <div style={{ fontSize: "12px", color: "#ef4444", fontWeight: "700", marginTop: "4px" }}>Hết hạn sau: {minRemain}s</div>
        </div>
        <button onClick={onConfirm} disabled={busy} style={{ width: "100%", padding: "12px", background: "#059669", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "800", fontSize: "14px", cursor: "pointer" }}>
          {busy ? "ĐANG XÁC NHẬN WEBHOOK & KAFKA..." : "ĐÃ THANH TOÁN"}
        </button>
      </div>
    </div>
  );
}
