const axios = require('axios');

async function testKnapsack() {
  try {
    console.log('Testing Knapsack ML endpoint...');
    
    const items = [
      { item_name: 'Medical Supplies', quantity: 50, weight: 120, volume: 2.5, priority: 10 },
      { item_name: 'Food Rations', quantity: 200, weight: 450, volume: 8.0, priority: 9 },
      { item_name: 'Fuel Drums', quantity: 10, weight: 800, volume: 12.0, priority: 8 },
      { item_name: 'Scientific Equipment', quantity: 5, weight: 200, volume: 3.0, priority: 6 },
      { item_name: 'Spare Parts', quantity: 30, weight: 150, volume: 2.0, priority: 5 }
    ];
    
    const response = await axios.post('http://localhost:8001/predict/optimize-cargo', {
      items: items,
      max_weight: 1500,
      max_volume: 25
    }, { timeout: 5000 });
    
    console.log('✅ ML Service Response:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ ML Service Error:');
    console.error('Message:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testKnapsack();
