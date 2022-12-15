Bineos.Placement = class {
  constructor(bineosClass) {
    this.bineosClass = bineosClass;
    this.data = {};
    this.extVar = {};
    this.onPreparePlacement = [];
    this.onLoadPlacement = [];
    this.onCompileTemplate = [];
    this.onOutputTemplate = [];

    // Generate callback id
    this.callbackId = bineosClass.generateUid();

    // Add callback to callback object
    this.bineosClass.callback[this.callbackId] = this.callback.bind(this);
  }

  // Add internal hook
  on(modificatorName, modificatorFunction) {
    const key = "on" + modificatorName.charAt(0).toUpperCase() + modificatorName.substring(1);
    if (!this[key]) return console.error('BINEOS: Hook "' + key + '" does not exist');
    this[key].push(modificatorFunction);
  }

  // Parse hooks from creative like a dom object
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
    // Run external modificators
    this.bineosClass[name].forEach((modificator) => modificator.apply(null, [this]));

    // Run internal modificators
    this[name].forEach((modificator) => modificator.apply(null, [this]));

    // Run modificators from creative
    this.hookParser(this.data[name]).forEach((modificator) => {
      try {
        modificator.args.unshift(this);
        this.bineosClass.placementFunctions[modificator.name].apply(null, modificator.args);
      } catch (error) {
        console.error(error);
      }
    });
  }

  loadTemplate(src) {
    if (!src) return { src };

    // Return the data as promise to allow parallel loading of template, javascript and css
    return {
      src,
      data: new Promise((resolve, reject) => {
        fetch(src)
          .then((response) => response.text())
          .then((template) => resolve(template));
      }),
    };
  }

  async callback(data) {
    Object.assign(this.data, data);

    // Wait for css and js dependencies
    await this.dependenciesLoaded;

    // Run onLoadPlacement hook
    this.hook("onLoadPlacement");

    // Was templateSrc changed in onLoadPlacement hook?
    if (this.templateSrc !== this.externalTemplate.src) {
      this.externalTemplate = this.loadTemplate(this.templateSrc);
    }

    // Load data from external template
    if (this.externalTemplate.src) {
      this.data.html = await this.externalTemplate.data;
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
    this.template = this.bineosClass.template.compile(this.data.html);
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

      // Run onOutputTemplate hook
      this.hook("onOutputTemplate");
    }

    // We dont need the container anymore
    delete this.container;
  }

  load(zoneUid) {
    const hostname = "ad." + this.bineosClass.containerHostname;
    const request = new Bineos.Request(hostname);
    request.zone = zoneUid;

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

    // Load external template when templateSrc was set
    this.externalTemplate = this.loadTemplate(this.templateSrc);

    // Request
    request.appendExtVars(this.extVar);
    request.loadScript();
  }
};
