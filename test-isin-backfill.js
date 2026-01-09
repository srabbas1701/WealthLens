// Test script to manually trigger ISIN backfill
// Run this in browser console or Node.js

async function testISINBackfill() {
  console.log('Testing ISIN backfill endpoint...\n');
  
  try {
    // First, check status
    console.log('📊 Checking status...');
    const statusResponse = await fetch('/api/mf/isin/backfill', {
      method: 'GET',
    });
    const statusData = await statusResponse.json();
    console.log(`Found ${statusData.assetsWithoutISIN || 0} MF assets without ISIN\n`);
    
    if (statusData.assetsWithoutISIN === 0) {
      console.log('✅ All MF assets already have ISINs! No backfill needed.');
      return;
    }
    
    // Run backfill
    console.log('🔄 Running ISIN backfill...');
    const response = await fetch('/api/mf/isin/backfill', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    
    const data = await response.json();
    
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log(`\n✅ SUCCESS!`);
      console.log(`Scanned: ${data.scanned} assets`);
      console.log(`Resolved: ${data.resolved} assets`);
      console.log(`Unresolved: ${data.unresolved} assets`);
      
      if (data.sample_unresolved && data.sample_unresolved.length > 0) {
        console.log('\n⚠️ Sample unresolved assets:');
        data.sample_unresolved.forEach(name => {
          console.log(`  - ${name}`);
        });
      }
      
      if (data.resolved > 0) {
        console.log('\n💡 Next step: Run NAV update to fetch prices for resolved ISINs');
        console.log('   POST /api/mf/navs/update');
      }
    } else {
      console.log(`\n❌ FAILED: ${data.error}`);
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error);
  }
}

// Run the test
testISINBackfill();


