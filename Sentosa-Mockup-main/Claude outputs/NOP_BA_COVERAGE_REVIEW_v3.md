# NOP Mockup — Review độ phủ yêu cầu khách hàng (BA)

| | |
|---|---|
| **Câu hỏi** | Mockup đã cover hết yêu cầu của khách hàng chưa? |
| **Trả lời** | **Chưa, nhưng đã tiến rất xa.** Độ phủ **49% → ~64%** chỉ sau một vòng lặp |
| **Đối chiếu** | `SDC IIS NOP FRD v0.5.docx` — 131 câu "shall/must" + 7 sơ đồ quy trình + comment review của SDC |
| **Build kiểm** | Source **19/09/2026 20:07** · typecheck sạch · production build sạch |
| **Phương pháp** | Bóc yêu cầu từ tài liệu → kiểm từng mục trên ứng dụng đang chạy (Playwright) |

---

## 1. Kết luận

| | Trước (18/09) | Nay (19/09) |
|---|---:|---:|
| Mục **Đạt** | 15 | **23** |
| Mục **Một phần** | 21 | 21 |
| Mục **Chưa** | 16 | **8** |
| **Độ phủ** | 49% | **≈64%** |
| **Độ phủ luồng** (7 sơ đồ) | 64% | **≈79%** |

Vòng lặp vừa rồi đã đóng được **8 mục** trước đây hoàn toàn trống. Đáng ghi nhận nhất là hai hạng mục tôi từng xếp Blocker:

- **Form nhập liệu**: từ 15 trường lên **28 trường**, chia Section A/B/C có trích dẫn điều khoản FRD ngay trên giao diện
- **Chương §8 Thông báo**: từ **0%** lên có **Notification Engine đủ 24 trigger** + Outbox ghi nhật ký dispatch

---

## 2. Những gì đã đóng được — kiểm chứng trực tiếp

| Yêu cầu FRD | Bằng chứng trên ứng dụng |
|---|---|
| §4.2.6 High-Risk Work (7 trường) | Section C đầy đủ: Confined Space · Scaffolding (>4m) · Crane/Lifting Ops · Excavation Depth · Primary Equipment Type (8 lựa chọn) · Other Equipment Details · Vehicle Type (5 lựa chọn) |
| §4.2.7 Location of Works | Section B: Road Name · Building Common Name · Postal Code · Floor/Level · Unit/Room Number · Space Description |
| §4.2.3 Email applicant | Trường `Applicant Email *` kiểu `email`, có validate |
| §4.2.5 Project Title | Đã có |
| §4.2.9 Remarks | `Additional Applicant Remarks` |
| §4.2.1 "Others" phải nhập mô tả | Tick Others → hiện `SPECIFIC DESCRIPTION FOR OTHERS TRIGGER *` + đếm 0/500 ký tự + chặn nếu trống |
| §4.2.1 14 Work Involvement | Đúng 14, **đã khôi phục 3 mục từng bị xoá**: Tree Protection (girth >1m), Working at Height (>30m), Seafront/Coastal |
| §4.4 Chặn nộp thiếu trường | Banner đỏ *"Please correct N issues marked below"* + thông báo inline dưới từng ô |
| §4.4 Giới hạn thời hạn theo Category | *"BAU Maintenance permits are limited to a maximum duration of 6 months (183 days). Select Project Work for longer durations."* — kiểm cả Ad-hoc 3 tháng |
| §4.4.1 Tài liệu Baseline bắt buộc | 3 ô upload **có nhãn riêng** + bộ đếm `Mandatory Baseline Documents: 0/3 Uploaded` + nút Submit **disabled** với tooltip |
| §4.2.9 Statutory Declaration | Đã **bỏ tick sẵn**; Submit khoá đến khi người dùng chủ động chấp thuận |
| §4.2.8 Personnel muster | Danh sách công nhân + nút `+ Add` (Name/Trade/FIN masked) + template `.xlsx` |
| §4.5 Xoá draft | Nút `Delete Draft` đã có |
| §5.2 Định tuyến song song | Road Closure + Excavation → **Senior Manager (Traffic & Road Safety)** + **Geotechnical Specialist PE** |
| §6.1 Trạng thái hiệu lực | Sau khi duyệt hết: `Approved` / permit `Upcoming` (ngày bắt đầu tương lai) |
| §6.3 Cảnh báo Blackout | *"Island Moratorium / Blackout Advisory — The proposed schedule overlaps with an active moratorium… (Submission is permitted to proceed)"* — **đúng tinh thần "cảnh báo không chặn"** của FRD |
| §8.1 Ma trận 24 thông báo | Catalog đủ **NOTIF-01…NOTIF-24** với Trigger ID · Sự kiện · Người nhận · Thời điểm · Kênh · Hành động cần làm |
| §8.2 Nhật ký gửi | Outbox ghi Timestamp · Trigger ID · NOP Ref · Recipient · Subject & Body · Status |
| §10 Audit Trail | Ghi thật: `SUBMIT` → `PRESCREEN_CLEAR` → `APPROVE_CLEARANCE` ×2 |

**Luồng chính chạy trọn vẹn một vòng:**
```
Nộp (Under Review, 0 approver)
  → LO Clear for Approval (routing đúng 2 phòng ban)
  → Approver duyệt lần lượt
  → Approved · permit Upcoming
  → Audit ghi 4 hành động · Notification dispatch 2 sự kiện
```

---

## 3. Ma trận đối chiếu chi tiết

### §2 Vai trò & Phân quyền

| Mục | Yêu cầu | Kết quả | Khoảng trống |
|---|---|:---:|---|
| 2.1 | 9 vai trò NOP | 🟡 | Thiếu `NOP Business Owner`, `Stakeholder Manager`. `NOP Operations Admin` ánh xạ vào System Administrator (banner hiển thị đúng) |
| 2.2.1 | Ma trận quyền theo Application Status | 🟡 | Quyền theo vai trò ✅, chưa theo **trạng thái hồ sơ** |
| 2.2.2 | Ma trận quyền theo Permit Status | 🟡 | Như trên |

### §3 Tổng quan NOP

| Mục | Yêu cầu | Kết quả | Khoảng trống |
|---|---|:---:|---|
| 3.1 | Quy trình tổng thể | ✅ | |
| 3.2 | Mã `SEN/NP/YYYYMMDD/NNN` | ✅ | |
| 3.3 | Mô hình 4 chiều trạng thái | ✅ | |
| 3.4.1 | Application Status — **5 giá trị FRD** | 🟡 | Đã bỏ `Submitted` ✅ nhưng **còn `Pending Review`** — không có trong FRD. Luồng chạy: `Under Review` → `Pending Review` → `Approved` |
| 3.4.2 | Approval Status | ✅ | |
| 3.4.3 | Permit Status | ✅ | |
| 3.4.4 | IPA Status | 🟡 | Có trường + NOTIF-08; chưa có màn hình Duty Manager điều phối IPA |
| 3.4.5 | Quy tắc chuyển trạng thái | ✅ | |
| 3.5 | Thời hạn tối đa theo Category | ✅ | **Mới đạt** — validate đủ BAU 183 ngày / Ad-hoc 92 ngày |

### §4 Nộp hồ sơ

| Mục | Yêu cầu | Kết quả | Khoảng trống |
|---|---|:---:|---|
| 4.1 | Tài khoản nhà thầu (đăng ký, xác minh, 2FA) | ❌ | Chưa có |
| 4.2.1 | Work Involvement 14 mục | ✅ | |
| 4.2.1b | Other Work Details | ✅ | **Mới đạt** |
| 4.2.3 | Applicant & LO details | 🟡 | Email ✅. LO vẫn là **dropdown cứng 4 người**, chưa lookup tài khoản NOP active (FRD §4.2.3.1) |
| 4.2.4 | Emergency Contact ×2 | ✅ | |
| 4.2.5 | Project & Work Schedule | 🟡 | Project Title ✅, dates/times ✅. **Thiếu:** trường khai `Working on Blackout Dates` Y/N + lý do, `Night Work` Y/N + lý do + **checkbox xác nhận điều khoản** (FRD yêu cầu "displayed and acknowledged before submission") |
| 4.2.6 | High-Risk Work | ✅ | **Mới đạt** |
| 4.2.7 | Location of Works | 🟡 | 6/8 trường ✅. **Thiếu:** Location Tags / vẽ trên bản đồ, Proposed Site Photo |
| 4.2.8 | Personnel On-site | ✅ | **Mới đạt** |
| 4.2.9 | Remarks & Declaration | ✅ | **Mới đạt** |
| 4.3 | **OneMap + vẽ ranh giới** | ❌ | Xác nhận `.leaflet-container = false`, vẫn 4 polygon SVG toạ độ cứng |
| 4.4 | Quy tắc nộp | ✅ | **Mới đạt** |
| 4.4.1 | Lịch hồ sơ Mandatory + **Conditional** | 🟡 | Baseline 3 ô + chặn nộp ✅. **Conditional chưa có**: tick Road Closure / Excavation / Height>30m / Seafront vẫn chỉ hiện 3 ô Baseline, không sinh ô cho TMP, Geotechnical PE, PE Scaffolding, PE Lateral-Load |
| 4.4.2 | Quy tắc upload | 🟡 | Ghi đúng PDF/PNG/JPG 4MB; chưa nối API upload thật |
| 4.5 | Draft lưu / mở lại / xoá | ✅ | **Mới đạt** |
| 4.7 | Urgent + thông báo tài liệu được hoãn | 🟡 | Cờ `isUrgent` tính đúng; chưa hiển thị cảnh báo Urgent + danh sách tài liệu được hoãn trước khi nộp |

### §5 Luồng phê duyệt

| Mục | Yêu cầu | Kết quả | Khoảng trống |
|---|---|:---:|---|
| 5.1 | Hành động phê duyệt + LO pre-screen + SoD | ✅ | |
| 5.2 | Duyệt song song | ✅ | |
| 5.3 | **Approver Group** | ❌ | `DomainApproval` không có trường group; approver vẫn là cá nhân |
| 5.4 | Chặn nộp khi bước duyệt không có approver active | ❌ | Chưa có |
| 5.5 | Định tuyến khi resubmit | 🟡 | Giữ phê duyệt không ảnh hưởng ✅; applicant vẫn **tự chọn** minor/critical; resubmit bỏ qua LO |
| 5.6 | Thông tin hiển thị cho applicant | 🟡 | Chưa có cấu hình visibility danh tính approver |

### §6 Vòng đời

| Mục | Yêu cầu | Kết quả | Khoảng trống |
|---|---|:---:|---|
| 6.1 | Hiệu lực & hết hạn | ✅ | |
| 6.2 | Gia hạn 1 lần ≤1 tháng | 🟡 | Có validate ngày; luồng vẫn ở phía SDC, chưa phải applicant xin → LO → approver |
| 6.3 | Suspend / Lift / Cancel / Revoke | ✅ | |
| 6.3b | Blackout | ✅ | **Mới đạt** — advisory hiển thị đúng trong form |
| 6.4 | Hoàn thiện hồ sơ Urgent + quá hạn | 🟡 | Chính sách D+3 mô tả trên tab SLA; chưa có job chạy thật, chưa cấu hình được |

### §7 Register & Báo cáo

| Mục | Yêu cầu | Kết quả | Khoảng trống |
|---|---|:---:|---|
| 7.1 | Register tìm / lọc / sắp xếp | ✅ | |
| 7.2 | Hai view của Approver | 🟡 | **Thiếu view "All Applications"** (FRD §7.2: hồ sơ hiện tại và quá khứ trong phạm vi được phép) |
| 7.3 | Overdue Document Monitoring | 🟡 | Có bộ đếm; chưa có màn hình liệt kê deadline + tài liệu còn thiếu |
| 7.4 | Export PDF summary / CSV / XLSX + PDF từng giấy phép | 🟡 | CSV ✅. **Thiếu PDF summary và XLSX** |

### §8 Thông báo

| Mục | Yêu cầu | Kết quả | Khoảng trống |
|---|---|:---:|---|
| 8.1 | Ma trận 24 thông báo | 🟡 | Catalog đủ 24 ✅. Nhưng **chỉ dispatch khi SUBMIT** — xem mục 4 |
| 8.2 | Gửi email + ghi log | 🟡 | Outbox ghi đủ trường ✅; chưa gửi email thật |
| 8.3 | Nhắc approver + leo thang | ❌ | Chỉ mô tả bằng chữ |
| 8.4 | Cấu hình cho NOP Ops Admin | ❌ | Tab chỉ có ô lọc + dropdown xem; **không có control cấu hình** chu kỳ nhắc, ngưỡng leo thang, danh sách phân phối, bật/tắt |

### §9 UCS · §10 Phi chức năng

| Mục | Kết quả | Ghi chú |
|---|:---:|---|
| 9.1 Dashboard live count | 🟡 | Thẻ `PERMITS (NOP)` trên dashboard CMS; UCS thật chưa tích hợp |
| 9.2 UCS map layer | ❌ | |
| 10 Audit Trail | ✅ | |
| 10 Security & Access Control | ✅ | |
| 10 NFR khác (performance, retention, PDPA) | ❌ | |

---

## 4. Vấn đề phát hiện trong vòng kiểm này

### 🔴 BA-01 — Giá trị mặc định của form không qua được chính validation của nó

**Mức:** Blocker · **Trang:** Contractor Portal, Step 1, trường `24/7 Mobile *`

Mở wizard, **không sửa gì**, chỉ điền 2 ô trống bắt buộc rồi bấm Next:

```
Giá trị prefill   : "+65 9123 4567"
Placeholder       : "+65 9123 4567"
Thông báo lỗi     : "Invalid Singapore mobile number. Expected +65 8XXX XXXX or 9XXX XXXX."
Kết quả           : BỊ CHẶN
```

Kiểm các biến thể:

| Nhập vào | Kết quả |
|---|---|
| `+65 9123 4567` *(đúng như placeholder)* | ❌ Từ chối |
| `9111 2222` | ❌ Từ chối |
| `+6591234567` | ✅ Chấp nhận |
| `91112222` | ✅ Chấp nhận |

Regex **không cho dấu cách giữa nhóm 4 chữ số**, mâu thuẫn với chính placeholder, chính thông báo lỗi và chính giá trị mặc định. Người dùng gõ đúng theo mẫu gợi ý vẫn bị báo sai.

**Sửa:** chuẩn hoá input (bỏ khoảng trắng trước khi kiểm), hoặc nới regex cho phép khoảng trắng. Đây là ô người dùng chạm vào đầu tiên — SDC sẽ gặp ngay giây thứ 10 của buổi demo.

---

### 🟠 BA-02 — Tài liệu Conditional chưa sinh ô upload

**FRD §4.4.1:** *"When the trigger for a Conditional supporting document is met, the CMS shall display the corresponding labelled upload field, identify it as Conditional and require the document."*

Tick đồng thời **Road Closure · Excavation · Working at Height >30m · Seafront** → Step 3 vẫn chỉ có **3 ô Baseline**. Bốn tài liệu bắt buộc theo điều kiện (TMP, Geotechnical PE, PE Scaffolding, PE Lateral-Load) không xuất hiện.

Hạ tầng đã sẵn — `SUPPORTING_DOCUMENT_SCHEDULE` có `requiredForTrigger`, và cơ chế chặn nộp theo bộ đếm đã chạy tốt cho Baseline. Chỉ cần mở rộng cùng cơ chế đó.

---

### 🟠 BA-03 — Thông báo chỉ phát sinh khi nộp hồ sơ

Theo dõi Outbox qua trọn luồng:

| Bước | Số notification |
|---|---:|
| Sau khi nộp | 6 *(+2: NOTIF-01 tới applicant, NOTIF-02 tới LO)* |
| Sau khi LO Clear for Approval | 6 *(không tăng)* |
| Sau khi Approver duyệt | 6 *(không tăng)* |
| Sau khi hồ sơ Approved | 6 *(không tăng)* |

Catalog định nghĩa **NOTIF-03** (Cleared for Review), **NOTIF-06** (Technical Clearance Endorsed), **NOTIF-09** (Final Site Entry Permit Authorized) — nhưng không trigger nào được bắn. Engine mới nối vào một điểm duy nhất.

---

### 🟡 BA-04 — Trạng thái `Pending Review` vẫn ngoài FRD

Luồng thực tế: `Under Review` → **`Pending Review`** → `Approved`. FRD §3.4.1 chỉ có 5 trạng thái, không có `Pending Review`. Nên dùng `Under Review` xuyên suốt và phân biệt giai đoạn bằng `loPreScreenStatus` (đã có sẵn).

### 🟡 BA-05 — Postal Code không kiểm định dạng

Nhập `12` → chấp nhận. Mã bưu chính Singapore là **6 chữ số**. Các trường khác (UEN, email, mobile, ngày, thời hạn) đều đã validate tốt — chỉ sót ô này.

### 🟡 BA-06 — Catalog thông báo vượt phạm vi FRD, cần SDC xác nhận

FRD §8.2: *"All NOP notifications **shall be sent by email**"*. Catalog trong mockup khai thêm kênh `SMS & Email` (NOTIF-10, NOTIF-12), `Multi-channel` (NOTIF-08, NOTIF-09), `In-App & Email` (NOTIF-06, NOTIF-16).

Đây có thể là hiện thực hoá đề xuất BA về xác nhận lệnh dừng thi công — hợp lý về nghiệp vụ, **nhưng vượt tài liệu**. Cần gắn nhãn *"BA Proposal — pending SDC confirmation"* hoặc đưa vào biên bản chốt phạm vi, tránh tranh cãi khi UAT: SMS/push kéo theo chi phí gateway và hạ tầng chưa nằm trong FRD.

---

## 5. Khoảng trống còn lại, xếp theo mức ảnh hưởng

| # | Khoảng trống | Chương | Đánh giá |
|---|---|---|---|
| 1 | **Validation số điện thoại chặn chính giá trị mặc định** | §4.2 | Blocker demo — sửa trong 15 phút |
| 2 | **Thông báo chỉ bắn ở 1/24 điểm** | §8.1 | Catalog đã xong, chỉ thiếu nối hook vào các hành động |
| 3 | **Tài liệu Conditional** | §4.4.1 | Hạ tầng sẵn, mở rộng cơ chế Baseline |
| 4 | **OneMap + vẽ ranh giới** | §4.3 | Việc lớn nhất còn lại; `leaflet-draw` đã có trong dependency |
| 5 | **Cấu hình thông báo & SLA cho Ops Admin** | §8.3, §8.4 | Tab hiện chỉ là văn bản tĩnh |
| 6 | **Approver Group + chặn khi thiếu approver** | §5.3, §5.4 | Vận hành thật không thể phụ thuộc cá nhân |
| 7 | **View "All Applications" + màn hình Overdue** | §7.2, §7.3 | |
| 8 | **Export PDF summary + XLSX** | §7.4 | |
| 9 | **Night Work + Blackout Y/N kèm xác nhận điều khoản** | §4.2.5 | Advisory đã hiện, còn thiếu trường khai và checkbox chấp thuận |
| 10 | **Quy trình tài khoản nhà thầu** | §4.1 | Cổng vào hệ thống |
| 11 | **Màn hình Duty Manager điều phối IPA** | §4.7, §6.4 | |
| 12 | **Lookup LO theo tài khoản active** | §4.2.3.1 | Hiện là dropdown cứng 4 người |

---

## 6. Khuyến nghị

### Trước buổi demo — nửa ngày công

1. **BA-01** sửa regex số điện thoại *(15 phút, nhưng là thứ SDC gặp đầu tiên)*
2. **BA-03** nối notification vào LO clear / endorse / final approve — để demo cho thấy Outbox chạy động qua cả luồng, đây là điểm bán hàng mạnh nhất của vòng này
3. **BA-05** validate Postal Code 6 chữ số
4. **BA-06** gắn nhãn *"BA Proposal — pending SDC confirmation"* cho các kênh SMS/Multi-channel

### Vòng phát triển tiếp theo — đưa độ phủ lên ~80%

Tài liệu Conditional (§4.4.1) · OneMap (§4.3) · Cấu hình thông báo & SLA (§8.3–8.4) · Approver Group (§5.3) · View All Applications (§7.2) · Export PDF/XLSX (§7.4) · Night Work & Blackout declaration (§4.2.5)

### Cần chốt với SDC

| Vấn đề | Đề xuất |
|---|---|
| Kênh gửi SMS / Multi-channel | Xác nhận có nằm trong phạm vi không — ảnh hưởng chi phí gateway |
| `Pending Review` | Bỏ, dùng `Under Review` theo đúng FRD §3.4.1 |
| Ngưỡng Excavation | FRD gắn Geotechnical PE với **>6m**; mockup dùng **>1.5m** cho trigger. Cần thống nhất trigger và điều kiện tài liệu là hai mức khác nhau |
| 2 vai trò còn thiếu | `NOP Business Owner` và `Stakeholder Manager` có cần dựng trong mockup không, hay chỉ mô tả trong tài liệu |

---

## 7. Nhận định tổng thể

Mockup đã vượt qua giai đoạn "trình diễn giao diện". Xương sống nghiệp vụ hiện đã đúng và chạy được: mô hình trạng thái, định tuyến theo Work Involvement, phân tách trách nhiệm, vòng đời giấy phép, audit trail. Lớp nhập liệu — điểm yếu nhất hai vòng trước — nay đã có validation nghiêm túc với thông báo inline và chặn nộp đúng nghiệp vụ.

Phần còn thiếu chủ yếu là **bề rộng, không phải chiều sâu**: nối thêm điểm phát thông báo, nhân bản cơ chế upload đã chạy tốt sang nhóm tài liệu điều kiện, thay bản đồ SVG bằng thư viện đã có sẵn trong dự án. Đây đều là việc mở rộng trên nền đã đúng, rủi ro thấp.

Với nhịp độ của vòng vừa rồi, **mục tiêu 80% trong 1–2 tuần là khả thi**.

---

*Review nội bộ phục vụ ra quyết định, không thay thế phê duyệt chính thức của khách hàng. Nội dung chứa thông tin khách hàng — xử lý ở mức Confidential.*
