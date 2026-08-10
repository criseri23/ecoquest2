(function () {
  class EcoQuestScanResult {
    constructor(result) {
      this.title = result?.title || "Residuo no identificado";
      this.badge = result?.badge || "Incierto";
      this.points = EcoQuestProgressStore.parsePoints(result?.points);
      this.container = result?.container || "No aplica";
      this.text = result?.text || "";
      this.isWaste = result?.isWaste ?? this.badge !== "No residuo";
      this.canUseGreenContainer = result?.canUseGreenContainer ?? this.container === "Contenedor verde";
      this.wasteType = result?.wasteType || this.badge;
      this.confidence = result?.confidence || "media";
    }

    get canBeStoredForRecycling() {
      return this.isWaste && this.container !== "No aplica";
    }

    toPendingItem() {
      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: this.title,
        badge: this.badge,
        points: this.points,
        container: this.container,
        text: this.text,
        canUseGreenContainer: this.canUseGreenContainer,
        wasteType: this.wasteType,
        confidence: this.confidence,
        scannedAt: new Date().toISOString(),
      };
    }
  }

  class EcoQuestProgressStore {
    constructor(storage) {
      this.storage = storage;
      this.progressKey = "ecoquestProgress";
      this.pendingKey = "ecoquestPendingScans";
    }

    readProgress() {
      const storedProgress = this.readJson(this.progressKey);

      return {
        totalPoints: Number(storedProgress?.totalPoints) || 0,
        scans: Number(storedProgress?.scans) || 0,
        successfulScans: Number(storedProgress?.successfulScans) || 0,
        history: Array.isArray(storedProgress?.history) ? storedProgress.history : [],
      };
    }

    writeProgress(progress) {
      this.writeJson(this.progressKey, progress);
    }

    readPendingScans() {
      const storedPending = this.readJson(this.pendingKey);
      return Array.isArray(storedPending) ? storedPending : [];
    }

    addPendingScan(result) {
      const scanResult = new EcoQuestScanResult(result);
      const progress = this.readProgress();

      progress.scans += 1;
      this.writeProgress(progress);

      if (!scanResult.canBeStoredForRecycling) {
        return {
          added: false,
          pendingCount: this.readPendingScans().length,
          scanResult,
        };
      }

      const pendingScans = [scanResult.toPendingItem(), ...this.readPendingScans()].slice(0, 20);
      this.writeJson(this.pendingKey, pendingScans);

      return {
        added: true,
        pendingCount: pendingScans.length,
        scanResult,
      };
    }

    awardPendingScans(scans, point) {
      const scanIds = new Set(scans.map((scan) => scan.id));
      const awardedPoints = scans.reduce((total, scan) => total + (Number(scan.points) || 0), 0);
      const progress = this.readProgress();

      progress.totalPoints += awardedPoints;
      progress.successfulScans += scans.length;
      progress.history = [
        {
          pointId: point.id,
          pointName: point.name,
          points: awardedPoints,
          items: scans.map((scan) => ({
            title: scan.title,
            container: scan.container,
            points: scan.points,
          })),
          recycledAt: new Date().toISOString(),
        },
        ...progress.history,
      ].slice(0, 10);

      const remainingScans = this.readPendingScans().filter((scan) => !scanIds.has(scan.id));
      this.writeProgress(progress);
      this.writeJson(this.pendingKey, remainingScans);

      return {
        awardedPoints,
        progress,
        remainingScans,
      };
    }

    readJson(key) {
      try {
        return JSON.parse(this.storage.getItem(key));
      } catch {
        return null;
      }
    }

    writeJson(key, value) {
      try {
        this.storage.setItem(key, JSON.stringify(value));
      } catch {
        console.warn("No se pudo guardar el progreso de EcoQuest.");
      }
    }

    static parsePoints(points) {
      const match = String(points || "").match(/[+-]?\d+/);
      return match ? Math.max(0, Number(match[0]) || 0) : 0;
    }
  }

  window.EcoQuestStorage = new EcoQuestProgressStore(window.localStorage);
  window.EcoQuestProgressStore = EcoQuestProgressStore;
  window.EcoQuestScanResult = EcoQuestScanResult;
})();
