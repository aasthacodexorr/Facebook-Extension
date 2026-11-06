(() => {
  const { findSpansContainingText, findSpansWithExactText, clickElement } =
    window.domHelpers;

  function isInvalidOrSold() {
    try {
      const invalidTextExists = document.body.innerText.includes(
        "It may have been sold or expired.",
      );

      if (invalidTextExists) {
        return "TO BE DELETED";
      }

      const alreadySoldTextIndicator = findSpansWithExactText("Sold");

      if (alreadySoldTextIndicator.length !== 0) {
        return "TO BE DELETED";
      }

      const inventoryUnavailableTextIndicator =
        findSpansWithExactText("Unavailable");

      if (inventoryUnavailableTextIndicator.length !== 0) {
        return "TO BE DELETED";
      }

      return "";
    } catch (error) {
      return "";
    }
  }

  return isInvalidOrSold();
})();
