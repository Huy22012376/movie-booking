# movie-booking (Hệ thống Đặt vé xem phim phân tán - Cine Cinemas)

## 1. Kiểm tra danh sách & Cấu trúc các bảng trong Database (Database-per-Service)

### Liệt kê tất cả các bảng đang có trong 3 cụm Database
docker exec booking-db-primary psql -U postgres -d booking_db -c "\dt" && \
docker exec user-db-primary psql -U postgres -d user_db -c "\dt" && \
docker exec catalog-db-primary psql -U postgres -d catalog_db -c "\dt"

### Xem chi tiết các cột của bảng Ghế (seats) và Đơn đặt vé (bookings)
docker exec booking-db-primary psql -U postgres -d booking_db -c "\d seats" && \
docker exec booking-db-primary psql -U postgres -d booking_db -c "\d bookings"

### Xem chi tiết các cột của bảng Người dùng (users)
docker exec user-db-primary psql -U postgres -d user_db -c "\d users"

---

## 2. Truy vấn dữ liệu Giao dịch & Khóa ghế (booking_db)

### Xem các ghế đang được giữ chỗ (LOCKED) và số giây đếm ngược còn lại
docker exec booking-db-primary psql -U postgres -d booking_db -c "SELECT \"movieId\", \"seatCode\", status, \"lockedBy\", ROUND(EXTRACT(EPOCH FROM (\"lockedUntil\" - NOW()))) AS giay_con_lai FROM seats WHERE status='LOCKED';"

### Xem danh sách ghế có giao dịch (LOCKED / BOOKED) trên Primary
docker exec booking-db-primary psql -U postgres -d booking_db -c "SELECT \"movieId\", \"seatCode\", status, \"lockedBy\", \"lockedUntil\" FROM seats WHERE status != 'AVAILABLE' ORDER BY \"movieId\", \"seatCode\";"

### Xem danh sách Đơn đặt vé đã thanh toán (bookings)
docker exec booking-db-primary psql -U postgres -d booking_db -c "SELECT id, \"seatCode\", \"userId\", status, \"createdAt\" FROM bookings;"

### Đặt lại toàn bộ ghế về trạng thái trống (AVAILABLE) khi cần reset để demo
docker exec booking-db-primary psql -U postgres -d booking_db -c "UPDATE seats SET status='AVAILABLE', \"lockedBy\"=NULL, \"lockedUntil\"=NULL;"

---

## 3. Kiểm tra Nhân bản dữ liệu (Primary - Replica Streaming Replication)

### Kiểm tra trạng thái kênh đồng bộ luồng thời gian thực (Streaming Replication)
docker exec booking-db-primary psql -U postgres -d booking_db -c "SELECT application_name, client_addr, state, sync_state FROM pg_stat_replication;"

### Đối chiếu dữ liệu Tài khoản người dùng ở cả Primary và Replica
docker exec user-db-primary psql -U postgres -d user_db -c "SELECT \"fullName\", email, phone FROM users;" && \
docker exec user-db-replica psql -U postgres -d user_db -c "SELECT \"fullName\", email, phone FROM users;"

### Đối chiếu dữ liệu Ghế đã đặt/giữ ở cả Primary và Replica
docker exec booking-db-primary psql -U postgres -d booking_db -c "SELECT \"movieId\", \"seatCode\", status, \"lockedBy\" FROM seats WHERE status != 'AVAILABLE' ORDER BY \"movieId\", \"seatCode\";" && \
docker exec booking-db-replica psql -U postgres -d booking_db -c "SELECT \"movieId\", \"seatCode\", status, \"lockedBy\" FROM seats WHERE status != 'AVAILABLE' ORDER BY \"movieId\", \"seatCode\";"

### Đối chiếu danh sách Đơn đặt vé ở cả Primary và Replica
docker exec booking-db-primary psql -U postgres -d booking_db -c "SELECT id, \"seatCode\", \"userId\" FROM bookings;" && \
docker exec booking-db-replica psql -U postgres -d booking_db -c "SELECT id, \"seatCode\", \"userId\" FROM bookings;"

---

## 4. Kiểm tra Load Balancer (Nginx) & Microservices

### Xem log phân phối tải của Nginx Load Balancer
docker logs nginx-lb --tail 10

### Thử nghiệm tắt nóng 1 máy chủ giao diện (Failover Test) và bật lại
docker stop frontend-1
docker start frontend-1

---

## 5. Vận hành hệ thống trên Codespaces & GitHub

### Khởi động lại toàn bộ hệ thống khi mở lại Codespace
docker compose up -d && sleep 15 && docker restart kong-gateway

### Cập nhật và đóng gói lại dịch vụ sau khi sửa code
docker compose up -d --build frontend-1 frontend-2 frontend-3

### Lưu toàn bộ mã nguồn lên GitHub
git add . && git commit -m "Update README with full DB inspection commands" && git push
