const axios = require('axios');

async function testRoute() {
  try {
    console.log('Testing ML service route endpoint...');
    
    const response = await axios.post('http://localhost:8001/predict/route', {
      start: { lat: -70.7666, lng: 11.7333 },
      end: { lat: -69.4083, lng: 76.1833 },
      hazards: []
    }, { timeout: 5000 });
    
    console.log('✅ ML Service Response:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ ML Service Error:');
    console.error(error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testRoute();
