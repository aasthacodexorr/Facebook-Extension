import { fetchInventories } from "./zopsoftware.js";

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
      let { post_id } = vehicle;
      await checkIfInvalidOrSold(post_id);
    }
  } catch (error) {
    cb({ success: false, error: "There were some errors" });
  }
};

async function checkIfInvalidOrSold(post_id) {
  console.log(post_id);
  if (post_id) {
    if (post_id.trim() !== "") {
      const tab = await chrome.tabs.create({
        url: `https://www.facebook.com/marketplace/item/${post_id}`,
        active: true,
      });

      await waitForTabToLoad(tab.id);
      await sleep(5000);

      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: getInventoryStatusFromSoldInventoryFromPublishedPage,
      });

      console.log(result.result);
    }
  }
}

function getInventoryStatusFromSoldInventoryFromPublishedPage() {
  let posted_status = "";

  function findSpansContainingText(text) {
  return [...document.querySelectorAll("span")].filter((span) => {
    return span.textContent.trim().includes(text);
  });
}

function findSpansWithExactText(text) {
  return [...document.querySelectorAll("span")].filter((span) => {
    return span.textContent.trim().toLowerCase() === text.toLowerCase();
  });
}

  const soldButtonDoms = findSpansContainingText("Mark as Sold");

  console.log(soldButtonDoms);

  if (soldButtonDoms.length !== 0) {
    const lastSoldButton = soldButtonDoms[soldButtonDoms.length - 1];
    clickElement(lastSoldButton);
    return "SOLD";
  }

  const invalidTextExists = document.body.innerText.includes(
    "It may have been sold or expired.",
  );

  if (invalidTextExists) {
    return "SOLD";
  }

  const alreadySoldTextIndicator = findSpansWithExactText("Sold");

  if (alreadySoldTextIndicator.length !== 0) {
    return "SOLD";
  }

  const inventoryUnavailableTextIndicator =
    findSpansWithExactText("Unavailable");

  if (inventoryUnavailableTextIndicator.length !== 0) {
    return "SOLD";
  }

  return "";
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
