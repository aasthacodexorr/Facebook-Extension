const { sleep } = window.domHelpers;

class ImageUpload {
  findFacebookFileInput() {
    const dialogInput = document
      .querySelector('[role="dialog"] form')
      ?.querySelector('input[type="file"]');

    if (dialogInput) {
      return dialogInput;
    }

    const inputs = document.querySelectorAll('input[type="file"]');

    return inputs.length > 0 ? inputs[0] : null;
  }

  uploadFileToFacebookInput(file) {
    const fileInput = this.findFacebookFileInput();

    if (!fileInput) {
      throw new Error("Facebook file input not found");
    }

    const dataTransfer = new DataTransfer();

    dataTransfer.items.add(file);

    fileInput.value = "";
    fileInput.files = dataTransfer.files;

    fileInput.dispatchEvent(new Event("input", { bubbles: true }));
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async upload(imageUrl, index) {}
}

class FetchImageUpload extends ImageUpload {
  async fetchImageAsFile(imageUrl, fileName = "image.jpg") {
    const response = await fetch(imageUrl, {
      headers: {
        Accept: "image/webp,image/avif,image/*,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`Image fetch failed: ${response.status}`);
    }

    const original_blob = await response.blob();

    const blob = await this.convertImageBlobToJpeg(original_blob);

    return new File([blob], fileName, {
      type: blob.type || "image/jpeg",
      lastModified: Date.now(),
    });
  }

  async upload(imageUrl, index) {
    console.log("image fetch option ....");
    const file = await this.fetchImageAsFile(
      imageUrl,
      `marketplace-image-${index + 1}.jpg`,
    );

    console.log("Adding Facebook file:", {
      url: imageUrl,
      name: file.name,
      type: file.type,
      sizeBytes: file.size,
      sizeMB: (file.size / 1024 / 1024).toFixed(2),
    });

    this.uploadFileToFacebookInput(file);
  }

  async convertImageBlobToJpeg(blob) {
    const imageBitmap = await createImageBitmap(blob);

    const canvas = document.createElement("canvas");
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;

    const ctx = canvas.getContext("2d");

    ctx.drawImage(imageBitmap, 0, 0);

    imageBitmap.close?.();

    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        (jpegBlob) => {
          if (!jpegBlob) {
            reject(new Error("Canvas JPEG conversion failed"));
            return;
          }

          resolve(jpegBlob);
        },
        "image/jpeg",
        0.92,
      );
    });
  }
}

class BackgroundImageUpload extends ImageUpload {
  async fetchImageViaStorageFallback(imageUrl) {
    const requestId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const responseKey = `_imgRes_${requestId}`;

    await chrome.storage.local.set({
      _imgReq: {
        id: requestId,
        url: imageUrl,
      },
    });

    const startedAt = Date.now();

    while (Date.now() - startedAt < 25000) {
      await sleep(3000);

      const result = await chrome.storage.local.get(responseKey);

      if (result[responseKey] !== undefined) {
        const dataUrl = result[responseKey];

        await chrome.storage.local.remove(responseKey);

        return dataUrl || "";
      }
    }

    throw new Error("Image fetch timed out");
  }

  dataUrlToFile(dataUrl, fileName) {
    const mimeType = this.getMimeTypeFromDataUrl(dataUrl);
    const base64 = dataUrl.split(",")[1] || dataUrl;
    const binary = atob(base64);
    const chunks = [];

    for (let offset = 0; offset < binary.length; offset += 512) {
      const slice = binary.slice(offset, offset + 512);
      const bytes = new Uint8Array(slice.length);

      for (let index = 0; index < slice.length; index++) {
        bytes[index] = slice.charCodeAt(index);
      }

      chunks.push(bytes.buffer);
    }

    return new File(chunks, fileName, {
      type: mimeType,
      lastModified: Date.now(),
    });
  }

  getMimeTypeFromDataUrl(dataUrl) {
    const match = /^data:([^;,]+)[;,]/i.exec(dataUrl || "");
    return match?.[1]?.toLowerCase() || "image/jpeg";
  }

  getExtensionFromMimeType(mimeType) {
    if (mimeType.includes("png")) return "png";
    if (mimeType.includes("webp")) return "webp";
    if (mimeType.includes("gif")) return "gif";
    return "jpg";
  }

  async uploadImageUrlToFacebook(imageUrl, index = 1) {
    const dataUrl = await this.fetchImageViaStorageFallback(imageUrl);

    if (!dataUrl) {
      console.warn("No data URL returned for image:", imageUrl);
      return false;
    }

    const mimeType = this.getMimeTypeFromDataUrl(dataUrl);
    const extension = this.getExtensionFromMimeType(mimeType);
    const fileName = `IMG_${String(index).padStart(2, "0")}.${extension}`;

    const file = this.dataUrlToFile(dataUrl, fileName);

    return this.uploadFileToFacebookInput(file);
  }

  async upload(imageUrl, index) {
    console.log("background upload ....");
    await this.uploadImageUrlToFacebook(imageUrl, index + 1);
  }
}

class ImageUploadSingleton {
  static instance = null;
  static async upload(imageUrl, index) {
    if (ImageUploadSingleton.instance === null) {
      try {
        ImageUploadSingleton.instance = new FetchImageUpload();
        await ImageUploadSingleton.instance.upload(imageUrl, index);
        console.log("fetch option initial ....");
      } catch (error) {
        ImageUploadSingleton.instance = new BackgroundImageUpload();
        await ImageUploadSingleton.instance.upload(imageUrl, index);
        console.log("background fallback option initial...");
      }
    } else {
      await ImageUploadSingleton.instance.upload(imageUrl, index);
    }
  }
}
