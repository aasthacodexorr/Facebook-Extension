window.domHelpers = {
  findSpansContainingText(text) {
    return [...document.querySelectorAll("span")].filter((span) => {
      return span.textContent.trim().toLowerCase().includes(text.toLowerCase());
    });
  },

  findSpansWithExactText(text) {
    return [...document.querySelectorAll("span")].filter((span) => {
      return span.textContent.trim().toLowerCase() === text.toLowerCase();
    });
  },

  clickElement(element) {
    element.scrollIntoView({
      behavior: "instant",
      block: "center",
      inline: "center",
    });

    element.click();
  },
};
