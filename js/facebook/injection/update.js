(async () => {
  const {
    findSpansContainingText,
    findSpansWithExactText,
    findDomsContainingText,
    findFieldByLabel,
    findInputInField,
    selectDropdownOption,
    clickElement,
    fillInput,
    setNativeValue,
    elementExists,
    sleep,
  } = window.domHelpers;

  function getNextBtn() {
    return (
      document.querySelector(
        'div[aria-label="Next"][role="button"], div[aria-label="Next"], button[aria-label="Next"]',
      ) ||
      [...document.querySelectorAll('div[role="button"], button')].find(
        (el) => (el.textContent || "").trim() === "Next",
      )
    );
  }

  function getUpdateBtn() {
    return (
      document.querySelector(
        'div[aria-label="Update"][role="button"], div[aria-label="Update"], button[aria-label="Update"]',
      ) ||
      [...document.querySelectorAll('div[role="button"], button')].find(
        (el) => (el.textContent || "").trim() === "Update",
      )
    );
  }

  function getDraftBtn() {
    return document.querySelector(
      'div[aria-label="Save draft"][role="button"], div[aria-label="Save draft"], button[aria-label="Save draft"]',
    );
  }

  function isBtnDisabled(btn) {
    if (!btn) return true;
    return btn.getAttribute("aria-disabled") === "true" || btn.disabled === true;
  }

  async function fillInputByLabelOrDropdown(labelText, value) {
    if (!value) return;
    const field = findFieldByLabel(labelText);
    if (!field) return;

    const input = findInputInField(field);
    if (input) {
      setNativeValue(input, value);
      await sleep(1500);

      const options = document.querySelectorAll(
        'div[role="listbox"] div[role="option"], div[role="option"]',
      );
      if (options.length > 0) {
        const valLower = String(value).trim().toLowerCase();
        const matched = [...options].find((opt) =>
          (opt.textContent || "").trim().toLowerCase().includes(valLower),
        );
        if (matched) {
          clickElement(matched);
          await sleep(1000);
          return;
        }
      }
      return;
    }

    await selectDropdownOption(field, value);
    await sleep(1500);
  }

  async function fillInputByLabel(labelText, value, selector = "input") {
    if (!value) return;
    const field = findFieldByLabel(labelText);
    if (!field) return;

    const input =
      field.matches && field.matches(selector)
        ? field
        : field.querySelector(selector);
    if (input) {
      setNativeValue(input, value);
      await sleep(1000);
    }
  }

  async function updateInventory() {
    const { mapper } = window.vehicleMapper;
    const data = mapper(window.vehicle_data || {});
    const response = {
      status: "NOT UPDATED",
    };

    await sleep(4000);

    if (data.odometer) {
      await fillInputByLabel("Mileage", data.odometer, "input");
    }

    if (data.price) {
      await fillInputByLabel("Price", data.price, "input");
    }

    if (data.body_type) {
      await fillInputByLabelOrDropdown("Body style", data.body_type);
    }
    if (data.exterior_color) {
      await fillInputByLabelOrDropdown("Exterior color", data.exterior_color);
    }
    if (data.interior_color) {
      await fillInputByLabelOrDropdown("Interior color", data.interior_color);
    }
    if (data.vehicle_condition) {
      await fillInputByLabelOrDropdown("Vehicle condition", data.vehicle_condition);
    }
    if (data.fuel_type) {
      await fillInputByLabelOrDropdown("Fuel type", data.fuel_type);
    }
    if (data.transmission) {
      await fillInputByLabelOrDropdown("Transmission", data.transmission);
    }

    if (data.vehicle_description) {
      await fillInputByLabel("Description", data.vehicle_description, "textarea");
    }

    await sleep(3000);

    let updateBtn = getUpdateBtn();
    if (updateBtn && !isBtnDisabled(updateBtn)) {
      response.status = "UPDATED";
      clickElement(updateBtn);
      await sleep(3000);
      return response;
    }

    let nextBtn = getNextBtn();
    if (nextBtn && !isBtnDisabled(nextBtn)) {
      clickElement(nextBtn);
      await sleep(6000);

      updateBtn = getUpdateBtn();
      if (updateBtn && !isBtnDisabled(updateBtn)) {
        response.status = "UPDATED";
        clickElement(updateBtn);
        await sleep(3000);
        return response;
      }
    }

    return response;
  }

  return updateInventory();
})();
