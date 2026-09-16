const Alexa = require('ask-sdk-core');
const { searchSong, getAudioStream } = require('./youtube');

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speakOutput = 'Welcome to YouToob Music. What song or artist would you like to hear?';
    const repromptOutput = 'You can say, play Starboy by The Weeknd, to start listening.';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(repromptOutput)
      .getResponse();
  }
};

const PlaySongIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'PlaySongIntent'
    );
  },
  async handle(handlerInput) {
    const slots = handlerInput.requestEnvelope.request.intent.slots;
    const songQuery = slots && slots.songQuery && slots.songQuery.value;

    if (!songQuery) {
      return handlerInput.responseBuilder
        .speak('Which song would you like to play? For example, you can say, play Believer.')
        .reprompt('Please tell me a song name.')
        .getResponse();
    }

    try {
      const song = await searchSong(songQuery);
      const stream = await getAudioStream(song.videoId);

      const metadata = {
        title: song.title,
        subtitle: song.artist
      };

      if (song.thumbnail) {
        metadata.art = {
          sources: [{ url: song.thumbnail }]
        };
      }

      // AudioPlayer stream requires HTTPS URL with range requests
      return handlerInput.responseBuilder
        .speak(`Playing ${song.title.replace(/&/g, 'and')}`)
        .withShouldEndSession(true)
        .addAudioPlayerPlayDirective(
          'REPLACE_ALL',
          stream.url,
          song.videoId,
          0,
          null,
          metadata
        )
        .getResponse();
    } catch (err) {
      console.error('Playback resolution error:', err);
      return handlerInput.responseBuilder
        .speak(`Sorry, I had trouble finding or playing ${songQuery}. Please try again with another song title.`)
        .getResponse();
    }
  }
};

const PauseIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.PauseIntent' ||
       Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent' ||
       Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent')
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .addAudioPlayerStopDirective()
      .withShouldEndSession(true)
      .getResponse();
  }
};

const ResumeIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.ResumeIntent'
    );
  },
  async handle(handlerInput) {
    const audioPlayer = handlerInput.requestEnvelope.context && handlerInput.requestEnvelope.context.AudioPlayer;
    if (!audioPlayer || !audioPlayer.token) {
      return handlerInput.responseBuilder
        .speak('Nothing was playing. What would you like to listen to?')
        .reprompt('Tell me a song name to play.')
        .getResponse();
    }

    const videoId = audioPlayer.token;
    const offsetInMilliseconds = audioPlayer.offsetInMilliseconds || 0;

    try {
      const stream = await getAudioStream(videoId);
      return handlerInput.responseBuilder
        .addAudioPlayerPlayDirective(
          'REPLACE_ALL',
          stream.url,
          videoId,
          offsetInMilliseconds,
          null
        )
        .withShouldEndSession(true)
        .getResponse();
    } catch (err) {
      console.error('Resume error:', err);
      return handlerInput.responseBuilder
        .speak('Unable to resume playback. Please request the song again.')
        .getResponse();
    }
  }
};

const PlaybackControllerHandler = {
  canHandle(handlerInput) {
    const reqType = Alexa.getRequestType(handlerInput.requestEnvelope);
    return reqType.startsWith('PlaybackController.');
  },
  async handle(handlerInput) {
    const reqType = Alexa.getRequestType(handlerInput.requestEnvelope);
    if (reqType === 'PlaybackController.PauseCommandIssued') {
      return handlerInput.responseBuilder
        .addAudioPlayerStopDirective()
        .getResponse();
    }
    if (reqType === 'PlaybackController.PlayCommandIssued') {
      const audioPlayer = handlerInput.requestEnvelope.context && handlerInput.requestEnvelope.context.AudioPlayer;
      if (audioPlayer && audioPlayer.token) {
        try {
          const stream = await getAudioStream(audioPlayer.token);
          return handlerInput.responseBuilder
            .addAudioPlayerPlayDirective(
              'REPLACE_ALL',
              stream.url,
              audioPlayer.token,
              audioPlayer.offsetInMilliseconds || 0,
              null
            )
            .getResponse();
        } catch (e) {}
      }
    }
    return handlerInput.responseBuilder.getResponse();
  }
};

const AudioPlayerEventHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope).startsWith('AudioPlayer.');
  },
  handle(handlerInput) {
    console.log(`[AudioPlayer] Event: ${Alexa.getRequestType(handlerInput.requestEnvelope)}`);
    return handlerInput.responseBuilder.getResponse();
  }
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent'
    );
  },
  handle(handlerInput) {
    const speakOutput = 'You can ask me to play any track from YouToob. For example: ask YouToob Music to play Starboy, or ask to pause or resume.';
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  }
};

const FallbackIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent'
    );
  },
  handle(handlerInput) {
    const speakOutput = 'Sorry, I did not catch that. You can say: play followed by the song or artist name.';
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  }
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`[SessionEnded] Reason: ${handlerInput.requestEnvelope.request.reason}`);
    return handlerInput.responseBuilder.getResponse();
  }
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error('[ErrorHandled]', error);
    const speakOutput = 'Sorry, an error occurred while processing your music request. Please try again.';
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  }
};

module.exports = {
  LaunchRequestHandler,
  PlaySongIntentHandler,
  PauseIntentHandler,
  ResumeIntentHandler,
  PlaybackControllerHandler,
  AudioPlayerEventHandler,
  HelpIntentHandler,
  FallbackIntentHandler,
  SessionEndedRequestHandler,
  ErrorHandler
};
