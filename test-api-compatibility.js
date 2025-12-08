#!/usr/bin/env node

/**
 * API Compatibility Test Script
 * Compares Next.js API routes vs Backend API responses
 */

const API_BASE_NEXTJS = 'http://localhost:3000/api';
const API_BASE_BACKEND = 'http://localhost:4000/api';

async function testEndpoint(endpoint, method = 'GET', body = null) {
  const headers = {
    'Content-Type': 'application/json',
  };

  const nextjsUrl = `${API_BASE_NEXTJS}${endpoint}`;
  const backendUrl = `${API_BASE_BACKEND}${endpoint}`;

  console.log(`\n🔍 Testing: ${method} ${endpoint}`);

  try {
    // Test Next.js API
    console.log(`   Next.js: ${nextjsUrl}`);
    const nextjsResponse = await fetch(nextjsUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    let nextjsData;
    try {
      nextjsData = await nextjsResponse.json();
    } catch (e) {
      nextjsData = { error: 'Invalid JSON response' };
    }

    // Test Backend API
    console.log(`   Backend: ${backendUrl}`);
    const backendResponse = await fetch(backendUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    let backendData;
    try {
      backendData = await backendResponse.json();
    } catch (e) {
      backendData = { error: 'Invalid JSON response' };
    }

    // Compare responses
    const statusMatch = nextjsResponse.status === backendResponse.status;
    const dataMatch = JSON.stringify(nextjsData) === JSON.stringify(backendData);

    console.log(`   Status: Next.js ${nextjsResponse.status} | Backend ${backendResponse.status} ${statusMatch ? '✅' : '❌'}`);
    console.log(`   Data: ${dataMatch ? '✅ Match' : '❌ Different'}`);

    if (!dataMatch) {
      console.log(`   Next.js: ${JSON.stringify(nextjsData).substring(0, 100)}...`);
      console.log(`   Backend: ${JSON.stringify(backendData).substring(0, 100)}...`);
    }

    return {
      endpoint,
      statusMatch,
      dataMatch,
      nextjsStatus: nextjsResponse.status,
      backendStatus: backendResponse.status,
      nextjsData,
      backendData
    };

  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { endpoint, error: error.message };
  }
}

async function runCompatibilityTests() {
  console.log('🚀 API Compatibility Test: Next.js vs Backend');
  console.log('==============================================\n');

  // Check if servers are running
  console.log('🔗 Checking server availability...');

  try {
    await fetch(`${API_BASE_NEXTJS}/categories`);
    console.log('✅ Next.js server: Running');
  } catch (e) {
    console.log('❌ Next.js server: Not running');
    return;
  }

  try {
    await fetch(`${API_BASE_BACKEND}/health`);
    console.log('✅ Backend server: Running\n');
  } catch (e) {
    console.log('❌ Backend server: Not running');
    return;
  }

  const testResults = [];

  // Test endpoints
  const endpoints = [
    { path: '/categories', description: 'Categories API' },
    { path: '/sheets', description: 'Sheets API' },
    { path: '/expenses?limit=2', description: 'Expenses API (limited)' },
    { path: '/analytics?sheetId=e2b9664a-8583-470c-84de-274131035fa5', description: 'Analytics API' },
    { path: '/descriptions?sheetId=e2b9664a-8583-470c-84de-274131035fa5', description: 'Descriptions API' },
  ];

  for (const endpoint of endpoints) {
    console.log(`\n📋 ${endpoint.description}`);
    console.log('='.repeat(50));

    const result = await testEndpoint(endpoint.path);
    testResults.push({ ...endpoint, ...result });
  }

  // Summary
  console.log('\n📊 COMPATIBILITY SUMMARY');
  console.log('========================');

  const compatible = testResults.filter(r => r.statusMatch && r.dataMatch);
  const statusOnly = testResults.filter(r => r.statusMatch && !r.dataMatch);
  const incompatible = testResults.filter(r => !r.statusMatch || r.error);

  console.log(`✅ Fully Compatible: ${compatible.length}/${testResults.length}`);
  console.log(`⚠️  Status Match Only: ${statusOnly.length}/${testResults.length}`);
  console.log(`❌ Incompatible: ${incompatible.length}/${testResults.length}`);

  if (compatible.length === testResults.length) {
    console.log('\n🎉 ALL ENDPOINTS ARE FULLY COMPATIBLE!');
    console.log('   Ready to migrate frontend to backend API.');
  } else {
    console.log('\n⚠️  SOME ENDPOINTS NEED FIXING:');
    statusOnly.forEach(r => console.log(`   - ${r.description}: Response data differs`));
    incompatible.forEach(r => console.log(`   - ${r.description}: Status/response issues`));
  }

  return testResults;
}

// Run the tests
runCompatibilityTests().catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
