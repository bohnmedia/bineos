class Bineos {
  constructor(containerId, containerDomain) {
    this.containerId = containerId;
    this.containerDomain = containerDomain;
    this.ntmName = "_bineos" + this.generateUid();
    this.className = "_bineos" + this.generateUid();
    this.dataLayer = {};
    this.extVar = {};
    this.getParameter = {};
    this.callback = {};
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
    switch (modificatorName) {
      case loadPlacement:
        return this.onLoadPlacement.push(modificatorFunction);
      case compileTemplate:
        return this.onCompileTemplate.push(modificatorFunction);
      case outputTemplate:
        return this.onOutputTemplate.push(modificatorFunction);
    }
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
