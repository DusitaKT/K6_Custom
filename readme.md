# Load Test Script — Description By KT Tester
k6 script สำหรับทดสอบโหลด รองรับ 2 รูปแบบการยิง (spike / constant rate) พร้อมรายงานสรุป (HTML)


## วิธีรัน
**Spike test** — ยิง N request พร้อมกันครั้งเดียว (ทดสอบ burst / connection ceiling):
```bash
k6 run script.js -e SCENARIO=1 -e VUS=3000
```
**Constant arrival rate** — ยิงคงที่ N request/วินาที ต่อเนื่องตามระยะเวลาที่กำหนด (ทดสอบ throughput ที่ต้องการจริง):
```bash
k6 run script.js -e SCENARIO=2 -e REQUESTS=3000 -e DURATION=60s
```
**ดู response body เต็มตอน error** (default จะ log แบบสั้น):
```bash
k6 run script.js -e SCENARIO=1 -e VUS=50 -e VERBOSE=1
```


## SCENARIO 1 vs SCENARIO 2 ต่างกันยังไง
- **SCENARIO=1 (spike)** — VU ทั้งหมดเปิดพร้อมกันทันที ยิงคนละ 1 ครั้งแล้วจบ ไม่มีการคุมความเร็ว เหมาะกับการทดสอบว่า server รับ connection พร้อมกันจำนวนมากได้ไหม (เช่น ตอนมีคนเข้าเว็บพร้อมกันตอนเปิดระบบ)
- **SCENARIO=2 (constant-arrival-rate)** — คุม rate ที่ N request/วินาที ต่อเนื่องตามเวลาที่ตั้ง เหมาะกับการทดสอบว่า server รองรับ throughput ที่คาดว่าจะเกิดขึ้นจริงได้ไหม


## ผลลัพธ์หลังรันจบ
- **Console**: ตาราง summary
- **`report.html`**: รายงานฉบับเต็มเปิดดูใน browser ได้ รวม breakdown error ตาม status code


## หมายเหตุ
- `status: 0` หมายถึง network error (connection reset, timeout, DNS fail) ไม่ใช่ HTTP error