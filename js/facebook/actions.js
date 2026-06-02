import { fetchInventories, updateLog } from "../zopsoftware.js";

export const markInventoriesAsSold = async (client_id, token, cb) => {
  const formData = new FormData();
  formData.append("token", token);

  try {
    cb({
      success: true,
      message: `We are marking the inventories as SOLD ...`,
    });

    const response = await fetchInventories(client_id, token, {
      onlySold: true,
    });

    if (!response.ok) throw new Error("Network error occurred");
    const { inventory } = await response.json();

    for (const vehicle of inventory) {
      let { post_id, stock_no, modification_hash } = vehicle;
      let result = await checkIfInvalidOrSold(post_id);

      if (result === "SOLD" && post_id.trim() !== "") {
        await updateLog(client_id, token, {
          stock_no,
          post_id,
          current_modification_hash: modification_hash,
          status: "SOLD",
        });
      }
    }
  } catch (error) {
    cb({ success: false, error: "There were some errors" });
  }
};

async function checkIfInvalidOrSold(post_id) {
  try {
    if (post_id) {
      if (post_id.trim() !== "") {
        const tab = await chrome.tabs.create({
          url: `https://www.facebook.com/marketplace/item/${post_id}`,
          active: false,
        });

        await waitForTabToLoad(tab.id);
        await sleep(5000);

        const [result] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: [
            "js/facebook/injection/helpers.js",
            "js/facebook/injection/markAsSold.js",
          ],
        });

        await chrome.tabs.remove(tab.id);

        return result.result;
      }
    }
  } catch (error) {
    return "";
  }
}

function waitForTabToLoad(tabId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error("Tab load timeout"));
    }, 30000);

    function listener(updatedTabId, changeInfo) {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }

    chrome.tabs.onUpdated.addListener(listener);
  });
}

function clickElement(element) {
  element.scrollIntoView({
    behavior: "instant",
    block: "center",
    inline: "center",
  });

  element.click();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
