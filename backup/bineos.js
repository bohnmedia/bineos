Bineos22 = (() => {
  const callback = {};
  const container = {};
  const extVar = {};
  const customFunctions = {};
  const eventTarget = {};
  const host = "ad.dl." + location.hostname.match(/[^\.]*\.[^\.]*$/)[0];

  // Generiere einen eindeutigen Hash
  const generateHash = (length = 16) => {
    const output = [];
    const allowedCharacters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for (let i = 0; i < length; i++) output.push(allowedCharacters.substr(Math.floor(Math.random() * allowedCharacters.length), 1));
    return output.join("");
  };

  // Finde alle Container, die eine ZonenId beinhalten
  const loadContainers = () => {
    document.querySelectorAll("[data-bineos-zone]").forEach((node) => {
      container[generateHash()] = node;
    });
  };

  // Gebe ein klassisches Placement auf Basis der Daten aus einem Werbemittel aus
  const defaultPlacement = (placement, uid) => {
    const template = Handlebars.compile(placement.html);
    const html = template(placement);
    container[uid].innerHTML = html;
    container[uid].style.display = null;
  };

  // Füge einen EventListener hinzu
  const on = (eventName, eventFunction) => {
    if (!eventTarget[eventName]) eventTarget[eventName] = [];
    eventTarget[eventName].push(eventFunction);
  };

  // Rufe einen EventListener auf
  const dispatch = (eventName, values) => {
    if (!eventTarget[eventName]) return;
    eventTarget[eventName].forEach((eventFunction) => {
      if (typeof values === "undefined") return eventFunction();
      if (Array.isArray(values)) return eventFunction.apply(null, values);
      eventFunction(values);
    });
  };

  // Führe Funktionen aus, die im Werbemittel angegeben wurden
  const runCustomFunctions = (customFunctionName, placement, container) => {
    // Überspringe, wenn keine customFunctions übergeben wurden
    if (!customFunctionName) return true;

    // Verarbeite alle Funktionen, die mit einem Semikolon getrennt sind in einem for-loop
    const customFunctionNames = customFunctionName.split(";");

    for (let i = 0; i < customFunctionNames.length; i++) {
      // Extrahiere alle Funktionsparameter, die mit einem Pipe-Zeichen getrennt sind
      let customFunctionArguments = customFunctionNames[i].split("|");

      // Der erste Wert ist der Name der Funktion
      let customFunctionName = customFunctionArguments.shift();

      // Falls die Funktion existiert, führe sie mit den zusätzlichen Parametern aus
      if (customFunctions[customFunctionName]) {
        let result = customFunctions[customFunctionName](...[placement, container].concat(customFunctionArguments));

        // Falls die Funktion false zurück gibt, brich die weitere Verarbeitung ab
        if (result === false) return false;
      }
    }
    return true;
  };

  // Weise den Callback zu, der später über das Placement aufgerufen wird
  const generateCallback = (uid) => {
    callback[uid] = (placement) => {
      // Run callback before parse template
      dispatch("parseTemplate", [placement, container[uid]]);

      // If the function returns false, skip the rest
      if (!runCustomFunctions(placement.onParseTemplate, placement, container[uid])) return;

      // Default placement function
      defaultPlacement(placement, uid);

      // EventListener onOutputTemplate
      runCustomFunctions(placement.onOutputTemplate, placement, container[uid]);
    };
  };

  // Generiere ein Objekt aus GET-Parametern
  const getParams = () => {
    const output = {};
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.forEach((value, key) => (output[key] = value));
    return output;
  };

  // Generiere einen extVar-String aus einem Objekt
  const extVars = (extVar) => {
    const vars = Object.assign({}, extVar, getParams());
    return Object.keys(vars)
      .map((key) => "extVar[]=" + key + ":" + vars[key])
      .join("&");
  };

  // Lade ein Placement und übergebe den Hash für die spätere Zuordnung
  const loadPlacement = (uid) => {
    const zoneUid = container[uid].dataset.bineosZone;
    const scriptTag = document.createElement("script");
    const extVarWithUid = Object.assign({ uid: uid }, extVar);
    scriptTag.src = "https://" + host + "/request.php?zone=" + zoneUid + "&" + extVars(extVarWithUid);
    document.head.appendChild(scriptTag);
  };

  // Lade die Placements für alle Container
  const loadPlacements = () => {
    Object.keys(container).forEach(generateCallback);
    Object.keys(container).forEach(loadPlacement);
  };

  // Folgende Funktion wird ausgeführt, sobald der DOM komplett zur Verfügung steht
  const init = () => {
    if (document.readyState === "loading") return window.addEventListener("DOMContentLoaded", init);
    loadContainers();
    loadPlacements();
  };

  // Objekte, die außerhalb der Klasse zur Verfügung stehen
  return { callback, customFunctions, init, extVar, on };
})();
