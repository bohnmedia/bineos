class BineosPlacement {
  constructor(bineosClass) {
    this.bineosClass = bineosClass;

    // Generate callback id
    this.callbackId = bineosClass.generateUid();

    // Add callback to callback object
    this.bineosClass.callback[this.callbackId] = this.callback.bind(this);
  }

  clickurl(url, clicktracker = true) {
    console.log("clickurl");
    this.data.clickurl = clicktracker ? this.data.clicktracker + encodeURIComponent(url) : url;
  }

  hook(name) {
    // Global modificators
    this.bineosClass[name].forEach((modificator) => modificator.apply(this));

    // Placement modificators
    if (!this.data[name]) return;
    const modificators = this.data[name].trim().split(/\s*;\s*/);
    modificators.forEach((modificator) => {
      const modificatorArguments = modificator.split(/\s*\|\s*/);
      const modificatorName = modificatorArguments.shift();
      try {
        this[modificatorName].apply(this, modificatorArguments);
      } catch (error) {
        console.error(error);
      }
    });
  }

  callback(data) {
    this.data = data;

    // Run onParseTemplate hook
    this.hook("onLoadPlacement");

    // Compile template
    this.template = Handlebars.compile(this.data.html);
    this.container = document.createElement("div");
    this.container.innerHTML = this.template(this.data);

    // Run onCompileTemplate hook
    this.hook("onCompileTemplate");

    // Move html to target
    if (this.target) {
      while (this.container.firstChild) {
        this.target.appendChild(this.container.firstChild);
      }
    }

    // Run onOutputTemplate hook
    this.hook("onOutputTemplate");

    // We dont need the container anymore
    delete this.container;
  }

  load(zoneUid) {
    // Generate request base url
    const url = new URL("https://ad." + this.bineosClass.containerDomain);
    url.pathname = "/request.php";
    url.searchParams.set("zone", zoneUid);

    // Add extVars
    const callback = this.bineosClass.className + ".callback['" + this.callbackId + "']";
    url.searchParams.append("extVar[]", "callback:" + callback);
    for (const key in this.bineosClass.extVar) {
      const value = this.bineosClass.extVar[key];
      url.searchParams.append("extVar[]", key + ":" + value);
    }

    // Append script to header
    const script = document.createElement("script");
    script.src = url.toString();
    document.head.appendChild(script);
  }
}
