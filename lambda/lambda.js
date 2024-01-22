/**
 * This is the main entry point for the Lambda function.
 * @param {Lambda Event} event
 * @param {Lambda context} context
 * @returns
 */
exports.handler = async (event, context) => {
  try {
    console.log(event);
    let response;
    const parameters = extractParameters(event);
    console.log(parameters);

    if (event.apiPath === "/weather/{latitude}/{longitude}") {
      const latitude = parameters["latitude"];
      const longitude = parameters["longitude"];
      response = await getWeather(latitude, longitude);
    } else if (event.apiPath === "/latlng/{place}") {
      const place = parameters["place"];
      response = await getLatLong(place);
    } else {
      throw new Error("Invalid API path");
    }

    return createResponse(event, response);
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify(createResponse(event, { message: error })),
    };
  }
};

/**
 *
 * @param {Lamba Event} event
 * @returns
 */
function extractParameters(event) {
  const parameters = {};
  for (const parameter of event["parameters"]) {
    parameters[parameter["name"]] = parameter["value"];
  }
  return parameters;
}

/**
 *
 * @param {Lamba Event} event
 * @param {API response} response
 * @returns
 */
function createResponse(event, response) {
  const response_body = {
    "application/json": {
      body: response,
    },
  };

  const action_response = {
    actionGroup: event["actionGroup"],
    apiPath: event["apiPath"],
    httpMethod: event["httpMethod"],
    httpStatusCode: 200,
    responseBody: response_body,
  };

  const session_attributes = event["sessionAttributes"];
  const prompt_session_attributes = event["promptSessionAttributes"];

  return {
    messageVersion: "1.0",
    response: action_response,
    sessionAttributes: session_attributes,
    promptSessionAttributes: prompt_session_attributes,
  };
}

/**
 * Get weather for a given latitude and longitude
 * @param {Number} latitude
 * @param {Number} longitude
 * @returns
 */
async function getWeather(latitude, longitude) {
  const url =
    "https://api.open-meteo.com/v1/forecast?latitude=" +
    latitude +
    "&longitude=" +
    longitude +
    "&current_weather=true&temperature_unit=fahrenheit";
  console.log(url);
  const response = await fetch(url);
  const weather = await response.json();
  console.log(weather);
  if (weather.current_weather == null) {
    return { temperature: null };
  } else {
    return { temperature: weather.current_weather.temperature };
  }
}

/**
 * Get latitude and longitude for a given city
 * @param {city} city
 * @returns
 */
async function getLatLong(city) {
  const url =
    "https://nominatim.openstreetmap.org/search?q=" +
    city +
    "&format=json&limit=1";
  console.log(url);
  const response = await fetch(url);
  const latlong = await response.json();
  console.log(latlong);
  if (latlong.length == 0) {
    return { latitude: null, longitude: null };
  } else {
    return { latitude: latlong[0].lat, longitude: latlong[0].lon };
  }
}
