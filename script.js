const LOCATIONS = {
  tokyo: { name: '東京', latitude: 35.6762, longitude: 139.6503, timezone: 'Asia/Tokyo' },
  osaka: { name: '大阪', latitude: 34.6937, longitude: 135.5023, timezone: 'Asia/Tokyo' },
  sapporo: { name: '札幌', latitude: 43.0618, longitude: 141.3545, timezone: 'Asia/Tokyo' },
  fukuoka: { name: '福岡', latitude: 33.5902, longitude: 130.4017, timezone: 'Asia/Tokyo' },
  naha: { name: '那覇', latitude: 26.2124, longitude: 127.6792, timezone: 'Asia/Tokyo' }
};

const WEATHER_CODES = {
  0: ['快晴', '☀️'],
  1: ['晴れ', '🌤️'],
  2: ['一部くもり', '⛅'],
  3: ['くもり', '☁️'],
  45: ['霧', '🌫️'],
  48: ['霧氷を伴う霧', '🌫️'],
  51: ['弱い霧雨', '🌦️'],
  53: ['霧雨', '🌦️'],
  55: ['強い霧雨', '🌧️'],
  61: ['弱い雨', '🌧️'],
  63: ['雨', '🌧️'],
  65: ['強い雨', '☔'],
  71: ['弱い雪', '🌨️'],
  73: ['雪', '🌨️'],
  75: ['強い雪', '❄️'],
  80: ['弱いにわか雨', '🌦️'],
  81: ['にわか雨', '🌧️'],
  82: ['強いにわか雨', '☔'],
  95: ['雷雨', '⛈️'],
  96: ['ひょうを伴う雷雨', '⛈️'],
  99: ['強いひょうを伴う雷雨', '⛈️']
};

const PRESSURE_CHANGE_ALERT_HPA = 8;
const HIGH_RAIN_PROBABILITY = 50;
const HIGH_HUMIDITY_PERCENT = 80;

const elements = {
  locationSelect: document.getElementById('location-select'),
  refreshButton: document.getElementById('refresh-button'),
  statusMessage: document.getElementById('status-message'),
  updatedAt: document.getElementById('updated-at'),
  forecastDate: document.getElementById('forecast-date'),
  cityName: document.getElementById('city-name'),
  weatherIcon: document.getElementById('weather-icon'),
  weatherDescription: document.getElementById('weather-description'),
  maxTemp: document.getElementById('max-temp'),
  minTemp: document.getElementById('min-temp'),
  rainProbability: document.getElementById('rain-probability'),
  umbrellaTip: document.getElementById('umbrella-tip'),
  humidity: document.getElementById('humidity'),
  pressure: document.getElementById('pressure'),
  pressureChange: document.getElementById('pressure-change'),
  clothingAdvice: document.getElementById('clothing-advice'),
  headacheLevel: document.getElementById('headache-level'),
  headacheMeter: document.getElementById('headache-meter'),
  headacheProbability: document.getElementById('headache-probability'),
  headacheReason: document.getElementById('headache-reason'),
  headacheCaution: document.getElementById('headache-caution')
};

function formatNumber(value, unit = '') {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return `--${unit}`;
  }

  return `${Math.round(value)}${unit}`;
}

function getWeatherInfo(code) {
  return WEATHER_CODES[code] ?? ['天気情報あり', '🌈'];
}

function getClothingAdvice(maxTemp, minTemp) {
  const averageTemp = (maxTemp + minTemp) / 2;

  if (maxTemp >= 30) {
    return 'かなり暑くなりそうです。半袖や通気性のよい服、帽子、こまめな水分補給を意識しましょう。';
  }

  if (averageTemp >= 24) {
    return '日中は軽めの服装で快適に過ごせそうです。半袖や薄手のシャツがおすすめです。';
  }

  if (averageTemp >= 18) {
    return '過ごしやすい気温です。長袖シャツや薄手の羽織りものがあると朝晩も安心です。';
  }

  if (averageTemp >= 12) {
    return '少し肌寒く感じるかもしれません。ジャケットやカーディガンなど重ね着しやすい服装がおすすめです。';
  }

  if (averageTemp >= 6) {
    return '冷え込みやすい一日です。コートや厚手のニット、首元を温める小物を用意しましょう。';
  }

  return '厳しい寒さが予想されます。厚手のコート、手袋、マフラーなどでしっかり防寒しましょう。';
}

function getUmbrellaTip(probability) {
  if (probability >= 70) {
    return '雨の可能性が高いです。大きめの傘を持って出かけると安心です。';
  }

  if (probability >= HIGH_RAIN_PROBABILITY) {
    return 'にわか雨に備えて、折りたたみ傘を持つのがおすすめです。';
  }

  if (probability >= 30) {
    return '雨の可能性はややあります。長時間外にいる場合は折りたたみ傘を検討しましょう。';
  }

  return '降水確率は低めです。傘なしでも過ごしやすそうです。';
}

function calculatePressureChange(hourlyTimes, hourlyPressures, targetDate) {
  const pressuresForDay = hourlyTimes
    .map((time, index) => ({ time, pressure: hourlyPressures[index] }))
    .filter(({ time, pressure }) => time.startsWith(targetDate) && pressure !== null && pressure !== undefined)
    .map(({ pressure }) => pressure);

  if (pressuresForDay.length < 2) {
    return null;
  }

  return Math.max(...pressuresForDay) - Math.min(...pressuresForDay);
}

function calculateHeadacheRisk(pressureChange, humidity, rainProbability) {
  const safeHumidity = Number.isFinite(humidity) ? humidity : 60;
  const safeRainProbability = Number.isFinite(rainProbability) ? rainProbability : 0;
  const pressureScore = pressureChange === null ? 20 : Math.min(pressureChange * 7, 70);
  const humidityScore = safeHumidity >= HIGH_HUMIDITY_PERCENT ? 12 : Math.max((safeHumidity - 60) * 0.4, 0);
  const rainScore = safeRainProbability >= HIGH_RAIN_PROBABILITY ? 14 : Math.max(safeRainProbability * 0.18, 0);
  const probability = Math.min(Math.round(pressureScore + humidityScore + rainScore), 95);

  if (pressureChange === null) {
    return {
      probability,
      level: 'データ不足',
      reason: '気圧変化データが不足しているため、湿度・降水確率を中心に参考値を表示しています。',
      showCaution: false
    };
  }

  if (probability >= 70 || pressureChange >= PRESSURE_CHANGE_ALERT_HPA) {
    return {
      probability,
      level: '高め',
      reason: `気圧差が約${pressureChange.toFixed(1)} hPaあり、湿度・降水確率も含めて注意度が高めです。`,
      showCaution: true
    };
  }

  if (probability >= 45) {
    return {
      probability,
      level: 'やや高め',
      reason: `気圧差は約${pressureChange.toFixed(1)} hPaです。体調の変化に気づけるよう、休憩の余裕を持つと安心です。`,
      showCaution: false
    };
  }

  return {
    probability,
    level: '低め',
    reason: `気圧差は約${pressureChange.toFixed(1)} hPaで、頭痛リスクは低めの参考値です。`,
    showCaution: false
  };
}

function buildForecastUrl(location) {
  const params = new URLSearchParams({
    latitude: location.latitude,
    longitude: location.longitude,
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,relative_humidity_2m_mean,pressure_msl_mean',
    hourly: 'pressure_msl',
    timezone: location.timezone,
    forecast_days: '3'
  });

  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

function setLoadingState(location) {
  elements.statusMessage.classList.remove('is-error');
  elements.statusMessage.textContent = `${location.name}の天気を取得しています。`;
  elements.refreshButton.disabled = true;
  elements.refreshButton.textContent = '取得中';
}

function clearLoadingState() {
  elements.refreshButton.disabled = false;
  elements.refreshButton.textContent = '更新';
}

function showError(message) {
  elements.statusMessage.classList.add('is-error');
  elements.statusMessage.textContent = message;
}

function updateWeather(data, location) {
  const daily = data.daily;
  const todayIndex = 0;
  const targetDate = daily.time[todayIndex];
  const maxTemp = daily.temperature_2m_max[todayIndex];
  const minTemp = daily.temperature_2m_min[todayIndex];
  const rainProbability = daily.precipitation_probability_max[todayIndex];
  const humidity = daily.relative_humidity_2m_mean[todayIndex];
  const pressure = daily.pressure_msl_mean[todayIndex];
  const pressureChange = calculatePressureChange(data.hourly.time, data.hourly.pressure_msl, targetDate);
  const [description, icon] = getWeatherInfo(daily.weather_code[todayIndex]);
  const formattedDate = new Intl.DateTimeFormat('ja-JP', { dateStyle: 'full' }).format(new Date(targetDate));
  const updatedAt = new Intl.DateTimeFormat('ja-JP', { dateStyle: 'short', timeStyle: 'short' }).format(new Date());

  elements.forecastDate.textContent = formattedDate;
  elements.cityName.textContent = location.name;
  elements.weatherIcon.textContent = icon;
  elements.weatherDescription.textContent = description;
  elements.maxTemp.textContent = formatNumber(maxTemp, '℃');
  elements.minTemp.textContent = formatNumber(minTemp, '℃');
  elements.rainProbability.textContent = formatNumber(rainProbability, '%');
  elements.umbrellaTip.textContent = getUmbrellaTip(rainProbability);
  elements.humidity.textContent = formatNumber(humidity, '%');
  elements.pressure.textContent = formatNumber(pressure, ' hPa');
  elements.clothingAdvice.textContent = getClothingAdvice(maxTemp, minTemp);
  elements.updatedAt.textContent = `最終更新: ${updatedAt}`;

  const headacheRisk = calculateHeadacheRisk(pressureChange, humidity, rainProbability);

  if (pressureChange === null) {
    elements.pressureChange.textContent = '気圧変化データが不足しています。';
  elements.headacheLevel.textContent = headacheRisk.level;
  elements.headacheMeter.style.width = `${headacheRisk.probability}%`;
  elements.headacheProbability.textContent = `${headacheRisk.probability}%`;
  elements.headacheReason.textContent = headacheRisk.reason;
  elements.headacheCaution.hidden = !headacheRisk.showCaution;

      elements.headacheAlert.hidden = true;
    }
  } else {
    elements.pressureChange.textContent = `今日の気圧差: 約${pressureChange.toFixed(1)} hPa`;

    if (elements.headacheAlert) {
      elements.headacheAlert.hidden = pressureChange < PRESSURE_CHANGE_ALERT_HPA;
    }
  }

  elements.statusMessage.classList.remove('is-error');
  elements.statusMessage.textContent = `${location.name}の最新予報を表示しています。`;
}

async function fetchWeather() {
  const location = LOCATIONS[elements.locationSelect.value] ?? LOCATIONS.tokyo;
  setLoadingState(location);

  try {
    const response = await fetch(buildForecastUrl(location));

    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status}`);
    }

    const data = await response.json();

    try {
      updateWeather(data, location);
    } catch (error) {
      console.error('Weather data rendering failed:', error);
      showError('天気データの表示更新に失敗しました。ページを再読み込みして、もう一度お試しください。');
    }
  } catch (error) {
    console.error('Weather data fetch failed:', error);
    showError('天気データを取得できませんでした。通信環境を確認して、もう一度お試しください。');
  } finally {
    clearLoadingState();
  }
}

elements.locationSelect.addEventListener('change', fetchWeather);
elements.refreshButton.addEventListener('click', fetchWeather);

document.addEventListener('DOMContentLoaded', fetchWeather);
