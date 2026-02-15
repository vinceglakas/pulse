// Test script for the scraping functionality
async function testScraping() {
  console.log('Testing scrape API...')
  
  try {
    // Test single URL scrape
    const response = await fetch('http://localhost:3000/api/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        urls: ['https://example.com']
      })
    })
    
    const data = await response.json()
    console.log('Scrape result:', JSON.stringify(data, null, 2))
    
    if (data.results && data.results.length > 0) {
      console.log('✅ Scrape API is working!')
      console.log(`- Title: ${data.results[0].data?.title}`)
      console.log(`- Description: ${data.results[0].data?.description?.slice(0, 100)}...`)
      console.log(`- Text length: ${data.results[0].data?.text?.length} characters`)
      console.log(`- Links found: ${data.results[0].data?.links?.length}`)
    } else {
      console.log('❌ Scrape API returned empty results')
    }
  } catch (error) {
    console.error('❌ Error testing scrape API:', error)
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testScraping()
}