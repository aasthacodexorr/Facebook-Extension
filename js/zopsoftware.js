export const fetchInventories = async (client_id, token, options = {}) => {
  const formData = new FormData();
  formData.append("token", token);

  for (const [key, value] of Object.entries(options)) {
    formData.append(key, value);
  }

  return fetch(
    `https://${client_id}.${await getDomain()}/api/website/robot/feed/fbmp`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: formData,
    },
  );
};

export const updateLog = async (client_id, token, options = {}) => {
  const formData = new FormData();
  formData.append("token", token);

  for (const [key, value] of Object.entries(options)) {
    formData.append(key, value);
  }

  return fetch(
    `https://${client_id}.${await getDomain()}/api/website/robot/feed/fbmp/update`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: formData,
    },
  );
};

export const deleteOneLog = async (client_id, token, post_id) => {
  const formData = new FormData();
  formData.append("token", token);

  return fetch(
    `https://${client_id}.${await getDomain()}/api/website/robot/feed/fbmp/delete/${post_id}`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: formData,
    },
  );
};

async function getDomain() {
  const data = await chrome.storage.local.get(["country"]);
  if (data.country) {
    return data.country.toLowerCase() === "US".toLowerCase()
      ? "zopsoftwareus.com"
      : "zopsoftware.com";
  }

  return "zopsoftware.com";
}
