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

  hookParser(modificators) {
    if (!modificators) return [];
    const container = document.createElement("div");
    const attributes = [];
    container.innerHTML = "<bineos-parser " + modificators + "></bineos-parser>";
    const parser = container.querySelector("bineos-parser");
    for (let i = 0; i < parser.attributes.length; i++) {
      try {
        attributes.push({
          name: parser.attributes[i].name,
          args: parser.attributes[i].value ? parser.attributes[i].value.split(",") : [],
        });
      } catch (error) {
        console.error(error);
      }
    }
    return attributes;
  }

  hook(name) {
    // Run global modificators
    this.bineosClass[name].forEach((modificator) => modificator.apply(null, [this]));

    // Run placement modificators
    this.hookParser(this.data[name]).forEach((modificator) => {
      try {
        modificator.args.unshift(this);
        this.bineosClass.placementFunctions[modificator.name].apply(null, modificator.args);
      } catch (error) {
        console.error(error);
      }
    });
  }

  async callback(data) {
    Object.assign(this.data, data);

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

    // Template from tag by id
    if (this.templateId) {
      let templateTag = document.querySelector("#" + this.templateId + '[type="text/bineos-template"]');
      if (templateTag) this.data.html = templateTag.text;
    }

    // Template from embedded tag
    if (this.templateTag) {
      this.data.html = this.templateTag.text;
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

    // Options from target
    if (this.target) {
      this.templateSrc = this.target.getAttribute("template-src");
      this.templateId = this.target.getAttribute("template-id");
      this.templateTag = this.target.querySelector('script[type="text/bineos-template"]');
      this.replace = this.target.getAttribute("replace");
    }

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
