# movie-booking
### xem thời gian đã đặt vé
docker exec booking-db-primary psql -U postgres -d booking_db -c "SELECT \"seatCode\", status, \"lockedBy\", \"lockedUntil\" - NOW() AS thoi_gian_con_lai FROM seats WHERE status='LOCKED';"
### Xem dữ liệu bảng Ghế 
docker exec booking-db-primary psql -U postgres -d booking_db -c "SELECT \"seatCode\", status, \"lockedBy\", \"lockedUntil\" FROM seats ORDER BY \"seatCode\";"
### Xem dữ liệu bảng Đơn đặt vé
docker exec booking-db-primary psql -U postgres -d booking_db -c "SELECT id, \"seatCode\", \"userId\", status, \"createdAt\" FROM bookings;"
###  Kiểm tra dữ liệu đã tự động sang máy chủ Replica chưa
docker exec booking-db-replica psql -U postgres -d booking_db -c "SELECT \"seatCode\", status, \"lockedBy\" FROM seats ORDER BY \"seatCode\";"
### Kiểm tra trạng thái hoạt động của kênh đồng bộ
docker exec booking-db-primary psql -U postgres -d booking_db -c "SELECT application_name, state, sync_state FROM pg_stat_replication;"
## xóa ghế trống
docker exec booking-db-primary psql -U postgres -d booking_db -c "UPDATE seats SET status='AVAILABLE', \"lockedBy\"=NULL, \"lockedUntil\"=NULL;"



### XEM TÀI KHOẢN NGƯỜI DÙNG
docker exec user-db-primary psql -U postgres -d user_db -c "SELECT \"fullName\", email, phone FROM users;"


### chạy lại codespace
docker compose up -d && sleep 15 && docker restart kong-gateway

### cập nhật dịch vụ (cái cuối thay đổi được)
docker compose up -d --build (seat-locking)(frontend-1 frontend-2 frontend-3)....
### đẩy code
git add . && git commit -m "Complete full system with database replication" && git push