    class MapVis {

        constructor(parentElement, airportData, geoData) {
            this.parentElement = parentElement;
            this.geoData = geoData;
            this.airportData = airportData;

            // define colors
            this.colors = ['#fddbc7', '#f4a582', '#d6604d', '#b2182b'];

            this.initVis();
        }

        initVis() {
            let vis = this;

            vis.margin = {top:20, right: 20, bottom: 20, left: 20};
            vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
            vis.height = document.getElementById(vis.parentElement).getBoundingClientRect().height - vis.margin.top - vis.margin.bottom;

            // init drawing area
            vis.svg = d3.select("#" + vis.parentElement).append("svg")
                .attr("width", vis.width)
                .attr("height", vis.height)
                .attr('transform', `translate (${vis.margin.left}, ${vis.margin.top})`);

            // add title
            vis.svg.append('g')
                .attr('class', 'title')
                .attr('id', 'map-title')
                .append('text')
                .text('Title for Map')
                .attr('transform', `translate(${vis.width / 2}, 20)`) 
                .attr('text-anchor', 'middle');

            // create a projection
            vis.projection = d3.geoOrthographic()
                .translate([vis.width / 1.8, vis.height / 1.8])
                .scale(230);

            // define a geo generator and pass the projection to it
            vis.path = d3.geoPath().projection(vis.projection);

            // add sphere (ocean)
            vis.svg.append("path")
                .datum({type: "Sphere"})
                .attr("class", "graticule")
                .attr('fill', '#ADDEFF')
                .attr("stroke","rgba(129,129,129,0.35)")
                .attr("d", vis.path);

            // convert TopoJSON data into GeoJSON
            vis.world = topojson.feature(vis.geoData, vis.geoData.objects.countries).features;

            // draw countries
            vis.countries = vis.svg.selectAll(".country")
                .data(vis.world)
                .enter().append("path")
                .attr('class', 'country')
                .attr("d", vis.path)
                .attr("fill", "transparent")
                .attr("stroke", "black");

            // add legend
            vis.legend = vis.svg.append("g")
                .attr('class', 'legend')
                .attr('transform', `translate(${vis.width * 2.8 / 4}, ${vis.height - 20})`);

            vis.legend.selectAll("rect")
                .data(vis.colors)
                .enter().append("rect")
                .attr("width", 20)
                .attr("height", 20)
                .attr("x", (d, i) => i * 25)
                .attr("fill", d => d);

            let legendScale = d3.scaleBand()
                .domain([0, 1, 2, 3])
                .range([0, 100]);

            let legendAxis = d3.axisBottom(legendScale).tickFormat(d => `Category ${d + 1}`);

            vis.legend.append("g")
                .attr("transform", "translate(0, 20)")
                .call(legendAxis);

            // make map draggable
            let m0, o0;
            vis.svg.call(
                d3.drag()
                    .on("start", function (event) {
                        let lastRotationParams = vis.projection.rotate();
                        m0 = [event.x, event.y];
                        o0 = [-lastRotationParams[0], -lastRotationParams[1]];
                    })
                    .on("drag", function (event) {
                        if (m0) {
                            let m1 = [event.x, event.y],
                                o1 = [o0[0] + (m0[0] - m1[0]) / 4, o0[1] + (m1[1] - m0[1]) / 4];
                            vis.projection.rotate([-o1[0], -o1[1]]);
                        }

                        // Update the map
                        vis.path = d3.geoPath().projection(vis.projection);
                        d3.selectAll(".country").attr("d", vis.path);
                        d3.selectAll(".graticule").attr("d", vis.path);
                    })
            );

            vis.wrangleData();
        }

        wrangleData() {
            let vis = this;

            vis.countryInfo = {};
            vis.geoData.objects.countries.geometries.forEach(d => {
                let randomCountryValue = Math.random() * 4;
                vis.countryInfo[d.properties.name] = {
                    name: d.properties.name,
                    category: 'category_' + Math.floor(randomCountryValue),
                    color: vis.colors[Math.floor(randomCountryValue)],
                    value: randomCountryValue / 4 * 100
                };
            });

            vis.updateVis();
        }

        updateVis() {
            let vis = this;

            vis.countries.transition()
                .duration(1000)
                .attr("fill", d => vis.countryInfo[d.properties.name]?.color || "gray");

            vis.countries
                .on("mouseover", function(event, d) {
                    d3.select(this).attr("fill", "lightblue");
                    vis.tooltip.style("opacity", 1)
                        .html(`
                        <div style="border: thin solid grey; border-radius: 5px; background: lightgrey; padding: 10px">
                            <h3>Name: ${d.properties.name}</h3>
                            <h4>Category: ${vis.countryInfo[d.properties.name].category}</h4>
                            <h4>Color: ${vis.countryInfo[d.properties.name].color}</h4>
                            <h4>Value: ${vis.countryInfo[d.properties.name].value}</h4>
                        </div>
                    `)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 10) + "px");
                })
                .on("mouseout", function(event, d) {
                    d3.select(this).attr("fill", vis.countryInfo[d.properties.name]?.color || "gray");
                    vis.tooltip.style("opacity", 0);
                });

            vis.tooltip = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("position", "absolute")
                .style("background", "white")
                .style("padding", "5px")
                .style("border", "1px solid black")
                .style("border-radius", "5px")
                .style("opacity", 0);
        }
    }
