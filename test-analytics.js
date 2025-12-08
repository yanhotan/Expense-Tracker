import { analyticsApi } from './frontend/lib/api.ts';

async function testAnalytics() {
  console.log('🧪 Testing analytics API connection...');

  try {
    console.log('Calling analyticsApi.getAll()...');
    const result = await analyticsApi.getAll();
    console.log('✅ Success! Analytics data:', {
      categories: Object.keys(result.categoryTotals || {}).length,
      months: Object.keys(result.monthlyTotals || {}).length,
      currentMonth: result.currentMonthTotal,
      previousMonth: result.previousMonthTotal
    });
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

testAnalytics();
