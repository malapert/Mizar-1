/*******************************************************************************
 * Copyright 2017 CNES - CENTRE NATIONAL d'ETUDES SPATIALES
 *
 * This file is part of MIZAR.
 *
 * MIZAR is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * MIZAR is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with MIZAR. If not, see <http://www.gnu.org/licenses/>.
 ******************************************************************************/

/**
 * Name resolver module : API allowing to search object name and zoom to it
 * @module NameResolver
 * @implements {NameResolver}
 */
define(["jquery", "underscore-min", "../Utils/Constants", "../Utils/Utils", "./AbstractNameResolver"],
    function ($, _, Constants, Utils, AbstractNameResolver) {

        /**************************************************************************************************************/

        /**
         * @name CDSNameResolver
         * @class
         *   Plugin to access to CDS name resolver
         * @augments AbstractNameResolver
         * @param {Context} options - Context
         * @memberOf module:NameResolver
         */
        var CDSNameResolver = function (options) {
            AbstractNameResolver.prototype.constructor.call(this, options);
        };

        /**************************************************************************************************************/

        Utils.inherits(AbstractNameResolver, CDSNameResolver);

        /**************************************************************************************************************/


        /**
         * Queries CDS using this URL : http://cdsweb.u-strasbg.fr/cgi-bin/nph-sesame/-oxp/A?<i>objectName</i>
         * and the layers
         * @function handle
         * @memberOf CDSNameResolver#
         */
        CDSNameResolver.prototype.handle = function (options) {
            var context = this.ctx;
            var objectName = options.objectName;
            var onError = options.onError;
            var onComplete = options.onComplete;
            var onSuccess = options.onSuccess;
            var searchLayer = options.searchLayer;
            var zoomTo = options.zoomTo;

            var url = "http://cdsweb.u-strasbg.fr/cgi-bin/nph-sesame/-oxp/A?" + objectName;
            $.ajax({
                type: "GET",
                url: url,
                dataType: "xml",
                success: function (xmlResponse) {
                    var target = $(xmlResponse).find("Target");
                    var name = $(target).find("name").text();
                    var features = [];

                    $(target).find("Resolver").each(function (index) {
                        var resolver = this;
                        var ra = $(resolver).find("jradeg");
                        var dec = $(resolver).find("jdedeg");

                        if (!_.isEmpty(ra.text()) && !_.isEmpty(dec.text())) {
                            ra = parseFloat(ra.text());
                            dec = parseFloat(dec.text());
                            var feature = {};
                            feature.ra = ra;
                            feature.dec = dec;
                            feature.credit = $(resolver).attr('name');
                            features.push(feature);
                        }
                    });

                    var response = {
                        totalResults: features.length,
                        type: "FeatureCollection",
                        features: []
                    };

                    _.each(features, function (feature) {
                        response.features.push({
                            type: 'Feature',
                            geometry: {
                                coordinates: [feature.ra, feature.dec],
                                type: Constants.GEOMETRY.Point,
                                crs: {
                                    type: "name",
                                    properties: {
                                        name: Constants.CRS.Equatorial
                                    }
                                }
                            },
                            properties: {
                                identifier: "CDS0",
                                name: name,
                                credits: "Powered by <a href=\"http://cdsweb.u-strasbg.fr/cgi-bin/Sesame\">Sesame API</a> (" + feature.credit + ")"
                            }
                        })
                    });

                    // Check if response contains features
                    if (response.type === "FeatureCollection" && response.features.length > 0) {
                        var firstFeature = response.features[0];
                        var zoomToCallback = function () {
                            searchLayer(objectName, onSuccess, onError, response);
                        };
                        zoomTo(firstFeature.geometry.coordinates[0], firstFeature.geometry.coordinates[1], Constants.CRS.Equatorial, zoomToCallback, response);
                    } else {
                        searchLayer(objectName, onSuccess, onError, response);
                    }
                },
                error: function (xhr) {
                    searchLayer(objectName, onSuccess, onError);
                    console.error(xhr.responseText);
                },
                complete: function (xhr, textStatus) {
                    if (onComplete) {
                        onComplete(xhr);
                    }
                }
            });
        };

        /**
         * @function remove
         * @memberOf CDSNameResolver#
         */
        CDSNameResolver.prototype.remove = function () {
        };

        return CDSNameResolver;
    });
