Bineos.Request = class {
  constructor(hostname) {
    this.hostname = hostname;
  }

  // Build request url from an object of parameters
  buildUrl(parameters) {
    const url = new URL("https://" + this.hostname + "/request.php");
    Object.entries(parameters).forEach((entry) => {
      const [key, value] = entry;

      // Value is array
      if (Array.isArray(value)) {
        value.forEach((value) => url.searchParams.append(key + "[]", value));

        // Value is object
      } else if (typeof value === "object") {
        Object.entries(value).forEach((subEntry) => {
          const [subKey, subValue] = subEntry;

          // Object item is an array
          if (Array.isArray(subValue)) {
            subValue.forEach((subValue) => url.searchParams.append(key + "[]", subKey + ":" + subValue));

            // Object item is no array
          } else {
            url.searchParams.append(key + "[]", subKey + ":" + subValue);
          }
        });

        // Value is no array
      } else {
        url.searchParams.append(key, value);
      }
    });
    return url.toString();
  }

  // Make request as script tag
  loadScript(parameters) {
    const script = document.createElement("script");
    script.src = this.buildUrl(parameters);
    return new Promise((resolve, reject) => {
      script.addEventListener("load", resolve);
      document.head.appendChild(script);
    });
  }

  // Load request output into a string
  loadText(parameters) {
    return new Promise((resolve, reject) => {
      fetch(this.buildUrl(parameters))
        .then((response) => response.text())
        .then((data) => resolve(data));
    });
  }
};
