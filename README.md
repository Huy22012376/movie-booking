# movie-booking (Hệ thống Đặt vé xem phim phân tán - Cine Cinemas)

Hệ thống đặt vé xem phim trực tuyến xây dựng theo kiến trúc **Microservices phân tán (26 Containers)**, tích hợp **Nginx Load Balancer**, **Kong API Gateway & Upstream Load Balancing**, **Apache Kafka**, **Elasticsearch**, **Pessimistic Locking** chống đặt trùng ghế, thanh toán chuẩn **EMVCo VietQR (MB Bank)**, cụm cơ sở dữ liệu **Primary – Replica Streaming Replication** và dịch vụ **sao lưu tự động mỗi giờ (`db-backup`)**.

---

## 1. Kiểm tra danh sách & Cấu trúc các bảng trong Database (Database-per-Service)

### Liệt kê tất cả các bảng đang có trong 4 cụm Database
```bash
docker exec booking-db-primary psql -U postgres -d booking_db -c "\dt" && \
docker exec payment-db-primary psql -U postgres -d payment_db -c "\dt" && \
docker exec user-db-primary psql -U postgres -d user_db -c "\dt" && \
docker exec catalog-db-primary psql -U postgres -d catalog_db -c "\dt"
```

### Xem chi tiết các cột của bảng Ghế (`seats`), Đơn đặt vé (`bookings`) & Thanh toán (`payments`)
```bash
docker exec booking-db-primary psql -U postgres -d booking_db -c "\d seats" && \
docker exec booking-db-primary psql -U postgres -d booking_db -c "\d bookings" && \
docker exec payment-db-primary psql -U postgres -d payment_db -c "\d payments"
```

### Xem chi tiết các cột của bảng Người dùng (`users`)
```bash
docker exec user-db-primary psql -U postgres -d user_db -c "\d users"
```

---

## 2. Truy vấn dữ liệu Giao dịch, Khóa ghế & Hóa đơn thanh toán (`booking_db` & `payment_db`)

### Xem các ghế đang được giữ chỗ (`LOCKED`) và số giây đếm ngược còn lại
```bash
docker exec booking-db-primary psql -U postgres -d booking_db -c "SELECT \"movieId\", \"seatCode\", status, \"lockedBy\", ROUND(EXTRACT(EPOCH FROM (\"lockedUntil\" - NOW()))) AS giay_con_lai FROM seats WHERE status='LOCKED';"
```

### Xem danh sách ghế có giao dịch (`LOCKED` / `BOOKED`) trên Primary
```bash
docker exec booking-db-primary psql -U postgres -d booking_db -c "SELECT \"movieId\", \"seatCode\", status, \"lockedBy\", \"lockedUntil\" FROM seats WHERE status != 'AVAILABLE' ORDER BY \"movieId\", \"seatCode\";"
```

### Xem 10 Đơn đặt vé (`bookings`) và 5 Hóa đơn thanh toán VietQR (`payments`) mới nhất
```bash
docker exec booking-db-primary psql -U postgres -d booking_db -c "SELECT id, \"seatCode\", \"userId\", status, \"createdAt\" FROM bookings ORDER BY \"createdAt\" DESC LIMIT 10;" && \
docker exec payment-db-primary psql -U postgres -d payment_db -c "SELECT id, user_id, cinema, seats, amount, method, status, created_at FROM payments ORDER BY created_at DESC LIMIT 5;"
```

### Đặt lại toàn bộ ghế về trạng thái trống (`AVAILABLE`) khi cần reset để demo
```bash
docker exec booking-db-primary psql -U postgres -d booking_db -c "UPDATE seats SET status='AVAILABLE', \"lockedBy\"=NULL, \"lockedUntil\"=NULL;"
```

---

## 3. Kiểm tra Nhân bản dữ liệu (`Primary - Replica Streaming Replication`)

### Kiểm tra trạng thái kênh đồng bộ luồng thời gian thực (`Streaming Replication`)
```bash
docker exec booking-db-primary psql -U postgres -c "SELECT application_name, client_addr, state, sync_state FROM pg_stat_replication;" && \
docker exec payment-db-primary psql -U postgres -c "SELECT application_name, client_addr, state, sync_state FROM pg_stat_replication;"
```

### Đối chiếu dữ liệu Tài khoản người dùng ở cả Primary và Replica
```bash
docker exec user-db-primary psql -U postgres -d user_db -c "SELECT \"fullName\", email, phone FROM users;" && \
docker exec user-db-replica psql -U postgres -d user_db -c "SELECT \"fullName\", email, phone FROM users;"
```

### Đối chiếu dữ liệu Ghế đã đặt/giữ ở cả Primary và Replica
```bash
docker exec booking-db-primary psql -U postgres -d booking_db -c "SELECT \"movieId\", \"seatCode\", status, \"lockedBy\" FROM seats WHERE status != 'AVAILABLE' ORDER BY \"movieId\", \"seatCode\";" && \
docker exec booking-db-replica psql -U postgres -d booking_db -c "SELECT \"movieId\", \"seatCode\", status, \"lockedBy\" FROM seats WHERE status != 'AVAILABLE' ORDER BY \"movieId\", \"seatCode\";"
```

### Đối chiếu danh sách Đơn đặt vé & Hóa đơn thanh toán ở cả Primary và Replica
```bash
docker exec booking-db-primary psql -U postgres -d booking_db -c "SELECT id, \"seatCode\", \"userId\", status FROM bookings ORDER BY \"createdAt\" DESC LIMIT 5;" && \
docker exec booking-db-replica psql -U postgres -d booking_db -c "SELECT id, \"seatCode\", \"userId\", status FROM bookings ORDER BY \"createdAt\" DESC LIMIT 5;" && \
docker exec payment-db-primary psql -U postgres -d payment_db -c "SELECT id, user_id, cinema, seats, amount, method, status FROM payments ORDER BY created_at DESC LIMIT 5;" && \
docker exec payment-db-replica psql -U postgres -d payment_db -c "SELECT id, user_id, cinema, seats, amount, method, status FROM payments ORDER BY created_at DESC LIMIT 5;"
```

---

## 4. Sao lưu tự động (`db-backup`), Tìm kiếm (`Elasticsearch`) & Khôi phục dữ liệu

### Kiểm tra các tệp sao lưu tĩnh `.sql` được tự động tạo mỗi 1 giờ trong thư mục `backups/`
```bash
ls -lh backups/ && docker logs db-backup --tail 5
```

### Kiểm tra dữ liệu tìm kiếm phim trong Elasticsearch
```bash
curl -s "http://localhost:9200/movies/_search?pretty" | grep -E "title|genre|rating"
```

### Kiểm tra nhật ký gửi vé điện tử bất đồng bộ của `notification-service` qua Kafka
```bash
docker logs notification-service --tail 15
```

### Thử nghiệm sao lưu và khôi phục dữ liệu thủ công (`pg_dump` & `psql`)
```bash
docker exec booking-db-primary pg_dump -U postgres booking_db > backups/manual_booking.sql
cat backups/manual_booking.sql | docker exec -i booking-db-primary psql -U postgres -d booking_db
```

---

## 5. Kiểm tra Load Balancer (`Nginx` & `Kong`) & Tính chịu lỗi (`Fault Tolerance`)

### Kiểm tra phân phối tải xoay vòng (Round Robin) trên 3 bản sao Frontend
```bash
for f in frontend-1 frontend-2 frontend-3; do
  echo "=== \$f ==="
  docker logs \$f --tail 3
done
```

### Kiểm tra các bản sao Backend (`booking-service` & `catalog-service`) được Kong chia tải
```bash
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "booking-service|catalog-service"
```

### Xem log phân phối tải của Nginx Load Balancer
```bash
docker logs nginx-lb --tail 10
```

### Thử nghiệm tắt nóng 1 máy chủ (Failover Test) và bật lại
```bash
docker stop frontend-1 booking-service
docker start frontend-1 booking-service
```

---

## 6. Vận hành hệ thống trên Codespaces & GitHub

### Khởi động lại toàn bộ hệ thống khi mở lại Codespace
```bash
docker compose up -d && sleep 15 && docker restart kong-gateway
```
> **Lưu ý mở cổng Public trong tab Ports:** `8080` (Giao diện Web - Nginx), `8000` (Kong API Gateway), `3005` (Grafana Monitoring).

### Cập nhật và đóng gói lại giao diện sau khi sửa code
```bash
cd frontend && npm run build && cd .. && docker compose up -d --build frontend-1 frontend-2 frontend-3
```

### Lưu toàn bộ mã nguồn lên GitHub (Tự động loại trừ thư mục `backups/` tạm)
```bash
grep -qxF 'backups/' .gitignore 2>/dev/null || echo 'backups/' >> .gitignore && \
git add . && \
git commit -m "Complete full 26-container distributed movie booking system" && \
git push
```

### Thông tin đăng nhập Grafana (`Port 3005`)
* **Username:** `admin`
* **Password:** `admin`

### Giám sát toàn bộ 26 Container & Tài nguyên hệ thống
```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
docker stats --no-stream
```
