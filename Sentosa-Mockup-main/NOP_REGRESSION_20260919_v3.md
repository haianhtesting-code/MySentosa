# SDC IIS — NOP Module · Kết quả kiểm thử lại (lần 3)

Build 19/09/2026 (bản cập nhật lần 3) · Chạy lại bộ 118 test case
BnK Solutions — BA & QA · Confidential — Client Project

---

## 1. Tóm tắt

**Luồng nộp hồ sơ NOP đã thông.** Đây là lần đầu tiên trong cả quá trình kiểm thử, một hồ sơ được tạo hoàn chỉnh từ đầu đến cuối: Bước 1 → Bước 2 → Bước 3 → nộp thành công, mã tham chiếu đúng định dạng `SEN/NP/YYYYMMDD/NNN`, hồ sơ chuyển sang Cán bộ liên lạc.

**Đóng thêm 13 issue.** Tổng cộng **39 / 43 issue đã đóng**, còn **4 issue mở** và **1 điểm mới về trải nghiệm** (không phải lỗi chặn).

| Chỉ số | Lần 1 | Lần 2 | **Lần 3** |
|---|---|---|---|
| Test case pass | 66 / 118 (56%) | 95 / 118 (81%) | **114 / 118 (97%)** |
| Issue đã đóng | — | 26 / 37 | **39 / 43** |
| Luồng bị chặn | 4 | 2 | **0** |
| Tham chiếu tài liệu trong giao diện | 22 | 1 | **1** |
| Vị trí tương phản dưới chuẩn | 43 | 43 | **19** |

Ghi nhận riêng: đội phát triển đã tách bộ quy tắc kiểm tra dữ liệu ra tệp `nopValidators.ts` với chú thích rõ từng định dạng được chấp nhận — đúng hướng đã đề nghị ở báo cáo trước. Tôi chạy 20 phép thử trên ba quy tắc (UEN, số điện thoại, email): **20/20 đúng**.

---

## 2. Xác nhận luồng nộp hồ sơ đã thông

Kịch bản chạy thực tế, không can thiệp dữ liệu:

```
Mở form → Bước 1 (25 trường, giá trị mặc định)  → "Next Step →"  ✅ sang Bước 2
Bước 2 (vị trí, loại công việc, vẽ ranh giới)    → "Next Step →"  ✅ sang Bước 3
Bước 3 → tải 3 tài liệu nền + tích cam kết       → "Submit"       ✅ modal đóng
   → thông báo "submitted successfully to Liaison Officer."
   → bản ghi được tạo, mã tham chiếu đúng định dạng SEN/NP/YYYYMMDD/NNN
```

Ba quy tắc kiểm tra nay chạy đúng:

| Quy tắc | Giá trị thử | Kết quả |
|---|---|---|
| UEN | `199801234K`, `201512345D`, `T05LL1103B`, `53312345A`, `12345678X` | Chấp nhận đủ |
| UEN | `ABC`, `199801234` | Từ chối đúng |
| Số điện thoại | `+65 9123 4567`, `+65 91234567`, `+6591234567`, `91234567`, `9123 4567`, `+65 6789 0123` | Chấp nhận đủ |
| Số điện thoại | `12345678`, `9123` | Từ chối đúng |
| Email | `david.tan@kimseng.sg`, `sales@bnk.com` | Chấp nhận đủ |
| Email | `user@domainXcom`, `a b@c.de`, `no-at.com` | Từ chối đúng |

---

## 3. Issue đã đóng ở lần này (13)

| ID | Nội dung | Kiểm chứng |
|---|---|---|
| **I-01** | Form tạo NOP không nộp được | Đã tạo được hồ sơ hoàn chỉnh, mã tham chiếu hợp lệ |
| **N-01** | Quy tắc UEN từ chối mọi mã hợp lệ | 7/7 phép thử đúng |
| **N-02** | Quy tắc số điện thoại từ chối định dạng form tự điền | 8/8 phép thử đúng |
| **N-03** | Tab theo dõi tài liệu quá hạn trống rỗng | Đã có nội dung đầy đủ: hạn chót 24h, Cán bộ liên lạc phụ trách, danh sách tài liệu còn thiếu kèm trạng thái, và hai thao tác nhắc nhà thầu |
| **N-04** | Dấu câu mồ côi sau khi gỡ tham chiếu | Nhãn nay sạch: "Document Completion Period Configuration", "Policy Guarantee:" |
| **N-05** | Email chấp nhận tên miền không có dấu chấm | `user@domainXcom` nay bị từ chối |
| **N-06** | Không có hồ sơ nháp trong dữ liệu mẫu | Tab "Draft Applications (1)" |
| **I-09** | Register thiếu chỉ báo tài liệu | Nay có ba nhãn phân biệt: Đủ tài liệu / Còn thiếu / Quá hạn trên từng dòng |
| **I-10** | Thiếu thông tin thời gian và điều kiện của IPA | Đã có "Authorised Work Period" và "IPA Statutory Conditions" trong hồ sơ chi tiết |
| **I-12** | Chưa có màn hình theo dõi tài liệu quá hạn | Đã hoàn chỉnh (xem N-03) |
| **I-14** | Tải tài liệu từ Register bỏ qua bước duyệt | Đã gỡ việc gán thẳng trạng thái "Đủ tài liệu" |
| **I-22** | Nội dung mặc định cứng khi chưa có dữ liệu tài liệu | Đã gỡ hoàn toàn |
| **I-33** | Ô chọn trên Register thiếu nhãn | Nay không còn ô nhập nào thiếu nhãn ở cả bốn màn hình |

---

## 4. Còn mở (4 issue + 1 điểm trải nghiệm)

| ID | Mô tả issue | Expect |
|---|---|---|
| **I-11** | Khi quản trị viên thay đổi nhóm người duyệt trong ma trận phân luồng, các bước đang chờ duyệt của hồ sơ đang chạy vẫn không được gán lại theo. | Thay đổi nhóm người duyệt áp dụng ngay cho mọi bước còn đang chờ; các quyết định đã hoàn tất giữ nguyên người duyệt và thời điểm cũ. |
| **I-13** | Màn hình theo dõi tài liệu quá hạn nay đã có nút gửi nhắc thủ công, nhưng hệ thống vẫn **không tự động** phát nhắc và leo thang theo khoảng thời gian và ngưỡng đã cấu hình. Hai tham số cấu hình chỉ được lưu, không có cơ chế nào đọc để phát thông báo. | Khi người duyệt quá hạn xử lý, hệ thống tự phát nhắc theo đúng khoảng đã cấu hình, lặp lại theo chu kỳ, và tự gửi thông báo leo thang tới người duyệt cùng quản lý phụ trách khi chạm ngưỡng. |
| **I-24** | Còn 1 vị trí hiển thị tham chiếu tài liệu cho người dùng: tiêu đề "26 FRD Statutory Notification Triggers" trong màn hình cấu hình thông báo. | Đổi thành tên gọi nghiệp vụ, ví dụ "Danh mục thông báo bắt buộc (26 loại)". |
| **I-28** | Thuật ngữ vẫn chưa thống nhất: cùng một khái niệm ngày cấm thi công dùng cả "Blackout" (147 lần) và "Moratorium" (20 lần), có nơi ghép cả hai trong một nhãn — "Island Operations Blackout & Moratorium Calendar". "Prescreen" (27 lần) và "Pre-screen" (36 lần) vẫn dùng lẫn. | Chốt một bộ từ vựng thống nhất và áp dụng cho toàn sản phẩm. |
| **I-32** | Tương phản màu đã cải thiện đáng kể (từ 43 xuống 19 vị trí dưới chuẩn) nhưng chưa đạt hết. Còn lại: nút "Apply for Permit" và tiêu đề "NOP Register" là chữ trắng trên nền cam sáng (2.49); nút "Export XLSX" (3.77) và "Endorse" (3.30); nặng nhất là hai nhãn trên nền xanh trong suốt ở màn hình phê duyệt — "✓ ENDORSED" (1.30) và "Role: Lead Arborist" (1.91). | Mọi cặp chữ – nền đạt tối thiểu 4.5:1 với chữ thường và 3:1 với chữ lớn hoặc in đậm. Riêng hai nhãn trên nền trong suốt cần đặt trên nền đặc. |
| **I-36** | Ảnh logo vẫn trả về lỗi không tìm thấy tệp trên mọi màn hình. | Bổ sung tệp logo hoặc gỡ tham chiếu. |

### Điểm mới về trải nghiệm (không phải lỗi chặn)

| ID | Mô tả issue | Expect |
|---|---|---|
| **N-07** | Ô tích cam kết ở Bước 3 dùng cơ chế kiểm tra sẵn có của trình duyệt (thuộc tính `required`), nên khi bỏ trống thì trình duyệt tự hiện bong bóng tiếng Anh "Please check this box if you want to proceed" thay vì thông báo của chính sản phẩm. Hệ quả: riêng ô này có kiểu báo lỗi khác hẳn các ô còn lại, và thông báo mà sản phẩm đã chuẩn bị sẵn cho trường hợp này không bao giờ hiển thị được. Người dùng vẫn nhận được phản hồi, nên đây là vấn đề về tính nhất quán chứ không phải bế tắc. | Bỏ thuộc tính kiểm tra của trình duyệt trên ô này để phần kiểm tra của sản phẩm chạy, hiển thị viền đỏ và thông báo cùng kiểu với các ô khác. |

---

## 5. Trạng thái các luồng nghiệp vụ

| Luồng | Lần 2 | **Lần 3** |
|---|---|---|
| Nộp hồ sơ NOP mới | 🔴 Chặn | ✅ **Thông** |
| Lưu nháp / mở lại / xoá nháp | 🟠 Không có dữ liệu | ✅ Thông (1 hồ sơ nháp) |
| Nhà thầu nộp tài liệu hoãn | ✅ | ✅ |
| Người duyệt xử lý tài liệu hoãn | ✅ | ✅ |
| Theo dõi tài liệu quá hạn | 🟠 Tab trống | ✅ **Thông** |
| Sàng lọc của Cán bộ liên lạc | ✅ | ✅ |
| Xin gia hạn / huỷ / gỡ đình chỉ | ✅ | ✅ |
| Rút hồ sơ / Sửa và nộp lại | ✅ | ✅ |
| Người duyệt endorse / yêu cầu sửa | ✅ | ✅ |
| Đình chỉ / Thu hồi / Gỡ đình chỉ | ✅ | ✅ |
| Xuất CSV / XLSX / PDF | ✅ | ✅ |
| Tạo blackout và phân tích ảnh hưởng | ✅ | ✅ |

**Không còn luồng nào bị chặn.**

---

## 6. Đề nghị còn lại

| Ưu tiên | Hạng mục | Ước tính |
|---|---|---|
| 1 | I-13 — cơ chế tự động nhắc và leo thang theo cấu hình | 1.5 ngày |
| 2 | I-11 — áp dụng lại phân luồng cho bước đang chờ | 1.0 ngày |
| 3 | I-32 — xử lý nốt 19 vị trí tương phản, ưu tiên hai nhãn trên nền trong suốt | 0.5 ngày |
| 4 | I-28 — thống nhất thuật ngữ toàn sản phẩm | 0.5 ngày |
| 5 | I-24, I-36, N-07 — ba mục nhỏ | 0.25 ngày |

**Tổng còn lại: khoảng 3.75 ngày công** (lần 1: 8.5 ngày · lần 2: 5.5 ngày).

Với trạng thái hiện tại, mockup **đã demo được với SDC**. Bốn issue còn lại không chặn bất kỳ luồng nào; I-13 và I-11 là phần logic nền chưa hoàn thiện, còn I-24, I-28, I-32, I-36 và N-07 là hoàn thiện giao diện.

---

## Ghi chú giới hạn

Kết quả dựa trên bản build ngày 19/09/2026 (bản cập nhật lần 3), chạy lại đúng bộ 118 test case đã lập. Các hạng mục phụ thuộc hệ thống bên thứ ba (gửi email thật, tích hợp UCS, WOG SSO, OneMap API bản production) vẫn nằm ngoài phạm vi chấm điểm theo thống nhất trước đó.

Ước tính ngày công là chỉ dẫn nội bộ, **chưa phải cam kết tiến độ hay chi phí** — cần Delivery Lead xác nhận trước khi trao đổi với SDC.

Ba cảnh báo bảo mật đã nêu ở các báo cáo trước (thông tin đăng nhập cơ sở dữ liệu trong tệp cấu hình, tài liệu chứa NRIC/FIN lưu ở chế độ đọc công khai, chưa có chính sách lưu trữ và che dữ liệu cá nhân ở tầng máy chủ) **vẫn chưa được xử lý** và không nằm trong phạm vi bộ test case này. Đề nghị chuyển bộ phận Security/ISMS nội bộ theo tiến trình riêng trước khi hệ thống đi vào vận hành thật.
