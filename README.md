# She Ha Long — V2 chức năng / V1 giao diện

Bản này giữ giao diện V1 làm nền, nhưng nâng cấp chức năng:
- Supabase Database
- Supabase Email/Password Auth
- quyền owner/admin
- dashboard chủ quán trong panel cùng phong cách V1
- thống kê và feedback list
- chi tiết feedback
- trạng thái Mới / Đang xử lý / Đã xử lý
- ghi chú chủ quán
- Google Maps chỉ hiện sau 4–5 sao

## Điểm khác với bản React
Bản này là website tĩnh HTML/CSS/JS nên **không cần Node.js/npm để chạy**. Chỉ cần cấu hình `config.js` rồi deploy lên Vercel/Netlify/GitHub Pages.

## Cấu hình
Mở `config.js`:
1. Giữ `supabaseUrl` là Project URL của bạn.
2. Thay `PASTE_YOUR_PUBLISHABLE_KEY_HERE` bằng Supabase Publishable key.
3. Giữ Google Maps URL của She Hua Long.

Không đưa Secret / service_role key vào `config.js`.

## Chạy local
Có thể mở `index.html` qua một static server. Với VS Code, dùng Live Server; hoặc:
`python -m http.server 5500`
sau đó mở `http://localhost:5500`.

## Deploy
Đẩy cả thư mục lên GitHub rồi import repository vào Vercel. Không cần build step vì đây là static site.
