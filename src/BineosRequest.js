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
