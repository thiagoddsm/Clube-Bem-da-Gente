import axios from 'axios';

const STONE_API_URL = 'https://api.stone.com.br'; // Placeholder URL

export const processPayment = async (paymentData: any) => {
  try {
    const response = await axios.post('/api/stone/payment', paymentData);
    return response.data;
  } catch (error) {
    console.error('Error processing payment:', error);
    throw error;
  }
};
