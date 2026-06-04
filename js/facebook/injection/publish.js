(async () => {
  const {
    findSpansContainingText,
    findSpansWithExactText,
    clickElement,
    sleep,
    fillInput,
    elementExists,
    findDomsContainingText,
  } = window.domHelpers;
  async function publishInventory() {
    const { mapper } = window.vehicleMapper;
    const data = mapper(window.vehicle_data);

    await sleep(3000);
    const vehicle_type_doms = findSpansWithExactText("Vehicle type");
    // Vehicle type

    if (vehicle_type_doms.length < 1) {
      return;
    }

    clickElement(findSpansWithExactText("Vehicle type")[0]);
    await sleep(3000);

    clickElement(findSpansWithExactText(data.vehicle_type)[0]);

    if (data.location.trim().length > 0) {
      await fillInput('input[aria-label="Location"]', data.location);

      await sleep(3000);

      clickElement(findSpansWithExactText(data.location)[0]);
    }
    await sleep(3000);

    clickElement(findSpansWithExactText("Year")[0]);
    await sleep(3000);

    clickElement(findSpansWithExactText(data.year)[0]);

    await fillInputByLabelOrDropdown("Make", data.make);
    await fillInputByLabelOrDropdown("Model", data.model);

    await fillInputByLabel("Mileage", data.odometer);
    await fillInputByLabel("Price", data.price);

    await fillInputByLabelOrDropdown("Body style", data.body_type);
    await fillInputByLabelOrDropdown("Exterior color", data.exterior_color);
    await fillInputByLabelOrDropdown("Interior color", data.interior_color);
    await fillInputByLabelOrDropdown(
      "Vehicle condition",
      data.vehicle_condition,
    );
    await fillInputByLabelOrDropdown("Fuel type", data.fuel_type);
    await fillInputByLabelOrDropdown("Transmission", data.transmission);

    await fillInputByLabel("Description", data.vehicle_description, "textarea");
  }

  async function fillInputByLabelOrDropdown(labelText, value) {
    const labels = findDomsContainingText(labelText, "label");

    if (labels.length === 0) {
      return;
    }

    const input = labels[0].querySelector('input[type="text"]');

    if (elementExists('input[type="text"]', labels[0])) {
      await fillInput('input[type="text"]', value, labels[0]);
    } else {
      clickElement(labels[0]);
      await sleep(3000);
      clickElement(findSpansWithExactText(value)[0]);
    }

    await sleep(3000);
  }

  async function fillInputByLabel(
    labelText,
    value,
    selector = 'input[type="text"]',
  ) {
    const labels = findDomsContainingText(labelText, "label");

    if (labels.length === 0) {
      return;
    }

    const input = labels[0].querySelector(selector);

    if (elementExists(selector, labels[0])) {
      await fillInput(selector, value, labels[0]);
    }

    await sleep(3000);
  }

  return publishInventory();
})();
