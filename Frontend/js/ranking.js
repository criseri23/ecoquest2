const SCORE_STORAGE_KEY = "ecoquestProgress";

const rankingScore = document.querySelector("#rankingScore");
const rankingScans = document.querySelector("#rankingScans");
const rankingSuccess = document.querySelector("#rankingSuccess");
const rankingPlayerScore = document.querySelector("#rankingPlayerScore");

function readProgress() {
  try {
    const storedProgress = JSON.parse(localStorage.getItem(SCORE_STORAGE_KEY));

    return {
      totalPoints: Number(storedProgress?.totalPoints) || 0,
      scans: Number(storedProgress?.scans) || 0,
      successfulScans: Number(storedProgress?.successfulScans) || 0,
    };
  } catch {
    return {
      totalPoints: 0,
      scans: 0,
      successfulScans: 0,
    };
  }
}

function renderRanking() {
  const progress = readProgress();

  rankingScore.textContent = progress.totalPoints;
  rankingScans.textContent = progress.scans;
  rankingSuccess.textContent = progress.successfulScans;
  rankingPlayerScore.textContent = `${progress.totalPoints} XP`;
}

renderRanking();
