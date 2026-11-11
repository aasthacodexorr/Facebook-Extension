const domHelpers = {
  sleep(ms) {
    let random_ms = domHelpers.getRandomIntInclusive(ms, Math.round(ms * 1.2));
    return new Promise((resolve) => setTimeout(resolve, random_ms));
  },

  getRandomIntInclusive(min, max) {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled + 1)) + minCeiled;
  },

  setNativeValue(element, value) {
    if (!element) return false;
    try {
      element.focus();
      const stringValue = value != null ? String(value) : "";
      const valueSetter = Object.getOwnPropertyDescriptor(element, "value")?.set;
      const prototype = Object.getPrototypeOf(element);
      const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

      if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
        prototypeValueSetter.call(element, stringValue);
      } else if (valueSetter) {
        valueSetter.call(element, stringValue);
      } else {
        element.value = stringValue;
      }

      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    } catch (e) {
      console.warn("setNativeValue error:", e);
      try {
        element.value = String(value || "");
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
      } catch {}
      return false;
    }
  },

  clickElement(element) {
    if (!element) return false;
    try {
      element.scrollIntoView({
        behavior: "instant",
        block: "center",
        inline: "center",
      });
    } catch {}

    try {
      element.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }),
      );
      element.dispatchEvent(
        new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }),
      );
      element.click();
      return true;
    } catch (e) {
      console.warn("clickElement error:", e);
      return false;
    }
  },

  findSpansContainingText(text) {
    if (!text) return [];
    const t = String(text).trim().toLowerCase();
    return [...document.querySelectorAll("span")].filter((span) => {
      return (span.textContent || "").trim().toLowerCase().includes(t);
    });
  },

  findSpansWithExactText(text) {
    if (!text) return [];
    const t = String(text).trim().toLowerCase();
    return [...document.querySelectorAll("span")].filter((span) => {
      return (span.textContent || "").trim().toLowerCase() === t;
    });
  },

  findDomsContainingText(text, dom = "span") {
    if (!text) return [];
    const t = String(text).trim().toLowerCase();
    return [...document.querySelectorAll(dom)].filter((current_dom) => {
      return (current_dom.textContent || "").trim().toLowerCase().includes(t);
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
    return domHelpers.setNativeValue(input, value);
  },

  elementExists(selector, root = document) {
    return root.querySelector(selector) !== null;
  },

  findFieldByLabel(labelName) {
    if (!labelName) return null;
    const cleanName = String(labelName).trim().toLowerCase();

    // 1. Label with aria-label
    let el = document.querySelector(`label[aria-label*="${cleanName}" i]`);
    if (el) return el;

    // 2. Div with aria-label or role="combobox"
    el = document.querySelector(
      `div[aria-label*="${cleanName}" i], div[role="combobox"][aria-label*="${cleanName}" i]`,
    );
    if (el) return el;

    // 3. Direct input/textarea with aria-label
    el = document.querySelector(
      `input[aria-label*="${cleanName}" i], textarea[aria-label*="${cleanName}" i]`,
    );
    if (el) return el;

    // 4. Any label element containing text
    const labels = domHelpers.findDomsContainingText(cleanName, "label");
    if (labels.length > 0) return labels[0];

    // 5. Any span or div containing the text
    const spans = domHelpers.findDomsContainingText(cleanName, "span");
    for (const span of spans) {
      const container =
        span.closest("label") ||
        span.closest('div[role="combobox"]') ||
        span.closest('div[role="button"]') ||
        span.parentElement;
      if (container) return container;
    }

    return null;
  },

  findInputInField(container, selector = 'input:not([type="hidden"]):not([type="file"]):not([type="checkbox"])') {
    if (!container) return null;
    if (container.matches && container.matches("input, textarea")) return container;
    return container.querySelector(selector);
  },

  async selectDropdownOption(triggerOrLabel, optionText) {
    if (!triggerOrLabel || !optionText) return false;
    const targetText = String(optionText).trim().toLowerCase();

    let trigger =
      typeof triggerOrLabel === "string"
        ? domHelpers.findFieldByLabel(triggerOrLabel)
        : triggerOrLabel;

    if (!trigger) return false;

    // Open dropdown
    domHelpers.clickElement(trigger);
    await domHelpers.sleep(2000);

    // Look for options in standard popup containers
    const menuSelectors = [
      'div[role="listbox"]',
      'div[role="menu"]',
      'div[aria-label="Select an option"]',
      'div[data-pagelet*="Select"]',
    ];

    let optionElements = [];
    for (const sel of menuSelectors) {
      const menus = document.querySelectorAll(sel);
      if (menus.length > 0) {
        const lastMenu = menus[menus.length - 1];
        const items = lastMenu.querySelectorAll('div[role="option"], span, div[role="menuitem"]');
        if (items.length > 0) {
          optionElements = [...items];
          break;
        }
      }
    }

    if (optionElements.length === 0) {
      // Fallback: look for newly visible role="option" anywhere in document
      optionElements = [...document.querySelectorAll('div[role="option"], div[role="menuitem"]')];
    }

    // Exact match first
    let matchedOption = optionElements.find((el) => {
      const t = (el.textContent || "").trim().toLowerCase();
      return t === targetText;
    });

    // Substring match second
    if (!matchedOption) {
      matchedOption = optionElements.find((el) => {
        const t = (el.textContent || "").trim().toLowerCase();
        return t.includes(targetText) || targetText.includes(t);
      });
    }

    if (matchedOption) {
      domHelpers.clickElement(matchedOption);
      await domHelpers.sleep(1500);
      return true;
    }

    // If no option matched, press Escape to close popup so it doesn't block other elements
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
    await domHelpers.sleep(500);
    return false;
  },
};

const vehicleMapper = {
  mapper(vehicle) {
    if (!vehicle) return {};
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
      vehicle_type: vehicle_type ? String(vehicle_type).trim() : "Car/truck",
      location: location ? String(location).trim() : "",
      year: year != null ? String(year).trim() : "",
      make: make ? String(make).trim() : "",
      model: model ? String(model).trim() : "",
      odometer: odometer != null ? String(odometer).trim() : "",
      price: selling_price != null ? String(selling_price).trim() : "",
      body_type: body_type ? String(body_type).trim() : "",
      exterior_color: exterior_color ? String(exterior_color).trim() : "",
      interior_color: interior_color ? String(interior_color).trim() : "",
      vehicle_condition: "Excellent",
      fuel_type: fuel_type ? String(fuel_type).trim() : "",
      vehicle_description: vehicle_description ? String(vehicle_description).trim() : "",
      enable_group_posting: enable_group_posting != null ? String(enable_group_posting) : "0",
      fbmp_list_of_groups: Array.isArray(fbmp_list_of_groups) ? fbmp_list_of_groups : [],
    };

    response["image_urls"] = vehicle.image_url
      ? String(vehicle.image_url)
          .split(";")
          .map((u) => u.trim())
          .filter(Boolean)
      : [];

    const transStr = String(transmission || "").trim().toLowerCase();
    response["transmission"] =
      transStr === "no" || transStr === "manual"
        ? "Manual transmission"
        : "Automatic transmission";

    return response;
  },
};

window.domHelpers = domHelpers;
window.vehicleMapper = vehicleMapper;
