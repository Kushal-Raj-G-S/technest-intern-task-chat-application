// Simple report storage (in production, use a database)
const reports = [];

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
      const { reportedUser, reason, description, reporterSession } = JSON.parse(event.body);
      
      if (!reportedUser || !reason || !reporterSession) {
        return {
          statusCode: 400,
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ success: false, message: 'Missing required fields' })
        };
      }

      // Store the report
      const report = {
        id: Date.now(),
        reportedUser,
        reason,
        description: description || '',
        reporterSession,
        timestamp: new Date().toISOString()
      };

      reports.push(report);

      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ success: true, message: 'Report submitted successfully' })
      };
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
