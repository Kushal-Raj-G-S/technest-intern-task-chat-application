const questions = [
  { question: "What is 2 + 2?", answer: "4" },
  { question: "What color is the sky?", answer: "blue" },
  { question: "What is the capital of France?", answer: "paris" },
  { question: "How many days in a week?", answer: "7" },
  { question: "What is 5 x 3?", answer: "15" }
];

// Simple session storage (in production, use a database)
const sessions = new Map();

exports.handler = async (event, context) => {
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

  if (event.httpMethod === 'POST') {
    try {
      const { username, answer, sessionId } = JSON.parse(event.body);
      
      if (!username || !answer || !sessionId) {
        return {
          statusCode: 400,
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ success: false, message: 'Missing required fields' })
        };
      }

      // Simple verification - check if answer matches any of our questions
      const isValid = questions.some(q => 
        q.answer.toLowerCase() === answer.toLowerCase().trim()
      );

      if (isValid) {
        sessions.set(sessionId, { username, verified: true, timestamp: Date.now() });
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ success: true, message: 'Verification successful' })
        };
      } else {
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ success: false, message: 'Incorrect answer. Please try again.' })
        };
      }
    } catch (error) {
      return {
        statusCode: 500,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ success: false, message: 'Server error' })
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};
