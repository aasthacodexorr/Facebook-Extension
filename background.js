import { fetchInventories } from "./js/zopsoftware.js";

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

  const response = await fetchInventories(client_id, token);
  const data = await response.json();

  if (!response.ok) {
    await chrome.storage.local.set({
      token: "",
      show_setup: true,
    });

    return {
      success: false,
      message: data.errors || "Invalid Client ID or Token",
    };
  }

  await chrome.storage.local.set({
    client_id,
    token,
    show_setup: false,
  });

  return {
    success: true,
    message: "Configuration saved successfully",
  };
}
