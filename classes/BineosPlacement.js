class BineosPlacement {
  constructor(bineosClass) {
    this.bineosClass = bineosClass;
    this.data = {};
    this.extVar = {};

    // Generate callback id
    this.callbackId = bineosClass.generateUid();

    // Add callback to callback object
    this.bineosClass.callback[this.callbackId] = this.callback.bind(this);
  }

  clickurl(url) {
    return this.data["rd_click_enc"] + encodeURIComponent(url);
  }

  shuffle(placement) {
    placement.data.productLoop.sort((a, b) => Math.random() - 0.5);
  }

  limit(placement, limit) {
    placement.data.productLoop.splice(limit);
  }

  hook(name) {
    // Global modificators
    this.bineosClass[name].forEach((modificator) => modificator.apply(null, [this]));

    // Placement modificators
    if (!this.data[name]) return;
    const modificators = this.data[name].trim().split(/\s*;\s*/);
    modificators.forEach((modificator) => {
      const modificatorArguments = modificator.split(/\s*\|\s*/);
      const modificatorName = modificatorArguments.shift();
      modificatorArguments.unshift(this);
      try {
        this[modificatorName].apply(null, modificatorArguments);
      } catch (error) {
        console.error(error);
      }
    });
  }

  async callback(data) {
    Object.assign(this.data, data);

    this.data.replace = this.target ? this.target.hasAttribute("replace") : null;

    // Run onParseTemplate hook
    this.hook("onLoadPlacement");

    // Template from file
    if (this.templateSrc) {
      let response = await fetch(this.templateSrc);
      if (response.status === 200) {
        let html = await response.text();
        this.data.html = html;
      }
    }

    // Template from tag
    if (this.templateId) {
      let templateTag = document.querySelector("#" + this.templateId + '[type="text/bineos-template"]');
      if (templateTag) this.data.html = templateTag.text;
    }

    // Compile template
    this.template = BineosTemplate.compile(this.data.html);
    this.container = document.createElement("div");
    this.container.innerHTML = this.template(this.data);

    // Run onCompileTemplate hook
    this.hook("onCompileTemplate");

    // Move html to target
    if (this.target) {
      while (this.container.firstChild) {
        if (this.replace) {
          this.target.parentNode.insertBefore(this.container.firstChild, this.target);
        } else {
          this.target.appendChild(this.container.firstChild);
        }
      }
      if (this.replace) {
        this.target.parentNode.removeChild(this.target);
        delete this.target;
      }
    }

    // Run onOutputTemplate hook
    this.hook("onOutputTemplate");

    // We dont need the container anymore
    delete this.container;
  }

  load(zoneUid) {
    this.zoneUid = zoneUid;

    // Generate request base url
    const url = new URL("https://ad." + this.bineosClass.containerDomain);
    url.pathname = "/request.php";
    url.searchParams.set("zone", zoneUid);

    // Global extVars
    Object.assign(this.extVar, this.bineosClass.extVar);

    // Extvars from target
    if (this.target) {
      [...this.target.attributes].forEach((attr) => {
        const split = attr.name.split("-");
        if ("extvar" === split[0] && split.length > 1) {
          this.extVar[split.slice(1).join("-")] = attr.nodeValue;
        }
      });
    }

    // Templates from target
    this.templateSrc = this.target ? this.target.getAttribute("template-src") : null;
    this.templateId = this.target ? this.target.getAttribute("template-id") : null;

    // Location of callback function for extVar
    this.extVar.callback = this.bineosClass.className + ".callback['" + this.callbackId + "']";

    // Run onPreparePlacement hook
    this.hook("onPreparePlacement");

    // Set global extvars from
    for (const key in this.extVar) {
      const value = this.extVar[key];
      url.searchParams.append("extVar[]", key + ":" + value);
    }

    // Append script to header
    const script = document.createElement("script");
    script.src = url.toString();
    document.head.appendChild(script);
  }
}
