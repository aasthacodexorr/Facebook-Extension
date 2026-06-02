export const fetchInventories = (client_id, token, options = {}) => {
  const formData = new FormData();
  formData.append("token", token);

  for (const [key, value] of Object.entries(options)) {
    formData.append(key, value);
  }

  return fetch(
    `https://${client_id}.zopsoftware.com/api/website/robot/feed/fbmp`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: formData,
    },
  );
};


export const updateLog = (client_id, token, options = {}) => {
  const formData = new FormData();
  formData.append("token", token);

  for (const [key, value] of Object.entries(options)) {
    formData.append(key, value);
  }

  return fetch(
    `https://${client_id}.zopsoftware.com/api/website/robot/feed/fbmp/update`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: formData,
    },
  );
};
