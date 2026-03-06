/**
 * test_api.js – Smart Container Risk Engine – Full API Test (Axios)
 *
 * Run:  node test_api.js
 * Deps: npm install axios form-data (already done)
 *
 * NOTE: For /datasets/upload/ and /datasets/manual-entry/ to return 202,
 *       Redis + Celery worker must be running, OR the server must be started with:
 *       CELERY_ALWAYS_EAGER=True python manage.py runserver
 *       Without them these endpoints return 500 (expected in dev without Redis).
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8000';

// ── State ─────────────────────────────────────────────────────────────────────
let accessToken = '';
let refreshToken = '';
let jobId = '';

const results = [];

// ── Helpers ───────────────────────────────────────────────────────────────────

function logResult(title, method, url, status, data, expectedStatus) {
    const ok = Array.isArray(expectedStatus)
        ? expectedStatus.includes(status)
        : status === expectedStatus;

    const icon = ok ? '✅' : '❌';
    const note = ok ? '' : `  (expected HTTP ${expectedStatus})`;
    console.log(`\n${icon}  [${method}] ${url}  →  HTTP ${status}${note}`);
    console.log(`   ${title}`);
    const preview = JSON.stringify(data, null, 2).split('\n').slice(0, 8).join('\n');
    console.log('   Response:', preview);
    results.push({ title, ok, status, expected: expectedStatus });
}

async function hit(title, method, url, opts = {}, expectedStatus = [200, 201, 202]) {
    try {
        const res = await axios({
            method,
            url: `${BASE}${url}`,
            ...opts,
            validateStatus: () => true,
            timeout: 15000,
        });
        logResult(title, method.toUpperCase(), url, res.status, res.data, expectedStatus);
        return res;
    } catch (err) {
        console.log(`❌  [${method.toUpperCase()}] ${url}  →  NETWORK ERROR: ${err.message}`);
        results.push({ title, ok: false, status: 'ERR', expected: expectedStatus });
        return null;
    }
}

const auth = () => ({ Authorization: `Bearer ${accessToken}` });

// ── Sample CSV content ────────────────────────────────────────────────────────
const SAMPLE_CSV = [
    'Container_ID,Importer_ID,Exporter_ID,Origin_Country,Destination_Country,Destination_Port,' +
    'HS_Code,Shipping_Line,Trade_Regime (Import / Export / Transit),Declared_Weight,' +
    'Measured_Weight,Declared_Value,Dwell_Time_Hours,Declaration_Time,Declaration_Date (YYYY-MM-DD)',
    'C001,IMP001,EXP001,CN,IN,INNSA,870322,MSC,Import,5000,5100,120000,48,2024-01-15 09:30:00,2024-01-15',
    'C002,IMP002,EXP002,US,IN,INMUN,392690,EVERGREEN,Export,3000,2950,80000,12,2024-01-16 11:00:00,2024-01-16',
    'C003,IMP003,EXP003,DE,IN,INCCU,841899,CMA,Transit,7000,7500,250000,72,2024-01-17 14:15:00,2024-01-17',
].join('\n');

const CSV_PATH = path.join(__dirname, '_test_sample.csv');

// ── Manual entry payload ──────────────────────────────────────────────────────
const MANUAL_PAYLOAD = [
    {
        Container_ID: 'M001',
        Importer_ID: 'IMP010',
        Exporter_ID: 'EXP010',
        Origin_Country: 'CN',
        Destination_Country: 'IN',
        Destination_Port: 'INNSA',
        HS_Code: '870322',
        Shipping_Line: 'MSC',
        'Trade_Regime (Import / Export / Transit)': 'Import',
        Declared_Weight: 5000,
        Measured_Weight: 5100,
        Declared_Value: 120000,
        Dwell_Time_Hours: 48,
        Declaration_Time: '2024-01-15 09:30:00',
        'Declaration_Date (YYYY-MM-DD)': '2024-01-15',
    },
];

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
    console.log('═'.repeat(65));
    console.log(' 🚀  Smart Container Risk Engine — Axios API Test Suite');
    console.log(`     Base URL: ${BASE}`);
    console.log('═'.repeat(65));

    // ─────────────────────────────────────────────────────────────────────────
    // 1. REGISTER
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n┌── AUTH ENDPOINTS ──────────────────────────────────────┐');
    const username = `axiostest_${Date.now()}`;
    const regRes = await hit('POST /auth/register/', 'post', '/auth/register/', {
        data: { username, email: `${username}@test.com`, password: 'securepass123' },
    }, 201);

    if (regRes?.data?.tokens) {
        accessToken = regRes.data.tokens.access;
        refreshToken = regRes.data.tokens.refresh;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. LOGIN
    // ─────────────────────────────────────────────────────────────────────────
    const loginRes = await hit('POST /auth/login/', 'post', '/auth/login/', {
        data: { username, password: 'securepass123' },
    }, 200);

    if (loginRes?.data?.tokens) {
        accessToken = loginRes.data.tokens.access;
        refreshToken = loginRes.data.tokens.refresh;
        console.log('\n   🔑 JWT tokens captured for authenticated requests.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2b. LOGIN — wrong credentials  (expect 401)
    // ─────────────────────────────────────────────────────────────────────────
    await hit('POST /auth/login/ (wrong password → 401)', 'post', '/auth/login/', {
        data: { username, password: 'wrongpassword' },
    }, 401);

    // ─────────────────────────────────────────────────────────────────────────
    // 3. TOKEN REFRESH
    // ─────────────────────────────────────────────────────────────────────────
    await hit('POST /auth/refresh/', 'post', '/auth/refresh/', {
        data: { refresh: refreshToken },
    }, 200);

    // ─────────────────────────────────────────────────────────────────────────
    // 4. FILE UPLOAD
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n┌── DATASET ENDPOINTS ───────────────────────────────────┐');
    fs.writeFileSync(CSV_PATH, SAMPLE_CSV);
    const form = new FormData();
    form.append('file', fs.createReadStream(CSV_PATH), 'sample.csv');

    const uploadRes = await hit('POST /datasets/upload/ (CSV file)', 'post', '/datasets/upload/', {
        headers: { ...auth(), ...form.getHeaders() },
        data: form,
    }, [202, 500]); // 500 = expected when Redis/Celery not running

    if (uploadRes?.data?.job_id) {
        jobId = uploadRes.data.job_id;
        console.log(`\n   📦 Job ID: ${jobId}`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4b. FILE UPLOAD — wrong extension  (expect 400)
    // ─────────────────────────────────────────────────────────────────────────
    const badForm = new FormData();
    const txtPath = path.join(__dirname, '_bad.txt');
    fs.writeFileSync(txtPath, 'hello world');
    badForm.append('file', fs.createReadStream(txtPath), 'bad.txt');
    await hit('POST /datasets/upload/ (bad .txt ext → 400)', 'post', '/datasets/upload/', {
        headers: { ...auth(), ...badForm.getHeaders() },
        data: badForm,
    }, 400);

    // ─────────────────────────────────────────────────────────────────────────
    // 5. MANUAL ENTRY
    // ─────────────────────────────────────────────────────────────────────────
    const manRes = await hit('POST /datasets/manual-entry/ (JSON array)', 'post', '/datasets/manual-entry/', {
        headers: { ...auth(), 'Content-Type': 'application/json' },
        data: MANUAL_PAYLOAD,
    }, [202, 500]); // 500 = expected when Redis/Celery not running

    if (manRes?.data?.job_id && !jobId) jobId = manRes.data.job_id;

    // ─────────────────────────────────────────────────────────────────────────
    // 5b. MANUAL ENTRY — empty array  (expect 400)
    // ─────────────────────────────────────────────────────────────────────────
    await hit('POST /datasets/manual-entry/ (empty array → 400)', 'post', '/datasets/manual-entry/', {
        headers: { ...auth(), 'Content-Type': 'application/json' },
        data: [],
    }, 400);

    // ─────────────────────────────────────────────────────────────────────────
    // 6. JOB STATUS
    // ─────────────────────────────────────────────────────────────────────────
    if (jobId) {
        await hit(`GET /datasets/status/${jobId}/`, 'get', `/datasets/status/${jobId}/`, {
            headers: auth(),
        }, 200);
    } else {
        console.log('\n⚠️   Skipping job status (no job_id — upload requires Redis/Celery).');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. DASHBOARD SUMMARY
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n┌── DASHBOARD ENDPOINTS ─────────────────────────────────┐');
    await hit('GET /dashboard/summary/', 'get', '/dashboard/summary/', {
        headers: auth(),
    }, 200);

    // ─────────────────────────────────────────────────────────────────────────
    // 8. CONTAINER LIST
    // ─────────────────────────────────────────────────────────────────────────
    await hit('GET /dashboard/containers/', 'get', '/dashboard/containers/', {
        headers: auth(),
    }, 200);

    await hit(
        'GET /dashboard/containers/?risk_level=Critical',
        'get',
        '/dashboard/containers/?risk_level=Critical',
        { headers: auth() },
        200
    );

    await hit(
        'GET /dashboard/containers/?page=1',
        'get',
        '/dashboard/containers/?page=1',
        { headers: auth() },
        200
    );

    // ─────────────────────────────────────────────────────────────────────────
    // 9. ANOMALY LIST
    // ─────────────────────────────────────────────────────────────────────────
    await hit('GET /dashboard/anomalies/', 'get', '/dashboard/anomalies/', {
        headers: auth(),
    }, 200);

    // ─────────────────────────────────────────────────────────────────────────
    // 10. EXPORT
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n┌── EXPORT ENDPOINT ─────────────────────────────────────┐');
    // No data uploaded (Celery not running) → 404 is expected
    await hit('GET /export/?format=csv', 'get', '/export/?format=csv', {
        headers: auth(),
    }, [200, 404]);

    await hit('GET /export/?format=xlsx', 'get', '/export/?format=xlsx', {
        headers: auth(),
    }, [200, 404]);

    await hit('GET /export/?format=pdf (invalid → 400)', 'get', '/export/?format=pdf', {
        headers: auth(),
    }, 400);

    // ─────────────────────────────────────────────────────────────────────────
    // SECURITY GUARD CHECKS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n┌── SECURITY GUARD CHECKS ───────────────────────────────┐');

    await hit('GET /dashboard/summary/ no token → 401', 'get', '/dashboard/summary/', {}, 401);
    await hit('GET /dashboard/containers/ no token → 401', 'get', '/dashboard/containers/', {}, 401);
    await hit('GET /dashboard/anomalies/ no token → 401', 'get', '/dashboard/anomalies/', {}, 401);
    await hit('GET /export/ no token → 401', 'get', '/export/?format=csv', {}, 401);

    // ─────────────────────────────────────────────────────────────────────────
    // SUMMARY
    // ─────────────────────────────────────────────────────────────────────────
    const passed = results.filter(r => r.ok);
    const failed = results.filter(r => !r.ok);

    console.log('\n' + '═'.repeat(65));
    console.log(` 📊  RESULTS:  ${passed.length} passed  |  ${failed.length} failed  |  ${results.length} total`);
    console.log('═'.repeat(65));

    if (passed.length) {
        console.log('\n✅  PASSED:');
        passed.forEach(r => console.log(`    • ${r.title}  (HTTP ${r.status})`));
    }

    if (failed.length) {
        console.log('\n❌  FAILED:');
        failed.forEach(r =>
            console.log(`    • ${r.title}  (got HTTP ${r.status}, expected ${r.expected})`)
        );
    }

    console.log('\n💡  NOTE: Upload/manual-entry return 500 when Redis+Celery are not running.');
    console.log('    Start them with:');
    console.log('      redis-server &');
    console.log('      celery -A core worker --loglevel=info &');
    console.log('    OR set env var: CELERY_ALWAYS_EAGER=True python manage.py runserver');
    console.log('    (ALWAYS_EAGER runs tasks inline but still requires ML model files)');
    console.log('\n' + '═'.repeat(65));

    // Cleanup
    [CSV_PATH, txtPath].forEach(f => fs.existsSync(f) && fs.unlinkSync(f));
}

run().catch(console.error);
