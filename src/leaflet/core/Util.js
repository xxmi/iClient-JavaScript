var L = require("leaflet");
var GeoJSONFormat = require('../../common/format/GeoJSON');
var SuperMap = require('../../common/SuperMap');
L.Util.supermap_callbacks = {};

L.Util.toGeoJSON = function (feature) {
    if (!feature) {
        return feature;
    }
    return JSON.parse(new GeoJSONFormat().write(feature));
};

L.Util.toSuperMapGeometry = function (geometry) {
    if (!geometry) {
        return geometry;
    }
    var result, format = new GeoJSONFormat();
    if (["FeatureCollection", "Feature", "Geometry"].indexOf(geometry.type) != -1) {
        result = format.read(geometry, geometry.type);
    } else if (typeof geometry.toGeoJSON === "function") {
        var geojson = geometry.toGeoJSON();
        result = (geojson) ? format.read(geojson, geojson.type) : geometry;
    }

    var serverResult = result;
    if (L.Util.isArray(result)) {
        if (result.length === 1) {
            serverResult = result[0];
        } else if (result.length > 1) {
            serverResult = [];
            result.map(function (item) {
                serverResult.push(item.geometry);
            });
        }
    }

    return (serverResult && serverResult.geometry) ? serverResult.geometry : serverResult;

};


L.Util.resolutionToScale = function (resolution, dpi, mapUnit) {
    var inchPerMeter = 1 / 0.0254;
    // 地球半径。
    var meterPerMapUnit = this.getMeterPerMapUnit(mapUnit);
    var scale = resolution * dpi * inchPerMeter * meterPerMapUnit;
    scale = 1 / scale;
    return scale;
};

L.Util.scaleToResolution = function (scale, dpi, mapUnit) {
    var inchPerMeter = 1 / 0.0254;
    var meterPerMapUnitValue = this.getMeterPerMapUnit(mapUnit);
    var resolution = scale * dpi * inchPerMeter * meterPerMapUnitValue;
    resolution = 1 / resolution;
    return resolution;
};

L.Util.getMeterPerMapUnit = function (mapUnit) {
    var earchRadiusInMeters = 6378137;
    var meterPerMapUnit;
    if (mapUnit === SuperMap.Unit.METER) {
        meterPerMapUnit = 1;
    } else if (mapUnit === SuperMap.Unit.DEGREE) {
        // 每度表示多少米。
        meterPerMapUnit = Math.PI * 2 * earchRadiusInMeters / 360;
    } else if (mapUnit === SuperMap.Unit.KILOMETER) {
        meterPerMapUnit = 1.0E-3;
    } else if (mapUnit === SuperMap.Unit.INCH) {
        meterPerMapUnit = 1 / 2.5399999918E-2;
    } else if (mapUnit === SuperMap.Unit.FOOT) {
        meterPerMapUnit = 0.3048;
    } else {
        return meterPerMapUnit;
    }
    return meterPerMapUnit;
};

L.Util.GetResolutionFromScaleDpi = function (scale, dpi, coordUnit, datumAxis) {
    var resolution = null,
        ratio = 10000;
    //用户自定义地图的Options时，若未指定该参数的值，则系统默认为6378137米，即WGS84参考系的椭球体长半轴。
    datumAxis = datumAxis || 6378137;
    coordUnit = coordUnit || "";
    if (scale > 0 && dpi > 0) {
        scale = L.Util.NormalizeScale(scale);
        if (coordUnit.toLowerCase() === "degree" || coordUnit.toLowerCase() === "degrees" || coordUnit.toLowerCase() === "dd") {
            //scale = SuperMap.Util.normalizeScale(scale);
            resolution = 0.0254 * ratio / dpi / scale / ((Math.PI * 2 * datumAxis) / 360) / ratio;
            return resolution;
        } else {
            resolution = 0.0254 * ratio / dpi / scale / ratio;
            return resolution;
        }
    }
    return -1;
};

L.Util.NormalizeScale = function (scale) {
    return (scale > 1.0) ? (1.0 / scale) : scale;
};

L.Util.Csv2GeoJSON = function (csv, options) {
    var defaultOptions = {
        titles: ['lon', 'lat'],
        latitudeTitle: 'lat',
        longitudeTitle: 'lon',
        fieldSeparator: ',',
        lineSeparator: '\n',
        deleteDoubleQuotes: true,
        firstLineTitles: false
    };
    options = options || defaultOptions;
    var _propertiesNames = [];
    if (typeof csv === 'string') {
        var titulos = options.titles;
        if (options.firstLineTitles) {
            csv = csv.split(options.lineSeparator);
            if (csv.length < 2) return;
            titulos = csv[0];
            csv.splice(0, 1);
            csv = csv.join(options.lineSeparator);
            titulos = titulos.trim().split(options.fieldSeparator);
            for (var i = 0; i < titulos.length; i++) {
                titulos[i] = _deleteDoubleQuotes(titulos[i]);
            }
            options.titles = titulos;
        }
        for (var i = 0; i < titulos.length; i++) {
            var prop = titulos[i].toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '_');
            if (prop == '' || prop == '_') prop = 'prop-' + i;
            _propertiesNames[i] = prop;
        }
        csv = _csv2json(csv);
    }
    return csv;

    function _deleteDoubleQuotes(cadena) {
        if (options.deleteDoubleQuotes) cadena = cadena.trim().replace(/^"/, "").replace(/"$/, "");
        return cadena;
    }

    function _csv2json(csv) {
        var json = {};
        json["type"] = "FeatureCollection";
        json["features"] = [];
        var titulos = options.titles;
        csv = csv.split(options.lineSeparator);
        for (var num_linea = 0; num_linea < csv.length; num_linea++) {
            var campos = csv[num_linea].trim().split(options.fieldSeparator)
                , lng = parseFloat(campos[titulos.indexOf(options.longitudeTitle)])
                , lat = parseFloat(campos[titulos.indexOf(options.latitudeTitle)]);
            if (campos.length == titulos.length && Math.abs(lng) < 180 && Math.abs(lat) < 90) {
                var feature = {};
                feature["type"] = "Feature";
                feature["geometry"] = {};
                feature["properties"] = {};
                feature["geometry"]["type"] = "Point";
                feature["geometry"]["coordinates"] = [lng, lat];
                for (var i = 0; i < titulos.length; i++) {
                    if (titulos[i] != options.latitudeTitle && titulos[i] != options.longitudeTitle) {
                        feature["properties"][_propertiesNames[i]] = _deleteDoubleQuotes(campos[i]);
                    }
                }
                json["features"].push(feature);
            }
        }
        return json;
    }
};
module.exports = L.Util;