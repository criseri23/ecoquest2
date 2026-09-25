(() => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  const key = "ecoquestMotion";
  let preference = "auto";
  try { preference = localStorage.getItem(key) || "auto"; } catch { }
  if (!["auto", "on", "off"].includes(preference)) preference = "auto";

  function apply() {
    document.documentElement.dataset.motion = preference;
    window.dispatchEvent(new Event("ecoquest-motion-change"));
  }

  window.EcoQuestMotion = {
    get preference() { return preference; },
    get enabled() { return preference === "on" || (preference === "auto" && !media.matches); },
    set(value) {
      if (!["auto", "on", "off"].includes(value)) return;
      preference = value;
      try { localStorage.setItem(key, value); } catch { }
      apply();
    }
  };
  if (media.addEventListener) media.addEventListener("change", apply);
  else media.addListener(apply);
  apply();
  const select = document.querySelector("#motionPreference");
  if (select) {
    select.value = preference;
    select.addEventListener("change", () => window.EcoQuestMotion.set(select.value));
  }
})();
