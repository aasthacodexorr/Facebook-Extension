chrome.runtime.onInstalled.addListener(async () => {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SAVE_CONFIG") {
      saveConfig(message.payload)
        .then((result) => {
          sendResponse(result);
        })
        .catch((error) => {
          sendResponse({
            success: false,
            message: error.message || "Something went wrong",
          });
        });

      return true;
    }
  });

  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));
});

async function saveConfig({ client_id, token }) {
  const formData = new FormData();
  formData.append("token", token);

  const response = await fetch(
    `https://${client_id}.zopsoftware.com/api/website/robot/feed/fbmp`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: formData,
    },
  );

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      message: data.errors || "Invalid Client ID or Token",
    };
  }

  await chrome.storage.local.set({
    client_id,
    token,
  });

  return {
    success: true,
    message: "Configuration saved successfully",
  };
}
