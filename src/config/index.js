// src/config/index.js
// Centralizes environment/config parsing and validation.
function required(name) {
  const v = process.env[name];
  if (!v || v.trim() === '') throw new Error('Missing required environment variable: ' + name);
  return v;
}
function optional(name, fallback) {
  const v = process.env[name];
  return v && v.trim() !== '' ? v : fallback;
}
function bangkokDate() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
function buildConfig() {
  const mode = optional('RUN_MODE', 'test').toLowerCase();
  const isProd = mode === 'production' || mode === 'prod';
  const dryRun = optional('DRY_RUN', 'false').toLowerCase() === 'true';
  const lineTokenName = isProd ? 'LINE_CHANNEL_ACCESS_TOKEN_PROD' : 'LINE_CHANNEL_ACCESS_TOKEN_TEST';
  const lineGroupName = isProd ? 'LINE_GROUP_ID_PROD' : 'LINE_GROUP_ID_TEST';
  const ttsProfile = optional('TTS_PROFILE', 'male-friendly').toLowerCase();
  const config = {
    mode: isProd ? 'production' : 'test', dryRun,
    location: { name: optional('LOCATION_NAME', 'บ้านลำพาย'), district: optional('DISTRICT_NAME', 'ต.โคกชะงาย'), province: optional('PROVINCE_NAME', 'พัทลุง'), lat: parseFloat(optional('WEATHER_LAT', '7.619729')), lon: parseFloat(optional('WEATHER_LON', '100.005932')), timezone: optional('WEATHER_TIMEZONE', 'Asia/Bangkok') },
    thresholds: { hotApparent: parseFloat(optional('THRESH_HOT_APPARENT', '35')), coolMorning: parseFloat(optional('THRESH_COOL_MORNING', '23')), rainProbNotable: parseFloat(optional('THRESH_RAIN_PROB_NOTABLE', '40')), rainProbHigh: parseFloat(optional('THRESH_RAIN_PROB_HIGH', '65')), strongWindKmh: parseFloat(optional('THRESH_STRONG_WIND_KMH', '35')), heavyRainMm: parseFloat(optional('THRESH_HEAVY_RAIN_MM', '10')) },
    flood: {
      sourceUrl: optional('FLOOD_SOURCE_URL', ''),
      freshnessLimitMinutes: parseFloat(optional('FLOOD_FRESHNESS_LIMIT_MINUTES', '180')),
      degradedMode: optional('FLOOD_DEGRADED_MODE', 'unknown-weather'),
    },
    weatherSources: {
      pageUrl: optional('WEATHER_PAGE_SOURCE_URL', 'https://chachoengsao-flood.vercel.app/phatthalung/weather'),
    },
    content: {
      provider: optional('CONTENT_PROVIDER', 'deterministic').toLowerCase(),
      apiKey: optional('GEMINI_API_KEY', ''),
      model: optional('GEMINI_CONTENT_MODEL', 'gemini-3.8-flash'),
      fallbackModel: optional('GEMINI_CONTENT_FALLBACK_MODEL', ''),
      thinkingLevel: optional('GEMINI_THINKING_LEVEL', 'low').toLowerCase(),
    },
    line: { channelAccessToken: dryRun ? optional(lineTokenName, '') : required(lineTokenName), groupId: dryRun ? optional(lineGroupName, '') : required(lineGroupName) },
    tts: {
      provider: optional('TTS_PROVIDER', 'gemini').toLowerCase(),
      mockFile: optional('TTS_MOCK_FILE', 'public/audio/mock-longform-section.mp3'),
      apiKey: optional('GEMINI_API_KEY', ''),
      profile: ttsProfile,
      voiceName: optional('TTS_VOICE_NAME', ttsProfile === 'female-friendly' ? 'Sulafat' : 'Achird'),
      voiceNameMale: optional('TTS_VOICE_NAME_MALE', 'Achird'),
      voiceNameFemale: optional('TTS_VOICE_NAME_FEMALE', 'Sulafat'),
      model: optional('GEMINI_TTS_MODEL', 'gemini-3.8-flash-tts'),
      style: optional('TTS_STYLE', ''),
      languageCode: optional('TTS_LANGUAGE_CODE', 'th-TH'),
      speakingRate: parseFloat(optional('TTS_SPEAKING_RATE', '0.92')),
    },
    storage: { repoOwner: optional('GITHUB_REPOSITORY_OWNER', 'aodxx'), repoName: optional('GITHUB_REPO_NAME', 'SkyAudio-Alert'), audioDir: 'public/audio' },
    runId: optional('RUN_ID', bangkokDate() + '-lampai-' + mode),
  };
  if (Number.isNaN(config.location.lat) || Number.isNaN(config.location.lon)) throw new Error('WEATHER_LAT / WEATHER_LON are invalid');
  if (!Number.isFinite(config.flood.freshnessLimitMinutes) || config.flood.freshnessLimitMinutes <= 0) throw new Error('FLOOD_FRESHNESS_LIMIT_MINUTES must be positive');
  if (!['unknown-weather', 'no-send'].includes(config.flood.degradedMode)) throw new Error('FLOOD_DEGRADED_MODE must be unknown-weather or no-send');
  if (!['gemini', 'deterministic'].includes(config.content.provider)) throw new Error('CONTENT_PROVIDER must be gemini or deterministic');
  if (!['low', 'medium', 'high'].includes(config.content.thinkingLevel)) throw new Error('GEMINI_THINKING_LEVEL must be low, medium or high');
  if (!Number.isFinite(config.tts.speakingRate) || config.tts.speakingRate <= 0) throw new Error('TTS_SPEAKING_RATE must be positive');
  if (!['edge', 'google', 'gemini', 'mock'].includes(config.tts.provider)) throw new Error('TTS_PROVIDER must be edge, google, gemini or mock');
  if (!['male-friendly', 'female-friendly'].includes(config.tts.profile)) throw new Error('TTS_PROFILE must be male-friendly or female-friendly');
  return config;
}
module.exports = { buildConfig };
