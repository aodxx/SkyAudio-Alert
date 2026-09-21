// src/config/index.js
// Centralizes environment/config parsing and validation.
// No secrets are hard-coded here — only names of expected env vars.

function required(name) {
  const v = process.env[name];
  if (!v || v.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

function optional(name, fallback) {
  const v = process.env[name];
  return v && v.trim() !== '' ? v : fallback;
}

function buildConfig() {
  const mode = optional('RUN_MODE', 'test').toLowerCase(); // 'test' | 'production'
  const isProd = mode === 'production' || mode === 'prod';
  const dryRun = optional('DRY_RUN', 'false').toLowerCase() === 'true';

  const config = {
    mode: isProd ? 'production' : 'test',
    dryRun,

    location: {
      name: optional('LOCATION_NAME', 'บ้านลำพาย'),
      district: optional('DISTRICT_NAME', 'ต.โคกชะงาย'),
      province: optional('PROVINCE_NAME', 'พัทลุง'),
      lat: parseFloat(optional('WEATHER_LAT', '7.619729')),
      lon: parseFloat(optional('WEATHER_LON', '100.005932')),
      timezone: optional('WEATHER_TIMEZONE', 'Asia/Bangkok'),
    },

    thresholds: {
      hotApparent: parseFloat(optional('THRESH_HOT_APPARENT', '35')),
      coolMorning: parseFloat(optional('THRESH_COOL_MORNING', '23')),
      rainProbNotable: parseFloat(optional('THRESH_RAIN_PROB_NOTABLE', '40')),
      rainProbHigh: parseFloat(optional('THRESH_RAIN_PROB_HIGH', '65')),
      strongWindKmh: parseFloat(optional('THRESH_STRONG_WIND_KMH', '35')),
      heavyRainMm: parseFloat(optional('THRESH_HEAVY_RAIN_MM', '10')),
    },

    line: {
      channelAccessToken: isProd
        ? required('LINE_CHANNEL_ACCESS_TOKEN_PROD')
        : required('LINE_CHANNEL_ACCESS_TOKEN_TEST'),
      groupId: isProd
        ? required('LINE_GROUP_ID_PROD')
        : required('LINE_GROUP_ID_TEST'),
    },

    tts: {
      apiKey: optional('GOOGLE_TTS_API_KEY', ''),
      voiceName: optional('TTS_VOICE_NAME', 'th-TH-Standard-A'),
      languageCode: optional('TTS_LANGUAGE_CODE', 'th-TH'),
      speakingRate: parseFloat(optional('TTS_SPEAKING_RATE', '0.95')),
    },

    storage: {
      // Public repo used as a free asset host via jsDelivr (immutable per-commit URLs).
      repoOwner: optional('GITHUB_REPOSITORY_OWNER', 'aodxx'),
      repoName: optional('GITHUB_REPO_NAME', 'SkyAudio-Alert'),
      audioDir: 'public/audio',
    },

    runId: optional('RUN_ID', `${new Date().toISOString().slice(0, 10)}-lampai-${mode}`),
  };

  if (Number.isNaN(config.location.lat) || Number.isNaN(config.location.lon)) {
    throw new Error('WEATHER_LAT / WEATHER_LON are invalid');
  }

  return config;
}

module.exports = { buildConfig };
