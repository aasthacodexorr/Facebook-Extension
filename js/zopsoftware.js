export const fetchInventories = (client_id, token, options = {}) => {

  const formData = new FormData();
  formData.append("token", token);

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
