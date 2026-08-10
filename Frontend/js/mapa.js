const OFFICIAL_BASE_LAYER_URL =
  "https://geoserver.buenosaires.gob.ar/geoserver/gwc/service/tms/1.0.0/catalogo_mapa_base%3Amapa_base_v2@EPSG%3A900913@png/{z}/{x}/{y}.png";

const MAP_CENTER = [-34.6037, -58.3816];
const GREEN_CONTAINER_ICON = "https://epok.buenosaires.gob.ar/media/repok/uploads/mapainteractivoba/contenedor_verde_xs.png";
const BLACK_CONTAINER_ICON = "https://epok.buenosaires.gob.ar/media/repok/uploads/mapainteractivoba/contenedor_negro_chico.png";
const GREEN_POINT_ICON = "https://epok.buenosaires.gob.ar/media/repok/uploads/mapainteractivoba/puntos_verdes.png";

const DEFAULT_RECYCLING_POINTS = [
  {
    id: "contenedor-verde-santa-fe",
    name: "Contenedor verde - Av. Santa Fe y Thames",
    address: "Av. Santa Fe y Thames",
    lat: -34.5825,
    lng: -58.4218,
    acceptedContainers: ["Contenedor verde", "Vidrio"],
    containerColor: "verde",
    type: "StreetContainerPoint",
  },
  {
    id: "contenedor-verde-cabrera",
    name: "Contenedor verde - Cabrera y Bulnes",
    address: "Cabrera y Bulnes",
    lat: -34.5929,
    lng: -58.4147,
    acceptedContainers: ["Contenedor verde", "Vidrio"],
    containerColor: "verde",
    type: "StreetContainerPoint",
  },
  {
    id: "contenedor-negro-honduras",
    name: "Contenedor negro - Honduras y Fitz Roy",
    address: "Honduras y Fitz Roy",
    lat: -34.5857,
    lng: -58.4352,
    acceptedContainers: ["Basura comun"],
    containerColor: "negro",
    type: "StreetContainerPoint",
  },
  {
    id: "punto-verde-las-heras",
    name: "Punto verde - Parque Las Heras",
    address: "Parque Las Heras",
    lat: -34.5844,
    lng: -58.4067,
    acceptedContainers: ["Contenedor verde", "Vidrio", "Punto especial", "Pilas/baterias"],
    specialty: "Punto especial",
    type: "SpecialGreenPoint",
  },
];

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
    const requestedContainer = this.normalize(container);

    return super.accepts(container) ||
      requestedContainer.includes("especial") ||
      requestedContainer.includes("pilas") ||
      requestedContainer.includes("bateria") ||
      requestedContainer.includes("raee") ||
      requestedContainer.includes("electronico");
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
      return this.points;
    }

    const containers = pendingScans.map((scan) => this.normalize(scan.container));
    const needsBlackContainer = containers.some((container) =>
      container.includes("basura") || container.includes("comun"));
    const needsSpecialPoint = containers.some((container) =>
      container.includes("especial") ||
      container.includes("pila") ||
      container.includes("bateria") ||
      container.includes("raee") ||
      container.includes("electronico"));

    if (needsBlackContainer) {
      return this.points.filter((point) => point.isBlackStreetContainer || point.accepts("Basura comun"));
    }

    if (needsSpecialPoint) {
      return this.points.filter((point) => point instanceof SpecialGreenPoint || point.accepts("Punto especial"));
    }

    const greenContainers = this.points.filter((point) => point.isGreenStreetContainer);
    return greenContainers.length > 0
      ? greenContainers
      : this.points.filter((point) => point.accepts("Contenedor verde"));
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
    this.verifier = null;
    this.mainMap = null;
    this.expandedMap = null;
    this.pointsLoaded = false;
    this.elements = {
      appShell: document.querySelector(".app-shell"),
      scoreTotal: document.querySelector("#scoreTotal"),
      pendingCount: document.querySelector("#pendingCount"),
      locateButton: document.querySelector("#locateButton"),
      verifyButton: document.querySelector("#verifyButton"),
      selectedPointName: document.querySelector("#selectedPointName"),
      selectedPointAddress: document.querySelector("#selectedPointAddress"),
      locationStatus: document.querySelector("#locationStatus"),
      pendingPreview: document.querySelector("#pendingPreview"),
      expandMapButton: document.querySelector("#expandMapButton"),
      closeMapButton: document.querySelector("#closeMapButton"),
      mapOverlay: document.querySelector("#mapOverlay"),
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
    this.selectedPoint = this.points[0];
    this.renderSelectedPoint();

    if (this.currentPosition) {
      this.renderLocationResult();
      return;
    }

    this.setStatus("Toca el boton de ubicacion para encontrar el contenedor cercano.");
  }

  bindEvents() {
    this.elements.locateButton.addEventListener("click", () => this.requestLocation());
    this.elements.verifyButton.addEventListener("click", () => this.verifyRecycling());
    this.elements.expandMapButton.addEventListener("click", () => this.openExpandedMap());
    this.elements.closeMapButton.addEventListener("click", () => this.closeExpandedMap());

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !this.elements.mapOverlay.hidden) {
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
        this.renderSelectedPoint();
      }));

    if (typeof mapState.markerLayer.addLayers === "function") {
      mapState.markerLayer.addLayers(markers);
      return;
    }

    markers.forEach((marker) => mapState.markerLayer.addLayer(marker));
  }

  getMarkerIcon(point) {
    const iconUrl = point.isBlackStreetContainer
      ? BLACK_CONTAINER_ICON
      : point instanceof SpecialGreenPoint
        ? GREEN_POINT_ICON
        : GREEN_CONTAINER_ICON;

    return L.icon({
      iconUrl,
      iconSize: [24, 24],
      iconAnchor: [12, 22],
      popupAnchor: [0, -18],
    });
  }

  createPopup(point) {
    return `
      <div class="eco-marker-popup">
        ${this.escapeHtml(point.name)}
        <small>${this.escapeHtml(point.address)}</small>
      </div>
    `;
  }

  async loadPoints() {
    try {
      const response = await fetch(this.getApiUrl("/api/contenedores"));

      if (!response.ok) {
        throw new Error("No se pudieron cargar los contenedores.");
      }

      const points = await response.json();
      return points.map((point) => this.createPoint(point));
    } catch {
      return DEFAULT_RECYCLING_POINTS.map((point) => this.createPoint(point));
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
      this.elements.selectedPointName.textContent = "Contenedores oficiales";
      this.elements.selectedPointAddress.textContent = "Ciudad de Buenos Aires";
      return;
    }

    this.elements.selectedPointName.textContent = this.selectedPoint.name;
    this.elements.selectedPointAddress.textContent = this.selectedPoint.address;
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

  requestLocation() {
    if (!navigator.geolocation) {
      this.setStatus("Este navegador no permite verificar ubicacion.");
      return;
    }

    if (!window.isSecureContext) {
      this.setStatus("La ubicacion necesita HTTPS o localhost.");
      return;
    }

    this.setStatus("Buscando tu ubicacion real...");

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
    this.elements.locateButton.classList.remove("is-active");
    this.elements.userLocationBadge.hidden = true;

    if (error.code === error.PERMISSION_DENIED) {
      this.setStatus("Permiti la ubicacion para validar el reciclaje.");
      return;
    }

    this.setStatus("No pude encontrar tu ubicacion. Proba otra vez.");
  }

  updateUserMarkers() {
    [this.mainMap, this.expandedMap].forEach((mapState) => {
      if (!mapState || !this.currentPosition) {
        return;
      }

      const latLng = [this.currentPosition.lat, this.currentPosition.lng];

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
    const nearest = this.verifier.findNearest(this.currentPosition, pendingScans);

    if (!nearest) {
      this.setStatus("No encontre contenedores cercanos para ese residuo.");
      return;
    }

    this.selectedPoint = nearest.point;
    this.renderSelectedPoint();
    this.focusMapsOnLocation(nearest.point);

    const distanceText = this.verifier.formatMeters(nearest.distance);
    const targetText = this.describeTarget(nearest.point);
    const accuracyText = this.currentPosition.accuracy
      ? ` Precision aprox: ${this.verifier.formatMeters(this.currentPosition.accuracy)}.`
      : "";

    if (this.verifier.isInsideVerificationZone(nearest.distance)) {
      this.setStatus(`Estas cerca del ${targetText}: ${distanceText}. Ya podes verificar.${accuracyText}`);
      return;
    }

    this.setStatus(`${this.capitalize(targetText)} compatible mas cercano a ${distanceText}. Acercate para ganar XP.${accuracyText}`);
  }

  focusMapsOnLocation(point) {
    [this.mainMap, this.expandedMap].forEach((mapState) => {
      if (!mapState || !this.currentPosition || !point) {
        return;
      }

      const userLatLng = [this.currentPosition.lat, this.currentPosition.lng];
      const pointLatLng = point.position;
      const bounds = L.latLngBounds([userLatLng, pointLatLng]);

      if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
        mapState.map.setView(userLatLng, 17);
        return;
      }

      mapState.map.fitBounds(bounds.pad(0.25), {
        maxZoom: 16,
      });
    });
  }

  verifyRecycling() {
    if (!this.currentPosition) {
      this.requestLocation();
      return;
    }

    if (!this.pointsLoaded) {
      this.setStatus("Todavia estoy cargando los contenedores oficiales.");
      return;
    }

    const pendingScans = this.store.readPendingScans();

    if (pendingScans.length === 0) {
      this.setStatus("No hay residuos pendientes para verificar.");
      return;
    }

    const nearest = this.verifier.findNearest(this.currentPosition, pendingScans);

    if (!nearest) {
      this.setStatus("No encontre un contenedor compatible para esos residuos.");
      return;
    }

    this.selectedPoint = nearest.point;
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

    const result = this.store.awardPendingScans(awardableScans, nearest.point);
    this.renderProgress();
    this.setStatus(`Reciclaje verificado: +${result.awardedPoints} XP.`);
  }

  openExpandedMap() {
    this.elements.mapOverlay.hidden = false;
    this.elements.appShell.classList.add("is-map-open");

    if (!this.expandedMap) {
      this.expandedMap = this.createMap("expandedEcoMap");
      this.addMarkersToMap(this.expandedMap);
      this.updateUserMarkers();
    }

    if (!this.expandedMap) {
      return;
    }

    setTimeout(() => {
      this.expandedMap.map.invalidateSize();

      if (this.currentPosition && this.selectedPoint) {
        this.focusMapsOnLocation(this.selectedPoint);
      }
    }, 80);

    this.elements.closeMapButton.focus();
  }

  closeExpandedMap() {
    this.elements.mapOverlay.hidden = true;
    this.elements.appShell.classList.remove("is-map-open");
    this.elements.expandMapButton.focus();
  }

  describeTarget(point) {
    if (point.isBlackStreetContainer) {
      return "contenedor negro";
    }

    if (point instanceof SpecialGreenPoint) {
      return "punto especial";
    }

    return "contenedor verde";
  }

  capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  setStatus(message) {
    this.elements.locationStatus.textContent = message;
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
