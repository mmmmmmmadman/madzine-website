/* Modular Fighters — Firebase web config for the online queue and the leaderboard.
   Paste the values from the Firebase console: Project settings > Your apps > SDK setup and
   configuration > Config. Only databaseURL is required (no Firebase Auth is used); apiKey / appId
   are optional and only matter if Auth or Analytics are added later.
   Leave databaseURL empty to keep the online features off (RANDOM MATCH then says so). */
window.MF_FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  databaseURL: "https://modular-fighters-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "modular-fighters",
  appId: ""
};
