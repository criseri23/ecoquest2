window.EcoQuestReady.then(() => {
const OFFICIAL_BASE_LAYER_URL =
  "https://geoserver.buenosaires.gob.ar/geoserver/gwc/service/tms/1.0.0/catalogo_mapa_base%3Amapa_base_v2@EPSG%3A900913@png/{z}/{x}/{y}.png";

const MAP_CENTER = [-34.6037, -58.3816];

class RecyclingPoint {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.address = config.address;
    this.lat = Number(config.lat);
    this.lng = Number(config.lng);
    this.type = config.type || "RecyclingPoint";
    this.containerColor = config.containerColor || "";
    this.acceptedContainers = config.acceptedContainers || ["Contenedor verde"];
  }

  get position() {
    return [this.lat, this.lng];
  }

  get isStreetContainer() {
    return this.type.includes("StreetContainer");
  }

  get isGreenStreetContainer() {
    return this.isStreetContainer && this.normalize(this.containerColor) === "verde";
  }

  get isBlackStreetContainer() {
    return this.isStreetContainer && this.normalize(this.containerColor) === "negro";
  }

  accepts(container) {
    const requestedContainer = this.normalize(container);

    return this.acceptedContainers.some((acceptedContainer) =>
      this.normalize(acceptedContainer) === requestedContainer);
  }

  normalize(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }
}

class SpecialGreenPoint extends RecyclingPoint {
  constructor(config) {
    super(config);
    this.specialty = config.specialty || "Punto especial";
  }

  accepts(container) {
    // Cada punto acepta solamente los materiales de su ficha.
    return super.accepts(container) || this.normalize(container) === this.normalize(this.specialty);
  }

}

class StreetContainerPoint extends RecyclingPoint {
  accepts(container) {
    const requestedContainer = this.normalize(container);

    if (this.isBlackStreetContainer) {
      return requestedContainer.includes("basura") ||
        requestedContainer.includes("comun") ||
        super.accepts(container);
    }

    return requestedContainer.includes("verde") ||
      requestedContainer.includes("vidrio") ||
      super.accepts(container);
  }
}

class DistanceService {
  calculateMeters(from, to) {
    const earthRadiusMeters = 6371000;
    const latitudeDelta = this.toRadians(to.lat - from.lat);
    const longitudeDelta = this.toRadians(to.lng - from.lng);
    const fromLatitude = this.toRadians(from.lat);
    const toLatitude = this.toRadians(to.lat);
    const haversine = Math.sin(latitudeDelta / 2) ** 2
      + Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;

    return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  }

  toRadians(value) {
    return value * Math.PI / 180;
  }

  formatMeters(distance) {
    if (distance >= 1000) {
      return `${(distance / 1000).toFixed(1)} km`;
    }

    return `${Math.round(distance)} m`;
  }
}

class ContainerVerifier extends DistanceService {
  constructor(points, thresholdMeters = 150) {
    super();
    this.points = points;
    this.thresholdMeters = thresholdMeters;
  }

  findNearest(position, pendingScans = []) {
    const candidates = this.getCandidates(pendingScans);

    return candidates
      .map((point) => ({
        point,
        distance: this.calculateMeters(position, point),
      }))
      .sort((left, right) => left.distance - right.distance)[0];
  }

  getCandidates(pendingScans) {
    if (pendingScans.length === 0) {
      return this.points.filter(point => !point.isBlackStreetContainer);
    }

    return this.points.filter(point => pendingScans.some(scan => point.accepts(scan.container)));
  }

  isInsideVerificationZone(distance) {
    return distance <= this.thresholdMeters;
  }

  normalize(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }
}

class EcoQuestMapController {
  constructor() {
    this.store = window.EcoQuestStorage;
    this.points = [];
    this.currentPosition = null;
    this.selectedPoint = null;
    this.selectedDistance = null;
    this.verifier = null;
    this.mainMap = null;
    this.pointsLoaded = false;
    this.isMapExpanded = false;
    this.isLocating = false;
    this.findNearestAfterLocation = false;
    this.usingFallback = false;
    this.elements = {
      appShell: document.querySelector(".app-shell"),
      mapPanel: document.querySelector(".map-panel"),
      scoreTotal: document.querySelector("#scoreTotal"),
      pendingCount: document.querySelector("#pendingCount"),
      locateButton: document.querySelector("#locateButton"),
      locateLabel: document.querySelector("#locateLabel"),
      nearestButton: document.querySelector("#nearestButton"),
      selectedPointType: document.querySelector("#selectedPointType"),
      pointExplanation: document.querySelector("#pointExplanation"),
      specialPointInfo: document.querySelector("#specialPointInfo"),
      mapDirections: document.querySelector("#mapDirections"),
      googleMapsLink: document.querySelector("#googleMapsLink"),
      travelMode: document.querySelector("#travelMode"),
      verifyButton: document.querySelector("#verifyButton"),
      selectedPointName: document.querySelector("#selectedPointName"),
      selectedPointAddress: document.querySelector("#selectedPointAddress"),
      selectedPointDistance: document.querySelector("#selectedPointDistance"),
      locationStatus: document.querySelector("#locationStatus"),
      pendingPreview: document.querySelector("#pendingPreview"),
      expandMapButton: document.querySelector("#expandMapButton"),
      userLocationBadge: document.querySelector("#userLocationBadge"),
    };
  }

  async start() {
    this.bindEvents();
    this.renderProgress();
    this.createMainMap();

    this.setStatus("Cargando contenedores oficiales...");
    this.points = await this.loadPoints();
    this.pointsLoaded = true;
    this.verifier = new ContainerVerifier(this.points);
    this.addMarkersToMap(this.mainMap);
    let savedPoint;
    try { savedPoint = sessionStorage.getItem("ecoquestSelectedPoint"); } catch { }
    this.selectedPoint = this.points.find(point => point.id === savedPoint) || null;
    this.renderSelectedPoint();

    if (this.currentPosition) {
      this.renderLocationResult();
      return;
    }

    if (this.selectedPoint) this.focusMapsOnLocation(this.selectedPoint);
    this.setStatus(this.points.length
      ? `${this.points.length.toLocaleString("es-AR")} puntos y contenedores de CABA. Tocá Mi ubicación para buscar cerca tuyo.`
      : "No se pudo cargar el catálogo. Revisá la conexión y recargá la página.");
  }

  bindEvents() {
    this.elements.locateButton.addEventListener("click", () => this.requestLocation(true));
    this.elements.nearestButton.addEventListener("click", () => this.requestLocation(true));
    this.elements.travelMode.addEventListener("change", () => this.updateDirections());
    this.elements.verifyButton.addEventListener("click", () => this.verifyRecycling());
    this.elements.expandMapButton.addEventListener("click", () => this.toggleExpandedMap());

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.isMapExpanded) {
        this.closeExpandedMap();
      }
    });
  }

  createMainMap() {
    this.mainMap = this.createMap("ecoMap");
  }

  createMap(elementId) {
    if (!window.L) {
      this.setStatus("No se pudo cargar el mapa. Revisa la conexion a internet.");
      return null;
    }

    const map = L.map(elementId, {
      zoomControl: false,
      attributionControl: true,
    }).setView(MAP_CENTER, 12);

    L.tileLayer(OFFICIAL_BASE_LAYER_URL, {
      tms: true,
      maxZoom: 18,
      minZoom: 1,
      attribution: "GCBA | OpenStreetMap",
    }).addTo(map);

    L.control.zoom({
      position: "bottomright",
    }).addTo(map);

    const markerLayer = this.createMarkerLayer();
    markerLayer.addTo(map);

    return {
      map,
      markerLayer,
      userMarker: null,
      accuracyCircle: null,
      selectedMarker: null,
    };
  }

  createMarkerLayer() {
    if (L.markerClusterGroup) {
      return L.markerClusterGroup({
        chunkedLoading: true,
        showCoverageOnHover: false,
        maxClusterRadius: 38,
      });
    }

    return L.layerGroup();
  }

  addMarkersToMap(mapState) {
    if (!mapState || !this.pointsLoaded) {
      return;
    }

    mapState.markerLayer.clearLayers();

    const markers = this.points.map((point) =>
      L.marker(point.position, {
        icon: this.getMarkerIcon(point),
        title: point.name,
      })
        .bindPopup(this.createPopup(point))
        .on("click", () => {
          this.selectedPoint = point;
          this.selectedDistance = this.calculateSelectedDistance(point);
          this.renderSelectedPoint();
          this.focusMapsOnLocation(point);
          this.setStatus("Destino seleccionado. Podés ver cómo llegar o elegir otro marcador.");
        }));

    if (typeof mapState.markerLayer.addLayers === "function") {
      mapState.markerLayer.addLayers(markers);
      return;
    }

    markers.forEach((marker) => mapState.markerLayer.addLayer(marker));
  }

  getMarkerIcon(point) {
    const special = point instanceof SpecialGreenPoint;
    const color = point.isBlackStreetContainer ? "black" : special ? "special" : "green";
    return L.divIcon({
      className: `eco-point-marker eco-point-${color}`,
      html: `<span>${special ? "★" : point.isBlackStreetContainer ? "●" : "♻"}</span>`,
      iconSize: special ? [34, 34] : [28, 28],
      iconAnchor: special ? [17, 17] : [14, 14],
    });
  }

  createPopup(point) {
    return `
      <div class="eco-marker-popup">
        ${this.escapeHtml(point.name)}
        <small>${this.escapeHtml(this.describeTarget(point))}</small>
        <small>${this.escapeHtml(point.address)}</small>
      </div>
    `;
  }

  async loadPoints() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(this.getApiUrl("/api/contenedores"), { signal: controller.signal });

      if (!response.ok) {
        throw new Error("No se pudieron cargar los contenedores.");
      }

      const points = await response.json();
      if (!Array.isArray(points) || !points.length) throw new Error("Sin puntos");
      const valid = points.filter(point => point.lat != null && point.lng != null && Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng)) && Math.abs(Number(point.lat)) <= 90 && Math.abs(Number(point.lng)) <= 180);
      if (!valid.length) throw new Error("Sin coordenadas válidas");
      return valid.map((point) => this.createPoint(point));
    } catch {
      this.usingFallback = true;
      try {
        const response = await fetch("../data/recycling-points.json");
        if (!response.ok) throw new Error("Catálogo no disponible");
        const catalog = await response.json();
        return catalog.points.map((point) => this.createPoint(point));
      } catch {
        return [];
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  createPoint(point) {
    const pointType = String(point.type || "");

    if (pointType.includes("Special")) {
      return new SpecialGreenPoint(point);
    }

    if (pointType.includes("Street")) {
      return new StreetContainerPoint(point);
    }

    return new RecyclingPoint(point);
  }

  getApiUrl(path) {
    if (window.EcoQuestAccount) return window.EcoQuestAccount.apiOrigin + path;
    if (!window.location.protocol.startsWith("http")) {
      return `http://localhost:5228${path}`;
    }

    if (window.location.port && window.location.port !== "5228") {
      return `${window.location.protocol}//${window.location.hostname}:5228${path}`;
    }

    return `${window.location.origin}${path}`;
  }

  renderSelectedPoint() {
    if (!this.selectedPoint) {
      this.elements.mapDirections.hidden = true;
      this.elements.specialPointInfo.hidden = true;
      this.elements.selectedPointType.textContent = "Elegí un punto";
      this.elements.pointExplanation.textContent = "Verde: reciclables. Negro: basura común. Violeta: Punto Verde para entregas con atención.";
      this.elements.selectedPointName.textContent = "¿Dónde querés reciclar?";
      this.elements.selectedPointAddress.textContent = "Ciudad de Buenos Aires";
      this.elements.selectedPointDistance.textContent = "Distancia pendiente";
      return;
    }

    const special = this.selectedPoint instanceof SpecialGreenPoint;
    this.elements.selectedPointType.textContent = this.describeTarget(this.selectedPoint);
    this.elements.selectedPointType.classList.toggle("is-special", special);
    this.elements.specialPointInfo.hidden = !special;
    this.elements.pointExplanation.textContent = special
      ? "Es un lugar de entrega, no un contenedor común. Para residuos como pilas o electrónicos, consultá qué recibe y su horario de atención antes de ir."
      : this.selectedPoint.isBlackStreetContainer ? "Para basura común. Separá los reciclables antes de depositarlos." : "Para materiales reciclables, limpios y secos.";
    try { sessionStorage.setItem("ecoquestSelectedPoint", this.selectedPoint.id); } catch { }
    this.updateDirections();
    this.elements.selectedPointName.textContent = this.selectedPoint.name;
    this.elements.selectedPointAddress.textContent = this.selectedPoint.address;
    this.elements.selectedPointDistance.textContent = this.formatSelectedDistance();
  }

  renderProgress() {
    const progress = this.store.readProgress();
    const pendingScans = this.store.readPendingScans();

    this.elements.scoreTotal.textContent = progress.totalPoints;
    this.elements.pendingCount.textContent = `${pendingScans.length} pendientes`;
    this.elements.pendingPreview.innerHTML = this.createPendingPreview(pendingScans);
  }

  createPendingPreview(pendingScans) {
    if (pendingScans.length === 0) {
      return `<span class="pending-empty">Sin residuos pendientes</span>`;
    }

    return pendingScans
      .slice(0, 4)
      .map((scan) => `
        <span class="pending-chip">
          ${this.escapeHtml(scan.title)}
          <small>+${Number(scan.points) || 0}</small>
        </span>
      `)
      .join("");
  }

  updateDirections() {
    if (!this.selectedPoint) return;
    const url = new URL("https://www.google.com/maps/dir/");
    url.searchParams.set("api", "1");
    url.searchParams.set("destination", `${this.selectedPoint.lat},${this.selectedPoint.lng}`);
    url.searchParams.set("travelmode", this.elements.travelMode.value);
    if (this.currentPosition) url.searchParams.set("origin", `${this.currentPosition.lat},${this.currentPosition.lng}`);
    this.elements.googleMapsLink.href = url.toString();
    this.elements.mapDirections.hidden = false;
  }

  requestLocation(findNearest = false) {
    if (this.isLocating) return;
    this.findNearestAfterLocation = findNearest;
    if (!navigator.geolocation) {
      this.setStatus("Este navegador no permite verificar ubicacion.");
      return;
    }

    if (!window.isSecureContext) {
      this.setStatus("La ubicacion necesita HTTPS o localhost.");
      return;
    }

    this.isLocating = true;
    this.elements.locateButton.disabled = true;
    this.elements.nearestButton.disabled = true;
    this.elements.locateLabel.textContent = "Buscando…";
    this.setStatus("Buscando tu ubicación. Si el navegador lo pide, permití el acceso.");

    navigator.geolocation.getCurrentPosition(
      (position) => this.handleLocationSuccess(position),
      (error) => this.handleLocationError(error),
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 15000,
      },
    );
  }

  handleLocationSuccess(position) {
    this.finishLocating();
    this.locationUpdatedAt = Date.now();
    this.currentPosition = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
    };

    this.elements.locateButton.classList.add("is-active");
    this.elements.userLocationBadge.hidden = false;
    this.updateUserMarkers();

    if (!this.pointsLoaded) {
      this.setStatus("Ubicacion tomada. Esperando contenedores oficiales...");
      return;
    }

    this.renderLocationResult();
  }

  handleLocationError(error) {
    this.finishLocating();
    this.currentPosition = null;
    if (this.mainMap?.userMarker) { this.mainMap.map.removeLayer(this.mainMap.userMarker); this.mainMap.userMarker = null; }
    if (this.mainMap?.accuracyCircle) { this.mainMap.map.removeLayer(this.mainMap.accuracyCircle); this.mainMap.accuracyCircle = null; }
    this.selectedDistance = null;
    this.renderSelectedPoint();
    this.elements.locateButton.classList.remove("is-active");
    this.elements.userLocationBadge.hidden = true;

    if (error.code === error.PERMISSION_DENIED) {
      this.setStatus("Permiti la ubicacion para validar el reciclaje.");
      return;
    }

    this.setStatus("No pude encontrar tu ubicacion. Proba otra vez.");
  }

  finishLocating() {
    this.isLocating = false;
    this.elements.locateButton.disabled = false;
    this.elements.nearestButton.disabled = false;
    this.elements.locateLabel.textContent = "Mi ubicación";
  }

  updateUserMarkers() {
    [this.mainMap].forEach((mapState) => {
      if (!mapState || !this.currentPosition) {
        return;
      }

      const latLng = [this.currentPosition.lat, this.currentPosition.lng];

      if (mapState.accuracyCircle) mapState.map.removeLayer(mapState.accuracyCircle);
      mapState.accuracyCircle = L.circle(latLng, { radius: this.currentPosition.accuracy, color: "#218bd0", weight: 1, fillOpacity: .08, interactive: false }).addTo(mapState.map);
      if (mapState.userMarker) {
        mapState.userMarker.setLatLng(latLng);
        return;
      }

      mapState.userMarker = L.circleMarker(latLng, {
        radius: 9,
        color: "#ffffff",
        fillColor: "#3ba9e4",
        fillOpacity: 1,
        weight: 3,
      })
        .bindPopup("Estas aca")
        .addTo(mapState.map);
    });
  }

  renderLocationResult() {
    const pendingScans = this.store.readPendingScans();
    const nearest = this.selectedPoint && !this.findNearestAfterLocation
      ? { point: this.selectedPoint, distance: this.calculateSelectedDistance(this.selectedPoint) }
      : this.verifier.findNearest(this.currentPosition, pendingScans);

    if (!nearest) {
      this.selectedPoint = null;
      this.selectedDistance = null;
      this.renderSelectedPoint();
      if (this.mainMap?.selectedMarker) { this.mainMap.map.removeLayer(this.mainMap.selectedMarker); this.mainMap.selectedMarker = null; }
      this.mainMap?.map.setView([this.currentPosition.lat, this.currentPosition.lng], 16);
      this.setStatus("No hay puntos disponibles para ese residuo en el catálogo de CABA.");
      return;
    }

    this.selectedPoint = nearest.point;
    this.selectedDistance = nearest.distance;
    this.renderSelectedPoint();
    this.focusMapsOnLocation(nearest.point);

    const distanceText = this.verifier.formatMeters(nearest.distance);
    const targetText = this.describeTarget(nearest.point);
    const accuracyText = this.currentPosition.accuracy
      ? ` Precision aprox: ${this.verifier.formatMeters(this.currentPosition.accuracy)}.`
      : "";

    if (nearest.distance > 20000) {
      this.mainMap?.map.setView([this.currentPosition.lat, this.currentPosition.lng], 15, { animate: false });
      this.setStatus("El catálogo cubre CABA; no encontramos un punto a menos de 20 km. El mapa queda en tu ubicación.");
      return;
    }
    if (this.currentPosition.accuracy > 150) {
      this.setStatus("Tu ubicación es poco precisa. El círculo azul muestra el margen de error. Probá nuevamente antes de validar.");
      return;
    }
    if (this.verifier.isInsideVerificationZone(nearest.distance)) {
      this.setStatus(`Estas cerca del ${targetText}: ${distanceText}. Ya podes verificar.${accuracyText}`);
      return;
    }

    this.setStatus(`${this.capitalize(targetText)} compatible mas cercano a ${distanceText}. Acercate para ganar XP.${accuracyText}`);
  }

  focusMapsOnLocation(point) {
    if (!this.mainMap || !point) return;
    const state = this.mainMap;
    state.map.invalidateSize();
    if (state.selectedMarker) state.map.removeLayer(state.selectedMarker);
    // El destino elegido queda visible aunque los otros marcadores estén agrupados.
    state.selectedMarker = L.marker(point.position, { icon: this.getMarkerIcon(point), zIndexOffset: 1000 })
      .bindPopup(this.createPopup(point)).addTo(state.map);
    if (this.currentPosition && this.calculateSelectedDistance(point) < 20000) {
      state.map.fitBounds(L.latLngBounds([[this.currentPosition.lat, this.currentPosition.lng], point.position]), { padding: [45, 45], maxZoom: 17, animate: false });
    } else {
      state.map.setView(point.position, 16, { animate: false });
    }
    state.selectedMarker.getElement()?.classList.add("is-selected");
  }

  async verifyRecycling() {
    if (this.verifying) return;
    if (!this.currentPosition) {
      this.requestLocation();
      return;
    }

    if (Date.now() - this.locationUpdatedAt > 60000) { this.requestLocation(false); return; }

    if (!this.pointsLoaded) {
      this.setStatus("Todavia estoy cargando los contenedores oficiales.");
      return;
    }

    const pendingScans = this.store.readPendingScans();

    if (pendingScans.length === 0) {
      this.setStatus("No hay residuos pendientes para verificar.");
      return;
    }

    if (!this.selectedPoint) { this.setStatus("Elegí un destino o tocá Buscar cercano primero."); return; }
    if (this.usingFallback) { this.setStatus("No se pudo cargar el catálogo oficial. Reintentá antes de validar."); return; }
    if (this.currentPosition.accuracy > 150) { this.setStatus("Tu ubicación es poco precisa. Tocá Mi ubicación para actualizarla."); return; }
    const nearest = { point: this.selectedPoint, distance: this.calculateSelectedDistance(this.selectedPoint) };

    if (!nearest) {
      this.setStatus("No encontre un contenedor compatible para esos residuos.");
      return;
    }

    this.selectedPoint = nearest.point;
    this.selectedDistance = nearest.distance;
    this.renderSelectedPoint();
    this.focusMapsOnLocation(nearest.point);

    if (!this.verifier.isInsideVerificationZone(nearest.distance)) {
      this.setStatus(`Todavia estas a ${this.verifier.formatMeters(nearest.distance)} del contenedor compatible.`);
      return;
    }

    const awardableScans = pendingScans.filter((scan) => nearest.point.accepts(scan.container));

    if (awardableScans.length === 0) {
      this.setStatus("Ese contenedor no acepta los residuos pendientes.");
      return;
    }

    if (window.EcoQuestAccount?.profile) {
      const scanIds = awardableScans.map(scan => scan.serverScanId).filter(Boolean);
      if (!scanIds.length) { this.setStatus("Escaneá los residuos con tu cuenta iniciada para sumar al ranking."); return; }
      this.verifying = true; this.elements.verifyButton.disabled = true;
      try {
        const result = await window.EcoQuestAccount.request("/api/ranking/verify", { method: "POST", body: JSON.stringify({ scanIds, pointId: nearest.point.id, ...this.currentPosition }) });
        window.EcoQuestAccount.applyProfile(result.profile);
        this.store.writeJson(this.store.pendingKey, this.store.readPendingScans().filter(scan => !scanIds.includes(scan.serverScanId)));
        this.renderProgress(); this.setStatus(`Reciclaje verificado: +${result.awardedPoints} XP. Ranking actualizado.`);
      } catch (error) { this.setStatus(error.message); }
      finally { this.verifying = false; this.elements.verifyButton.disabled = false; }
      return;
    }
    const result = this.store.awardPendingScans(awardableScans, nearest.point);
    this.renderProgress();
    this.setStatus(`Reciclaje verificado: +${result.awardedPoints} XP.`);
  }

  toggleExpandedMap() {
    if (this.isMapExpanded) {
      this.closeExpandedMap();
      return;
    }

    this.openExpandedMap();
  }

  openExpandedMap() {
    this.isMapExpanded = true;
    this.elements.mapPanel.classList.add("is-map-expanded");
    this.elements.expandMapButton.textContent = "Reducir mapa";

    setTimeout(() => {
      this.mainMap?.map.invalidateSize();

      if (this.currentPosition && this.selectedPoint) {
        this.focusMapsOnLocation(this.selectedPoint);
      }
    }, 80);

    this.elements.expandMapButton.focus();
  }

  closeExpandedMap() {
    this.isMapExpanded = false;
    this.elements.mapPanel.classList.remove("is-map-expanded");
    this.elements.expandMapButton.textContent = "Expandir mapa";

    setTimeout(() => {
      if (this.mainMap) {
        this.mainMap?.map.invalidateSize();
      }
    }, 80);

    this.elements.expandMapButton.focus();
  }

  calculateSelectedDistance(point) {
    if (!this.currentPosition || !this.verifier || !point) {
      return null;
    }

    return this.verifier.calculateMeters(this.currentPosition, point);
  }

  formatSelectedDistance() {
    if (!this.selectedPoint) {
      return "Distancia pendiente";
    }

    if (!this.currentPosition || this.selectedDistance === null) {
      return "Activa ubicacion para calcular distancia";
    }

    return `${this.verifier.formatMeters(this.selectedDistance)} en línea recta`;
  }

  createExpandedStatus() {
    if (!this.currentPosition || this.selectedDistance === null) {
      return "Primero activa tu ubicacion para ver que tan cerca estas.";
    }

    if (this.verifier.isInsideVerificationZone(this.selectedDistance)) {
      return "Estas dentro de la zona para verificar el reciclaje.";
    }

    return `Acercate al ${this.describeTarget(this.selectedPoint)} para poder verificar.`;
  }

  describeTarget(point) {
    if (point.isBlackStreetContainer) {
      return "contenedor negro";
    }

    if (point instanceof SpecialGreenPoint) {
      return "Punto Verde · atención especial";
    }

    return "contenedor verde";
  }

  capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  setStatus(message) {
    this.elements.locationStatus.textContent = (this.usingFallback ? "API sin conexión; copia del catálogo oficial. " : "") + message;
  }

  escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

new EcoQuestMapController().start();

});