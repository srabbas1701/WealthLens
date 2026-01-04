// Quick test script to verify Yahoo Finance API is working
// Run with: node test-yahoo-finance.js

async function testYahooFinance() {
  const symbol = 'HDFCBANK'; // NSE symbol
  const yahooSymbol = `${symbol}.NS`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=5d`;
  
  console.log(`Testing Yahoo Finance API for ${symbol} (${yahooSymbol})...`);
  console.log(`URL: ${url}\n`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });
    
    console.log(`Response Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      console.error(`❌ API returned error: ${response.status}`);
      return;
    }
    
    const data = await response.json();
    
    console.log('\nResponse Structure:');
    console.log('- Has chart:', !!data?.chart);
    console.log('- Has result:', !!data?.chart?.result);
    console.log('- Result length:', data?.chart?.result?.length || 0);
    
    if (data?.chart?.result && data.chart.result.length > 0) {
      const result = data.chart.result[0];
      const meta = result?.meta;
      
      console.log('\nMeta Data:');
      console.log('- Has meta:', !!meta);
      console.log('- regularMarketPreviousClose:', meta?.regularMarketPreviousClose);
      console.log('- regularMarketTime:', meta?.regularMarketTime);
      console.log('- regularMarketPrice:', meta?.regularMarketPrice);
      
      if (meta?.regularMarketPreviousClose) {
        const price = meta.regularMarketPreviousClose;
        const timestamp = meta.regularMarketTime || Math.floor(Date.now() / 1000);
        const priceDate = new Date(timestamp * 1000).toISOString().split('T')[0];
        
        console.log(`\n✅ SUCCESS!`);
        console.log(`Price: ₹${price.toFixed(2)}`);
        console.log(`Date: ${priceDate}`);
      } else {
        console.log('\n❌ ERROR: regularMarketPreviousClose not found in response');
        console.log('Full meta:', JSON.stringify(meta, null, 2));
      }
    } else {
      console.log('\n❌ ERROR: Invalid response structure');
      console.log('Response:', JSON.stringify(data, null, 2).substring(0, 500));
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  }
}

testYahooFinance();

