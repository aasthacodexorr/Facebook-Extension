const domHelpers = {
  sleep(ms) {
    let random_ms = domHelpers.getRandomIntInclusive(ms, ms * 2);
    return new Promise((resolve) => setTimeout(resolve, ms));
  },
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
  findDomsContainingText(text, dom = "span") {
    return [...document.querySelectorAll(dom)].filter((current_dom) => {
      return current_dom.textContent
        .trim()
        .toLowerCase()
        .includes(text.toLowerCase());
    });
  },
  async waitForElement(selector, timeout = 3000, root = document) {
    const started_at = Date.now();
    while (Date.now() - started_at < timeout) {
      const element = root.querySelector(selector);
      if (element) {
        return element;
      }
      await domHelpers.sleep(500);
    }
    return null;
  },
  async fillInput(selector, value, root = document) {
    const input = await domHelpers.waitForElement(selector, 3000, root);

    if (!input) {
      return false;
    }

    input.focus();
    input.value = value;

    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));

    return true;
  },
  elementExists(selector, root = document) {
    return root.querySelector(selector) !== null;
  },
  clickElement(element) {
    element.scrollIntoView({
      behavior: "instant",
      block: "center",
      inline: "center",
    });

    element.click();
  },
  getRandomIntInclusive(min, max) {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled + 1)) + minCeiled;
  },
};

const vehicleMapper = {
  mapper(vehicle) {
    const {
      vehicle_type,
      location,
      year,
      make,
      model,
      odometer,
      selling_price,
      body_type,
      exterior_color,
      interior_color,
      fuel_type,
      vehicle_description,
      transmission,
      enable_group_posting,
      fbmp_list_of_groups,
    } = vehicle;

    const response = {
      vehicle_type,
      location,
      year,
      make,
      model,
      odometer,
      price: selling_price,
      body_type,
      exterior_color,
      interior_color,
      vehicle_condition: "Excellent",
      fuel_type,
      vehicle_description,
      enable_group_posting,
      fbmp_list_of_groups,
    };

    response["image_urls"] = vehicle.image_url
      ? vehicle.image_url.split(";")
      : [];

    response["transmission"] =
      transmission.toLowerCase() == "no"
        ? "Manual transmission"
        : "Automatic transmission";
    return response;
  },
};

window.domHelpers = domHelpers;
window.vehicleMapper = vehicleMapper;
