export const handleBackgroundImageFetchRequest = (changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  const request = changes._imgReq?.newValue;

  if (!request?.id || !request?.url) {
    return;
  }

  handleImageFetchRequest(request.id, request.url);
};

async function handleImageFetchRequest(requestId, imageUrl) {
  const responseKey = `_imgRes_${requestId}`;

  try {
    const response = await fetch(imageUrl, {
      headers: {
        Accept: "image/webp,image/avif,image/*,*/*;q=0.8",
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) {
      throw new Error(`Image fetch failed: ${response.status}`);
    }

    const blob = await response.blob();

    if (blob.size > 8 * 1024 * 1024) {
      throw new Error("Image is larger than 8MB");
    }

    const dataUrl = await blobToDataUrl(blob);

    await chrome.storage.local.set({
      [responseKey]: dataUrl,
    });
  } catch (error) {
    console.warn("Background image fetch failed:", error);

    await chrome.storage.local.set({
      [responseKey]: "",
    });
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () =>
      reject(new Error("Failed to convert blob to data URL"));

    reader.readAsDataURL(blob);
  });
}
