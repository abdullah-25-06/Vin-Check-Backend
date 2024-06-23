const getVinToken = async () => {
  try {
    const response = await fetch("https://api.vindata.com/v1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        secret_key: process.env.VIN_SECRET_KEY,
        username: process.env.USERNAME,
        password: process.env.PASSWORD,
      }),
    });

    const data = await response.json();

    return {
      token: data.token,
      expiresAt: Date.now() + 1 * 60 * 1000,
    };
  } catch (err) {
    return null;
  }
};
const getVinData = async (token, vin) => {
  try {
    const response = await fetch(
      `https://api.vindata.com/v1/products/vhr/reports/${vin}?force=false`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 200) {
      const data = await response.json();
      return data;
    }
    if (response.status === 401) {
      return { status: 401 };
    }
    return null;
  } catch (err) {
    return null;
  }
};
module.exports = { getVinToken, getVinData };
