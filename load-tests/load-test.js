/**
 * ============================================================================
 * SecureMe API - Baseline Load Testing Script (100 Virtual Users / 1 Minute)
 * ============================================================================
 */

const http = require('http');
const https = require('https');

const TARGET_URL = process.env.API_URL || 'https://secureme-backend-h0kx.onrender.com';
const CONCURRENT_USERS = 100;
const DURATION_SECONDS = 60;

console.log(`[START] Starting Load Test: ${CONCURRENT_USERS} Virtual Users for ${DURATION_SECONDS}s against ${TARGET_URL}`);

let totalRequests = 0;
let successfulRequests = 0;
let failedRequests = 0;
const latencies = [];

const startTime = Date.now();
const endTime = startTime + (DURATION_SECONDS * 1000);

async function makeRequest() {
  const reqStart = Date.now();
  return new Promise((resolve) => {
    const isHttps = TARGET_URL.startsWith('https');
    const client = isHttps ? https : http;
    
    const req = client.get(`${TARGET_URL}/health`, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        const duration = Date.now() - reqStart;
        latencies.push(duration);
        totalRequests++;
        if (res.statusCode >= 200 && res.statusCode < 400) {
          successfulRequests++;
        } else {
          failedRequests++;
        }
        resolve();
      });
    });

    req.on('error', () => {
      failedRequests++;
      totalRequests++;
      resolve();
    });

    req.setTimeout(5000, () => {
      req.destroy();
      failedRequests++;
      totalRequests++;
      resolve();
    });
  });
}

async function runVirtualUser() {
  while (Date.now() < endTime) {
    await makeRequest();
    // Micro-delay between requests per VU
    await new Promise(r => setTimeout(r, 50));
  }
}

async function startLoadTest() {
  const workers = [];
  for (let i = 0; i < CONCURRENT_USERS; i++) {
    workers.push(runVirtualUser());
  }
  await Promise.all(workers);

  const totalTimeSec = (Date.now() - startTime) / 1000;
  latencies.sort((a, b) => a - b);
  const minLat = latencies[0] || 0;
  const maxLat = latencies[latencies.length - 1] || 0;
  const avgLat = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const rps = (totalRequests / totalTimeSec).toFixed(2);

  console.log('\n================ LOAD TEST RESULTS ================');
  console.log(`Total Requests Sent : ${totalRequests}`);
  console.log(`Throughput (RPS)    : ${rps} req/sec`);
  console.log(`Response Times:`);
  console.log(`  - Min (Fastest)   : ${minLat} ms`);
  console.log(`  - Average         : ${avgLat.toFixed(1)} ms`);
  console.log(`  - Max (Slowest)   : ${maxLat} ms`);
  console.log(`  - 95th Percentile : ${p95} ms`);
  console.log(`Error Rate          : ${((failedRequests / totalRequests) * 100).toFixed(2)}%`);
  console.log('===================================================\n');
}

startLoadTest();
