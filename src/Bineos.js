class Bineos {
  constructor(containerId, containerHostname) {
    this.containerId = containerId;
    this.containerHostname = containerHostname || (BINEOSSCRIPTHOSTNAME.match(/^cdn\.dl\./) ? BINEOSSCRIPTHOSTNAME.substring(4) : "ad-srv.net");
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
    this.placementFunctions = {};

    // Read get parameters
    for (const [key, value] of new URL(window.location.href).searchParams.entries()) {
      this.getParameter[key] = value;
    }

    // Custom function shuffle
    this.placementFunctions.shuffle = (placement) => {
      placement.data.productLoop.sort((a, b) => Math.random() - 0.5);
    };

    // Custom function limit
    this.placementFunctions.limit = (placement, limit) => {
      placement.data.productLoop.splice(limit);
    };

    // Make this class global
    window[this.className] = this;
  }

  // Add external hook
  on(modificatorName, modificatorFunction) {
    const key = "on" + modificatorName.charAt(0).toUpperCase() + modificatorName.substring(1);
    if (!this[key]) return console.error('BINEOS: Hook "' + key + '" does not exist');
    this[key].push(modificatorFunction);
  }

  // Generate an uid starting with a letter
  generateUid() {
    return Math.random().toString(16).slice(2);
  }

  // Load CSS and JS files for placements
  loadPlacementDependencies(options) {
    const promisses = [];
    if (options.css) options.css.forEach((href) => promisses.push(this.loadCSS(href)));
    if (options.js) options.js.forEach((src) => promisses.push(this.loadJS(src)));
    return Promise.all(promisses);
  }

  loadPlacements(options = {}) {
    // Load CSS and JS files for placements
    const dependenciesLoaded = this.loadPlacementDependencies(options);

    // Load placements based on containers
    document.querySelectorAll("bineos-zone[uid]").forEach((node) => {
      const uid = node.getAttribute("uid");
      const placement = new Bineos.Placement(this);

      // Set placement target
      placement.target = node;

      // Add promise for dependency loader
      placement.dependenciesLoaded = dependenciesLoaded;

      // Load placement
      placement.load(uid);
    });
  }

  channelTracker(channelTrackerId, parameters = {}) {
    const url = new URL("https://tm." + this.containerHostname + "/tm/a/channel/tracker/" + channelTrackerId);
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
    return new Promise((resolve, reject) => {
      link.addEventListener("load", resolve);
      document.head.appendChild(link);
    });
  }

  loadJS(src) {
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = src;
    return new Promise((resolve, reject) => {
      script.addEventListener("load", resolve);
      document.head.appendChild(script);
    });
  }

  // Set datalayer variables [Deprecated: Will be removed in 3.0]
  set(dataLayer) {
    for (const [key, value] of Object.entries(dataLayer)) {
      this.dataLayer[key] = value;
    }
    return this;
  }

  // Send data to bineos server
  send() {
    // Assign getParameters and className to dataLayer
    Object.assign(this.dataLayer, this.getParameter, { className: this.className });

    // Assign getParameters to extVars
    Object.assign(this.extVar, this.getParameter);

    // Set global ntm data object
    window[this.ntmName] = [this.dataLayer, { event: "ntmInit", t: new Date().getTime() }];

    // Generate the script url
    const url = new URL("https://tm." + this.containerHostname);
    url.pathname = "/tm/a/container/init/" + this.containerId + ".js";
    url.searchParams.set("ntmData", this.ntmName);
    url.searchParams.set("rnd", Math.floor(Math.random() * 100000000));

    // Insert the script tag to the head
    const script = document.createElement("script");
    script.src = url.toString();
    document.head.appendChild(script);
  }
};

Bineos.BINEOSSCRIPTHOSTNAME = new URL(document.currentScript.src).hostname;