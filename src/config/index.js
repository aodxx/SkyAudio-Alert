// src/config/index.js
// Centralizes environment/config parsing and validation.

function required(name) {
  const v = process.env[name];
  if (!v || v.trim() === '') throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

function optional(name, fallback) {
  const v = process.env[name];
  return v && v.trim() !== '' ? v : fallback;
}

function bangkokDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function buildConfig() {
  const mode = optional('RUN_MODE', 'test').toLowerCase();
  const isProd = mode === 'production' || mode === 'prod';
  const dryRun = optional('DRY_RUN', 'false').toLowerCase() === 'true';

  const lineTokenName = isProd ? 'LINE_CHANNEL_ACCESS_TOKEN_PROD' : 'LINE_CHANNEL_ACCESS_TOKEN_TEST';
  const lineGroupName = isProd ? 'LINE_GROUP_ID_PROD' : 'LINE_GROUP_ID_TEST';

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
      channelAccessToken: dryRun ? optional(lineTokenName, '') : required(lineTokenName),
      groupId: dryRun ? optional(lineGroupName, '') : required(lineGroupName),
    },
    tts: {
      provider: optional('TTS_PROVIDER', 'edge').toLowerCase(),
      apiKey: optional('GOOGLE_TTS_API_KEY', ''),
      voiceName: optional('TTS_VOICE_NAME', 'th-TH-PremwadeeNeural'),
      languageCode: optional('TTS_LANGUAGE_CODE', 'th-TH'),
      speakingRate: parseFloat(optional('TTS_SPEAKING_RATE', '0.95')),
    },
    storage: {
      repoOwner: optional('GITHUB_REPOSITORY_OWNER', 'aodxx'),
      repoName: optional('GITHUB_REPO_NAME', 'SkyAudio-Alert'),
      audioDir: 'public/audio',
    },
    runId: optional('RUN_ID', `${bangkokDate()}-lampai-${mode}`),
  };

  if (Number.isNaN(config.location.lat) || Number.isNaN(config.location.lon)) throw new Error('WEATHER_LAT / WEATHER_LON are invalid');
  if (!Number.isFinite(config.tts.speakingRate) || config.tts.speakingRate <= 0) throw new Error('TTS_SPEAKING_RATE must be positive');
  if (!['edge', 'google'].includes(config.tts.provider)) throw new Error('TTS_PROVIDER must be edge or google');
  return config;
}

module.exports = { buildConfig };