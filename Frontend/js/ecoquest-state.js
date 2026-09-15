window.EcoQuestReady = window.EcoQuestReady.then(() => {
(function () {
  const missions = window.EcoQuestRules.missions;

  class EcoQuestScanResult {
    constructor(result) {
      this.serverScanId = result?.scanId || null;
      this.title = result?.title || "Residuo no identificado";
      this.badge = result?.badge || "Incierto";
      this.points = EcoQuestProgressStore.parsePoints(result?.points);
      this.container = result?.container || "No aplica";
      this.text = result?.text || "";
      this.isWaste = result?.isWaste ?? this.badge !== "No residuo";
      this.canUseGreenContainer = result?.canUseGreenContainer ?? this.container === "Contenedor verde";
      this.wasteType = result?.wasteType || this.badge;
      this.confidence = result?.confidence || "media";
      this.points = this.canBeStoredForRecycling ? window.EcoQuestRules.recyclingXp : 0;
    }

    get canBeStoredForRecycling() {
      return this.isWaste && this.container !== "No aplica";
    }

    toPendingItem() {
      return {
        serverScanId: this.serverScanId,
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
      const suffix = window.EcoQuestAccount?.profile?.id ? `:${window.EcoQuestAccount.profile.id}` : "";
      this.progressKey = "ecoquestProgress" + suffix;
      this.pendingKey = "ecoquestPendingScans" + suffix;
    }

    readProgress() {
      const storedProgress = this.readJson(this.progressKey);

      return {
        totalPoints: Number(storedProgress?.totalPoints) || 0,
        scans: Number(storedProgress?.scans) || 0,
        successfulScans: Number(storedProgress?.successfulScans) || 0,
        completedMissionIds: Array.isArray(storedProgress?.completedMissionIds) ? storedProgress.completedMissionIds : [],
        rewardedScanIds: Array.isArray(storedProgress?.rewardedScanIds) ? storedProgress.rewardedScanIds : [],
        activity: storedProgress?.activity || { visits: [], challenges: [], claimedStreakDays: [] },
        history: Array.isArray(storedProgress?.history) ? storedProgress.history : [],
      };
    }

    writeProgress(progress) {
      if (!this.writeJson(this.progressKey, progress)) {
        throw new Error("No se pudo guardar el progreso. Liberá espacio y volvé a intentar.");
      }
      window.dispatchEvent(new Event("ecoquest:progress"));
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
      const progress = this.readProgress();
      const requestedIds = new Set(scans.map(scan => scan.id));
      const consumedIds = new Set(progress.rewardedScanIds);
      const pending = this.readPendingScans();
      // Cada residuo pendiente se premia una sola vez.
      scans = pending.filter(scan => {
        if (!requestedIds.has(scan.id) || consumedIds.has(scan.id)) return false;
        consumedIds.add(scan.id);
        return true;
      });
      if (!scans.length) return { awardedPoints: 0, bonusPoints: 0, progress, remainingScans: pending };
      const scanIds = new Set(scans.map(scan => scan.id));
      const recyclingPoints = scans.length * window.EcoQuestRules.recyclingXp;
      const awardedPoints = recyclingPoints;
      progress.rewardedScanIds = [...consumedIds];
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

      const dailyBonus = scans.length ? window.EcoQuestActivity.record(progress, true) : 0;
      progress.totalPoints += dailyBonus;
      const bonusPoints = this.applyMissionRewards(progress) + dailyBonus;
      const remainingScans = this.readPendingScans().filter((scan) => !scanIds.has(scan.id));
      this.writeProgress(progress);
      this.writeJson(this.pendingKey, remainingScans);

      return {
        awardedPoints: recyclingPoints + bonusPoints,
        bonusPoints,
        progress,
        remainingScans,
      };
    }

    applyMissionRewards(progress) {
      const completed = new Set(progress.completedMissionIds);
      let bonus = 0;
      for (const mission of missions) {
        if (progress.successfulScans >= mission.goal && !completed.has(mission.id)) {
          completed.add(mission.id);
          bonus += mission.reward;
        }
      }
      progress.completedMissionIds = [...completed];
      progress.totalPoints += bonus;
      return bonus;
    }

    reconcileMissionRewards() {
      if (window.EcoQuestAccount?.profile) return this.readProgress();
      const progress = this.readProgress();
      // Conservamos los logros anteriores sin repetir premios.
      if (this.applyMissionRewards(progress) > 0) this.writeProgress(progress);
      return progress;
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
        return true;
      } catch {
        console.warn("No se pudo guardar el progreso de EcoQuest.");
        return false;
      }
    }

    static parsePoints(points) {
      const match = String(points || "").match(/[+-]?\d+/);
      return match ? Math.max(0, Number(match[0]) || 0) : 0;
    }
  }

  window.EcoQuestMissions = missions;
  window.EcoQuestStorage = new EcoQuestProgressStore(window.localStorage);
  window.EcoQuestProgressStore = EcoQuestProgressStore;
  window.EcoQuestScanResult = EcoQuestScanResult;
})();

});