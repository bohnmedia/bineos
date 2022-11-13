[LOOP]

(() => {

    const data = {
		"clickurl"          : "[CLICKURL]",
		"destinationurl"    : "[DESTINATIONURL]",
		"rd_click_enc"      : "[RD_CLICK_ENC]",
		"imageurl"          : "[IMAGEURL]",
		"onLoadPlacement"   : "[onLoadPlacement]",
		"onCompileTemplate" : "[onCompileTemplate]",
		"onOutputTemplate"  : "[onOutputTemplate]",
		"zoneUid"           : "[ZONEUID]",
    	"html"              : [HTML|JSONIFY]
    };

    [IF-HTML]
    data.productLoop = [];
	[PRODUCTLOOP]
	data.productLoop.push({
		productId        : [PRODUCTLOOP-PRODUCT-ID|JSONIFY],
		headline         : [PRODUCTLOOP-HEADLINE|JSONIFY],
		clickurl         : "[PRODUCTLOOP-CLICKURL]",
		description      : [PRODUCTLOOP-DESCRIPTION|JSONIFY],
		teaser           : [PRODUCTLOOP-TEASER|JSONIFY],
		brandName        : [PRODUCTLOOP-BRAND-NAME|JSONIFY],
		imageSmall       : "[PRODUCTLOOP-IMAGE-SMALL]",
		imageMedium      : "[PRODUCTLOOP-IMAGE-MEDIUM]",
		imageLarge       : "[PRODUCTLOOP-IMAGE-LARGE]",
		brandImageSmall  : "[PRODUCTLOOP-BRAND-IMAGE-SMALL]",
		brandImageMedium : "[PRODUCTLOOP-BRAND-IMAGE-MEDIUM]",
		brandImageLarge  : "[PRODUCTLOOP-BRAND-IMAGE-LARGE]",
		price            : [PRODUCTLOOP-PRICE-FLOAT],
		priceOld         : [PRODUCTLOOP-PRICE-OLD-FLOAT],
		priceBase        : [PRODUCTLOOP-PRICE-BASE|JSONIFY],
		currency         : "[PRODUCTLOOP-CURRENCY]",
		freetext1        : [PRODUCTLOOP-FREETEXT-1|JSONIFY],
		freetext2        : [PRODUCTLOOP-FREETEXT-2|JSONIFY],
		freetext3        : [PRODUCTLOOP-FREETEXT-3|JSONIFY],
		freeimage1       : "[PRODUCTLOOP-FREEIMAGE-1]",
		freeimage2       : "[PRODUCTLOOP-FREEIMAGE-2]",
		freeimage3       : "[PRODUCTLOOP-FREEIMAGE-3]",
		attribute1       : [PRODUCTLOOP-ATTRIBUTE-1|JSONIFY],
		attribute2       : [PRODUCTLOOP-ATTRIBUTE-2|JSONIFY],
		attribute3       : [PRODUCTLOOP-ATTRIBUTE-3|JSONIFY],
		attribute4       : [PRODUCTLOOP-ATTRIBUTE-4|JSONIFY],
		attribute5       : [PRODUCTLOOP-ATTRIBUTE-5|JSONIFY],
		attribute6       : [PRODUCTLOOP-ATTRIBUTE-6|JSONIFY]
	});
	[/PRODUCTLOOP]
    [/IF-HTML]

    [IF-STANDARD]
    if (!data.html) {
        data.html = '<a href="{{clickurl}}" target="_blank"><img style="max-width:100%;height:auto;vertical-align:middle" src="{{imageurl}}"></a>';
    }
    [/IF-STANDARD]

	[EXTVAR_CALLBACK](data);

})();

[/LOOP]