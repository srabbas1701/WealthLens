// Test script to manually trigger price update
// Run this in browser console or Node.js

async function testPriceUpdate() {
  console.log('Testing price update endpoint...\n');
  
  try {
    const response = await fetch('/api/stocks/prices/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log(`\n✅ SUCCESS!`);
      console.log(`Updated: ${data.updated} symbols`);
      console.log(`Failed: ${data.failed} symbols`);
      console.log(`Price Date: ${data.priceDate}`);
      
      if (data.results && data.results.length > 0) {
        console.log('\nFirst 5 results:');
        data.results.slice(0, 5).forEach(r => {
          if (r.success) {
            console.log(`  ✓ ${r.symbol}: ₹${r.price} (${r.priceDate})`);
          } else {
            console.log(`  ✗ ${r.symbol}: ${r.error}`);
          }
        });
      }
    } else {
      console.log(`\n❌ FAILED: ${data.error}`);
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error);
  }
}

// Run the test
testPriceUpdate();

