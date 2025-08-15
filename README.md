# Nối Thú Cổ Điển – HTML5 (MVP)

MVP game nối thú chạy **thuần HTML/CSS/JS**, bám GDD: lưới 10×8, nối tối đa 2 góc, 7 level (vật cản từ Lv4), combo 2s có thưởng, quy đổi thời gian còn lại thành điểm.

## Cấu trúc
```
noi-thu-anh-hung/
├─ index.html
├─ styles/
│  └─ style.css
├─ scripts/
│  └─ game.js
└─ assets/        # (để ảnh/sfx sau này)
```

## Chạy local
- Mở trực tiếp `index.html` bằng trình duyệt; nếu dùng ảnh/âm thanh và gặp CORS, chạy:
  ```bash
  python -m http.server 8080
  # rồi mở http://localhost:8080
  ```

## Deploy GitHub Pages
1) Tạo repo mới trên GitHub (Public), upload toàn bộ thư mục trên (hoặc `git push`).  
2) Vào **Settings → Pages** → Build and deployment: **Deploy from a branch**.  
   - Branch: `main` ; Folder: `/ (root)` → Save  
3) Mở link: `https://<user>.github.io/<repo-name>/` để chơi.

## Nâng cấp gợi ý
- Tách asset emoji thành PNG/SVG trong `assets/`.  
- Thêm SFX/nhạc, điểm cao (localStorage), menu chính, v.v.
