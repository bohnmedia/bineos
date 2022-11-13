# Bineos Callback 2.0
Die Bineos Callback 2.0 führt Funktionen der bisher lokal beim Kunden eingebundenen Bineos-Klasse mit Funktionen zusammen, die Bisher über den Tag Manager realisiert wurden.

Die Klasse verfolgt dabei folgende Ziele:
- Redundanten Code reduzieren
- Ladezeiten reduzieren
- Mehr Flexibilität bei Steuerung und Darstellung von Placements
- Ein zentraler Basiscode für alle Kunden

## Einbindung der neuen Bineos-Klasse auf der Kundenwebseite

Um die zentrale Pflegbarkeit für alle Kunden zu gewährleisten, sollte die Klasse zukünftig über das CDN von Neory ausgeliefert werden. Sofern das CDN über die Kundendomain verwendet wird, reicht hier die entsprechende Container-ID. Die Domain für den Tag Manager wird automatisch ermittelt.

```html
<script src="https://cdn.dl.kunde.tld/bineos.min.js"></script>
<script>
  const bineos = new Bineos("12345678");
  bineos.init();
</script>
```

Für den Fall, dass das Script über eine andere Domain eingebunden wurde, muss zusätzliche die Domain übergeben werden, über die der Tag-Manager erreichbar ist.

```javascript
const bineos = new Bineos("12345678", "dl.kunde.tld");
```

Falls keine Kundendomain übergeben wurde und das Script über einen Hostnamen erreichbar ist, der nicht mit "cdn.dl." beginnt, greift automatisch "ad-srv.net" als Fallback.

### DataLayer-Variablen über Bineos-Tag

DataLayer-Variablen können entweder einzeln oder als Objekt an die Bineos-Klasse übergeben werden.

```javascript
const bineos = new Bineos("12345678");

// Übergabe als Objekt
bineos.dataLayer = {
  "articleId": 12345678,
  "touchpoint": "article"
}

// Einzelne Übergabe
bineos.dataLayer.articleId = 12345678;
bineos.dataLayer.touchpoint = "article";

bineos.init();
```

Diese können dann wie gewohnt über die Makros verarbeitet werden.

### ExtVars über Bineos-Tag

Bisher musste man zwingend ExtVars innerhalb des Placement-Tags im Tag-Manager übergeben, wenn man diese innerhalb eines Werbemittels verwenden wollte. Dies ist nun auch direkt über den Bineos-Tag möglich. Dies ermöglicht dem Kunden völlig neue Ausspielungsmöglichkeiten, da er nun eigenständig seiten- und kundenabhängige ExtVars definieren kann.

```javascript
// Übergabe als Objekt
bineos.extVar = {
  "ressort": "Sport",
  "customerStatus": "digitalAbo"
}

// Einzelne Übergabe
bineos.extVar.ressort = "Sport";
bineos.extVar.customerStatus = "digitalAbo";
```

Die ExtVars lassen sich daraufhin direkt im Werbemittel verwenden, ohne dass zusätzliche Anpassungen durch Bineos vorgenommen werden müssen.

<img width="512" alt="image" src="https://user-images.githubusercontent.com/87128053/201534974-fa05dcdc-fb7b-4b4e-ae82-114fe5c33c5a.png">

## Der neue Bineos-Zone-Tag

Im Falle der ersten Bineos-Callback-Funktion wurde noch mit einem Mapping von inkrementellen IDs auf unique Zonen-IDs von Neory gearbeitet, was beim Anlegen einer Zone für zusätzlichen Aufwand gesorgt hat. Per Makro musste ein Mapping von der inkrementellen ID auf die UID der Zone vorgenommen werden. Daraufhin musste im Bineos-Tag definiert werden, dass die Zone mit der entsprechenden ID geladen wird.

Mit der Bineos-Callback 2.0 wurde das Mapping entfernt, sodass nurnoch mit den UIDs der Zonen gearbeitet wird. Um die Zonen auf der Webseite zu definieren, wird der Tag "bineos-zone" verwendet.

```html
<bineos-zone uid="tsmo807r2e0c"></bineos-zone>
```

Ist ein Zonen-Tag mit entsprechender UID vorhanden, wird die Zone automatisch geladen.

### Mehrfache Definition der selben Zone

Mit der Bineos-Callback 2.0 ist es nun auch möglich, die selbe Zone mehrmals auf einer Seite zu definieren, was vor allem im Zusammenhang mit ExtVars einige neue Anwendungsmöglichkeiten bietet.

```html
<bineos-zone uid="tsmo807r2e0c"></bineos-zone>
...
<bineos-zone uid="tsmo807r2e0c"></bineos-zone>
...
<bineos-zone uid="tsmo807r2e0c"></bineos-zone>
```

### ExtVar-Übergabe an Bineos-Zone

Wie bereits erwähnt ist es über den Bineos-Tag ja bereits möglich, ExtVars zu definieren, die global für die Seite gelten. Diese lassen sich aber auch gezielt innerhalb einer Bineos-Zone definieren.

```html
<bineos-zone uid="tsmo807r2e0c" extvar-position="1" extvar-foo="bar"></bineos-zone>
...
<bineos-zone uid="tsmo807r2e0c" extvar-position="2"></bineos-zone>
...
<bineos-zone uid="tsmo807r2e0c" extvar-position="3"></bineos-zone>
```

Über das obere Beispiel lassen sich drei Werbemittel auf eine Zone buchen. Die Reihenfolge wird per ExtVar bestimmt.

<img width="488" alt="image" src="https://user-images.githubusercontent.com/87128053/201536390-90d91e54-582f-4ebc-b506-86fe2f20732a.png">

## HTML und Templates

In der ersten Version der Bineos-Callback wurden lediglich die Daten eines Placements an die Callback-Funktion übergeben. Der HTML-Code, der zur Darstellung des Placements verwendet wurde, musste per JavaScript erzeugt werden. Das hat einerseits zwar das höchste Maß an Flexibilität geboten, bedeutete aber auch immer, dass der entsprechende HTML-Code innerhalb der Callback definiert werden musste, was im Falle von individuellen Recommendations jedes Mal zusätzlichen Aufwand bei Bineos bedeutete.

Im Anschluss wurde geprüft, ob es besser ist, den HTML-Code direkt im Werbemittel-Template zu definieren. In diesem Falle konnte mit nativem HTML-Code gearbeitet werden. Der verwendete HTML-Code war zudem durch die Zuordnung des Templates direkt erkennbar.

Leider boten die Werbemittel-Templates nur einen beschränkten Funktionsumfang, weshalb zusätzlich die JS-Template-Engine [Handlebars](https://handlebarsjs.com/) zum Einsatz kam. Dies ermöglichte zusätzlich IF-Abfragen, Schleifen sowie die Definition zusätzlicher Platzhalter.

Bis sich Änderungen an Templates ins Livesystem durchgeschlagen haben, konnte es mehr als zwei Stunden dauern, weshalb die Idee für die Bineos-Callback 2.0 entstand, die die Vorteile der Bineos-Callback 1.0 mit den Vorteilen eines Template-Systems, das über den Tag-Manager gesteuert werden kann, entstand.

### Werbemittel-Template

Mit der Bineos-Callback 2.0 gibt es nun ein zentrales Template, das sowohl für die Ausspielung von Bannern als auch für die Ausspielung von Recommendations verwendet wird. Es stellt sowohl die Rohdaten als auch den HTML-Code für die Ausspielung bereit, sofern dieser über das Werbemittel definiert wurde. Bevor das Template kompiliert wird, können per JavaScipt Veränderungen vorgenommen werden.

Das Standard-Template für die Ausspielung findet sich in der Datei [default.tpl](./default.tpl).

### Template-System

Um IF-Abfragen und Schleifen innerhalb der HTML-Templates zu ermöglichen, kommt in der Bineos-Callback 2.0 das Template-System [Template7](https://www.idangero.us/template7/) zum Einsatz, das die selbe Template-Syntax wie Handlebars verwendet, jedoch deutlich kleiner und schneller ist.

### HTML-Code

Der HTML-Code für Banner und Recommendations verwendet die Template-Syntax von [Template7](https://www.idangero.us/template7/). Über das standardmäßige Werbemittel-Template für die Bineos-Callback 2.0 werden folgende Platzhalter definiert.

- **{{clickurl}}** beinhaltet die Click-URL auf die Ziel-URL inklusive Clicktracker.
- **{{destinationurl}}** beinhaltet die URL aus dem Feld "Destination-URL" im Werbemittel-Template.
- **{{rd_click_enc}}** beinhaltet den Clicktracker, an den eine URL-enkodierte Ziel-URL gehangen werden kann.
- **{{imageurl}}** beinhaltet die im Werbemittel definierte Bild-URL.

Die Variablen können wie folgt im HTML-Code verwendet werden.

```html
<a href="{{clickurl}}"><img src="{{imageurl}}"></a>
```

Falls im Werbemittel-Template der Typ "Standard" ausgewählt wurde, greift im Falle, dass kein HTML definiert wurde automatisch folgender HTML-Code.

```html
<a href="{{clickurl}}" target="_blank"><img style="max-width:100%;height:auto;vertical-align:middle" src="{{imageurl}}"></a>
```

Im Falle von Recommendations steht zusätzlich das Array "productLoop" zur Verfügung, dessen Items alle Felder beinhalten, die beim Import gemappt werden können.

- productId
- headline
- clickurl
- description
- teaser
- brandName
- imageSmall
- imageMedium
- imageLarge
- brandImageSmall
- brandImageMedium
- brandImageLarge
- price
- priceOld
- priceBase
- currency
- freetext1
- freetext2
- freetext3
- freeimage1
- freeimage2
- freeimage3
- attribute1
- attribute2
- attribute3
- attribute4
- attribute5
- attribute6

Auf diese lässt sich dann mit der Funktion #each auf "productLoop" zugreifen.

```html
<section class="reco-article-container">
  {{#each productLoop}}
  <article class="nfy-ressortbox nfy-ressortbox-teaser-small">
    <a href="{{this.clickurl}}">
      <figure class="nfy-ressortbox-image">
        <img src="{{this.imageSmall}}" width="403" height="220" class="nfy-mobile-first"> 
      </figure>
      <div class="nfy-image-overlay-icons"></div>
      <div class="nfy-ressortbox-text">
        <div class="category_group">
          {{#if this.attribute3}}<span class="newPW mr10">PLUS</span>{{/if}}
          <span class="nfy-category">{{this.attribute6}}</span>
        </div>
        <h2 class="nfy-teaser-headline newPW">{{this.headline}}</h2>
      </div>
    </a>
  </article>
  {{/each}}
</section>
```

#### HTML-Code über Werbemittel

Die einfachste Art, den HTML-Code für ein Placement zu definieren, ist es diesen direkt ins Werbemittel zu schreiben.

<img width="653" alt="image" src="https://user-images.githubusercontent.com/87128053/201539230-60e50dbd-3189-4eb9-9e3d-c1e750da6736.png">

#### HTML-Code per eingebettetem Script-Tag

Fügt man in den Bineos-Zone-Tag einen Script-Tag vom Typ "text/bineos-template" ein, wird der darin enthaltene HTML-Code als Template verwendet.

```html
<bineos-zone uid="tsmo807r2e0c">
  <script type="text/bineos-template">
    <a href="{{clickurl}}"><img src="{{imageurl}}"></a>
  </script>
</bineos-zone>
```

#### HTML-Code per externem Script-Tag

Gibt man dem Script-Tag eine ID, kann diese über das Attribut "template-id" verknüpft werden.

```html
<bineos-zone uid="tsmo807r2e0c" template-id="mein-template"></bineos-zone>
<script type="text/bineos-template" id="mein-template">
  <a href="{{clickurl}}"><img src="{{imageurl}}"></a>
</script>
```

#### HTML-Code über externe Datei

Über das Attribut "template-src" kann eine URL angegeben werden, über die das Template geladen werden soll.

```html
<bineos-zone uid="tsmo807r2e0c" template-src="https://office.bohn.media/bineos/test.tpl"></bineos-zone>
```
