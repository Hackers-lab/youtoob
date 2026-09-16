const { skill } = require('../index');

module.exports = async (req, res) => {
  // Allow health check / status check via GET
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'online',
      message: 'Alexa YouTube Music Skill Endpoint is Active and Ready.',
      endpoint: '/api/alexa'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const requestEnvelope = req.body;
    if (!requestEnvelope || !requestEnvelope.request) {
      return res.status(400).json({ error: 'Invalid Alexa Request Envelope' });
    }

    const response = await skill.invoke(requestEnvelope);
    return res.status(200).json(response);
  } catch (err) {
    console.error('Error handling Alexa request on Vercel:', err);
    return res.status(500).json({
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'SSML',
          ssml: '<speak>Sorry, an unexpected internal error occurred. Please try again later.</speak>'
        },
        shouldEndSession: true
      }
    });
  }
};
