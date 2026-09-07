const scanButton = document.querySelector("#scanButton");
const resultCard = document.querySelector("#resultCard");
const camera = document.querySelector("#camera");
const cameraFrame = document.querySelector(".camera-frame");
const scoreTotal = document.querySelector("#scoreTotal");

const apiEndpoint = getApiEndpoint();
const progressStore = window.EcoQuestStorage;
let isScanning = false;
let isCameraReady = false;
const CAMERA_READY_TIMEOUT_MS = 12000;
const ANALYSIS_TIMEOUT_MS = 75000;
const CAPTURE_MAX_SIDE = 640;
const CAPTURE_JPEG_QUALITY = 0.72;

setButtonIdle();
updateScoreHud();

function getApiEndpoint() {
  if (!window.location.protocol.startsWith("http")) {
    return "http://localhost:5228/api/ia/analizar";
  }

  if (window.location.port && window.location.port !== "5228") {
    return `${window.location.protocol}//${window.location.hostname}:5228/api/ia/analizar`;
  }

  return `${window.location.origin}/api/ia/analizar`;
}

async function startCamera() {
  isCameraReady = false;
  cameraFrame.classList.remove("is-live");

  if (!window.isSecureContext) {
    setButtonMessage("Camara bloqueada", true);
    renderResult({
      title: "Camara bloqueada",
      badge: "HTTPS",
      points: "+0",
      container: "No aplica",
      text: "En celular, la camara solo funciona con HTTPS. Desde la PC usa localhost; desde el telefono necesitas abrir EcoQuest con una URL segura.",
    });
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    renderResult({
      title: "Camara no disponible",
      badge: "Incierto",
      points: "+0",
      container: "No aplica",
      text: "Abri EcoQuest desde localhost o HTTPS para permitir el uso de la camara.",
    });
    return;
  }

  try {
    setButtonMessage("Preparando camara...", true);

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    await attachCameraStream(stream);
  } catch (error) {
    stopCameraStream(camera.srcObject);
    camera.srcObject = null;

    try {
      const fallbackStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      await attachCameraStream(fallbackStream);
    } catch (fallbackError) {
      console.warn("No se pudo activar la camara.", fallbackError);
      stopCameraStream(camera.srcObject);
      camera.srcObject = null;
      setButtonMessage("Camara no disponible", true);
      renderResult({
        title: "Permiso de camara",
        badge: "Incierto",
        points: "+0",
        container: "No aplica",
        text: "Permiti el acceso a la camara para poder analizar residuos con IA.",
      });
    }
  }
}

async function attachCameraStream(stream) {
  isCameraReady = false;
  cameraFrame.classList.remove("is-live");
  camera.srcObject = stream;
  camera.muted = true;
  camera.playsInline = true;
  camera.setAttribute("autoplay", "");
  camera.setAttribute("muted", "");
  camera.setAttribute("playsinline", "");

  await playCamera();
  await waitForCameraFrame();

  isCameraReady = true;
  cameraFrame.classList.add("is-live");
  setButtonIdle();
}

function playCamera() {
  const playPromise = camera.play();

  if (!playPromise || typeof playPromise.then !== "function") {
    return Promise.resolve();
  }

  return Promise.race([
    playPromise,
    new Promise((_, reject) => {
      window.setTimeout(() => {
        reject(new Error("La camara tardo demasiado en iniciar."));
      }, CAMERA_READY_TIMEOUT_MS);
    }),
  ]);
}

function hasUsableCameraFrame() {
  return camera.videoWidth > 0
    && camera.videoHeight > 0
    && camera.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
}

function waitForCameraFrame() {
  if (hasUsableCameraFrame()) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("La camara tardo demasiado en iniciar."));
    }, CAMERA_READY_TIMEOUT_MS);
    const intervalId = window.setInterval(handleReady, 80);

    function cleanup() {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
      camera.removeEventListener("loadedmetadata", handleReady);
      camera.removeEventListener("loadeddata", handleReady);
      camera.removeEventListener("canplay", handleReady);
      camera.removeEventListener("playing", handleReady);
      camera.removeEventListener("timeupdate", handleReady);
    }

    function handleReady() {
      if (hasUsableCameraFrame()) {
        cleanup();
        resolve();
      }
    }

    camera.addEventListener("loadedmetadata", handleReady);
    camera.addEventListener("loadeddata", handleReady);
    camera.addEventListener("canplay", handleReady);
    camera.addEventListener("playing", handleReady);
    camera.addEventListener("timeupdate", handleReady);
  });
}

async function captureCameraFrame() {
  if (!camera.srcObject) {
    throw new Error("La camara todavia no esta lista.");
  }

  await waitForCameraFrame();
  isCameraReady = true;
  cameraFrame.classList.add("is-live");

  const sourceWidth = camera.videoWidth || 640;
  const sourceHeight = camera.videoHeight || 480;
  const scale = Math.min(1, CAPTURE_MAX_SIDE / Math.max(sourceWidth, sourceHeight));
  const width = Math.round(sourceWidth * scale);
  const height = Math.round(sourceHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  context.drawImage(camera, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", CAPTURE_JPEG_QUALITY);
}

function stopCameraStream(stream) {
  if (!stream || typeof stream.getTracks !== "function") {
    return;
  }

  stream.getTracks().forEach((track) => track.stop());
}

function renderResult(result) {
  const currentProgress = progressStore.readProgress();
  const safeResult = {
    title: result.title || "Residuo no identificado",
    badge: result.badge || "Incierto",
    points: result.points || "+0",
    container: result.container || "No aplica",
    text: result.text || "No pude analizar la imagen. Proba otra foto con mejor luz.",
    totalPoints: Number.isFinite(result.totalPoints) ? result.totalPoints : currentProgress.totalPoints,
    pendingAdded: Boolean(result.pendingAdded),
    pendingCount: Number(result.pendingCount) || progressStore.readPendingScans().length,
  };
  const canOpenMap = safeResult.container !== "No aplica" && safeResult.badge !== "No residuo";
  const pendingStatus = safeResult.pendingAdded
    ? `Pendientes ${safeResult.pendingCount}`
    : canOpenMap
      ? "Verificar en mapa"
      : "Sin puntos";
  const mapAction = canOpenMap
    ? `<a class="map-action" href="mapa.html">Abrir mapa</a>`
    : "";

  resultCard.innerHTML = `
    <p class="result-label">
      <img src="../img/hoja-crop.png" alt="" aria-hidden="true">
      Resultado de Analisis
    </p>
    <div class="result-content">
      <div class="result-icon" aria-hidden="true">
        <img src="../img/hoja-crop.png" alt="">
      </div>
      <div class="result-copy">
        <div class="result-heading">
          <h3>${escapeHtml(safeResult.title)}</h3>
          <span>${escapeHtml(safeResult.badge)}</span>
        </div>
        <p>${escapeHtml(safeResult.text)}</p>
        <div class="result-reward">
          <span>${escapeHtml(safeResult.container)}</span>
          <small>${escapeHtml(pendingStatus)}</small>
        </div>
        ${mapAction}
      </div>
    </div>
  `;
}

function savePendingScan(result) {
  const pendingScan = progressStore.addPendingScan(result);
  updateScoreHud();
  return pendingScan;
}

function updateScoreHud(progress = progressStore.readProgress()) {
  if (scoreTotal) {
    scoreTotal.textContent = progress.totalPoints;
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setButtonLoading(isLoading) {
  scanButton.disabled = isLoading;
  scanButton.innerHTML = isLoading
    ? `<img src="../img/estrella-crop.png" alt="" aria-hidden="true"> Analizando...`
    : `<img src="../img/estrella-crop.png" alt="" aria-hidden="true"> Escanear con IA`;
}

function setButtonMessage(message, disabled) {
  scanButton.disabled = disabled;
  scanButton.innerHTML = `<img src="../img/estrella-crop.png" alt="" aria-hidden="true"> ${message}`;
}

function setButtonIdle() {
  setButtonMessage("Escanear con IA", !isCameraReady);
}

async function scanWaste() {
  if (isScanning) {
    return;
  }

  isScanning = true;
  setButtonLoading(true);
  const abortController = new AbortController();
  const timeoutId = window.setTimeout(() => abortController.abort(), ANALYSIS_TIMEOUT_MS);

  try {
    const imageDataUrl = await captureCameraFrame();

    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imageDataUrl }),
      signal: abortController.signal,
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(readErrorMessage(responseText));
    }

    const result = JSON.parse(responseText);
    const pendingScan = savePendingScan(result);
    renderResult({
      ...result,
      pendingAdded: pendingScan.added,
      pendingCount: pendingScan.pendingCount,
      totalPoints: progressStore.readProgress().totalPoints,
    });
  } catch (error) {
    console.warn("Error al escanear con IA.", error);
    const message = error.name === "AbortError"
      ? "La IA tardo demasiado en responder. Proba otra vez con una foto mas clara."
      : error.message;

    renderResult({
      title: "No pude escanear",
      badge: "Incierto",
      points: "+0",
      container: "No aplica",
      text: message || "Revisa la camara, el servidor y la conexion con la IA.",
    });
  } finally {
    window.clearTimeout(timeoutId);
    isScanning = false;
    setButtonIdle();
  }
}

function readErrorMessage(responseText) {
  if (!responseText) {
    return "No se pudo analizar la imagen.";
  }

  try {
    const problem = JSON.parse(responseText);
    return problem.detail
      || problem.error?.message
      || problem.error
      || problem.title
      || JSON.stringify(problem).slice(0, 220)
      || "No se pudo analizar la imagen.";
  } catch {
    return responseText;
  }
}

scanButton.addEventListener("click", scanWaste);
startCamera();
