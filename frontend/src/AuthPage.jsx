import { useState } from "react";

const genCaptcha = () => Math.random().toString(36).substring(2, 8).toUpperCase();

export default function AuthPage({ kongUrl, onSuccess, onBack }) {
    const [mode, setMode] = useState("LOGIN");
    const [captcha, setCaptcha] = useState(genCaptcha());
    const [captchaInput, setCaptchaInput] = useState("");
    const [err, setErr] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
        dob: "",
        gender: "Nam",
        phone: "",
        agree: true
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErr("");
        if (captchaInput.trim().toUpperCase() !== captcha) {
            setErr("Mã xác thực không khớp! Vui lòng nhập lại.");
            setCaptcha(genCaptcha());
            setCaptchaInput("");
            return;
        }
        if (mode === "REGISTER") {
            if (!form.fullName || !form.email || !form.password) {
                setErr("Vui lòng nhập đầy đủ các trường bắt buộc (*).");
                return;
            }
            if (form.password !== form.confirmPassword) {
                setErr("Mật khẩu xác nhận không trùng khớp!");
                return;
            }
            if (!form.agree) {
                setErr("Bạn cần đồng ý với điều khoản sử dụng của Cine Cinemas.");
                return;
            }
        }

        setLoading(true);
        try {
            const url = mode === "LOGIN" ? `${kongUrl}/api/auth/login` : `${kongUrl}/api/auth/register`;
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form)
            });
            const data = await res.json();
            if (!res.ok) {
                setErr(data.message || "Có lỗi xảy ra, vui lòng thử lại!");
                setCaptcha(genCaptcha());
                setLoading(false);
                return;
            }
            if (mode === "REGISTER") {
                alert("🎉 Chúc mừng! Bạn đã đăng ký tài khoản thành công. Vui lòng đăng nhập để tiếp tục đặt ghế.");
                setSuccessMsg("Đăng ký thành công! Vui lòng đăng nhập bằng tài khoản vừa tạo.");
                setMode("LOGIN");
                setForm({ ...form, password: "", confirmPassword: "" });
                setCaptcha(genCaptcha());
                setCaptchaInput("");
                setLoading(false);
                return;
            }
            onSuccess(data);

        } catch {
            setErr("Không kết nối được máy chủ xác thực (Kiểm tra cổng 8000 Public).");
        }
        setLoading(false);
    };
    return (
        <div style={{ background: "#f8fafc", padding: "40px 16px 60px" }}>
            <div style={{ maxWidth: mode === "LOGIN" ? "460px" : "680px", margin: "0 auto", background: "#fff", borderRadius: "6px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", textAlign: "center", fontWeight: "700", fontSize: "15px" }}>
                    <div onClick={() => { setMode("LOGIN"); setErr(""); setSuccessMsg(""); setCaptcha(genCaptcha()); }} style={{ padding: "14px", cursor: "pointer", background: mode === "LOGIN" ? "#03599d" : "#fff", color: mode === "LOGIN" ? "#fff" : "#334155", borderBottom: "1px solid #e2e8f0" }}>
                        ĐĂNG NHẬP
                    </div>
                    <div onClick={() => { setMode("REGISTER"); setErr(""); setSuccessMsg(""); setCaptcha(genCaptcha()); }} style={{ padding: "14px", cursor: "pointer", background: mode === "REGISTER" ? "#03599d" : "#fff", color: mode === "REGISTER" ? "#fff" : "#334155", borderBottom: "1px solid #e2e8f0" }}>
                        ĐĂNG KÝ
                    </div>
                </div>


                <form onSubmit={handleSubmit} style={{ padding: "28px 32px" }}>
                    <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", color: "#03599d", padding: "8px 12px", borderRadius: "4px", fontSize: "12px", marginBottom: "18px" }}>
                        ℹ️ Vui lòng đăng nhập hoặc đăng ký tài khoản để tiếp tục chọn ghế đặt vé.
                    </div>
                    {successMsg && (
                        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", padding: "10px 12px", borderRadius: "4px", fontSize: "13px", marginBottom: "16px", fontWeight: "600" }}>
                            ✅ {successMsg}
                        </div>
                    )}

                    {err && (
                        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "10px 12px", borderRadius: "4px", fontSize: "13px", marginBottom: "16px" }}>
                            ⚠️ {err}
                        </div>
                    )}

                    {mode === "LOGIN" ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>Email</label>
                                <input type="email" required placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "14px" }} />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>Mật khẩu</label>
                                <input type="password" required placeholder="Mật khẩu" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "14px" }} />
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}><span style={{ color: "#ef4444" }}>*</span> Họ tên</label>
                                <input type="text" required placeholder="Ví dụ: Nguyễn Viết Huy" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} style={{ width: "100%", padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "14px" }} />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}><span style={{ color: "#ef4444" }}>*</span> Email</label>
                                <input type="email" required placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={{ width: "100%", padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "14px" }} />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}><span style={{ color: "#ef4444" }}>*</span> Mật khẩu</label>
                                <input type="password" required placeholder="Mật khẩu" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={{ width: "100%", padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "14px" }} />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}><span style={{ color: "#ef4444" }}>*</span> Xác nhận lại mật khẩu</label>
                                <input type="password" required placeholder="Xác nhận lại mật khẩu" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} style={{ width: "100%", padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "14px" }} />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>Ngày sinh</label>
                                <input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} style={{ width: "100%", padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "14px" }} />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>Giới tính</label>
                                <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} style={{ width: "100%", padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "14px" }}>
                                    <option value="Nam">Nam</option>
                                    <option value="Nữ">Nữ</option>
                                    <option value="Khác">Khác</option>
                                </select>
                            </div>
                            <div style={{ gridColumn: "1 / -1" }}>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}><span style={{ color: "#ef4444" }}>*</span> Số điện thoại</label>
                                <input type="text" required placeholder="Số điện thoại" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={{ width: "100%", padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "14px" }} />
                            </div>
                        </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", alignItems: "center", marginTop: "18px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f1f5f9", border: "1px dashed #94a3b8", padding: "8px 14px", borderRadius: "4px" }}>
                            <span style={{ fontSize: "20px", fontWeight: "900", letterSpacing: "4px", color: "#15803d", fontStyle: "italic" }}>{captcha}</span>
                            <button type="button" onClick={() => setCaptcha(genCaptcha())} style={{ background: "none", border: "none", fontSize: "18px", color: "#03599d", cursor: "pointer" }} title="Đổi mã">↻</button>
                        </div>
                        <input type="text" required placeholder="Mã xác thực" value={captchaInput} onChange={(e) => setCaptchaInput(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "14px" }} />
                    </div>

                    {mode === "REGISTER" && (
                        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#475569", marginTop: "14px" }}>
                            <input type="checkbox" checked={form.agree} onChange={(e) => setForm({ ...form, agree: e.target.checked })} />
                            <span>Tôi cam kết tuân theo chính sách bảo mật và điều khoản sử dụng của Cine Cinemas.</span>
                        </label>
                    )}

                    <button type="submit" disabled={loading} style={{ width: "100%", marginTop: "20px", padding: "11px", background: "linear-gradient(90deg, #0a64a4, #1d8fe1)", color: "#fff", border: "none", borderRadius: "4px", fontWeight: "700", fontSize: "14px", cursor: "pointer" }}>
                        {loading ? "ĐANG XỬ LÝ..." : mode === "LOGIN" ? "ĐĂNG NHẬP BẰNG TÀI KHOẢN" : "ĐĂNG KÝ"}
                    </button>

                    <button type="button" onClick={onBack} style={{ width: "100%", marginTop: "10px", padding: "8px", background: "none", border: "none", color: "#64748b", fontSize: "13px", cursor: "pointer" }}>
                        ← Quay lại xem phim
                    </button>
                </form>
            </div>
        </div>
    );
}
