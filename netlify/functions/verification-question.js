const questions = [
  { question: "What is 2 + 2?", answer: "4" },
  { question: "What color is the sky?", answer: "blue" },
  { question: "What is the capital of France?", answer: "paris" },
  { question: "How many days in a week?", answer: "7" },
  { question: "What is 5 x 3?", answer: "15" }
];

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod === 'GET') {
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(randomQuestion)
    };
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};
