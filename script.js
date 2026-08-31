import http from 'k6/http';
import { Counter, Rate } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.4/index.js';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

// CONFIG
if (!__ENV.SCENARIO) throw new Error('ต้องระบุ -e SCENARIO=<1 หรือ 2> (1=spike, 2=constant-arrival-rate)');
const SCENARIO = Number(__ENV.SCENARIO);

const VERBOSE = Number(__ENV.VERBOSE || 0);           // 1 = log response body ตอน error, 0 (default) = log แบบสั้น
const LOG_SUCCESS = Number(__ENV.LOG_SUCCESS || 0);   // ชั่วคราว: 1 = log status 2xx ด้วย, 0 (default) = log เฉพาะ error เหมือนเดิม

let VUS;
if (SCENARIO === 1) {
    if (!__ENV.VUS) throw new Error('SCENARIO=1 ต้องระบุ -e VUS=<จำนวน request ที่ยิงพร้อมกัน>');
    VUS = Number(__ENV.VUS);
}

function durationToSeconds(str) {
    const match = String(str).match(/^(\d+(?:\.\d+)?)(ms|s|m|h)$/);
    if (!match) throw new Error(`DURATION รูปแบบไม่ถูกต้อง: "${str}" (ตัวอย่างที่ใช้ได้: '60s', '5m', '1h')`);
    const [, num, unit] = match;
    const multiplier = { ms: 0.001, s: 1, m: 60, h: 3600 }[unit];
    return Number(num) * multiplier;
}

let REQUESTS, DURATION, RATE_PER_SECOND, VU_POOL;
if (SCENARIO === 2) {
    if (!__ENV.REQUESTS) throw new Error('SCENARIO=2 ต้องระบุ -e REQUESTS=<จำนวนคำขอรวม> เช่น -e REQUESTS=3000');
    if (!__ENV.DURATION) throw new Error('SCENARIO=2 ต้องระบุ -e DURATION=<เวลา> เช่น -e DURATION=60s');
    REQUESTS = Number(__ENV.REQUESTS);
    DURATION = __ENV.DURATION;
    RATE_PER_SECOND = Math.ceil(REQUESTS / durationToSeconds(DURATION));
    VU_POOL = Math.max(RATE_PER_SECOND * 2, 10);
}


// SCENARIO
export const options = {
    insecureSkipTLSVerify: true,
    discardResponseBodies: SCENARIO !== 1,
    scenarios: {
        contacts:
            SCENARIO === 2
                ? {
                    executor: 'constant-arrival-rate',
                    rate: RATE_PER_SECOND,
                    timeUnit: '1s',
                    duration: DURATION,
                    preAllocatedVUs: VU_POOL,
                    maxVUs: VU_POOL,
                }
                : {
                    executor: 'per-vu-iterations',
                    vus: VUS,
                    iterations: 1,
                    maxDuration: '10m',
                    gracefulStop: '120s',
                },
    },
};


// METRICS & LOGGING
const errorRate = new Rate('error_rate');
const errors = new Counter('errors');
function logResponse(response) {
    const isSuccess = response.status >= 200 && response.status < 300;
    errorRate.add(!isSuccess);
    if (isSuccess) {
        // if (LOG_SUCCESS === 1) {
        //     console.log(`REQ_LOG | vu:${__VU} | status:${response.status} | duration:${response.timings.duration}ms`);
        // }
        return;
    }
    if (response.status === 0) {
        errors.add(1, { type: 'network' });
        console.error(
            `NETWORK ERROR | vu:${__VU} | error_code:${response.error_code} | error:"${response.error}"`
        );
        return;
    }
    errors.add(1, { type: 'http', status: String(response.status) });
    if (VERBOSE === 1) {
        const bodyText = response.body ? String(response.body).slice(0, 500) : '(no body)';
        console.error(`REQ_LOG | vu:${__VU} | status:${response.status} | body:${bodyText}`);
    } else {
        console.log(
            `REQ_LOG | vu:${__VU} | status:${response.status} | error:"${response.error}" | duration:${response.timings.duration}ms`
        );
    }
}


// API FUNCTIONS
export function exam() {
    const url = 'https://google.com';
    const params = {
        timeout: '300s',    // ถ้าไม่กำหนด timeout K6 จะใช้ 60s เป็น default
    };
    const response = http.get(url, params);
    logResponse(response);
    return response;
}


// ENTRY POINT
export default function () {
    exam();
}


// SUMMARY REPORT
export function handleSummary(data) {
    return {
        stdout: textSummary(data, { indent: ' ', enableColors: true }),
        'report.html': htmlReport(data),
    };
}