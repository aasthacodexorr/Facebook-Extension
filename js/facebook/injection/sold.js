(() => {
  const { findSpansContainingText, findSpansWithExactText, clickElement } =
    window.domHelpers;

  function getInventoryStatusFromSoldInventoryFromPublishedPage() {
    try {
      const soldButtonDoms = findSpansContainingText("Mark as Sold");

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
    } catch (error) {
      return "";
    }
  }

  return getInventoryStatusFromSoldInventoryFromPublishedPage();
})();
