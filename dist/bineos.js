class Bineos {
  constructor(containerId, containerHostname) {
    this.containerId = containerId;
    this.containerHostname = containerHostname || (this.scriptHostname.match(/^cdn\.dl\./) ? this.scriptHostname.substring(4) : "ad-srv.net");
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
    this.placementFunctions = this.placementFunctions || {};

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

  // Load a placement by its zoneuid
  loadPlacement(zoneUid, extVars = {}) {
    const placement = new Bineos.Placement(this);
    placement.extVar = extVars;
    return new Promise((resolve, reject) => {
      placement.on("compileTemplate", resolve);
      placement.load(zoneUid);
    });
  }

  // Load placements by "bineos-zone" tags
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
}

// Add hostname of the javascript file to the bineos class
((scriptHostname) => {
  Bineos.prototype.scriptHostname = scriptHostname;
})(new URL(document.currentScript.src).hostname);

Bineos.Request = class {
  constructor(hostname) {
    this.url = new URL("https://" + hostname + "/request.php");
  }

  get zone() {
    return this.url.searchParams.get("zone");
  }

  set zone(value) {
    this.url.searchParams.set("zone", value);
  }

  appendExtVar(key, value) {
    this.url.searchParams.append("extVar[]", key + ':' + value);
  }

  appendExtVars(values) {
    for (const [key, value] of Object.entries(values)) {
      this.appendExtVar(key, value);
    }
  }

  appendExtData(key, value2) {
    this.url.searchParams.append("extData[]", key + ':' + value);
  }

  // Make request as script tag
  loadScript() {
    const script = document.createElement("script");
    script.src = this.url.toString();
    return new Promise((resolve, reject) => {
      script.addEventListener("load", resolve);
      document.head.appendChild(script);
    });
  }

  // Load request output into a string
  loadText() {
    return new Promise((resolve, reject) => {
      fetch(this.url.toString())
        .then((response) => response.text())
        .then((data) => resolve(data));
    });
  }
};

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

/**
 * Template7 1.4.1
 * Mobile-first HTML template engine
 *
 * http://www.idangero.us/template7/
 *
 * Copyright 2019, Vladimir Kharlampidi
 * The iDangero.us
 * http://www.idangero.us/
 *
 * Licensed under MIT
 *
 * Released on: February 5, 2019
 */

Bineos.prototype.template = (() => {
  "use strict";

  var t7ctx;
  if (typeof window !== "undefined") {
    t7ctx = window;
  } else if (typeof global !== "undefined") {
    t7ctx = global;
  } else {
    t7ctx = undefined;
  }

  var Template7Context = t7ctx;

  var Template7Utils = {
    quoteSingleRexExp: new RegExp("'", "g"),
    quoteDoubleRexExp: new RegExp('"', "g"),
    isFunction: function isFunction(func) {
      return typeof func === "function";
    },
    escape: function escape(string) {
      if (string === void 0) string = "";

      return string.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    },
    helperToSlices: function helperToSlices(string) {
      var quoteDoubleRexExp = Template7Utils.quoteDoubleRexExp;
      var quoteSingleRexExp = Template7Utils.quoteSingleRexExp;
      var helperParts = string
        .replace(/[{}#}]/g, "")
        .trim()
        .split(" ");
      var slices = [];
      var shiftIndex;
      var i;
      var j;
      for (i = 0; i < helperParts.length; i += 1) {
        var part = helperParts[i];
        var blockQuoteRegExp = void 0;
        var openingQuote = void 0;
        if (i === 0) {
          slices.push(part);
        } else if (part.indexOf('"') === 0 || part.indexOf("'") === 0) {
          blockQuoteRegExp = part.indexOf('"') === 0 ? quoteDoubleRexExp : quoteSingleRexExp;
          openingQuote = part.indexOf('"') === 0 ? '"' : "'";
          // Plain String
          if (part.match(blockQuoteRegExp).length === 2) {
            // One word string
            slices.push(part);
          } else {
            // Find closed Index
            shiftIndex = 0;
            for (j = i + 1; j < helperParts.length; j += 1) {
              part += " " + helperParts[j];
              if (helperParts[j].indexOf(openingQuote) >= 0) {
                shiftIndex = j;
                slices.push(part);
                break;
              }
            }
            if (shiftIndex) {
              i = shiftIndex;
            }
          }
        } else if (part.indexOf("=") > 0) {
          // Hash
          var hashParts = part.split("=");
          var hashName = hashParts[0];
          var hashContent = hashParts[1];
          if (!blockQuoteRegExp) {
            blockQuoteRegExp = hashContent.indexOf('"') === 0 ? quoteDoubleRexExp : quoteSingleRexExp;
            openingQuote = hashContent.indexOf('"') === 0 ? '"' : "'";
          }
          if (hashContent.match(blockQuoteRegExp).length !== 2) {
            shiftIndex = 0;
            for (j = i + 1; j < helperParts.length; j += 1) {
              hashContent += " " + helperParts[j];
              if (helperParts[j].indexOf(openingQuote) >= 0) {
                shiftIndex = j;
                break;
              }
            }
            if (shiftIndex) {
              i = shiftIndex;
            }
          }
          var hash = [hashName, hashContent.replace(blockQuoteRegExp, "")];
          slices.push(hash);
        } else {
          // Plain variable
          slices.push(part);
        }
      }
      return slices;
    },
    stringToBlocks: function stringToBlocks(string) {
      var blocks = [];
      var i;
      var j;
      if (!string) {
        return [];
      }
      var stringBlocks = string.split(/({{[^{^}]*}})/);
      for (i = 0; i < stringBlocks.length; i += 1) {
        var block = stringBlocks[i];
        if (block === "") {
          continue;
        }
        if (block.indexOf("{{") < 0) {
          blocks.push({
            type: "plain",
            content: block,
          });
        } else {
          if (block.indexOf("{/") >= 0) {
            continue;
          }
          block = block.replace(/{{([#/])*([ ])*/, "{{$1").replace(/([ ])*}}/, "}}");
          if (block.indexOf("{#") < 0 && block.indexOf(" ") < 0 && block.indexOf("else") < 0) {
            // Simple variable
            blocks.push({
              type: "variable",
              contextName: block.replace(/[{}]/g, ""),
            });
            continue;
          }
          // Helpers
          var helperSlices = Template7Utils.helperToSlices(block);
          var helperName = helperSlices[0];
          var isPartial = helperName === ">";
          var helperContext = [];
          var helperHash = {};
          for (j = 1; j < helperSlices.length; j += 1) {
            var slice = helperSlices[j];
            if (Array.isArray(slice)) {
              // Hash
              helperHash[slice[0]] = slice[1] === "false" ? false : slice[1];
            } else {
              helperContext.push(slice);
            }
          }

          if (block.indexOf("{#") >= 0) {
            // Condition/Helper
            var helperContent = "";
            var elseContent = "";
            var toSkip = 0;
            var shiftIndex = void 0;
            var foundClosed = false;
            var foundElse = false;
            var depth = 0;
            for (j = i + 1; j < stringBlocks.length; j += 1) {
              if (stringBlocks[j].indexOf("{{#") >= 0) {
                depth += 1;
              }
              if (stringBlocks[j].indexOf("{{/") >= 0) {
                depth -= 1;
              }
              if (stringBlocks[j].indexOf("{{#" + helperName) >= 0) {
                helperContent += stringBlocks[j];
                if (foundElse) {
                  elseContent += stringBlocks[j];
                }
                toSkip += 1;
              } else if (stringBlocks[j].indexOf("{{/" + helperName) >= 0) {
                if (toSkip > 0) {
                  toSkip -= 1;
                  helperContent += stringBlocks[j];
                  if (foundElse) {
                    elseContent += stringBlocks[j];
                  }
                } else {
                  shiftIndex = j;
                  foundClosed = true;
                  break;
                }
              } else if (stringBlocks[j].indexOf("else") >= 0 && depth === 0) {
                foundElse = true;
              } else {
                if (!foundElse) {
                  helperContent += stringBlocks[j];
                }
                if (foundElse) {
                  elseContent += stringBlocks[j];
                }
              }
            }
            if (foundClosed) {
              if (shiftIndex) {
                i = shiftIndex;
              }
              if (helperName === "raw") {
                blocks.push({
                  type: "plain",
                  content: helperContent,
                });
              } else {
                blocks.push({
                  type: "helper",
                  helperName: helperName,
                  contextName: helperContext,
                  content: helperContent,
                  inverseContent: elseContent,
                  hash: helperHash,
                });
              }
            }
          } else if (block.indexOf(" ") > 0) {
            if (isPartial) {
              helperName = "_partial";
              if (helperContext[0]) {
                if (helperContext[0].indexOf("[") === 0) {
                  helperContext[0] = helperContext[0].replace(/[[\]]/g, "");
                } else {
                  helperContext[0] = '"' + helperContext[0].replace(/"|'/g, "") + '"';
                }
              }
            }
            blocks.push({
              type: "helper",
              helperName: helperName,
              contextName: helperContext,
              hash: helperHash,
            });
          }
        }
      }
      return blocks;
    },
    parseJsVariable: function parseJsVariable(expression, replace, object) {
      return expression
        .split(/([+ \-*/^()&=|<>!%:?])/g)
        .reduce(function (arr, part) {
          if (!part) {
            return arr;
          }
          if (part.indexOf(replace) < 0) {
            arr.push(part);
            return arr;
          }
          if (!object) {
            arr.push(JSON.stringify(""));
            return arr;
          }

          var variable = object;
          if (part.indexOf(replace + ".") >= 0) {
            part
              .split(replace + ".")[1]
              .split(".")
              .forEach(function (partName) {
                if (partName in variable) {
                  variable = variable[partName];
                } else {
                  variable = undefined;
                }
              });
          }
          if (typeof variable === "string" || Array.isArray(variable) || (variable.constructor && variable.constructor === Object)) {
            variable = JSON.stringify(variable);
          }
          if (variable === undefined) {
            variable = "undefined";
          }

          arr.push(variable);
          return arr;
        }, [])
        .join("");
    },
    parseJsParents: function parseJsParents(expression, parents) {
      return expression
        .split(/([+ \-*^()&=|<>!%:?])/g)
        .reduce(function (arr, part) {
          if (!part) {
            return arr;
          }

          if (part.indexOf("../") < 0) {
            arr.push(part);
            return arr;
          }

          if (!parents || parents.length === 0) {
            arr.push(JSON.stringify(""));
            return arr;
          }

          var levelsUp = part.split("../").length - 1;
          var parentData = levelsUp > parents.length ? parents[parents.length - 1] : parents[levelsUp - 1];

          var variable = parentData;
          var parentPart = part.replace(/..\//g, "");
          parentPart.split(".").forEach(function (partName) {
            if (typeof variable[partName] !== "undefined") {
              variable = variable[partName];
            } else {
              variable = "undefined";
            }
          });
          if (variable === false || variable === true) {
            arr.push(JSON.stringify(variable));
            return arr;
          }
          if (variable === null || variable === "undefined") {
            arr.push(JSON.stringify(""));
            return arr;
          }
          arr.push(JSON.stringify(variable));
          return arr;
        }, [])
        .join("");
    },
    getCompileVar: function getCompileVar(name, ctx, data) {
      if (data === void 0) data = "data_1";

      var variable = ctx;
      var parts;
      var levelsUp = 0;
      var newDepth;
      if (name.indexOf("../") === 0) {
        levelsUp = name.split("../").length - 1;
        newDepth = variable.split("_")[1] - levelsUp;
        variable = "ctx_" + (newDepth >= 1 ? newDepth : 1);
        parts = name.split("../")[levelsUp].split(".");
      } else if (name.indexOf("@global") === 0) {
        variable = "Template7.global";
        parts = name.split("@global.")[1].split(".");
      } else if (name.indexOf("@root") === 0) {
        variable = "root";
        parts = name.split("@root.")[1].split(".");
      } else {
        parts = name.split(".");
      }
      for (var i = 0; i < parts.length; i += 1) {
        var part = parts[i];
        if (part.indexOf("@") === 0) {
          var dataLevel = data.split("_")[1];
          if (levelsUp > 0) {
            dataLevel = newDepth;
          }
          if (i > 0) {
            variable += "[(data_" + dataLevel + " && data_" + dataLevel + "." + part.replace("@", "") + ")]";
          } else {
            variable = "(data_" + dataLevel + " && data_" + dataLevel + "." + part.replace("@", "") + ")";
          }
        } else if (Number.isFinite ? Number.isFinite(part) : Template7Context.isFinite(part)) {
          variable += "[" + part + "]";
        } else if (part === "this" || part.indexOf("this.") >= 0 || part.indexOf("this[") >= 0 || part.indexOf("this(") >= 0) {
          variable = part.replace("this", ctx);
        } else {
          variable += "." + part;
        }
      }
      return variable;
    },
    getCompiledArguments: function getCompiledArguments(contextArray, ctx, data) {
      var arr = [];
      for (var i = 0; i < contextArray.length; i += 1) {
        if (/^['"]/.test(contextArray[i])) {
          arr.push(contextArray[i]);
        } else if (/^(true|false|\d+)$/.test(contextArray[i])) {
          arr.push(contextArray[i]);
        } else {
          arr.push(Template7Utils.getCompileVar(contextArray[i], ctx, data));
        }
      }

      return arr.join(", ");
    },
  };

  /* eslint no-eval: "off" */

  var Template7Helpers = {
    _partial: function _partial(partialName, options) {
      var ctx = this;
      var p = Template7Class.partials[partialName];
      if (!p || (p && !p.template)) {
        return "";
      }
      if (!p.compiled) {
        p.compiled = new Template7Class(p.template).compile();
      }
      Object.keys(options.hash).forEach(function (hashName) {
        ctx[hashName] = options.hash[hashName];
      });
      return p.compiled(ctx, options.data, options.root);
    },
    escape: function escape(context) {
      if (typeof context === "undefined" || context === null) {
        return "";
      }
      if (typeof context !== "string") {
        throw new Error('Template7: Passed context to "escape" helper should be a string');
      }
      return Template7Utils.escape(context);
    },
    if: function if$1(context, options) {
      var ctx = context;
      if (Template7Utils.isFunction(ctx)) {
        ctx = ctx.call(this);
      }
      if (ctx) {
        return options.fn(this, options.data);
      }

      return options.inverse(this, options.data);
    },
    unless: function unless(context, options) {
      var ctx = context;
      if (Template7Utils.isFunction(ctx)) {
        ctx = ctx.call(this);
      }
      if (!ctx) {
        return options.fn(this, options.data);
      }

      return options.inverse(this, options.data);
    },
    each: function each(context, options) {
      var ctx = context;
      var ret = "";
      var i = 0;
      if (Template7Utils.isFunction(ctx)) {
        ctx = ctx.call(this);
      }
      if (Array.isArray(ctx)) {
        if (options.hash.reverse) {
          ctx = ctx.reverse();
        }
        for (i = 0; i < ctx.length; i += 1) {
          ret += options.fn(ctx[i], { first: i === 0, last: i === ctx.length - 1, index: i });
        }
        if (options.hash.reverse) {
          ctx = ctx.reverse();
        }
      } else {
        // eslint-disable-next-line
        for (var key in ctx) {
          i += 1;
          ret += options.fn(ctx[key], { key: key });
        }
      }
      if (i > 0) {
        return ret;
      }
      return options.inverse(this);
    },
    with: function with$1(context, options) {
      var ctx = context;
      if (Template7Utils.isFunction(ctx)) {
        ctx = context.call(this);
      }
      return options.fn(ctx);
    },
    join: function join(context, options) {
      var ctx = context;
      if (Template7Utils.isFunction(ctx)) {
        ctx = ctx.call(this);
      }
      return ctx.join(options.hash.delimiter || options.hash.delimeter);
    },
    js: function js(expression, options) {
      var data = options.data;
      var func;
      var execute = expression;
      "index first last key".split(" ").forEach(function (prop) {
        if (typeof data[prop] !== "undefined") {
          var re1 = new RegExp("this.@" + prop, "g");
          var re2 = new RegExp("@" + prop, "g");
          execute = execute.replace(re1, JSON.stringify(data[prop])).replace(re2, JSON.stringify(data[prop]));
        }
      });
      if (options.root && execute.indexOf("@root") >= 0) {
        execute = Template7Utils.parseJsVariable(execute, "@root", options.root);
      }
      if (execute.indexOf("@global") >= 0) {
        execute = Template7Utils.parseJsVariable(execute, "@global", Template7Context.Template7.global);
      }
      if (execute.indexOf("../") >= 0) {
        execute = Template7Utils.parseJsParents(execute, options.parents);
      }
      if (execute.indexOf("return") >= 0) {
        func = "(function(){" + execute + "})";
      } else {
        func = "(function(){return (" + execute + ")})";
      }
      return eval(func).call(this);
    },
    js_if: function js_if(expression, options) {
      var data = options.data;
      var func;
      var execute = expression;
      "index first last key".split(" ").forEach(function (prop) {
        if (typeof data[prop] !== "undefined") {
          var re1 = new RegExp("this.@" + prop, "g");
          var re2 = new RegExp("@" + prop, "g");
          execute = execute.replace(re1, JSON.stringify(data[prop])).replace(re2, JSON.stringify(data[prop]));
        }
      });
      if (options.root && execute.indexOf("@root") >= 0) {
        execute = Template7Utils.parseJsVariable(execute, "@root", options.root);
      }
      if (execute.indexOf("@global") >= 0) {
        execute = Template7Utils.parseJsVariable(execute, "@global", Template7Context.Template7.global);
      }
      if (execute.indexOf("../") >= 0) {
        execute = Template7Utils.parseJsParents(execute, options.parents);
      }
      if (execute.indexOf("return") >= 0) {
        func = "(function(){" + execute + "})";
      } else {
        func = "(function(){return (" + execute + ")})";
      }
      var condition = eval(func).call(this);
      if (condition) {
        return options.fn(this, options.data);
      }

      return options.inverse(this, options.data);
    },
  };
  Template7Helpers.js_compare = Template7Helpers.js_if;

  var Template7Options = {};
  var Template7Partials = {};

  var Template7Class = function Template7Class(template) {
    var t = this;
    t.template = template;
  };

  var staticAccessors = { options: { configurable: true }, partials: { configurable: true }, helpers: { configurable: true } };
  Template7Class.prototype.compile = function compile(template, depth) {
    if (template === void 0) template = this.template;
    if (depth === void 0) depth = 1;

    var t = this;
    if (t.compiled) {
      return t.compiled;
    }

    if (typeof template !== "string") {
      throw new Error("Template7: Template must be a string");
    }
    var stringToBlocks = Template7Utils.stringToBlocks;
    var getCompileVar = Template7Utils.getCompileVar;
    var getCompiledArguments = Template7Utils.getCompiledArguments;

    var blocks = stringToBlocks(template);
    var ctx = "ctx_" + depth;
    var data = "data_" + depth;
    if (blocks.length === 0) {
      return function empty() {
        return "";
      };
    }

    function getCompileFn(block, newDepth) {
      if (block.content) {
        return t.compile(block.content, newDepth);
      }
      return function empty() {
        return "";
      };
    }
    function getCompileInverse(block, newDepth) {
      if (block.inverseContent) {
        return t.compile(block.inverseContent, newDepth);
      }
      return function empty() {
        return "";
      };
    }

    var resultString = "";
    if (depth === 1) {
      resultString += "(function (" + ctx + ", " + data + ", root) {\n";
    } else {
      resultString += "(function (" + ctx + ", " + data + ") {\n";
    }
    if (depth === 1) {
      resultString += "function isArray(arr){return Array.isArray(arr);}\n";
      resultString += "function isFunction(func){return (typeof func === 'function');}\n";
      resultString += 'function c(val, ctx) {if (typeof val !== "undefined" && val !== null) {if (isFunction(val)) {return val.call(ctx);} else return val;} else return "";}\n';
      resultString += "root = root || ctx_1 || {};\n";
    }
    resultString += "var r = '';\n";
    var i;
    for (i = 0; i < blocks.length; i += 1) {
      var block = blocks[i];
      // Plain block
      if (block.type === "plain") {
        // eslint-disable-next-line
        resultString +=
          "r +='" +
          block.content
            .replace(/\r/g, "\\r")
            .replace(/\n/g, "\\n")
            .replace(/'/g, "\\" + "'") +
          "';";
        continue;
      }
      var variable = void 0;
      var compiledArguments = void 0;
      // Variable block
      if (block.type === "variable") {
        variable = getCompileVar(block.contextName, ctx, data);
        resultString += "r += c(" + variable + ", " + ctx + ");";
      }
      // Helpers block
      if (block.type === "helper") {
        var parents = void 0;
        if (ctx !== "ctx_1") {
          var level = ctx.split("_")[1];
          var parentsString = "ctx_" + (level - 1);
          for (var j = level - 2; j >= 1; j -= 1) {
            parentsString += ", ctx_" + j;
          }
          parents = "[" + parentsString + "]";
        } else {
          parents = "[" + ctx + "]";
        }
        var dynamicHelper = void 0;
        if (block.helperName.indexOf("[") === 0) {
          block.helperName = getCompileVar(block.helperName.replace(/[[\]]/g, ""), ctx, data);
          dynamicHelper = true;
        }
        if (dynamicHelper || block.helperName in Template7Helpers) {
          compiledArguments = getCompiledArguments(block.contextName, ctx, data);
          resultString += "r += (Template7Helpers" + (dynamicHelper ? "[" + block.helperName + "]" : "." + block.helperName) + ").call(" + ctx + ", " + (compiledArguments && compiledArguments + ", ") + "{hash:" + JSON.stringify(block.hash) + ", data: " + data + " || {}, fn: " + getCompileFn(block, depth + 1) + ", inverse: " + getCompileInverse(block, depth + 1) + ", root: root, parents: " + parents + "});";
        } else if (block.contextName.length > 0) {
          throw new Error('Template7: Missing helper: "' + block.helperName + '"');
        } else {
          variable = getCompileVar(block.helperName, ctx, data);
          resultString += "if (" + variable + ") {";
          resultString += "if (isArray(" + variable + ")) {";
          resultString += "r += (Template7Helpers.each).call(" + ctx + ", " + variable + ", {hash:" + JSON.stringify(block.hash) + ", data: " + data + " || {}, fn: " + getCompileFn(block, depth + 1) + ", inverse: " + getCompileInverse(block, depth + 1) + ", root: root, parents: " + parents + "});";
          resultString += "}else {";
          resultString += "r += (Template7Helpers.with).call(" + ctx + ", " + variable + ", {hash:" + JSON.stringify(block.hash) + ", data: " + data + " || {}, fn: " + getCompileFn(block, depth + 1) + ", inverse: " + getCompileInverse(block, depth + 1) + ", root: root, parents: " + parents + "});";
          resultString += "}}";
        }
      }
    }
    resultString += "\nreturn r;})";

    if (depth === 1) {
      // eslint-disable-next-line
      t.compiled = eval(resultString);
      return t.compiled;
    }
    return resultString;
  };
  staticAccessors.options.get = function () {
    return Template7Options;
  };
  staticAccessors.partials.get = function () {
    return Template7Partials;
  };
  staticAccessors.helpers.get = function () {
    return Template7Helpers;
  };

  Object.defineProperties(Template7Class, staticAccessors);

  function Template7() {
    var args = [],
      len = arguments.length;
    while (len--) args[len] = arguments[len];

    var template = args[0];
    var data = args[1];
    if (args.length === 2) {
      var instance = new Template7Class(template);
      var rendered = instance.compile()(data);
      instance = null;
      return rendered;
    }
    return new Template7Class(template);
  }
  Template7.registerHelper = function registerHelper(name, fn) {
    Template7Class.helpers[name] = fn;
  };
  Template7.unregisterHelper = function unregisterHelper(name) {
    Template7Class.helpers[name] = undefined;
    delete Template7Class.helpers[name];
  };
  Template7.registerPartial = function registerPartial(name, template) {
    Template7Class.partials[name] = { template: template };
  };
  Template7.unregisterPartial = function unregisterPartial(name) {
    if (Template7Class.partials[name]) {
      Template7Class.partials[name] = undefined;
      delete Template7Class.partials[name];
    }
  };
  Template7.compile = function compile(template, options) {
    var instance = new Template7Class(template, options);
    return instance.compile();
  };

  Template7.options = Template7Class.options;
  Template7.helpers = Template7Class.helpers;
  Template7.partials = Template7Class.partials;

  // Helper for german dates
  Template7.registerHelper("dateFormat", function (dateStr, format) {
    const dayNames = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
    const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
    const date = new Date(dateStr);
    const formatArr = format.split("");
    const elements = {
      // Day
      d: ("0" + date.getDate()).slice(-2), // Day of the month, 2 digits with leading zeros
      D: dayNames[date.getDay()].substring(0, 2), // A textual representation of a day, two letters
      j: date.getDate(), // Day of the month without leading zeros
      l: dayNames[date.getDay()], // A full textual representation of the day of the week
      w: date.getDay(), // Numeric representation of the day of the week
      // Month
      F: monthNames[date.getMonth()], // A full textual representation of a month, such as January or March
      m: ("0" + (date.getMonth() + 1)).slice(-2), // Numeric representation of a month, with leading zeros
      M: monthNames[date.getMonth()].substring(0, 3), // A short textual representation of a month, three letters
      n: date.getMonth() + 1, // Numeric representation of a month, without leading zeros
      // Year
      Y: date.getFullYear(), // A full numeric representation of a year
      // Time
      G: date.getHours(), // 24-hour format of an hour without leading zeros
      H: ("0" + date.getHours()).slice(-2), // 24-hour format of an hour with leading zeros
      i: ("0" + date.getMinutes()).slice(-2), // Minutes with leading zeros
      s: ("0" + date.getSeconds()).slice(-2), // Seconds with leading zeros
    };
    return formatArr.map((v) => (elements[v] ? elements[v] : v)).join("");
  });

  return Template7;
})();

Bineos.prototype.placementFunctions = {
  // Custom function shuffle
  shuffle: (placement) => {
    placement.data.productLoop.sort((a, b) => Math.random() - 0.5);
  },

  // Custom function limit
  limit: (placement, limit) => {
    placement.data.productLoop.splice(limit);
  },
};
