import { fetchInventories } from "./js/zopsoftware.js";
import {
  markInventoriesAsSold,
  publishAndUpdate,
} from "./js/facebook/actions.js";

chrome.runtime.onInstalled.addListener(async () => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));
});

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
  }

  if (message.type === "MARK_ONLY_SOLD") {
    console.log(`MARKING SOLD`);
    let { client_id, token } = message.payload;
    markInventoriesAsSold(client_id, token, sendResponse);
  }

  if (message.type === "PUBLISH_AND_UPDATE") {
    console.log(`PUBLISH AND UPDATE`);
    let { client_id, token } = message.payload;
    publishAndUpdate(client_id, token, sendResponse);
  }

  return true;
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
