const BINEOSSCRIPTHOSTNAME = new URL(document.currentScript.src).hostname;

class Bineos {
  constructor(containerId, containerDomain) {
    this.containerId = containerId;
    this.containerDomain = containerDomain || BINEOSSCRIPTHOSTNAME.match(/^cdn\.dl\./) ? BINEOSSCRIPTHOSTNAME.substring(4) : "ad-srv.net";
    this.ntmName = "_bineos" + this.generateUid();
    this.className = "_bineos" + this.generateUid();
    this.dataLayer = {};
    this.extVar = {};
    this.getParameter = {};
    this.callback = {};
    this.onPreparePlacement = [];
    this.onLoadPlacement = [];
    this.onCompileTemplate = [];
    this.onOutputTemplate = [];

    // Read get parameters
    for (const [key, value] of new URL(window.location.href).searchParams.entries()) {
      this.getParameter[key] = value;
    }

    // Make this class global
    window[this.className] = this;
  }

  // Add external hook
  on(modificatorName, modificatorFunction) {
    const key = "on" + modificatorName.charAt(0).toUpperCase() + modificatorName.substring(1);
    this[key].push(modificatorFunction);
  }

  generateUid() {
    // Generate an uid starting with a letter
    return Math.random().toString(16).slice(2);
  }

  loadPlacements() {
    // Load placements based on containers
    document.querySelectorAll("bineos-zone[uid]").forEach((node) => {
      const uid = node.getAttribute("uid");
      const placement = new BineosPlacement(this);

      // Set placement target
      placement.target = node;

      // Load placement
      placement.load(uid);
    });
  }

  channelTracker(channelTrackerId, parameters = {}) {
    const url = new URL("https://tm." + this.containerDomain + "/tm/a/channel/tracker/" + channelTrackerId);
    for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
    fetch(url, { mode: "no-cors", cache: "no-cache" });
  }

  articleScore(parameters) {
    this.channelTracker(this.asConfigChannelTrackerId, parameters);
  }

  loadCSS(href) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  // Load the bineos script
  init() {
    // Assign getParameters and className to dataLayer
    Object.assign(this.dataLayer, this.getParameter, { className: this.className });

    // Assign getParameters to extVars
    Object.assign(this.extVar, this.getParameter);

    // Set global ntm data object
    window[this.ntmName] = [this.dataLayer, { event: "ntmInit", t: new Date().getTime() }];

    // Generate the script url
    const url = new URL("https://tm." + this.containerDomain);
    url.pathname = "/tm/a/container/init/" + this.containerId + ".js";
    url.searchParams.set("ntmData", this.ntmName);
    url.searchParams.set("rnd", Math.floor(Math.random() * 100000000));

    // Insert the script tag to the head
    const script = document.createElement("script");
    script.src = url.toString();
    document.head.appendChild(script);
  }
}
