const Alexa = require('ask-sdk-core');
const handlers = require('./lib/handlers');

const skill = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    handlers.LaunchRequestHandler,
    handlers.PlaySongIntentHandler,
    handlers.PauseIntentHandler,
    handlers.ResumeIntentHandler,
    handlers.PlaybackControllerHandler,
    handlers.AudioPlayerEventHandler,
    handlers.HelpIntentHandler,
    handlers.FallbackIntentHandler,
    handlers.SessionEndedRequestHandler
  )
  .addErrorHandlers(handlers.ErrorHandler)
  .withCustomUserAgent('alexa-youtube-music-skill/2.0.0')
  .create();

/**
 * Standard AWS Lambda entrypoint (if hosted on AWS Lambda or Alexa-Hosted Skills)
 */
exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    handlers.LaunchRequestHandler,
    handlers.PlaySongIntentHandler,
    handlers.PauseIntentHandler,
    handlers.ResumeIntentHandler,
    handlers.PlaybackControllerHandler,
    handlers.AudioPlayerEventHandler,
    handlers.HelpIntentHandler,
    handlers.FallbackIntentHandler,
    handlers.SessionEndedRequestHandler
  )
  .addErrorHandlers(handlers.ErrorHandler)
  .withCustomUserAgent('alexa-youtube-music-skill/2.0.0')
  .lambda();

exports.skill = skill;
