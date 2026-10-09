# SDC IIS — NOP Module · Bộ Test Case & Kết quả thực thi

| | |
|---|---|
| **Dự án** | Sentosa Development Corporation — IIS / No Objection Permit |
| **Bản kiểm thử** | Build 19/09/2026 |
| **Tổng số test case** | 118 |
| **Phương pháp** | Playwright trên Chromium (production build), locale `en-SG`; kiểm chứng state thật trong localStorage; quét DOM cho phần nội dung và UI/UX |
| **Loại trừ** | Các hạng mục phụ thuộc hệ thống bên thứ ba: gửi email thật (§8.2), UCS Dashboard (§9.1), UCS Map Layer (§9.2), NFR hạ tầng (§10), WOG SSO, OneMap API production |
| **Phân loại** | Confidential — Client Project |

---

## Tổng hợp kết quả

| Nhóm | Số TC | Pass | Fail | Blocked | Tỷ lệ pass |
|---|---|---|---|---|---|
| TC-A · Ứng dụng & Biểu mẫu | 24 | 9 | 11 | 4 | 38% |
| TC-B · Trạng thái & Vòng đời | 18 | 14 | 4 | 0 | 78% |
| TC-C · Phê duyệt | 16 | 12 | 3 | 1 | 75% |
| TC-D · Urgent / IPA / Tài liệu hoãn | 14 | 3 | 3 | 8 | 21% |
| TC-E · Register & Báo cáo | 15 | 11 | 4 | 0 | 73% |
| TC-F · Thông báo & Cấu hình | 12 | 10 | 2 | 0 | 83% |
| TC-G · Phân quyền | 8 | 5 | 3 | 0 | 63% |
| TC-H · Nội dung & Ngôn ngữ | 6 | 1 | 5 | 0 | 17% |
| TC-I · UI/UX & Khả năng tiếp cận | 5 | 1 | 4 | 0 | 20% |
| **Tổng** | **118** | **66** | **39** | **13** | **56%** |

**Blocked** = không thực thi được vì một lỗi chặn ở bước trước, không phải vì chức năng sai.

---

## TC-A · Ứng dụng & Biểu mẫu (§4)

| ID | Test case | Kết quả |
|---|---|---|
| TC-A01 | Mở form tạo NOP mới từ Portal | ✅ Pass |
| TC-A02 | Bước 1 hiển thị đủ trường bắt buộc theo §4.2.3 (PIC Name, Mobile, Email, Office Number) | ❌ Fail — không có ô nhập |
| TC-A03 | Bước 1 hiển thị NOP Category (BAU / Ad-hoc / Project) theo §4.2.5 | ❌ Fail — không có ô nhập |
| TC-A04 | Bước 1 hiển thị Daily Work Start Time / End Time theo §4.2.5 | ❌ Fail — không có ô nhập |
| TC-A05 | Bước 1 hiển thị SDC Liaison Officer theo §4.2.3 | ❌ Fail — không có ô nhập |
| TC-A06 | Night Work = Yes làm hiện Reason + T&C Agreement theo §4.2.5 | ❌ Fail — không có ô nhập |
| TC-A07 | Working on Blackout Dates = Yes làm hiện ô lý do | ✅ Pass |
| TC-A08 | Confined Space / Lifting Operations hiển thị theo §4.2.6 | ❌ Fail — không có ô nhập |
| TC-A09 | Equipment Type / Vehicle Type hiển thị theo §4.2.6 | ❌ Fail — không có ô nhập |
| TC-A10 | Chọn trigger Excavation Work làm hiện ô Excavation Depth | ⛔ Blocked |
| TC-A11 | Chọn trigger Height >30m làm hiện câu hỏi Scaffolding Yes/No | ❌ Fail — logic ép trả lời Yes |
| TC-A12 | Trường địa chỉ chi tiết theo §4.2.7 (Road, Building, Postal, Level, Unit) | ❌ Fail — không có ô nhập |
| TC-A13 | Nhập email hợp lệ được chấp nhận | ❌ Fail |
| TC-A14 | Nhập email có dấu cách bị từ chối | ❌ Fail |
| TC-A15 | Bỏ trống trường bắt buộc thì hiện lỗi đỏ ngay tại ô đó | ❌ Fail — chỉ có chữ đỏ dưới ô, và chỉ 7/15 lỗi được hiện |
| TC-A16 | Bấm "Next Step →" khi hợp lệ thì chuyển sang Bước 2 | ❌ Fail — không phản hồi, không báo lỗi |
| TC-A17 | Bấm "Next Step →" khi không hợp lệ thì hiện lỗi và giữ nguyên bước | ❌ Fail — giữ nguyên bước nhưng không báo lỗi |
| TC-A18 | Nút "Back" quay lại bước trước | ⛔ Blocked |
| TC-A19 | Bước 2 hiển thị bản đồ và cho vẽ ranh giới công trường (§4.4) | ⛔ Blocked |
| TC-A20 | Bước 3 upload nhận PDF / PNG / JPG / BMP / GIF (§4.3.3) | ⛔ Blocked |
| TC-A21 | Nộp thành công sinh mã `SEN/NP/YYYYMMDD/NNN` (§3.2) | ❌ Fail — không nộp được |
| TC-A22 | Lưu nháp và tải lại được (§4.5) | ✅ Pass |
| TC-A23 | Xoá nháp có hộp xác nhận | ✅ Pass |
| TC-A24 | Chặn nộp khi bước phê duyệt không có Approver active (§5.4) | ✅ Pass — có logic chặn và alert |

---

## TC-B · Trạng thái & Vòng đời (§3.3, §6)

| ID | Test case | Kết quả |
|---|---|---|
| TC-B01 | `ApplicationStatus` chỉ gồm 5 giá trị của §3.3.1 | ✅ Pass |
| TC-B02 | `PermitStatus` gồm đủ 6 giá trị của §3.3.3 | ✅ Pass |
| TC-B03 | Bộ đếm / bộ lọc / bản đồ "Active" loại trừ Suspended, Cancelled, Revoked (§6.1) | ✅ Pass |
| TC-B04 | Validity state tự tính theo ngày giờ, không cần thao tác đóng thủ công (§6.1) | ✅ Pass |
| TC-B05 | Applicant rút hồ sơ khi đang Under Review | ✅ Pass |
| TC-B06 | Rút hồ sơ **không** làm đổi `permitStatus` (§3.3.5) | ❌ Fail — bị set thành "Cancelled" |
| TC-B07 | Applicant gửi yêu cầu gia hạn | ✅ Pass |
| TC-B08 | Gia hạn quá 1 tháng bị chặn (§6.2) | ✅ Pass |
| TC-B09 | Mỗi NOP chỉ được gia hạn 1 lần (§6.2) | ✅ Pass |
| TC-B10 | Chỉ sửa được validity end date khi gia hạn (§6.2) | ✅ Pass |
| TC-B11 | Applicant gửi yêu cầu huỷ kèm lý do (§6.3) | ✅ Pass |
| TC-B12 | Yêu cầu huỷ đi qua LO rồi tới Approver, chỉ Cancelled khi đủ phê duyệt | ✅ Pass |
| TC-B13 | Applicant gửi yêu cầu gỡ đình chỉ kèm lý do (§6.3) | ✅ Pass — sau khi có NOP Suspended |
| TC-B14 | Nút "Request Lifting" hiển thị sẵn trên dữ liệu mẫu | ❌ Fail — dữ liệu mẫu không có NOP Suspended |
| TC-B15 | Đình chỉ chỉ áp dụng cho NOP đã Approved (§6.3) | ❌ Fail — đình chỉ được cả hồ sơ Draft |
| TC-B16 | Thu hồi chỉ áp dụng cho NOP đã Approved (§6.3) | ❌ Fail — không có kiểm tra trạng thái |
| TC-B17 | Gỡ đình chỉ chỉ cho phép tiếp tục khi validity state = Active (§6.3) | ✅ Pass |
| TC-B18 | LO không có quyền thu hồi NOP (§6.3) | ✅ Pass |

---

## TC-C · Phê duyệt (§5)

| ID | Test case | Kết quả |
|---|---|---|
| TC-C01 | Sau khi LO clear, hồ sơ được route song song tới các Approver theo trigger (§5.2) | ✅ Pass |
| TC-C02 | Approver endorse clearance, trạng thái bước chuyển Approved | ✅ Pass |
| TC-C03 | Approver request changes, hồ sơ chuyển Change Requested và giữ mã tham chiếu | ✅ Pass |
| TC-C04 | Applicant sửa và resubmit, hồ sơ quay về LO pre-screening (§5.5) | ✅ Pass |
| TC-C05 | Hệ thống tự phân loại minor / critical amendment (§5.5) | ✅ Pass |
| TC-C06 | Applicant không tự chọn được loại amendment | ✅ Pass |
| TC-C07 | Sửa scope / dates / area luôn bị xếp critical (§5.5) | ✅ Pass |
| TC-C08 | Applicant, LO và Approver phải là 3 người khác nhau (§5.1) | ✅ Pass — nút bị vô hiệu khi trùng vai |
| TC-C09 | Approver xem được tài liệu đã nhận và còn thiếu trước khi quyết định NOP Urgent (§5.1) | ✅ Pass |
| TC-C10 | Bản ghi quyết định lưu approver, decision, datetime, comments, tài liệu còn thiếu (§5.1) | ✅ Pass |
| TC-C11 | Snapshot tài liệu còn thiếu là dữ liệu thật, không phải giá trị mặc định cứng | ❌ Fail — dùng chuỗi dự phòng cứng |
| TC-C12 | Một thành viên trong Approver group quyết định thay cả nhóm (§5.3) | ✅ Pass |
| TC-C13 | Bản ghi quyết định lưu cả tên group và cá nhân (§5.3) | ✅ Pass |
| TC-C14 | Đổi Approver role/group áp dụng ngay cho các bước còn Pending (§5.3) | ❌ Fail — chưa có cơ chế |
| TC-C15 | Quyết định đã hoàn tất giữ nguyên sau khi đổi routing (§5.3) | ⛔ Blocked |
| TC-C16 | Applicant xem được tiến độ từng bước phê duyệt (§5.7) | ❌ Fail — chỉ có trạng thái tổng |

---

## TC-D · Urgent / IPA / Tài liệu hoãn (§4.6, §6.5)

| ID | Test case | Kết quả |
|---|---|---|
| TC-D01 | Ngày bắt đầu < 7 ngày tự phân loại Urgent (§4.6) | ✅ Pass |
| TC-D02 | Audit ghi nhận việc phân loại Urgent kèm ngày nộp và ngày bắt đầu | ✅ Pass |
| TC-D03 | Nhãn Urgent hiển thị trên Register | ✅ Pass |
| TC-D04 | Deadline tài liệu tính từ thời điểm IPA granted, N ngày 24h liên tục (§6.5.1) | ❌ Fail — hàm có nhưng không có dữ liệu để kiểm chứng |
| TC-D05 | Đổi cấu hình N chỉ áp dụng cho IPA cấp sau đó (§6.5.1) | ⛔ Blocked |
| TC-D06 | Applicant mở được danh sách tài liệu còn thiếu | ❌ Fail — modal rỗng |
| TC-D07 | Applicant upload được tài liệu hoãn | ❌ Fail — không có ô upload |
| TC-D08 | Tài liệu nộp lên được route tới Approver chịu trách nhiệm (§6.5.2) | ⛔ Blocked |
| TC-D09 | Approver chấp nhận tài liệu hoãn | ⛔ Blocked |
| TC-D10 | Approver yêu cầu sửa, trạng thái giữ Documents Outstanding (§6.5.2) | ⛔ Blocked |
| TC-D11 | Chỉ chuyển "Documents Complete" khi đủ tài liệu **và** đủ review được chấp nhận (§6.5.2) | ⛔ Blocked |
| TC-D12 | Upload tài liệu từ Register **không** tự chuyển sang Documents Complete | ❌ Fail — chuyển thẳng, bỏ qua review |
| TC-D13 | Màn hình Overdue Document Monitoring liệt kê NOP quá hạn kèm deadline và tài liệu thiếu (§6.5.2) | ⛔ Blocked |
| TC-D14 | Gỡ cảnh báo Overdue và dừng reminder khi hoàn tất | ⛔ Blocked |

---

## TC-E · Register & Báo cáo (§7)

| ID | Test case | Kết quả |
|---|---|---|
| TC-E01 | Register tìm kiếm / lọc / sắp xếp được | ✅ Pass |
| TC-E02 | Approver có hai view Pending Applications và All Applications (§7.2) | ✅ Pass |
| TC-E03 | Pending Applications là view mặc định của Approver | ✅ Pass |
| TC-E04 | Hồ sơ rời Pending sau khi Approver hoàn tất hành động | ✅ Pass |
| TC-E05 | Hồ sơ quay lại Pending khi cần hành động lần nữa | ✅ Pass |
| TC-E06 | Register hiển thị chỉ báo Documents Outstanding / Overdue trên từng dòng (§7.1) | ❌ Fail — không có |
| TC-E07 | Register hiển thị IPA status kèm authorised work period và conditions (§7.1) | ❌ Fail — chỉ có badge IPA Granted |
| TC-E08 | Mở dossier xem đủ 7 tab | ✅ Pass |
| TC-E09 | Tab Audit Trail hiển thị lịch sử đầy đủ | ✅ Pass |
| TC-E10 | Export CSV | ✅ Pass |
| TC-E11 | Export XLSX cho OR Team và Ops Admin (§7.3) | ❌ Fail — không có nút |
| TC-E12 | Export PDF Summary từ Approver view phản ánh filter/sort hiện tại (§7.3) | ✅ Pass |
| TC-E13 | Tải PDF riêng cho NOP đã Approved (§7.3) | ✅ Pass |
| TC-E14 | Bản đồ hiển thị đúng các permit đang Active | ✅ Pass |
| TC-E15 | Nội dung trên bản đồ mô tả đúng chức năng thực có | ❌ Fail — mô tả tính năng chưa tồn tại |

---

## TC-F · Thông báo & Cấu hình (§8)

| ID | Test case | Kết quả |
|---|---|---|
| TC-F01 | Catalog phủ đủ 26 trigger của §8.1 | ✅ Pass |
| TC-F02 | Không còn trigger thừa ngoài FRD bật mặc định | ✅ Pass |
| TC-F03 | Nộp hồ sơ sinh thông báo tới Applicant và LO | ⛔ Blocked → đánh giá qua code: ✅ |
| TC-F04 | Yêu cầu gia hạn sinh thông báo tới LO | ✅ Pass |
| TC-F05 | Yêu cầu huỷ sinh thông báo tới LO | ✅ Pass |
| TC-F06 | Outbox ghi trigger, người nhận, ngày giờ, delivery status (§8.2) | ✅ Pass |
| TC-F07 | Cấu hình khoảng nhắc Approver và ngưỡng escalation (§8.3) | ✅ Pass |
| TC-F08 | Hệ thống thực sự phát nhắc và escalation theo cấu hình (§8.3) | ❌ Fail — chỉ có cấu hình, không có engine |
| TC-F09 | Cấu hình distribution list và designated managers (§8.4) | ✅ Pass |
| TC-F10 | Thông báo bắt buộc không tắt được (§8.4) | ✅ Pass |
| TC-F11 | Tạo blackout mới và phân tích NOP bị ảnh hưởng (§6.4) | ✅ Pass |
| TC-F12 | Cuối tuần và ngày lễ tự động thành blackout island-wide (§6.4) | ✅ Pass |

---

## TC-G · Phân quyền (§2)

| ID | Test case | Kết quả |
|---|---|---|
| TC-G01 | `UserRole` phủ đủ 9 vai trò của §2.1 | ✅ Pass |
| TC-G02 | Ma trận quyền khớp §2.2 | ✅ Pass |
| TC-G03 | Chọn được 4 vai trò mới từ giao diện | ❌ Fail — bộ chọn vai trò chưa cập nhật |
| TC-G04 | LO chỉ thấy hồ sơ được gán (§7.1) | ❌ Fail — logic lọc bị ngược |
| TC-G05 | Approver chỉ thấy hồ sơ trong phạm vi quyền | ✅ Pass |
| TC-G06 | SDC Stakeholder (gồm OR Team) thấy hồ sơ được uỷ quyền | ❌ Fail — không phân biệt được với view_all |
| TC-G07 | NOP Operations Admin thấy toàn bộ | ✅ Pass |
| TC-G08 | Applicant chỉ thấy hồ sơ của tổ chức mình | ✅ Pass |

---

## TC-H · Nội dung & Ngôn ngữ

| ID | Test case | Kết quả |
|---|---|---|
| TC-H01 | Không có tham chiếu điều khoản tài liệu (FRD, §x.x) trong giao diện | ❌ Fail — 22 vị trí |
| TC-H02 | Không có mã task nội bộ (T01–T45) trong giao diện | ❌ Fail — 11 vị trí |
| TC-H03 | Không có nội dung kiểu hướng dẫn sử dụng / giải thích cơ chế | ❌ Fail — panel trên trang bản đồ |
| TC-H04 | Nhãn nút phản ánh đúng hành vi thực tế | ❌ Fail — "Cancel Permit" thực chất là gửi yêu cầu |
| TC-H05 | Thuật ngữ nhất quán trong toàn hệ thống | ❌ Fail — Blackout/Moratorium, Pre-screen/Prescreen |
| TC-H06 | Empty state có nội dung rõ ràng | ✅ Pass |

---

## TC-I · UI/UX & Khả năng tiếp cận

| ID | Test case | Kết quả |
|---|---|---|
| TC-I01 | Không có control nào bị che, không bấm được | ✅ Pass — z-index modal lồng nhau đã đúng (9000 → 10000) |
| TC-I02 | Ô nhập sai hiển thị viền đỏ và `aria-invalid` | ❌ Fail — chỉ có chữ đỏ dưới ô |
| TC-I03 | Trường bắt buộc có `aria-required` | ❌ Fail — chỉ đánh dấu bằng dấu `*` |
| TC-I04 | Tỷ lệ tương phản đạt WCAG AA | ❌ Fail — 43 mẫu dưới ngưỡng |
| TC-I05 | Không có cuộn ngang ở 1280 / 1024 / 768 px | ✅ Pass |

---

## Ghi chú giới hạn

Bộ test case này do BnK Solutions xây dựng phục vụ kiểm thử nội bộ và thống nhất phạm vi với SDC. Kết quả phản ánh trạng thái build ngày 19/09/2026. Các hạng mục phụ thuộc hệ thống bên thứ ba đã được loại khỏi phạm vi chấm điểm theo thống nhất trước đó.
