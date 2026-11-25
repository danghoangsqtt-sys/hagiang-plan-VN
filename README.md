# Hà Giang 2026 · Mobile Travel Planner (v5.0)

Ứng dụng web tĩnh (PWA) tối ưu cho điện thoại di động dành cho hành trình **Hà Nội – Hà Giang (30/11 – 05/12/2026 · 2 người)**. Không cần tài khoản, máy chủ hay API key — hoạt động offline sau lần mở đầu tiên.

🌐 **Trang web trực tiếp (GitHub Pages):**  
`https://danghoangsqtt-sys.github.io/hagiang-plan-VN/`

## Điểm mới ở phiên bản 5.0

- **Kiến trúc mã nguồn sạch & tách mô-đun:** Tách `index.html`, `styles.css`, `data.js`, `app.js` thay thế 5 lớp CSS chồng chéo cũ (`v1`–`v4.1`).
- **Giao diện di động hiện đại & Chế độ tối (Dark Mode):** Bảng màu xanh ngọc cao nguyên đá & cam đất, hỗ trợ **Tự động / Sáng / Tối** dịu mắt khi xem trên xe cabin ban đêm.
- **Thẻ "Mốc tiếp theo" thông minh:** Tự động hiển thị hoạt động chưa hoàn thành tiếp theo ngay trên Trang chủ.
- **Lịch trình mượt mà hơn:** Hỗ trợ vuốt trái/phải đổi ngày, cập nhật tiến độ tức thì không giật màn hình, chạm ảnh minh họa để phóng to.
- **Sổ chi tiêu kiểu Bottom-Sheet di động:** Ghi nhanh khoản chi mới với các nút cộng nhanh (`+50k`, `+100k`, `+200k`, `+500k`, `+1 triệu`), chỉnh sửa gọn gàng không cần cuộn bảng ngang.
- **Service Worker v5.0.0 nâng cấp:** Chiến lược *Network-First* cho mã nguồn (tự cập nhật khi có mạng) và *Cache-First* cho ảnh/biểu tượng (siêu nhanh khi mất sóng trên đèo).
- **Tương thích 100% dữ liệu cũ:** Giữ nguyên khóa `localStorage` (`haGiangTrip2026-v1`) và định dạng sao lưu JSON v1.

## Mở & cài lên điện thoại

1. Truy cập `https://danghoangsqtt-sys.github.io/hagiang-plan-VN/` trên điện thoại khi có mạng để ứng dụng tải dữ liệu offline.
2. **iPhone (Safari):** Nhấn nút **Chia sẻ (↑)** → **Thêm vào MH chính** (*Add to Home Screen*).
3. **Android (Chrome):** Nhấn menu **⋮** → **Cài đặt ứng dụng** hoặc **Thêm vào màn hình chính**.

## Cấu trúc tệp

- `index.html` — Khung giao diện HTML5 ngữ nghĩa
- `styles.css` — Hệ thống giao diện mobile-first (Light + Dark mode)
- `data.js` — Toàn bộ dữ liệu 6 ngày, 22 điểm check-in, 66 mục checklist, ngân sách
- `app.js` — Logic trạng thái, lưu cục bộ, biểu mẫu bottom-sheet, xuất CSV/JSON
- `sw.js` — Service Worker caching offline (`ha-giang-planner-mobile-v5.0.0`)
- `manifest.webmanifest` — Cấu hình cài đặt PWA & phím tắt nhanh
- `photos/` — Bộ ảnh địa phương từ brochure Lu Travel & minh họa SVG Hà Nội

## Lưu ý dữ liệu & quyền riêng tư

- Dữ liệu cá nhân (checklist, chi phí, đặt chỗ, nhật ký) chỉ lưu trong `localStorage` trên trình duyệt của bạn, **không** gửi lên GitHub.
- Không đưa file JSON sao lưu hay thông tin giấy tờ cá nhân lên repository công khai.
- Giá tour, vé bay, thời tiết là thông tin lập kế hoạch tham khảo dựa trên tài liệu Lu Travel (25/11/2026).
